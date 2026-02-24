import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button } from 'antd'
import { PlusOutlined, ThunderboltOutlined, SearchOutlined } from '@ant-design/icons'
import PromptList from './pages/PromptList'
import PromptEditor from './pages/PromptEditor'
import { getAll, create } from './store/promptStore'

const { Sider, Content } = Layout

function Sidebar({ prompts, onNewPrompt }) {
  const navigate = useNavigate()
  const location = useLocation()

  const selectedKey = location.pathname === '/'
    ? 'main'
    : prompts.find(p => location.pathname === `/editor/${p.id}`)?.id || 'main'

  const menuItems = [
    {
      key: 'main',
      icon: <ThunderboltOutlined />,
      label: 'Prompt',
      onClick: () => navigate('/'),
    },
    ...prompts.slice(0, 8).map(p => ({
      key: p.id,
      label: (
        <span style={{ paddingLeft: 8, fontSize: 12 }}>
          ↳ {p.name || '未命名'}
        </span>
      ),
      onClick: () => navigate(`/editor/${p.id}`),
      style: { paddingLeft: 24 },
    })),
  ]

  return (
    <Sider width={240} className="app-sider">
      <div className="sider-header">
        <div className="sider-logo">P</div>
        <span className="sider-title">Promt Manager</span>
      </div>

      <Menu
        className="sider-nav"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
      />

      <div className="sider-footer">
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
      <Sidebar prompts={prompts} onNewPrompt={handleNewPrompt} />
      <Content className="app-content">
        <Routes>
          <Route path="/" element={<PromptList onDataChange={refreshPrompts} onNewPrompt={handleNewPrompt} />} />
          <Route path="/editor/:id" element={<PromptEditor onDataChange={refreshPrompts} />} />
        </Routes>
      </Content>
    </Layout>
  )
}
