import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Tag, Popconfirm, Typography, Space } from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined,
  SearchOutlined,
  ImportOutlined,
  ExportOutlined,
  StarOutlined,
  EllipsisOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  TableOutlined,
} from '@ant-design/icons'
import { getAll, remove, exportAll, importFromFile } from '../store/promptStore'

const { Text } = Typography

const VIEWS = [
  { key: 'Table', icon: <TableOutlined /> },
  { key: 'List', icon: <UnorderedListOutlined /> },
]

const TAG_COLOR_MAP = {
  Workflow: 'red',
  Tool: 'green',
  Role: 'default',
  Technical: 'blue',
}

function getTagColor(tag) {
  return TAG_COLOR_MAP[tag] || 'default'
}


export default function PromptList({ onDataChange, onNewPrompt }) {
  const navigate = useNavigate()
  const [prompts, setPrompts] = useState([])
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [activeView, setActiveView] = useState('Table')
  const [showSearch, setShowSearch] = useState(false)
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--notion-surface)' }}>
      {/* ── Header ── */}
      <header className="page-header">
        <div className="breadcrumb">
          <span style={{ color: 'var(--notion-text-primary)' }}>⚡ Promt</span>
        </div>
        <div className="header-actions">
          <Button
            type="text"
            size="small"
            icon={<ImportOutlined />}
            onClick={() => importRef.current.click()}
            style={{ color: 'var(--notion-text-muted)', fontSize: 12 }}
          >导入</Button>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <Button
            type="text"
            size="small"
            icon={<ExportOutlined />}
            onClick={exportAll}
            style={{ color: 'var(--notion-text-muted)', fontSize: 12 }}
          >导出</Button>
          <div style={{ width: 1, height: 16, background: 'var(--notion-border)', margin: '0 4px' }} />
          <Button type="text" size="small" icon={<StarOutlined />} style={{ color: 'var(--notion-text-muted)' }} />
          <Button type="text" size="small" icon={<EllipsisOutlined />} style={{ color: 'var(--notion-text-muted)' }} />
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '15px 64px 32px' }}>
          {/* View toolbar */}
          <div className="view-toolbar">
            <div className="view-tabs">
              {/* Category filter tabs inline */}
              {allTags.length > 0 && (
                <>
                  {/* <div style={{ width: 1, height: 16, background: 'var(--notion-border)', margin: '0 4px' }} /> */}
                  <button
                    className={`view-tab-btn ${!filterTag ? 'active' : ''}`}
                    onClick={() => setFilterTag('')}
                  >全部</button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      className={`view-tab-btn ${filterTag === tag ? 'active' : ''}`}
                      onClick={() => setFilterTag(tag === filterTag ? '' : tag)}
                    >{tag}</button>
                  ))}
                </>
              )}
            </div>
            <div className="toolbar-actions">
              <Button.Group size="small">
                <Button type="primary" onClick={onNewPrompt} style={{ fontSize: 12 }}>New</Button>
                <Button type="primary" icon={<PlusOutlined style={{ fontSize: 10 }} />} style={{ padding: '0 6px' }} />
              </Button.Group>
            </div>
          </div>

          {/* Table header */}
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--notion-text-faint)', minHeight: 34, fontWeight: 500 }}>
            <div style={{ width: 340, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <UnorderedListOutlined style={{ fontSize: 11 }} /> Name
            </div>
            <div style={{ width: 180, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              Category
            </div>
            <div style={{ flex: 1, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              Description
            </div>
            <div style={{ padding: '0 12px', display: 'flex', gap: 4 }}>
              <Button type="text" size="small" icon={<PlusOutlined />} style={{ padding: '0 4px' }} />
              <Button type="text" size="small" icon={<EllipsisOutlined />} style={{ padding: '0 4px' }} />
            </div>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: 'var(--notion-text-faint)' }}>
              <svg style={{ width: 40, height: 40, marginBottom: 12, opacity: 0.2 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <Text style={{ fontSize: 13, color: 'var(--notion-text-faint)' }}>
                {search || filterTag ? '没有匹配的 Prompt' : '还没有 Prompt，点击「New」开始'}
              </Text>
            </div>
          ) : (
            filtered.map(p => (
              <PromptRow
                key={p.id}
                prompt={p}
                onClick={() => navigate(`/editor/${p.id}`)}
                onDelete={() => handleDelete(p.id)}
              />
            ))
          )}

          {/* Add row */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
              cursor: 'pointer', borderTop: '1px solid var(--notion-border)',
              color: 'var(--notion-text-faint)', fontSize: 12,
            }}
            onClick={onNewPrompt}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--notion-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            <PlusOutlined style={{ fontSize: 11 }} />
            <span>New</span>
          </div>

          {/* Count */}
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--notion-text-faint)' }}>
            {filtered.length} 条{filtered.length !== prompts.length && `（共 ${prompts.length}）`}
          </div>
        </div>
      </div>
    </div>
  )
}

function PromptRow({ prompt: p, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', cursor: 'pointer', minHeight: 36,
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        background: hovered ? 'var(--notion-hover)' : 'transparent',
        transition: 'background 0.1s',
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Name */}
      <div style={{ width: 340, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
        <ThunderboltOutlined style={{ fontSize: 12, color: 'var(--notion-text-faint)', flexShrink: 0 }} />
        <Text style={{ fontSize: 13, color: 'var(--notion-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.name || '未命名'}
        </Text>
      </div>

      {/* Category */}
      <div style={{ width: 180, padding: '6px 16px' }}>
        <Space size={4} wrap>
          {p.tags?.slice(0, 1).map(tag => (
            <Tag key={tag} color={getTagColor(tag)} style={{ margin: 0, fontSize: 12 }}>{tag}</Tag>
          ))}
        </Space>
      </div>

      {/* Description */}
      <div style={{ flex: 1, padding: '6px 16px', overflow: 'hidden' }}>
        <Text style={{ fontSize: 13, color: 'var(--notion-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {p.description || ''}
        </Text>
      </div>

      {/* Actions */}
      <div className="row-actions" style={{ padding: '0 12px', opacity: hovered ? 1 : 0, transition: 'opacity 0.1s' }}>
        <Popconfirm
          title="确认删除此 Prompt？"
          onConfirm={e => { e.stopPropagation(); onDelete() }}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={e => e.stopPropagation()}
            style={{ padding: '0 4px' }}
          />
        </Popconfirm>
      </div>
    </div>
  )
}
