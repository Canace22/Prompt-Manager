import React, { useState } from 'react'
import { Button, message } from 'antd'
import { SyncOutlined, LoadingOutlined } from '@ant-design/icons'

export default function NotionSync({ onSynced }) {
  const [pulling, setPulling] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  const handlePull = async () => {
    setPulling(true)
    try {
      const r = await fetch('/api/notion/sync')
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      messageApi.success(`同步完成：新增 ${data.added} 条，更新 ${data.updated} 条`)
      onSynced?.()
    } catch (err) {
      messageApi.error('同步失败：' + err.message)
    } finally {
      setPulling(false)
    }
  }

  return (
    <>
      {contextHolder}
      <Button
        type="text"
        size="small"
        icon={pulling ? <LoadingOutlined /> : <SyncOutlined />}
        onClick={handlePull}
        disabled={pulling}
        style={{ color: 'var(--notion-text-muted)', fontSize: 12 }}
        title="从 Notion 拉取最新 Prompt"
      >
        <span className="hidden-sm">Notion 同步</span>
      </Button>
    </>
  )
}
