import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import PromptList from './pages/PromptList'
import PromptEditor from './pages/PromptEditor'
import { getAll, create } from './store/promptStore'

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { icon: '🔍', label: 'Search', path: null, action: 'search' },
      { icon: '🏠', label: 'Home', path: '/' },
    ],
  },
  {
    label: 'Private',
    items: [
      { icon: '⚡', label: 'Prompt', path: '/', isMain: true },
    ],
  },
]

function Sidebar({ prompts, onNewPrompt }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <aside
      className="shrink-0 flex flex-col overflow-hidden"
      style={{ width: 240, background: 'var(--notion-sidebar)' }}
    >
      {/* Workspace header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-notion-border">
        <div className="w-5 h-5 rounded bg-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
          P
        </div>
        <span className="text-notion-sm font-medium text-notion-text-primary truncate flex-1">Promt</span>
        <svg className="w-4 h-4 text-notion-text-faint shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <button className="sidebar-item w-full">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
        </button>

        {/* Main Prompt page link */}
        <button
          className={`sidebar-item w-full ${location.pathname === '/' ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <span className="text-base shrink-0">⚡</span>
          <span className="truncate flex-1 text-left">Prompt</span>
        </button>

        {/* Recent prompts */}
        {prompts.slice(0, 8).map(p => (
          <button
            key={p.id}
            className={`sidebar-item w-full pl-6 ${location.pathname === `/editor/${p.id}` ? 'active' : ''}`}
            onClick={() => navigate(`/editor/${p.id}`)}
          >
            <span className="text-notion-text-faint shrink-0">↳</span>
            <span className="truncate flex-1 text-left text-xs">{p.name || '未命名'}</span>
          </button>
        ))}
      </nav>

      {/* New button at bottom */}
      <div className="px-2 py-2 border-t border-notion-border">
        <button
          className="sidebar-item w-full text-notion-text-faint hover:text-notion-text-primary"
          onClick={onNewPrompt}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          New page
        </button>
      </div>
    </aside>
  )
}

export default function App() {
  const navigate = useNavigate()
  const [prompts, setPrompts] = useState([])

  useEffect(() => {
    getAll().then(setPrompts)
  }, [])

  const handleNewPrompt = async () => {
    const p = await create({ name: '新 Prompt' })
    const data = await getAll()
    setPrompts(data)
    navigate(`/editor/${p.id}`)
  }

  const refreshPrompts = async () => {
    const data = await getAll()
    setPrompts(data)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--notion-bg)' }}>
      <Sidebar prompts={prompts} onNewPrompt={handleNewPrompt} />
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        <Routes>
          <Route path="/" element={<PromptList onDataChange={refreshPrompts} onNewPrompt={handleNewPrompt} />} />
          <Route path="/editor/:id" element={<PromptEditor onDataChange={refreshPrompts} />} />
        </Routes>
      </div>
    </div>
  )
}
