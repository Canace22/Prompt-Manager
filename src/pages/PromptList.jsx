import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import NotionSync from '../components/NotionSync'
import { getAll, remove, exportAll, importFromFile } from '../store/promptStore'

const TAG_CLASS_MAP = {
  Workflow: 'tag tag-workflow',
  Tool: 'tag tag-tool',
  Role: 'tag tag-role',
  Technical: 'tag tag-technical',
}

function getTagClass(tag) {
  return TAG_CLASS_MAP[tag] || 'tag tag-default'
}

const VIEWS = ['All Prompts', 'By Category']

export default function PromptList({ onDataChange, onNewPrompt }) {
  const navigate = useNavigate()
  const [prompts, setPrompts] = useState([])
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [activeView, setActiveView] = useState('All Prompts')
  const importRef = useRef()

  const reload = async () => {
    const data = await getAll()
    setPrompts(data)
    onDataChange?.()
  }

  useEffect(() => { reload() }, [])

  const allTags = [...new Set(prompts.flatMap(p => p.tags || []))]

  const filtered = prompts.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    const matchTag = !filterTag || p.tags?.includes(filterTag)
    return matchSearch && matchTag
  })

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (window.confirm('确认删除此 Prompt？')) {
      await remove(id)
      reload()
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const count = await importFromFile(file)
      reload()
      alert(`成功导入 ${count} 条 Prompt`)
    } catch (err) {
      alert('导入失败：' + err.message)
    }
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--notion-surface)' }}>
      {/* ── Breadcrumb / Top bar ── */}
      <header className="flex items-center justify-between px-6 py-2.5 border-b border-notion-border shrink-0" style={{ minHeight: 44 }}>
        <div className="flex items-center gap-1.5 text-notion-sm text-notion-text-muted">
          <span>🌐 AI</span>
          <svg className="w-3 h-3 text-notion-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-notion-text-primary">⚡ Promt</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-ghost text-xs" onClick={() => importRef.current.click()}>
            导入
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button className="btn-ghost text-xs" onClick={exportAll}>
            导出
          </button>
          <NotionSync onSynced={reload} />
          <div className="w-px h-4 mx-1" style={{ background: 'var(--notion-border)' }} />
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
        {/* Page title area */}
        <div className="px-16 pt-12 pb-4">
          <h1 className="text-4xl font-bold text-notion-text-primary mb-0" style={{ fontWeight: 700 }}>Promt</h1>
        </div>

        {/* ── Database view area ── */}
        <div className="px-16 pb-8">
          {/* Database title */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">⚡</span>
            <span className="text-notion-base font-medium text-notion-text-primary">Prompt</span>
          </div>

          {/* View tabs + toolbar */}
          <div className="flex items-center justify-between border-b border-notion-border mb-0">
            <div className="flex items-center gap-0">
              {VIEWS.map(v => (
                <button
                  key={v}
                  className={`view-tab ${activeView === v ? 'active' : ''}`}
                  onClick={() => setActiveView(v)}
                >
                  {v === 'All Prompts' && (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  )}
                  {v === 'By Category' && (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                  {v}
                </button>
              ))}
              <button className="view-tab text-notion-text-faint">
                + 1 more...
              </button>
            </div>
            <div className="flex items-center gap-0.5 pb-1">
              {/* filter / sort / search / fullscreen / etc. */}
              {[
                { title: '筛选', path: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z' },
                { title: '排序', path: 'M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12' },
                { title: '搜索', path: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
              ].map(({ title, path }) => (
                <button key={title} className="btn-ghost p-1.5" title={title}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={path} />
                  </svg>
                </button>
              ))}
              <div className="mx-1 w-px h-4" style={{ background: 'var(--notion-border)' }} />
              {/* New button */}
              <div className="flex items-center">
                <button className="btn-primary rounded-r-none pr-2.5 text-xs" onClick={onNewPrompt}>
                  New
                </button>
                <button className="btn-primary rounded-l-none pl-2 pr-2 border-l border-blue-400/30 text-xs">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* ── Table ── */}
          <div>
            {/* Table header */}
            <div className="flex items-center text-xs font-medium" style={{ minHeight: 34, color: 'var(--notion-text-faint)' }}>
              <div className="flex items-center gap-1.5 px-2 py-2" style={{ width: 340 }}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h8" />
                </svg>
                Name
              </div>
              <div className="flex items-center gap-1.5 px-4 py-2" style={{ width: 180 }}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Category
                <span className="px-1 py-0.5 rounded" style={{ background: '#dbeafe', color: '#1d5fa8', fontSize: 10 }}>AI</span>
              </div>
              <div className="flex items-center gap-1.5 px-4 py-2 flex-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Description
                <span className="px-1 py-0.5 rounded" style={{ background: '#dbeafe', color: '#1d5fa8', fontSize: 10 }}>AI</span>
              </div>
              <div className="px-3 flex items-center gap-1">
                <button className="btn-ghost p-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button className="btn-ghost p-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tag filter bar */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1.5 flex-wrap" style={{ borderTop: '1px solid var(--notion-border)' }}>
                <button
                  onClick={() => setFilterTag('')}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${!filterTag ? 'text-white' : 'text-[#9b9b9b] hover:text-[#e0e0e0]'}`}
                  style={!filterTag ? { background: 'var(--notion-blue)' } : {}}
                >全部</button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(tag === filterTag ? '' : tag)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${filterTag === tag ? 'text-white' : 'text-[#9b9b9b] hover:text-[#e0e0e0]'}`}
                    style={filterTag === tag ? { background: 'var(--notion-blue)' } : {}}
                  >{tag}</button>
                ))}
                <input
                  type="text"
                  placeholder="搜索..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="ml-auto bg-transparent border-none text-xs focus:outline-none"
                  style={{ color: 'var(--notion-text-muted)' }}
                />
              </div>
            )}

            {/* Table rows */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--notion-text-faint)' }}>
                <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">{search || filterTag ? '没有匹配的 Prompt' : '还没有 Prompt，点击「New」开始'}</p>
              </div>
            ) : (
              filtered.map(p => (
                <div
                  key={p.id}
                  className="table-row-item group"
                  onClick={() => navigate(`/editor/${p.id}`)}
                >
                  {/* Name column */}
                  <div className="flex items-center gap-2 px-2 py-2 shrink-0" style={{ width: 340 }}>
                    <span className="text-sm shrink-0" style={{ color: 'var(--notion-text-faint)' }}>⚡</span>
                    <span className="text-sm truncate" style={{ color: 'var(--notion-text-primary)' }}>{p.name || '未命名'}</span>
                  </div>

                  {/* Category column */}
                  <div className="flex items-center px-4 py-2 shrink-0" style={{ width: 180 }}>
                    {p.tags?.slice(0, 1).map(tag => (
                      <span key={tag} className={getTagClass(tag)}>{tag}</span>
                    ))}
                  </div>

                  {/* Description column */}
                  <div className="flex-1 px-4 py-2 min-w-0">
                    <span className="text-sm truncate block" style={{ color: 'var(--notion-text-muted)' }}>{p.description || ''}</span>
                  </div>

                  {/* Action column */}
                  <div className="px-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="btn-danger p-1"
                      onClick={e => handleDelete(e, p.id)}
                      title="删除"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Add new row */}
            <div
              className="flex items-center gap-2 px-2 py-2 cursor-pointer transition-colors group"
              style={{ borderTop: '1px solid var(--notion-border)', color: 'var(--notion-text-faint)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--notion-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
              onClick={onNewPrompt}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs">New</span>
            </div>
          </div>

          {/* Row count */}
          <div className="mt-2 text-xs text-notion-text-faint">
            {filtered.length} 条 {filtered.length !== prompts.length && `（共 ${prompts.length}）`}
          </div>
        </div>
      </div>
    </div>
  )
}
