import React, { useState } from 'react'

const fmt = (iso) => {
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HistoryView({ history = [], onApplyPrompt }) {
  const [selected, setSelected] = useState(null)

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-600">
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
      <div className="w-40 shrink-0 space-y-1 overflow-y-auto">
        {history.map((h, i) => (
          <button
            key={h.id || i}
            className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors text-xs ${selected === i ? 'bg-indigo-700/50 border border-indigo-600/50' : 'hover:bg-gray-800 border border-transparent'}`}
            onClick={() => setSelected(i)}
          >
            <div className="text-gray-300 truncate font-mono">{h.model}</div>
            <div className="text-gray-600 mt-0.5">{fmt(h.time)}</div>
            {h.elapsed && <div className="text-gray-600">{h.elapsed}s</div>}
          </button>
        ))}
      </div>

      {/* 详情 */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!entry ? (
          <p className="text-xs text-gray-600 py-4">← 选择一条记录查看详情</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{fmt(entry.time)} · {entry.model}</span>
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
                <p className="text-xs text-gray-600 mb-1">变量</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(entry.variables).map(([k, v]) => (
                    <span key={k} className="text-xs font-mono bg-gray-800 px-2 py-0.5 rounded">
                      <span className="text-amber-400">{k}</span>
                      <span className="text-gray-600"> = </span>
                      <span className="text-gray-300">{v || '(空)'}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* System Prompt */}
            <div>
              <p className="text-xs text-gray-600 mb-1">System Prompt</p>
              <pre className="p-3 bg-gray-800/60 border border-gray-700/50 rounded-lg text-xs text-gray-400 font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                {entry.systemPrompt || entry.prompt || '(空)'}
              </pre>
            </div>

            {/* 用户输入 */}
            {entry.userInput && (
              <div>
                <p className="text-xs text-gray-600 mb-1">用户消息</p>
                <pre className="p-3 bg-gray-800/60 border border-gray-700/50 rounded-lg text-xs text-blue-300 font-mono whitespace-pre-wrap max-h-24 overflow-auto">
                  {entry.userInput}
                </pre>
              </div>
            )}

            {/* 输出 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-600">模型输出</p>
                <button
                  className="text-xs text-gray-600 hover:text-gray-400"
                  onClick={() => navigator.clipboard.writeText(entry.output)}
                >复制</button>
              </div>
              <pre className="p-3 bg-gray-800/60 border border-gray-700/50 rounded-lg text-xs text-gray-200 font-mono whitespace-pre-wrap max-h-60 overflow-auto">
                {entry.output || '(无输出)'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
