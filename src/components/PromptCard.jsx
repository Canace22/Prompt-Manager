import React from 'react'
import { useNavigate } from 'react-router-dom'

const MODEL_LABELS = {
  'qwen-turbo': 'Turbo',
  'qwen-plus': 'Plus',
  'qwen-max': 'Max',
  'qwen-long': 'Long',
}

export default function PromptCard({ prompt, onDelete }) {
  const navigate = useNavigate()

  const handleDelete = (e) => {
    e.stopPropagation()
    if (window.confirm(`确认删除「${prompt.name}」？`)) {
      onDelete(prompt.id)
    }
  }

  const ago = (iso) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return '刚刚'
    if (m < 60) return `${m} 分钟前`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} 小时前`
    return `${Math.floor(h / 24)} 天前`
  }

  return (
    <div
      className="card p-4 hover:border-indigo-700 cursor-pointer transition-all duration-150 group"
      onClick={() => navigate(`/editor/${prompt.id}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-100 truncate">{prompt.name || '未命名'}</h3>
          {prompt.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{prompt.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
            {MODEL_LABELS[prompt.model] || prompt.model}
          </span>
          <button
            className="btn-danger p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDelete}
            title="删除"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-600 line-clamp-2 font-mono leading-relaxed">
        {prompt.content || <span className="italic">暂无内容</span>}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {prompt.tags?.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
          {prompt.variables?.length > 0 && (
            <span className="inline-block px-2 py-0.5 rounded-md text-xs bg-amber-900/40 text-amber-300 border border-amber-800/40">
              {prompt.variables.length} 变量
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          {prompt.history?.length > 0 && (
            <span>{prompt.history.length} 次测试</span>
          )}
          <span>{ago(prompt.updatedAt)}</span>
        </div>
      </div>
    </div>
  )
}
