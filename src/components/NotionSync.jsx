import React, { useState } from 'react'

export default function NotionSync({ onSynced }) {
  const [pulling, setPulling] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [msg, setMsg] = useState('')

  const flash = (text) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 3000)
  }

  const handlePull = async () => {
    setPulling(true)
    setMsg('')
    try {
      const r = await fetch('/api/notion/sync')
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      flash(`同步完成：新增 ${data.added} 条，更新 ${data.updated} 条`)
      onSynced?.()
    } catch (err) {
      flash('同步失败：' + err.message)
    } finally {
      setPulling(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="btn-ghost text-xs py-1 gap-1"
        onClick={handlePull}
        disabled={pulling || pushing}
        title="从 Notion 拉取最新 Prompt"
      >
        {pulling ? (
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        )}
        <span className="hidden sm:inline">Notion 同步</span>
      </button>
      {msg && (
        <span className={`text-xs ${msg.includes('失败') ? 'text-red-400' : 'text-green-400'}`}>
          {msg}
        </span>
      )}
    </div>
  )
}
