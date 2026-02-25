import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button } from 'antd'
import { PlusOutlined, ThunderboltOutlined, SettingOutlined } from '@ant-design/icons'
import PromptList from './pages/PromptList'
import PromptEditor from './pages/PromptEditor'
import Settings from './pages/Settings'
import NotionSync from './components/NotionSync'
import { getAll, create } from './store/promptStore'

const { Sider, Content } = Layout

const CATEGORY_ORDER = ['Workflow', 'Tool', 'Role', 'Technical']

function groupByCategory(prompts) {
  const groups = {}
  prompts.forEach(p => {
    const category = p.tags?.[0] || '其他'
    if (!groups[category]) groups[category] = []
    groups[category].push(p)
  })
  // Sort groups by predefined order, then alphabetically for the rest
  return Object.entries(groups).sort(([a], [b]) => {
    const ai = CATEGORY_ORDER.indexOf(a)
    const bi = CATEGORY_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

const PREVIEW_COUNT = 3

function Sidebar({ prompts, onNewPrompt, onRefresh }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [expanded, setExpanded] = useState({})

  const selectedId = location.pathname === '/'
    ? null
    : prompts.find(p => location.pathname === `/editor/${p.id}`)?.id || null

  const grouped = groupByCategory(prompts)

  const toggleExpand = (category) =>
    setExpanded(prev => ({ ...prev, [category]: !prev[category] }))

  return (
    <Sider width={240} className="app-sider">
      <div className="sider-header">
        <div className="sider-logo">P</div>
        <span className="sider-title">Promt Manager</span>
        <NotionSync onSynced={onRefresh} iconOnly />
      </div>

      <div className="sider-nav" style={{ overflowY: 'auto', flex: 1 }}>
        {/* Top-level Prompt entry */}
        <div
          className={`sider-item${location.pathname === '/' ? ' active' : ''}`}
          onClick={() => navigate('/')}
        >
          <ThunderboltOutlined style={{ fontSize: 13 }} />
          <span>Prompt</span>
        </div>

        {/* Grouped categories */}
        {grouped.map(([category, items]) => {
          const isExpanded = expanded[category]
          const visible = isExpanded ? items : items.slice(0, PREVIEW_COUNT)
          const hasMore = items.length > PREVIEW_COUNT

          return (
            <div key={category}>
              {/* Category label */}
              <div className="sider-category-label">{category}</div>

              {/* Prompt rows */}
              {visible.map(p => (
                <div
                  key={p.id}
                  className={`sider-item sider-item-child${selectedId === p.id ? ' active' : ''}`}
                  onClick={() => navigate(`/editor/${p.id}`)}
                >
                  <span className="sider-item-arrow">↳</span>
                  <span className="sider-item-name">{p.name || '未命名'}</span>
                </div>
              ))}

              {/* More / Less toggle */}
              {hasMore && (
                <div
                  className="sider-item sider-item-more"
                  onClick={() => toggleExpand(category)}
                >
                  {isExpanded ? '收起' : `more (${items.length - PREVIEW_COUNT})`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="sider-footer">
        <div
          className={`sider-item${location.pathname === '/settings' ? ' active' : ''}`}
          onClick={() => navigate('/settings')}
        >
          <SettingOutlined style={{ fontSize: 13 }} />
          <span>Settings</span>
        </div>
        <Button
          type="text"
          icon={<PlusOutlined />}
          onClick={onNewPrompt}
          block
          style={{ textAlign: 'left', color: 'var(--notion-text-faint)', justifyContent: 'flex-start' }}
        >
          New page
        </Button>
      </div>
    </Sider>
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
    <Layout style={{ height: '100vh' }}>
      <Sidebar prompts={prompts} onNewPrompt={handleNewPrompt} onRefresh={refreshPrompts} />
      <Content className="app-content">
        <Routes>
          <Route path="/" element={<PromptList onDataChange={refreshPrompts} onNewPrompt={handleNewPrompt} />} />
          <Route path="/editor/:id" element={<PromptEditor onDataChange={refreshPrompts} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Content>
    </Layout>
  )
}
