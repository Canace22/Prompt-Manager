import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PromptCard from '../components/PromptCard'
import NotionSync from '../components/NotionSync'
import { getAll, create, remove, exportAll, importFromFile } from '../store/promptStore'

export default function PromptList() {
  const navigate = useNavigate()
  const [prompts, setPrompts] = useState([])
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const importRef = useRef()

  const reload = async () => {
    const data = await getAll()
    setPrompts(data)
  }

  useEffect(() => { reload() }, [])

  const allTags = [...new Set(prompts.flatMap(p => p.tags || []))]

  const filtered = prompts.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    const matchTag = !filterTag || p.tags?.includes(filterTag)
    return matchSearch && matchTag
  })

  const handleCreate = async () => {
    const p = await create({ name: '新 Prompt' })
    navigate(`/editor/${p.id}`)
  }

  const handleDelete = async (id) => {
    await remove(id)
    reload()
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
    <div className="min-h-screen flex flex-col">
      {/* 顶栏 */}
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-indigo-400">⚡ Prompt</span>
          <span className="text-gray-600 text-sm hidden sm:block">管理工具</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="搜索 Prompt..."
            className="input w-48 sm:w-64"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-ghost" onClick={() => importRef.current.click()} title="导入 JSON">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="hidden sm:inline">导入</span>
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button className="btn-ghost" onClick={exportAll} title="导出 JSON">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">导出</span>
          </button>
          <NotionSync onSynced={reload} />
          <button className="btn-primary" onClick={handleCreate}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建
          </button>
        </div>
      </header>

      {/* 标签筛选 */}
      {allTags.length > 0 && (
        <div className="px-6 pt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-600">标签：</span>
          <button
            className={`text-xs px-2 py-0.5 rounded-md border transition-colors ${!filterTag ? 'bg-indigo-700 border-indigo-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-indigo-700'}`}
            onClick={() => setFilterTag('')}
          >全部</button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-md border transition-colors ${filterTag === tag ? 'bg-indigo-700 border-indigo-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-indigo-700'}`}
              onClick={() => setFilterTag(tag === filterTag ? '' : tag)}
            >{tag}</button>
          ))}
        </div>
      )}

      {/* 列表 */}
      <main className="flex-1 px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-600">
            <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">{search || filterTag ? '没有匹配的 Prompt' : '还没有 Prompt，点击「新建」开始'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(p => (
              <PromptCard key={p.id} prompt={p} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      {/* 底部统计 */}
      <footer className="px-6 py-2 border-t border-gray-800 text-xs text-gray-600 flex items-center justify-between">
        <span>{filtered.length} / {prompts.length} 条 Prompt</span>
        <span>数据存储在本地 prompts.json 文件</span>
      </footer>
    </div>
  )
}
