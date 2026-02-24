import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getById, update, addHistory, remove } from '../store/promptStore'
import TestPanel from '../components/TestPanel'
import HistoryView from '../components/HistoryView'

const pushToNotion = async (id) => {
  const r = await fetch('/api/notion/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  return r.json()
}

const TABS = ['编辑', '测试', '历史']

export default function PromptEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState(null)
  const [activeTab, setActiveTab] = useState('编辑')
  const [draft, setDraft] = useState({})
  const [tagInput, setTagInput] = useState('')
  const [saved, setSaved] = useState(true)
  const [pushing, setPushing] = useState(false)
  const [pushMsg, setPushMsg] = useState('')

  const reload = useCallback(async () => {
    const p = await getById(id)
    if (!p) { navigate('/'); return }
    setPrompt(p)
    setDraft({ name: p.name, description: p.description, content: p.content, tags: p.tags || [], model: p.model })
    setSaved(true)
  }, [id])

  useEffect(() => { reload() }, [reload])

  const setField = (field, value) => {
    setDraft(d => ({ ...d, [field]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    const updated = await update(id, draft)
    setPrompt(updated)
    setSaved(true)
  }

  const handleDelete = async () => {
    if (window.confirm(`确认删除「${prompt.name}」？`)) {
      await remove(id)
      navigate('/')
    }
  }

  const handleSaveHistory = async (entry) => {
    const updated = await addHistory(id, entry)
    setPrompt(updated)
  }

  const handlePushToNotion = async () => {
    if (!saved) await handleSave()
    setPushing(true)
    setPushMsg('')
    try {
      const result = await pushToNotion(id)
      if (result.error) throw new Error(result.error)
      setPushMsg('已推送到 Notion')
      reload()
    } catch (err) {
      setPushMsg('推送失败：' + err.message)
    } finally {
      setPushing(false)
      setTimeout(() => setPushMsg(''), 3000)
    }
  }

  const handleApplyPrompt = (content) => {
    setField('content', content)
    setActiveTab('编辑')
  }

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const tag = tagInput.trim()
      if (!draft.tags.includes(tag)) {
        setField('tags', [...draft.tags, tag])
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag) => {
    setField('tags', draft.tags.filter(t => t !== tag))
  }

  // 自动保存（内容有变化且距上次改动 2s 后）
  useEffect(() => {
    if (saved) return
    const t = setTimeout(() => { handleSave() }, 2000)
    return () => clearTimeout(t)
  }, [draft, saved])

  if (!prompt) return null

  const variables = draft.content?.match(/\{\{(\w+)\}\}/g)?.map(m => m.slice(2, -2)) || []

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶栏 */}
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-2.5 flex items-center gap-3">
        <button className="btn-ghost py-1 px-2" onClick={() => navigate('/')}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <input
          className="flex-1 bg-transparent text-lg font-semibold text-gray-100 focus:outline-none placeholder-gray-600"
          value={draft.name || ''}
          onChange={e => setField('name', e.target.value)}
          placeholder="Prompt 名称"
        />

        <div className="flex items-center gap-2 shrink-0">
          {pushMsg && (
            <span className={`text-xs ${pushMsg.includes('失败') ? 'text-red-400' : 'text-green-400'}`}>
              {pushMsg}
            </span>
          )}
          <span className={`text-xs ${saved ? 'text-gray-600' : 'text-amber-400'}`}>
            {saved ? '已保存' : '编辑中...'}
          </span>
          <button
            className="btn-ghost py-1 text-xs gap-1"
            onClick={handlePushToNotion}
            disabled={pushing}
            title="推送到 Notion"
          >
            {pushing ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            )}
            <span className="hidden sm:inline">{prompt?.notionId ? '推送 Notion' : '发布 Notion'}</span>
          </button>
          <button className="btn-primary py-1" onClick={handleSave}>保存</button>
          <button className="btn-danger py-1" onClick={handleDelete}>删除</button>
        </div>
      </header>

      {/* 主体：左侧元信息 + 右侧内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧元信息栏 */}
        <aside className="w-52 shrink-0 border-r border-gray-800 p-4 overflow-y-auto flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">描述</label>
            <textarea
              className="input resize-none text-xs h-16"
              placeholder="Prompt 用途描述..."
              value={draft.description || ''}
              onChange={e => setField('description', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">默认模型</label>
            <select className="input text-xs" value={draft.model || 'qwen-turbo'} onChange={e => setField('model', e.target.value)}>
              <option value="qwen-turbo">qwen-turbo</option>
              <option value="qwen-plus">qwen-plus</option>
              <option value="qwen-max">qwen-max</option>
              <option value="qwen-long">qwen-long</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">标签</label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {draft.tags?.map(tag => (
                <span
                  key={tag}
                  className="tag cursor-pointer hover:bg-red-900/40 hover:text-red-300 hover:border-red-800/50"
                  onClick={() => handleRemoveTag(tag)}
                  title="点击移除"
                >{tag} ×</span>
              ))}
            </div>
            <input
              className="input text-xs"
              placeholder="输入标签按回车"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
            />
          </div>

          {variables.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">检测到的变量</label>
              <div className="flex flex-wrap gap-1">
                {variables.map(v => (
                  <span key={v} className="text-xs font-mono px-2 py-0.5 rounded-md bg-amber-900/40 text-amber-300 border border-amber-800/40">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-gray-800 text-xs text-gray-600 space-y-1">
            <p>创建：{new Date(prompt.createdAt).toLocaleDateString('zh-CN')}</p>
            <p>更新：{new Date(prompt.updatedAt).toLocaleDateString('zh-CN')}</p>
            <p>{prompt.history?.length || 0} 次测试记录</p>
            {prompt.notionId && (
              <a
                href={`https://www.notion.so/${prompt.notionId.replace(/-/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-indigo-500 hover:text-indigo-400 mt-1"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.7 2h14.6C20.8 2 22 3.2 22 4.7v14.6c0 1.5-1.2 2.7-2.7 2.7H4.7C3.2 22 2 20.8 2 19.3V4.7C2 3.2 3.2 2 4.7 2zm2.1 3.5c-.4.3-.6.8-.5 1.2l.1.3 5.8 7.8V18c0 .6.4 1 1 1h.1c.5 0 1-.4 1-1v-3.5l5.6-7.7.1-.3c.1-.4-.1-.9-.5-1.2-.3-.2-.7-.3-1.1-.1l-5.1 3.5-5.2-3.5c-.3-.2-.8-.2-1.1.1l-.2.2z"/>
                </svg>
                在 Notion 查看
              </a>
            )}
          </div>
        </aside>

        {/* 右侧主区 */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Tab 切换 */}
          <div className="border-b border-gray-800 px-4 flex items-center gap-0">
            {TABS.map(tab => (
              <button
                key={tab}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === '历史' && prompt.history?.length > 0 && (
                  <span className="ml-1.5 text-xs bg-gray-700 px-1.5 py-0.5 rounded-full text-gray-400">
                    {prompt.history.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 编辑 Tab */}
          {activeTab === '编辑' && (
            <div className="flex-1 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-500">System Prompt 内容</label>
                <span className="text-xs text-gray-600">使用 {`{{变量名}}`} 定义变量</span>
              </div>
              <textarea
                className="input flex-1 font-mono text-sm leading-relaxed resize-none"
                placeholder="在这里编写你的 Prompt...\n\n支持 {{变量名}} 占位符，在测试时填写具体值。\n\n示例：你是一个专业的{{role}}，请用{{language}}回答用户问题。"
                value={draft.content || ''}
                onChange={e => setField('content', e.target.value)}
              />
            </div>
          )}

          {/* 测试 Tab */}
          {activeTab === '测试' && (
            <div className="flex-1 p-4 overflow-y-auto">
              <TestPanel
                prompt={{ ...prompt, ...draft, variables }}
                onSaveHistory={handleSaveHistory}
              />
            </div>
          )}

          {/* 历史 Tab */}
          {activeTab === '历史' && (
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              <HistoryView
                history={prompt.history || []}
                onApplyPrompt={handleApplyPrompt}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
