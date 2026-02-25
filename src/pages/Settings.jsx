import React, { useEffect, useState } from 'react'
import { Form, Input, Button, message, Spin, Typography } from 'antd'
import { SaveOutlined, KeyOutlined, DatabaseOutlined, LockOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const FIELDS = [
  {
    key: 'DASHSCOPE_API_KEY',
    label: 'DashScope API Key',
    icon: <KeyOutlined />,
    placeholder: 'sk-xxxxxxxxxxxxxxxx',
    tip: '阿里云灵积模型服务 API Key，用于千问模型调用',
    password: true,
  },
  {
    key: 'NOTION_TOKEN',
    label: 'Notion Token',
    icon: <KeyOutlined />,
    placeholder: 'ntn_xxxxxxxxxxxxxxxx',
    tip: 'Notion Integration Token，用于同步 Prompt 到 Notion',
    password: true,
  },
  {
    key: 'NOTION_DATABASE_ID',
    label: 'Notion Database ID',
    icon: <DatabaseOutlined />,
    placeholder: '1b441c9133c580aab50ff82be3ea8a14',
    tip: 'Notion 数据库 ID，可从数据库 URL 中获取',
    password: false,
  },
  {
    key: 'ADMIN_PASSWORD',
    label: '管理员密码',
    icon: <LockOutlined />,
    placeholder: '请输入密码',
    tip: '用于保护设置页面的管理员密码',
    password: true,
  },
]

export default function Settings() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
        form.setFieldsValue(data)
        setLoading(false)
      })
      .catch(() => {
        messageApi.error('加载配置失败')
        setLoading(false)
      })
  }, [])

  const handleSave = async (values) => {
    setSaving(true)
    try {
      const r = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || '保存失败')
      messageApi.success('配置已保存，立即生效')
    } catch (err) {
      messageApi.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-page">
      {contextHolder}
      <div className="page-header">
        <div className="breadcrumb">
          <span>Settings</span>
        </div>
      </div>

      <div className="page-body">
        <div className="page-title">
          <h1>设置</h1>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Token 配置</div>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 20 }}>
            以下配置保存于服务器 <code>.env</code> 文件，保存后立即生效，无需重启。
          </Text>

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Spin />
            </div>
          ) : (
            <Form form={form} layout="vertical" onFinish={handleSave} style={{ maxWidth: 520 }}>
              {FIELDS.map(field => (
                <Form.Item
                  key={field.key}
                  name={field.key}
                  label={
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--notion-text-primary)' }}>
                      {field.icon}&nbsp; {field.label}
                    </span>
                  }
                  extra={<span style={{ fontSize: 12, color: 'var(--notion-text-faint)' }}>{field.tip}</span>}
                >
                  {field.password ? (
                    <Input.Password
                      placeholder={field.placeholder}
                      autoComplete="off"
                      style={{ fontFamily: 'monospace', fontSize: 13 }}
                    />
                  ) : (
                    <Input
                      placeholder={field.placeholder}
                      style={{ fontFamily: 'monospace', fontSize: 13 }}
                    />
                  )}
                </Form.Item>
              ))}

              <Form.Item style={{ marginTop: 8 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                  style={{ borderRadius: 6 }}
                >
                  保存配置
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>
      </div>
    </div>
  )
}
