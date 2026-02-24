import React, { useState, useRef, useEffect, useCallback } from 'react'
import { fillVariables } from '../store/promptStore'

// 将 File 对象转成 base64 data URL
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

// 图片变量上传控件（本地文件或粘贴 URL）
function ImageVarInput({ value, onChange }) {
  const fileRef = useRef(null)

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const base64 = await fileToBase64(file)
    onChange(base64)
  }, [onChange])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handlePaste = useCallback((e) => {
    const file = Array.from(e.clipboardData?.files || []).find(f => f.type.startsWith('image/'))
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="flex-1 flex flex-col gap-1.5">
      {value ? (
        <div className="relative group w-full">
          <img
            src={value}
            alt="已选图片"
            className="max-h-32 rounded-lg object-contain"
            style={{ border: '1px solid var(--notion-border)', background: 'var(--notion-hover)' }}
          />
          <button
            className="absolute top-1 right-1 rounded px-1.5 py-0.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
            style={{ background: 'var(--notion-surface)', color: 'var(--notion-text-muted)' }}
            onClick={() => onChange('')}
          >移除</button>
        </div>
      ) : (
        <div
          className="rounded-lg p-3 text-center cursor-pointer text-xs transition-colors hover:text-[var(--notion-text-primary)]"
          style={{ border: '1.5px dashed var(--notion-border)', color: 'var(--notion-text-faint)' }}
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onPaste={handlePaste}
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
        >
          点击上传 / 拖拽 / 粘贴图片
        </div>
      )}
      <input
        type="text"
        className="input text-xs"
        placeholder="或直接输入图片 URL"
        value={value.startsWith('data:') ? '' : value}
        onChange={e => onChange(e.target.value)}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}

const MODELS = [
  { value: 'qwen-turbo', label: 'Qwen Turbo（快）' },
  { value: 'qwen-plus', label: 'Qwen Plus（均衡）' },
  { value: 'qwen-max', label: 'Qwen Max（强）' },
  { value: 'qwen-long', label: 'Qwen Long（长文）' },
]

export default function TestPanel({ prompt, onSaveHistory }) {
  const [varValues, setVarValues] = useState({})
  const [userInput, setUserInput] = useState('')
  const [model, setModel] = useState(prompt.model || 'qwen-turbo')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(null)
  const abortRef = useRef(null)
  const outputRef = useRef(null)

  // 当 prompt 变量变化时，同步 varValues
  useEffect(() => {
    setVarValues(prev => {
      const next = {}
      ;(prompt.variables || []).forEach(v => { next[v] = prev[v] || '' })
      return next
    })
  }, [prompt.variables?.join(',')])

  // 输出自动滚动到底部
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  const buildMessages = () => {
    // 文本变量直接替换；图片变量用占位符替换（保留 {{var}} 以便后续处理）
    const textVarValues = {}
    ;(prompt.variables || []).forEach(v => {
      const isImage = prompt.varMeta?.[v]?.type === 'image'
      textVarValues[v] = isImage ? `[图片:${v}]` : (varValues[v] || '')
    })

    const systemContent = fillVariables(prompt.content, textVarValues)

    // 检测是否有图片变量被填写
    const imageVars = (prompt.variables || []).filter(
      v => prompt.varMeta?.[v]?.type === 'image' && varValues[v]
    )

    let userContent
    if (imageVars.length > 0) {
      // 多模态：图片 + 文字拼在 user 消息里
      const parts = imageVars.map(v => ({
        type: 'image_url',
        image_url: { url: varValues[v] },
      }))
      if (userInput.trim()) {
        parts.push({ type: 'text', text: userInput.trim() })
      }
      userContent = parts
    } else {
      userContent = userInput.trim() || null
    }

    const msgs = [{ role: 'system', content: systemContent }]
    if (userContent) {
      msgs.push({ role: 'user', content: userContent })
    }
    return msgs
  }

  const handleRun = async () => {
    setOutput('')
    setError('')
    setElapsed(null)
    setLoading(true)
    const start = Date.now()
    const messages = buildMessages()
    let fullOutput = ''

    try {
      abortRef.current = new AbortController()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            const raw = json?.output?.choices?.[0]?.message?.content
            // 多模态返回 content 是数组 [{text:'...'}, ...]，文本返回是字符串
            const delta = Array.isArray(raw)
              ? raw.map(p => p.text ?? '').join('')
              : (raw || '')
            fullOutput += delta
            setOutput(fullOutput)
          } catch {
            // 忽略解析错误
          }
        }
      }

      const cost = ((Date.now() - start) / 1000).toFixed(1)
      setElapsed(cost)
      onSaveHistory?.({
        model,
        variables: { ...varValues },
        userInput,
        systemPrompt: fillVariables(prompt.content, varValues),
        output: fullOutput,
        elapsed: cost,
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setLoading(false)
  }

  const previewPrompt = fillVariables(prompt.content, varValues)

  return (
    <div className="flex flex-col gap-4">
      {/* 模型选择 */}
      <div className="flex items-center gap-3">
        <label className="text-xs shrink-0" style={{ color: 'var(--notion-text-muted)' }}>模型</label>
        <select
          className="input flex-1"
          value={model}
          onChange={e => setModel(e.target.value)}
        >
          {MODELS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* 变量填写 */}
      {prompt.variables?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium" style={{ color: 'var(--notion-text-muted)' }}>填写变量</p>
          <div className="grid grid-cols-1 gap-2">
            {prompt.variables.map(v => {
              const isImage = prompt.varMeta?.[v]?.type === 'image'
              return (
                <div key={v} className="flex items-start gap-2">
                  <label className="text-xs font-mono w-20 shrink-0 truncate pt-1.5" style={{ color: '#b45309' }}>
                    {`{{${v}}}`}
                  </label>
                  {isImage ? (
                    <ImageVarInput
                      value={varValues[v] || ''}
                      onChange={val => setVarValues(prev => ({ ...prev, [v]: val }))}
                    />
                  ) : (
                    <input
                      className="input flex-1"
                      placeholder={`填写 ${v}`}
                      value={varValues[v] || ''}
                      onChange={e => setVarValues(prev => ({ ...prev, [v]: e.target.value }))}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Prompt 预览 */}
      {prompt.variables?.length > 0 && (
        <details className="group">
          <summary className="text-xs cursor-pointer select-none" style={{ color: 'var(--notion-text-muted)' }}>
            预览填充后的 System Prompt ▾
          </summary>
          <pre className="mt-2 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-auto max-h-32"
            style={{ background: 'var(--notion-hover)', color: 'var(--notion-text-muted)', border: '1px solid var(--notion-border)' }}>
            {previewPrompt}
          </pre>
        </details>
      )}

      {/* 用户输入 */}
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--notion-text-muted)' }}>用户消息（可选）</label>
        <textarea
          className="input resize-none h-20 font-mono text-xs"
          placeholder="输入用户消息，不填则只发 System Prompt..."
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
        />
      </div>

      {/* 运行按钮 */}
      <div className="flex items-center gap-2">
        {loading ? (
          <button className="btn bg-red-700 hover:bg-red-600 text-white" onClick={handleStop}>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            停止
          </button>
        ) : (
          <button className="btn-primary" onClick={handleRun} disabled={!prompt.content}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            运行测试
          </button>
        )}
        {elapsed && !loading && (
          <span className="text-xs" style={{ color: 'var(--notion-text-muted)' }}>{elapsed}s</span>
        )}
      </div>

      {/* 输出结果 */}
      {(output || error) && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium" style={{ color: 'var(--notion-text-muted)' }}>输出结果</p>
            {output && (
              <button
                className="text-xs hover:underline"
                style={{ color: 'var(--notion-text-faint)' }}
                onClick={() => navigator.clipboard.writeText(output)}
              >复制</button>
            )}
          </div>
          {error ? (
            <div className="p-3 rounded-lg text-sm text-red-600" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              {error}
            </div>
          ) : (
            <div
              ref={outputRef}
              className="p-3 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-auto max-h-80 leading-relaxed"
              style={{ background: 'var(--notion-hover)', color: 'var(--notion-text-primary)', border: '1px solid var(--notion-border)' }}
            >
              {output}
              {loading && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: 'var(--notion-blue)' }} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
