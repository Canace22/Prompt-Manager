import { v4 as uuidv4 } from 'uuid'

// 解析 prompt 内容中的 {{变量名}} 占位符
export const parseVariables = (content) => {
  const matches = content.match(/\{\{(\w+)\}\}/g) || []
  return [...new Set(matches.map(m => m.slice(2, -2)))]
}

// 用变量值替换 prompt 内容中的占位符
export const fillVariables = (content, vars) =>
  content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)

const fetchAll = () =>
  fetch('/api/prompts').then(r => r.json())

const saveAll = (prompts) =>
  fetch('/api/prompts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prompts),
  }).then(r => r.json())

export const getAll = () => fetchAll()

export const getById = async (id) => {
  const list = await fetchAll()
  return list.find(p => p.id === id) || null
}

export const create = async (fields) => {
  const prompts = await fetchAll()
  const now = new Date().toISOString()
  const prompt = {
    id: uuidv4(),
    name: '未命名 Prompt',
    description: '',
    content: '',
    variables: [],
    tags: [],
    model: 'qwen-turbo',
    history: [],
    createdAt: now,
    updatedAt: now,
    ...fields,
  }
  prompt.variables = parseVariables(prompt.content)
  prompts.unshift(prompt)
  await saveAll(prompts)
  return prompt
}

export const update = async (id, fields) => {
  const prompts = await fetchAll()
  const idx = prompts.findIndex(p => p.id === id)
  if (idx === -1) return null
  const updated = {
    ...prompts[idx],
    ...fields,
    id,
    updatedAt: new Date().toISOString(),
  }
  if (fields.content !== undefined) {
    updated.variables = parseVariables(updated.content)
  }
  prompts[idx] = updated
  await saveAll(prompts)
  return updated
}

export const remove = async (id) => {
  const prompts = await fetchAll()
  await saveAll(prompts.filter(p => p.id !== id))
}

export const addHistory = async (id, entry) => {
  const prompts = await fetchAll()
  const idx = prompts.findIndex(p => p.id === id)
  if (idx === -1) return null
  const history = [
    { id: uuidv4(), time: new Date().toISOString(), ...entry },
    ...(prompts[idx].history || []),
  ]
  prompts[idx] = { ...prompts[idx], history }
  await saveAll(prompts)
  return prompts[idx]
}

export const exportAll = async () => {
  const data = await fetchAll()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `promts_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export const importFromFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const incoming = JSON.parse(e.target.result)
        if (!Array.isArray(incoming)) throw new Error('格式错误')
        const existing = await fetchAll()
        const existingIds = new Set(existing.map(p => p.id))
        const merged = [
          ...incoming.filter(p => !existingIds.has(p.id)),
          ...existing,
        ]
        await saveAll(merged)
        resolve(incoming.length)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
