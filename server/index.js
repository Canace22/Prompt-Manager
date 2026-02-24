import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 手动加载 .env（避免额外依赖 dotenv 的 esm 版本问题）
try {
  const envPath = join(__dirname, '..', '.env')
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.trim().split('=')
    if (key && !key.startsWith('#')) {
      process.env[key] = vals.join('=')
    }
  })
} catch {
  // .env 不存在时忽略
}

const app = express()
const PORT = process.env.PORT || 3001
const API_KEY = process.env.DASHSCOPE_API_KEY || ''
const NOTION_TOKEN = process.env.NOTION_TOKEN || ''
const NOTION_DB_ID = process.env.NOTION_DATABASE_ID || '1b441c9133c580aab50ff82be3ea8a14'

app.use(cors())
app.use(express.json({ limit: '20mb' }))

const DATA_FILE = join(__dirname, '..', 'prompts.json')

const readData = () => {
  if (!existsSync(DATA_FILE)) return []
  try { return JSON.parse(readFileSync(DATA_FILE, 'utf-8')) } catch { return [] }
}

const writeData = (data) => {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasKey: !!API_KEY && API_KEY !== 'your_api_key_here' })
})

// 读取所有 Prompt
app.get('/api/prompts', (req, res) => {
  res.json(readData())
})

// 覆盖写入所有 Prompt
app.put('/api/prompts', (req, res) => {
  const data = req.body
  if (!Array.isArray(data)) return res.status(400).json({ error: '数据格式错误' })
  writeData(data)
  res.json({ ok: true })
})

// 检测 messages 是否包含图片（user message content 为数组且含 image_url）
const hasImageContent = (messages) =>
  messages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === 'image_url'))

// 将前端多模态格式转换为 DashScope 多模态格式
// 前端: [{type:'image_url', image_url:{url:'...'}}]
// DashScope: [{image:'...'}, {text:'...'}]
const toMultimodalMessages = (messages) =>
  messages.map(m => {
    if (!Array.isArray(m.content)) return m
    const content = m.content.map(p => {
      if (p.type === 'image_url') return { image: p.image_url.url }
      if (p.type === 'text') return { text: p.text }
      return p
    })
    return { ...m, content }
  })

// 千问 API 中转（支持流式输出，自动区分文本/多模态）
app.post('/api/chat', async (req, res) => {
  const { model = 'qwen-turbo', messages, stream = true } = req.body

  if (!API_KEY || API_KEY === 'your_api_key_here') {
    return res.status(400).json({ error: '请先在 .env 文件中配置 DASHSCOPE_API_KEY' })
  }

  const isMultimodal = hasImageContent(messages)
  const endpoint = isMultimodal
    ? 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
    : 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'

  const finalMessages = isMultimodal ? toMultimodalMessages(messages) : messages
  // 多模态模型固定用 qwen-vl-plus，文本模型用用户选择的
  const finalModel = isMultimodal ? 'qwen-vl-plus' : model

  const body = JSON.stringify({
    model: finalModel,
    input: { messages: finalMessages },
    parameters: { result_format: 'message', incremental_output: stream },
  })

  try {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
          ...(stream ? { Accept: 'text/event-stream' } : {}),
        },
        body,
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      return res.status(response.status).json({ error: errText })
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      const pump = async () => {
        const { done, value } = await reader.read()
        if (done) {
          res.write('data: [DONE]\n\n')
          res.end()
          return
        }
        res.write(decoder.decode(value, { stream: true }))
        pump()
      }
      pump()
    } else {
      const data = await response.json()
      res.json(data)
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ─── Notion 同步 ─────────────────────────────────────────────────────────────

const notionHeaders = () => ({
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
})

// 从 Notion page 正文提取 Prompt 内容（取第一个 code block 或所有段落）
const extractPageContent = (blocks) => {
  const parts = []
  for (const b of blocks) {
    if (b.type === 'code') {
      const text = b.code?.rich_text?.map(t => t.plain_text).join('') || ''
      if (text) return text // 优先取 code block
    }
    if (['paragraph', 'heading_1', 'heading_2', 'heading_3'].includes(b.type)) {
      const rich = b[b.type]?.rich_text || []
      const text = rich.map(t => t.plain_text).join('')
      if (text) parts.push(text)
    }
  }
  return parts.join('\n\n')
}

// 获取 Notion page 正文 blocks
const fetchPageBlocks = async (pageId) => {
  const r = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
    headers: notionHeaders(),
  })
  const data = await r.json()
  return data.results || []
}

// 将 Notion 记录转换为本地 prompt 格式
// Notion 变量格式 ${var} → 本地 {{var}}
const notionToLocal = (page, content) => {
  const props = page.properties
  const getName = (p) => p?.title?.map(t => t.plain_text).join('') || ''
  const getText = (p) => p?.rich_text?.map(t => t.plain_text).join('') || ''
  const getSelect = (p) => p?.select?.name || ''
  const getStatus = (p) => p?.status?.name || ''

  const localContent = content.replace(/\$\{(\w+)\}/g, '{{$1}}')
  const variables = [...new Set((localContent.match(/\{\{(\w+)\}\}/g) || []).map(m => m.slice(2, -2)))]

  return {
    notionId: page.id,
    name: getName(props.Name),
    description: getText(props.Description),
    content: localContent,
    variables,
    tags: getSelect(props.Category) ? [getSelect(props.Category)] : [],
    notionStatus: getStatus(props.Status),
    model: 'qwen-turbo',
    history: [],
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  }
}

