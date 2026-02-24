import React, { useState, useRef, useEffect } from 'react'
import { fillVariables } from '../store/promptStore'

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
    const systemContent = fillVariables(prompt.content, varValues)
    const msgs = [{ role: 'system', content: systemContent }]
    if (userInput.trim()) {
      msgs.push({ role: 'user', content: userInput.trim() })
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
            const delta = json?.output?.choices?.[0]?.message?.content || ''
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
        <label className="text-xs text-gray-500 shrink-0">模型</label>
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
          <p className="text-xs text-gray-500 font-medium">填写变量</p>
          <div className="grid grid-cols-1 gap-2">
            {prompt.variables.map(v => (
              <div key={v} className="flex items-center gap-2">
                <label className="text-xs text-amber-400 font-mono w-20 shrink-0 truncate">
                  {`{{${v}}}`}
                </label>
                <input
                  className="input flex-1"
                  placeholder={`填写 ${v}`}
                  value={varValues[v] || ''}
                  onChange={e => setVarValues(prev => ({ ...prev, [v]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompt 预览 */}
      {prompt.variables?.length > 0 && (
        <details className="group">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 select-none">
            预览填充后的 System Prompt ▾
          </summary>
          <pre className="mt-2 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400 font-mono whitespace-pre-wrap overflow-auto max-h-32 border border-gray-700/50">
            {previewPrompt}
          </pre>
        </details>
      )}

      {/* 用户输入 */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">用户消息（可选）</label>
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
          <span className="text-xs text-gray-500">{elapsed}s</span>
        )}
      </div>

      {/* 输出结果 */}
      {(output || error) && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 font-medium">输出结果</p>
            {output && (
              <button
                className="text-xs text-gray-600 hover:text-gray-400"
                onClick={() => navigator.clipboard.writeText(output)}
              >复制</button>
            )}
          </div>
          {error ? (
            <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-sm text-red-400">
              {error}
            </div>
          ) : (
            <div
              ref={outputRef}
              className="p-3 bg-gray-800/60 border border-gray-700/50 rounded-lg text-sm text-gray-200 font-mono whitespace-pre-wrap overflow-auto max-h-80 leading-relaxed"
            >
              {output}
              {loading && <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 animate-pulse" />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
