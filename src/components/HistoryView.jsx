import React, { useState } from 'react'

const fmt = (iso) => {
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const preStyle = {
  padding: '12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontFamily: 'monospace',
  whiteSpace: 'pre-wrap',
  overflow: 'auto',
  background: 'var(--notion-hover)',
  border: '1px solid var(--notion-border)',
  color: 'var(--notion-text-muted)',
}

export default function HistoryView({ history = [], onApplyPrompt }) {
  const [selected, setSelected] = useState(null)

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--notion-text-faint)' }}>
        <svg className="w-8 h-8 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">还没有测试记录</p>
      </div>
    )
  }

  const entry = selected !== null ? history[selected] : null

  return (
    <div className="flex gap-3 h-full min-h-0">
      {/* 历史列表 */}
      <div className="w-40 shrink-0 space-y-0.5 overflow-y-auto">
        {history.map((h, i) => (
          <button
            key={h.id || i}
            className="w-full text-left px-2.5 py-2 rounded-lg transition-colors text-xs"
            style={{
              background: selected === i ? 'var(--notion-hover)' : 'transparent',
              border: selected === i ? '1px solid var(--notion-border)' : '1px solid transparent',
              color: 'var(--notion-text-primary)',
            }}
            onClick={() => setSelected(i)}
          >
            <div className="truncate font-mono" style={{ color: 'var(--notion-text-muted)' }}>{h.model}</div>
            <div className="mt-0.5" style={{ color: 'var(--notion-text-faint)' }}>{fmt(h.time)}</div>
            {h.elapsed && <div style={{ color: 'var(--notion-text-faint)' }}>{h.elapsed}s</div>}
          </button>
        ))}
      </div>

      {/* 详情 */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!entry ? (
          <p className="text-xs py-4" style={{ color: 'var(--notion-text-faint)' }}>← 选择一条记录查看详情</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--notion-text-muted)' }}>{fmt(entry.time)} · {entry.model}</span>
              {onApplyPrompt && entry.systemPrompt && (
                <button
                  className="btn-ghost text-xs py-1"
                  onClick={() => onApplyPrompt(entry.systemPrompt)}
                  title="将此次使用的 System Prompt 覆盖到编辑器"
                >
                  ↩ 还原此 Prompt
                </button>
              )}
            </div>

            {/* 变量 */}
            {entry.variables && Object.keys(entry.variables).length > 0 && (
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--notion-text-muted)' }}>变量</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(entry.variables).map(([k, v]) => (
                    <span key={k} className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{ background: 'var(--notion-hover)', border: '1px solid var(--notion-border)', color: 'var(--notion-text-primary)' }}>
                      <span style={{ color: '#b45309' }}>{k}</span>
                      <span style={{ color: 'var(--notion-text-faint)' }}> = </span>
                      <span>{v || '(空)'}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* System Prompt */}
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--notion-text-muted)' }}>System Prompt</p>
              <pre style={{ ...preStyle, maxHeight: 160 }}>
                {entry.systemPrompt || entry.prompt || '(空)'}
              </pre>
            </div>

            {/* 用户输入 */}
            {entry.userInput && (
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--notion-text-muted)' }}>用户消息</p>
                <pre style={{ ...preStyle, maxHeight: 96, color: '#1d5fa8' }}>
                  {entry.userInput}
                </pre>
              </div>
            )}

            {/* 输出 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs" style={{ color: 'var(--notion-text-muted)' }}>模型输出</p>
                <button
                  className="text-xs hover:underline"
                  style={{ color: 'var(--notion-text-faint)' }}
                  onClick={() => navigator.clipboard.writeText(entry.output)}
                >复制</button>
              </div>
              <pre style={{ ...preStyle, maxHeight: 240, color: 'var(--notion-text-primary)' }}>
                {entry.output || '(无输出)'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
