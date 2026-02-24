import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button, Input, Select, Tag, Tabs, Typography, Space, Popconfirm, Tooltip,
} from 'antd'
import {
  LeftOutlined, StarOutlined, EllipsisOutlined, DeleteOutlined,
  LoadingOutlined, ThunderboltOutlined, RightOutlined,
} from '@ant-design/icons'
import { getById, update, addHistory, remove } from '../store/promptStore'
import TestPanel from '../components/TestPanel'
import HistoryView from '../components/HistoryView'

const { Text } = Typography
const { TextArea } = Input

const pushToNotion = async (id) => {
  const r = await fetch('/api/notion/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  return r.json()
}

const MODEL_OPTIONS = [
  { value: 'qwen-turbo', label: 'qwen-turbo' },
  { value: 'qwen-plus', label: 'qwen-plus' },
  { value: 'qwen-max', label: 'qwen-max' },
  { value: 'qwen-long', label: 'qwen-long' },
]

export default function PromptEditor({ onDataChange }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState(null)
  const [activeTab, setActiveTab] = useState('edit')
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
    await remove(id)
    navigate('/')
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
    setActiveTab('edit')
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

  const tabItems = [
    {
      key: 'edit',
      label: '编辑',
      children: (
        <div style={{ paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: 'var(--notion-text-faint)' }}>
              Prompt 内容 · 使用 {`{{变量名}}`} 定义变量
            </Text>
            <Space size={8}>
              <Button size="small" type="primary" onClick={handleSave}>
                {saved ? '已保存' : '保存'}
              </Button>
              <Popconfirm
                title={`确认删除「${prompt.name}」？`}
                onConfirm={handleDelete}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          </div>
          <TextArea
            style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, minHeight: 360 }}
            placeholder={'在这里编写你的 Prompt...\n\n支持 {{变量名}} 占位符，在测试时填写具体值。\n\n示例：你是一个专业的{{role}}，请用{{language}}回答用户问题。'}
            value={draft.content || ''}
            onChange={e => setField('content', e.target.value)}
            autoSize={{ minRows: 14 }}
          />
        </div>
      ),
    },
    {
      key: 'test',
      label: '测试',
      children: (
        <div style={{ paddingTop: 16 }}>
          <TestPanel
            prompt={{ ...prompt, ...draft, variables, varMeta: draft.varMeta || {} }}
            onSaveHistory={handleSaveHistory}
          />
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          历史
          {(prompt.history?.length || 0) > 0 && (
            <Tag style={{ marginLeft: 4, fontSize: 10 }}>{prompt.history.length}</Tag>
          )}
        </span>
      ),
      children: (
        <div style={{ paddingTop: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <HistoryView
            history={prompt.history || []}
            onApplyPrompt={handleApplyPrompt}
          />
        </div>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--notion-surface)' }}>
      {/* Header */}
      <header className="page-header">
        <div className="breadcrumb">
          <Button
            type="text"
            size="small"
            icon={<LeftOutlined />}
            onClick={() => navigate('/')}
            style={{ color: 'var(--notion-text-muted)', padding: '0 4px' }}
          />
          <span>
            <ThunderboltOutlined style={{ marginRight: 4 }} />
            Prompt
          </span>
          <RightOutlined style={{ fontSize: 11, color: 'var(--notion-text-faint)' }} />
          <Text style={{ fontSize: 13, color: 'var(--notion-text-primary)', maxWidth: 192, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {prompt.name}
          </Text>
        </div>
        <div className="header-actions">
          {pushMsg && (
            <span className={`push-msg ${pushMsg.includes('失败') ? 'error' : 'success'}`}>{pushMsg}</span>
          )}
          <span className={`save-badge ${saved ? 'saved' : 'unsaved'}`}>
            {saved ? 'Saved' : 'Editing...'}
          </span>
          <Button
            type="text"
            size="small"
            onClick={handlePushToNotion}
            disabled={pushing}
            icon={pushing ? <LoadingOutlined /> : null}
            style={{ color: 'var(--notion-text-muted)', fontSize: 12 }}
          >
            {!pushing && '↑ Notion'}
          </Button>
          <Button type="text" size="small" icon={<StarOutlined />} style={{ color: 'var(--notion-text-muted)' }} />
          <Button type="text" size="small" icon={<EllipsisOutlined />} style={{ color: 'var(--notion-text-muted)' }} />
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Title */}
        <div style={{ padding: '48px 64px 8px' }}>
          <Input
            variant="borderless"
            style={{ fontSize: 36, fontWeight: 700, color: 'var(--notion-text-primary)', padding: 0 }}
            value={draft.name || ''}
            onChange={e => setField('name', e.target.value)}
            placeholder="Untitled"
          />
        </div>

        {/* Properties */}
        <div style={{ padding: '0 64px' }} className="editor-properties">
          {/* Description */}
          <div className="property-row">
            <span className="property-label">描述</span>
            <div className="property-value">
              <Input
                variant="borderless"
                style={{ fontSize: 13, color: 'var(--notion-text-primary)', padding: 0 }}
                placeholder="Add a description..."
                value={draft.description || ''}
                onChange={e => setField('description', e.target.value)}
              />
            </div>
          </div>

          {/* Model */}
          <div className="property-row">
            <span className="property-label">模型</span>
            <div className="property-value">
              <Select
                variant="borderless"
                style={{ fontSize: 13, minWidth: 140 }}
                value={draft.model || 'qwen-turbo'}
                onChange={v => setField('model', v)}
                options={MODEL_OPTIONS}
                size="small"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="property-row">
            <span className="property-label" style={{ paddingTop: 4 }}>标签</span>
            <div className="property-value">
              <Space size={6} wrap>
                {draft.tags?.map(tag => (
                  <Tag
                    key={tag}
                    closable
                    onClose={() => handleRemoveTag(tag)}
                    style={{ cursor: 'default' }}
                  >{tag}</Tag>
                ))}
                <Input
                  size="small"
                  variant="borderless"
                  style={{ fontSize: 13, color: 'var(--notion-text-muted)', width: 80, padding: 0 }}
                  placeholder="+ 添加标签"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                />
              </Space>
            </div>
          </div>

          {/* Variables */}
          {variables.length > 0 && (
            <div className="property-row">
              <span className="property-label" style={{ paddingTop: 4 }}>变量</span>
              <div className="property-value">
                <Space size={6} wrap>
                  {variables.map(v => {
                    const isImage = draft.varMeta?.[v]?.type === 'image'
                    return (
                      <Tooltip key={v} title={isImage ? '切换为文本' : '切换为图片'}>
                        <Tag
                          color={isImage ? 'blue' : 'gold'}
                          style={{ cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}
                          onClick={() => {
                            const next = { ...(draft.varMeta || {}) }
                            next[v] = { type: isImage ? 'text' : 'image' }
                            setField('varMeta', next)
                          }}
                        >
                          {`{{${v}}}`} {isImage ? '🖼' : 'T'}
                        </Tag>
                      </Tooltip>
                    )
                  })}
                </Space>
              </div>
            </div>
          )}

          {/* Notion */}
          <div className="property-row">
            <span className="property-label">Notion</span>
            <div className="property-value">
              {prompt.notionId ? (
                <a
                  href={`https://www.notion.so/${prompt.notionId.replace(/-/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13, color: 'var(--notion-blue)' }}
                  onClick={e => e.stopPropagation()}
                >
                  在 Notion 查看 ↗
                </a>
              ) : (
                <Text style={{ fontSize: 13, color: 'var(--notion-text-faint)' }}>未同步</Text>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="property-row">
            <span className="property-label">记录</span>
            <div className="property-value">
              <Text style={{ fontSize: 13, color: 'var(--notion-text-faint)' }}>
                创建 {new Date(prompt.createdAt).toLocaleDateString('zh-CN')} · 更新 {new Date(prompt.updatedAt).toLocaleDateString('zh-CN')} · {prompt.history?.length || 0} 次测试
              </Text>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 64px' }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="small"
            style={{ marginTop: 8 }}
          />
        </div>
      </div>
    </div>
  )
}
