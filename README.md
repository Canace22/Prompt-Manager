# Prompt 管理工具

本地 Prompt 维护工具，支持编辑、测试（调用千问 API）、查看历史。

## 快速开始

### 1. 配置 API Key

复制 `.env.example` 为 `.env`，填写你的阿里云千问 API Key：

```bash
cp .env.example .env
# 编辑 .env，填写 DASHSCOPE_API_KEY
```

API Key 获取地址：https://dashscope.aliyuncs.com/

### 2. 安装依赖

```bash
npm install
cd server && npm install && cd ..
```

### 3. 启动

```bash
npm run dev
```

前端运行在 http://localhost:5173，后端运行在 http://localhost:3001。

## 功能说明

| 功能 | 说明 |
|------|------|
| Prompt 列表 | 查看所有 Prompt，支持搜索和标签筛选 |
| 编辑 | 编写 System Prompt，支持 `{{变量名}}` 占位符 |
| 测试 | 填写变量值，调用千问 API，流式查看输出 |
| 历史 | 查看每次测试的输入/输出，支持一键还原 Prompt |
| 导入/导出 | JSON 格式备份和恢复所有 Prompt |

## 支持的模型

- `qwen-turbo` — 快速响应
- `qwen-plus` — 均衡性能
- `qwen-max` — 最强能力
- `qwen-long` — 超长上下文

## 数据存储

Prompt 数据存储在浏览器 LocalStorage，不上传任何服务器。
