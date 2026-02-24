import React from 'react'
import { useNavigate } from 'react-router-dom'

const TAG_CLASS_MAP = {
  Workflow: 'tag tag-workflow',
  Tool: 'tag tag-tool',
  Role: 'tag tag-role',
  Technical: 'tag tag-technical',
}

function getTagClass(tag) {
  return TAG_CLASS_MAP[tag] || 'tag tag-default'
}

export default function PromptCard({ prompt, onDelete }) {
  const navigate = useNavigate()

  const handleDelete = (e) => {
    e.stopPropagation()
    if (window.confirm(`确认删除「${prompt.name}」？`)) {
      onDelete(prompt.id)
    }
  }

  return (
    <div
      className="table-row-item group"
      onClick={() => navigate(`/editor/${prompt.id}`)}
    >
      <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ width: 340 }}>
        <span className="text-notion-text-faint text-sm shrink-0">⚡</span>
        <span className="text-notion-sm text-notion-text-primary truncate">{prompt.name || '未命名'}</span>
      </div>

      <div className="flex items-center px-4 py-2 border-l border-notion-border shrink-0" style={{ width: 180 }}>
        {prompt.tags?.slice(0, 1).map(tag => (
          <span key={tag} className={getTagClass(tag)}>{tag}</span>
        ))}
      </div>

      <div className="flex-1 px-4 py-2 border-l border-notion-border min-w-0">
        <span className="text-notion-sm text-notion-text-muted truncate block">{prompt.description || ''}</span>
      </div>

      <div className="px-3 border-l border-notion-border flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="btn-danger p-1" onClick={handleDelete} title="删除">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