// 将本地 prompt 内容转换为 Notion blocks
// 本地 {{var}} → Notion ${var}
const localToNotionContent = (content) =>
  content.replace(/\{\{(\w+)\}\}/g, '${$1}')

// 从 Notion 数据库拉取所有 Prompt（含正文）
const fetchNotionPrompts = async () => {
  const r = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({ page_size: 100 }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.message || 'Notion API 错误')

  const pages = data.results || []
  const results = []
  for (const page of pages) {
    const blocks = await fetchPageBlocks(page.id)
    const content = extractPageContent(blocks)
    results.push(notionToLocal(page, content))
  }
  return results
}

// 在 Notion 创建新 page
const createNotionPage = async (prompt) => {
  const notionContent = localToNotionContent(prompt.content || '')
  const category = prompt.tags?.[0]
  const validCategories = ['Technical', 'Role', 'Tool', 'Workflow']

  const r = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: NOTION_DB_ID },
      properties: {
        Name: { title: [{ text: { content: prompt.name || '未命名' } }] },
        Description: { rich_text: [{ text: { content: prompt.description || '' } }] },
        ...(category && validCategories.includes(category)
          ? { Category: { select: { name: category } } }
          : {}),
        Status: { status: { name: 'Draft' } },
      },
      children: notionContent ? [{
        object: 'block',
        type: 'code',
        code: {
          language: 'markdown',
          rich_text: [{ type: 'text', text: { content: notionContent } }],
        },
      }] : [],
    }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.message || '创建失败')
  return data.id
}

// 更新 Notion page 属性 + 正文
const updateNotionPage = async (notionId, prompt) => {
  const notionContent = localToNotionContent(prompt.content || '')
  const category = prompt.tags?.[0]
  const validCategories = ['Technical', 'Role', 'Tool', 'Workflow']

  // 更新属性
  await fetch(`https://api.notion.com/v1/pages/${notionId}`, {
    method: 'PATCH',
    headers: notionHeaders(),
    body: JSON.stringify({
      properties: {
        Name: { title: [{ text: { content: prompt.name || '未命名' } }] },
        Description: { rich_text: [{ text: { content: prompt.description || '' } }] },
        ...(category && validCategories.includes(category)
          ? { Category: { select: { name: category } } }
          : { Category: { select: null } }),
      },
    }),
  })

  // 更新正文：先删除现有 blocks，再写入新内容
  if (notionContent) {
    const listRes = await fetch(`https://api.notion.com/v1/blocks/${notionId}/children`, {
      headers: notionHeaders(),
    })
    const listData = await listRes.json()
    for (const block of listData.results || []) {
      await fetch(`https://api.notion.com/v1/blocks/${block.id}`, {
        method: 'DELETE',
        headers: notionHeaders(),
      })
    }
    await fetch(`https://api.notion.com/v1/blocks/${notionId}/children`, {
      method: 'PATCH',
      headers: notionHeaders(),
      body: JSON.stringify({
        children: [{
          object: 'block',
          type: 'code',
          code: {
            language: 'markdown',
            rich_text: [{ type: 'text', text: { content: notionContent } }],
          },
        }],
      }),
    })
  }
}

// GET /api/notion/sync — 从 Notion 拉取并合并到本地
app.get('/api/notion/sync', async (req, res) => {
  if (!NOTION_TOKEN || NOTION_TOKEN === 'your_notion_token_here') {
    return res.status(400).json({ error: '请先在 .env 中配置 NOTION_TOKEN' })
  }
  try {
    const notionPrompts = await fetchNotionPrompts()
    const local = readData()
    const localByNotionId = new Map(local.filter(p => p.notionId).map(p => [p.notionId, p]))
    const localById = new Map(local.map(p => [p.id, p]))

    const merged = [...local]
    let added = 0, updated = 0

    for (const np of notionPrompts) {
      const existing = localByNotionId.get(np.notionId)
      if (existing) {
        // 以 Notion 更新时间较新的为准
        const notionNewer = new Date(np.updatedAt) > new Date(existing.updatedAt)
        if (notionNewer) {
          const idx = merged.findIndex(p => p.id === existing.id)
          merged[idx] = { ...existing, ...np, id: existing.id, history: existing.history }
          updated++
        }
      } else {
        const { v4: uuidv4 } = await import('uuid')
        merged.unshift({ ...np, id: uuidv4() })
        added++
      }
    }

    writeData(merged)
    res.json({ ok: true, added, updated, total: notionPrompts.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/notion/push — 将本地指定 prompt 推送到 Notion
app.post('/api/notion/push', async (req, res) => {
  if (!NOTION_TOKEN || NOTION_TOKEN === 'your_notion_token_here') {
    return res.status(400).json({ error: '请先在 .env 中配置 NOTION_TOKEN' })
  }
  const { id } = req.body
  try {
    const local = readData()
    const prompt = local.find(p => p.id === id)
    if (!prompt) return res.status(404).json({ error: 'Prompt 不存在' })

    let notionId = prompt.notionId
    if (notionId) {
      await updateNotionPage(notionId, prompt)
    } else {
      notionId = await createNotionPage(prompt)
      const idx = local.findIndex(p => p.id === id)
      local[idx] = { ...prompt, notionId }
      writeData(local)
    }
    res.json({ ok: true, notionId })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────

createServer(app).listen(PORT, () => {
  console.log(`[server] 运行在 http://localhost:${PORT}`)
  console.log(`[server] API Key: ${API_KEY ? (API_KEY === 'your_api_key_here' ? '未配置' : '已配置') : '未配置'}`)
})
