import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button, Select, Input, Typography, Space, Collapse } from 'antd'
import { PlayCircleOutlined, StopOutlined, CopyOutlined, LoadingOutlined } from '@ant-design/icons'
import { fillVariables } from '../store/promptStore'

const { Text } = Typography
const { TextArea } = Input

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

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
    <div className="image-var-input">
      {value ? (
        <div className="image-preview">
          <img src={value} alt="已选图片" />
          <Button
            size="small"
            danger
            style={{ position: 'absolute', top: 4, right: 4, opacity: 0 }}
            className="remove-btn"
            onClick={() => onChange('')}
          >移除</Button>
        </div>
      ) : (
        <div
          className="drop-zone"
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
      <Input
        size="small"
        placeholder="或直接输入图片 URL"
        value={value.startsWith('data:') ? '' : value}
        onChange={e => onChange(e.target.value)}
        style={{ fontSize: 12 }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}

const MODEL_OPTIONS = [
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

  useEffect(() => {
    setVarValues(prev => {
      const next = {}
      ;(prompt.variables || []).forEach(v => { next[v] = prev[v] || '' })
      return next
    })
  }, [prompt.variables?.join(',')])

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  const buildMessages = () => {
    const textVarValues = {}
    ;(prompt.variables || []).forEach(v => {
      const isImage = prompt.varMeta?.[v]?.type === 'image'
      textVarValues[v] = isImage ? `[图片:${v}]` : (varValues[v] || '')
    })

    const systemContent = fillVariables(prompt.content, textVarValues)
    const imageVars = (prompt.variables || []).filter(
      v => prompt.varMeta?.[v]?.type === 'image' && varValues[v]
    )

    let userContent
    if (imageVars.length > 0) {
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
    if (userContent) msgs.push({ role: 'user', content: userContent })
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
            const delta = Array.isArray(raw)
              ? raw.map(p => p.text ?? '').join('')
              : (raw || '')
            fullOutput += delta
            setOutput(fullOutput)
          } catch {
            // skip parse errors
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
      if (err.name !== 'AbortError') setError(err.message)
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
    <div className="test-panel">
      {/* Model */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 12, color: 'var(--notion-text-muted)', flexShrink: 0 }}>模型</Text>
        <Select
          style={{ flex: 1 }}
          size="small"
          value={model}
          onChange={setModel}
          options={MODEL_OPTIONS}
        />
      </div>

      {/* Variables */}
      {prompt.variables?.length > 0 && (
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500, color: 'var(--notion-text-muted)', display: 'block', marginBottom: 8 }}>填写变量</Text>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            {prompt.variables.map(v => {
              const isImage = prompt.varMeta?.[v]?.type === 'image'
              return (
                <div key={v} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Text
                    style={{ fontSize: 12, fontFamily: 'monospace', width: 80, flexShrink: 0, color: '#b45309', paddingTop: 4 }}
                  >{`{{${v}}}`}</Text>
                  {isImage ? (
                    <ImageVarInput
                      value={varValues[v] || ''}
                      onChange={val => setVarValues(prev => ({ ...prev, [v]: val }))}
                    />
                  ) : (
                    <Input
                      size="small"
                      style={{ flex: 1, fontSize: 12 }}
                      placeholder={`填写 ${v}`}
                      value={varValues[v] || ''}
                      onChange={e => setVarValues(prev => ({ ...prev, [v]: e.target.value }))}
                    />
                  )}
                </div>
              )
            })}
          </Space>
        </div>
      )}

      {/* Preview */}
      {prompt.variables?.length > 0 && (
        <Collapse
          ghost
          size="small"
          items={[{
            key: '1',
            label: <Text style={{ fontSize: 12, color: 'var(--notion-text-muted)' }}>预览填充后的 System Prompt</Text>,
            children: <pre className="preview-box">{previewPrompt}</pre>,
          }]}
        />
      )}

      {/* User input */}
      <div>
        <Text style={{ fontSize: 12, color: 'var(--notion-text-muted)', display: 'block', marginBottom: 4 }}>用户消息（可选）</Text>
        <TextArea
          style={{ fontFamily: 'monospace', fontSize: 12 }}
          rows={3}
          placeholder="输入用户消息，不填则只发 System Prompt..."
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
        />
      </div>

      {/* Run button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {loading ? (
          <Button danger icon={<StopOutlined />} onClick={handleStop}>停止</Button>
        ) : (
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleRun}
            disabled={!prompt.content}
          >运行测试</Button>
        )}
        {elapsed && !loading && (
          <Text style={{ fontSize: 12, color: 'var(--notion-text-muted)' }}>{elapsed}s</Text>
        )}
      </div>

      {/* Output */}
      {(output || error) && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: 500, color: 'var(--notion-text-muted)' }}>输出结果</Text>
            {output && (
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => navigator.clipboard.writeText(output)}
                style={{ fontSize: 12, color: 'var(--notion-text-faint)' }}
              >复制</Button>
            )}
          </div>
          {error ? (
            <div className="error-box">{error}</div>
          ) : (
            <div ref={outputRef} className="output-box">
              {output}
              {loading && (
                <span style={{
                  display: 'inline-block', width: 6, height: 16,
                  marginLeft: 2, background: 'var(--notion-blue)',
                  animation: 'pulse 1s ease-in-out infinite',
                }} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
