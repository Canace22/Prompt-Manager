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

export default function PromptEditor({ onDataChange }) {
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
    setDraft({
      name: p.name,
      description: p.description,
      content: p.content,
      tags: p.tags || [],
      model: p.model,
      varMeta: p.varMeta || {},
    })
    setSaved(true)
  }, [id, navigate])

  useEffect(() => { reload() }, [reload])

  const setField = (field, value) => {
    setDraft(d => ({ ...d, [field]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    await update(id, draft)
    setSaved(true)
    onDataChange?.()
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
      if (!draft.tags.includes(tag)) setField('tags', [...draft.tags, tag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag) => {
    setField('tags', draft.tags.filter(t => t !== tag))
  }

  useEffect(() => {
    if (saved) return
    const t = setTimeout(() => { handleSave() }, 2000)
    return () => clearTimeout(t)
  }, [draft, saved])

  if (!prompt) return null

  const variables = (() => {
    const content = draft.content || ''
    const pattern = /\{\{(\w+)\}\}|\$\{(\w+)\}/g
    const names = []
    let m
    while ((m = pattern.exec(content)) !== null) names.push(m[1] ?? m[2])
    return [...new Set(names)]
  })()

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--notion-surface)' }}>
      {/* ── Breadcrumb bar ── */}
      <header className="flex items-center justify-between px-6 py-2.5 border-b border-notion-border shrink-0" style={{ minHeight: 44 }}>
        <div className="flex items-center gap-1.5 text-notion-sm text-notion-text-muted">
          <button
            className="sidebar-item px-1.5 py-0.5"
            onClick={() => navigate('/')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span>⚡ Prompt</span>
          <svg className="w-3 h-3 text-notion-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-notion-text-primary truncate max-w-48">{prompt.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {pushMsg && (
            <span className={`text-xs px-2 ${pushMsg.includes('失败') ? 'text-red-400' : 'text-green-400'}`}>
              {pushMsg}
            </span>
          )}
          <span className={`text-xs px-2 ${saved ? 'text-notion-text-faint' : 'text-amber-400'}`}>
            {saved ? 'Saved' : 'Editing...'}
          </span>
          <button
            className="btn-ghost text-xs"
            onClick={handlePushToNotion}
            disabled={pushing}
          >
            {pushing ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : '↑ Notion'}
          </button>
          <button className="btn-ghost" title="收藏">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <button className="btn-ghost" title="更多">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Page content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Title area */}
        <div className="px-16 pt-12 pb-2">
          <input
            className="w-full bg-transparent text-4xl font-bold text-notion-text-primary focus:outline-none placeholder-notion-text-faint"
            style={{ fontWeight: 700 }}
            value={draft.name || ''}
            onChange={e => setField('name', e.target.value)}
            placeholder="Untitled"
          />
        </div>

        {/* Properties block */}
        <div className="px-16 py-4 border-b border-notion-border space-y-2">
          {/* Description property */}
          <div className="flex items-start gap-6">
            <span className="text-notion-sm text-notion-text-faint w-28 shrink-0 pt-0.5">描述</span>
            <input
              className="flex-1 bg-transparent text-notion-sm text-notion-text-primary focus:outline-none placeholder-notion-text-faint"
              placeholder="Add a description..."
              value={draft.description || ''}
              onChange={e => setField('description', e.target.value)}
            />
          </div>

          {/* Model property */}
          <div className="flex items-center gap-6">
            <span className="text-notion-sm text-notion-text-faint w-28 shrink-0">模型</span>
            <select
              className="bg-transparent text-notion-sm text-notion-text-primary focus:outline-none cursor-pointer"
              value={draft.model || 'qwen-turbo'}
              onChange={e => setField('model', e.target.value)}
            >
              <option value="qwen-turbo">qwen-turbo</option>
              <option value="qwen-plus">qwen-plus</option>
              <option value="qwen-max">qwen-max</option>
              <option value="qwen-long">qwen-long</option>
            </select>
          </div>

          {/* Tags property */}
          <div className="flex items-start gap-6">
            <span className="text-notion-sm text-notion-text-faint w-28 shrink-0 pt-1">标签</span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {draft.tags?.map(tag => (
                <span
                  key={tag}
                  className="tag tag-default cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={() => handleRemoveTag(tag)}
                  title="点击移除"
                >{tag} ×</span>
              ))}
              <input
                className="bg-transparent text-notion-sm text-notion-text-muted focus:outline-none placeholder-notion-text-faint min-w-16"
                placeholder="+ 添加标签"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
              />
            </div>
          </div>

          {/* Variables property */}
          {variables.length > 0 && (
            <div className="flex items-start gap-6">
              <span className="text-notion-sm text-notion-text-faint w-28 shrink-0 pt-1">变量</span>
              <div className="flex flex-wrap gap-1.5">
                {variables.map(v => {
                  const isImage = draft.varMeta?.[v]?.type === 'image'
                  return (
                    <button
                      key={v}
                      className={`text-xs px-2 py-0.5 rounded-md font-mono border transition-colors ${isImage ? 'border-blue-300 text-blue-700' : 'border-amber-300 text-amber-700'}`}
                      style={{ background: isImage ? '#dbeafe' : '#fef3c7' }}
                      onClick={() => {
                        const next = { ...(draft.varMeta || {}) }
                        next[v] = { type: isImage ? 'text' : 'image' }
                        setField('varMeta', next)
                      }}
                      title={isImage ? '切换为文本' : '切换为图片'}
                    >
                      {`{{${v}}}`} {isImage ? '🖼' : 'T'}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notion sync status */}
          <div className="flex items-center gap-6">
            <span className="text-notion-sm text-notion-text-faint w-28 shrink-0">Notion</span>
            {prompt.notionId ? (
              <a
                href={`https://www.notion.so/${prompt.notionId.replace(/-/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-notion-sm text-notion-blue-text hover:underline flex items-center gap-1"
                onClick={e => e.stopPropagation()}
              >
                在 Notion 查看 ↗
              </a>
            ) : (
              <span className="text-notion-sm text-notion-text-faint">未同步</span>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-6">
            <span className="text-notion-sm text-notion-text-faint w-28 shrink-0">记录</span>
            <span className="text-notion-sm text-notion-text-faint">
              创建 {new Date(prompt.createdAt).toLocaleDateString('zh-CN')} · 更新 {new Date(prompt.updatedAt).toLocaleDateString('zh-CN')} · {prompt.history?.length || 0} 次测试
            </span>
          </div>
        </div>

        {/* ── Tab area ── */}
        <div className="px-16">
          <div className="flex items-center gap-0 border-b border-notion-border mt-4">
            {TABS.map(tab => (
              <button
                key={tab}
                className={`view-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === '历史' && (prompt.history?.length || 0) > 0 && (
                  <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--notion-hover)', color: 'var(--notion-text-faint)' }}>
                    {prompt.history.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Editor */}
          {activeTab === '编辑' && (
            <div className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-notion-text-faint">Prompt 内容 · 使用 {`{{变量名}}`} 定义变量</span>
                <div className="flex items-center gap-2">
                  <button className="btn-primary text-xs" onClick={handleSave}>
                    {saved ? '已保存' : '保存'}
                  </button>
                  <button className="btn-danger text-xs" onClick={handleDelete}>删除</button>
                </div>
              </div>
              <textarea
                className="input font-mono text-sm leading-relaxed resize-none"
                style={{ minHeight: 360 }}
                placeholder={'在这里编写你的 Prompt...\n\n支持 {{变量名}} 占位符，在测试时填写具体值。\n\n示例：你是一个专业的{{role}}，请用{{language}}回答用户问题。'}
                value={draft.content || ''}
                onChange={e => setField('content', e.target.value)}
              />
            </div>
          )}

          {activeTab === '测试' && (
            <div className="py-4 overflow-y-auto">
              <TestPanel
                prompt={{ ...prompt, ...draft, variables, varMeta: draft.varMeta || {} }}
                onSaveHistory={handleSaveHistory}
              />
            </div>
          )}

          {activeTab === '历史' && (
            <div className="py-4 overflow-hidden flex flex-col">
              <HistoryView
                history={prompt.history || []}
                onApplyPrompt={handleApplyPrompt}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
