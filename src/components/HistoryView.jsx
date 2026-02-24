import React, { useState } from 'react'
import { Button, Tag, Typography, Space, Empty } from 'antd'
import { RollbackOutlined, CopyOutlined, ClockCircleOutlined } from '@ant-design/icons'

const { Text } = Typography

const fmt = (iso) => {
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HistoryView({ history = [], onApplyPrompt }) {
  const [selected, setSelected] = useState(null)

  if (history.length === 0) {
    return (
      <Empty
        image={<ClockCircleOutlined style={{ fontSize: 32, color: 'var(--notion-text-faint)' }} />}
        description={<Text style={{ fontSize: 13, color: 'var(--notion-text-faint)' }}>还没有测试记录</Text>}
        style={{ padding: '48px 0' }}
      />
    )
  }

  const entry = selected !== null ? history[selected] : null

  return (
    <div className="history-view">
      {/* List */}
      <div className="history-list">
        {history.map((h, i) => (
          <button
            key={h.id || i}
            className={`history-item ${selected === i ? 'active' : ''}`}
            onClick={() => setSelected(i)}
          >
            <div className="history-model">{h.model}</div>
            <div className="history-time">{fmt(h.time)}</div>
            {h.elapsed && <div className="history-time">{h.elapsed}s</div>}
          </button>
        ))}
      </div>

      {/* Detail */}
      <div className="history-detail">
        {!entry ? (
          <Text style={{ fontSize: 12, color: 'var(--notion-text-faint)', display: 'block', paddingTop: 16 }}>
            ← 选择一条记录查看详情
          </Text>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: 'var(--notion-text-muted)' }}>
                {fmt(entry.time)} · {entry.model}
              </Text>
              {onApplyPrompt && entry.systemPrompt && (
                <Button
                  type="text"
                  size="small"
                  icon={<RollbackOutlined />}
                  onClick={() => onApplyPrompt(entry.systemPrompt)}
                  style={{ fontSize: 12, color: 'var(--notion-text-muted)' }}
                >
                  还原此 Prompt
                </Button>
              )}
            </div>

            {/* Variables */}
            {entry.variables && Object.keys(entry.variables).length > 0 && (
              <div>
                <Text style={{ fontSize: 12, color: 'var(--notion-text-muted)', display: 'block', marginBottom: 4 }}>变量</Text>
                <Space size={6} wrap>
                  {Object.entries(entry.variables).map(([k, v]) => (
                    <Tag key={k} style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      <span style={{ color: '#b45309' }}>{k}</span>
                      <span style={{ color: 'var(--notion-text-faint)' }}> = </span>
                      <span>{v || '(空)'}</span>
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {/* System Prompt */}
            <div>
              <Text style={{ fontSize: 12, color: 'var(--notion-text-muted)', display: 'block', marginBottom: 4 }}>System Prompt</Text>
              <pre className="history-pre" style={{ maxHeight: 160 }}>
                {entry.systemPrompt || entry.prompt || '(空)'}
              </pre>
            </div>

            {/* User input */}
            {entry.userInput && (
              <div>
                <Text style={{ fontSize: 12, color: 'var(--notion-text-muted)', display: 'block', marginBottom: 4 }}>用户消息</Text>
                <pre className="history-pre" style={{ maxHeight: 96, color: '#1d5fa8' }}>
                  {entry.userInput}
                </pre>
              </div>
            )}

            {/* Output */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: 'var(--notion-text-muted)' }}>模型输出</Text>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => navigator.clipboard.writeText(entry.output)}
                  style={{ fontSize: 12, color: 'var(--notion-text-faint)' }}
                >复制</Button>
              </div>
              <pre className="history-pre" style={{ maxHeight: 240, color: 'var(--notion-text-primary)' }}>
                {entry.output || '(无输出)'}
              </pre>
            </div>
          </Space>
        )}
      </div>
    </div>
  )
}
