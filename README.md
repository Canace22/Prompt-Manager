# Prompt 管理工具

本地 Prompt 维护工具，支持编辑、测试（调用千问 API）、查看历史，以及与 Notion 数据库双向同步。

## 快速开始

### 1. 配置环境变量

复制 `.env.example` 为 `.env`，填写所需配置：

```bash
cp .env.example .env
```

| 变量 | 必填 | 说明 |
|------|------|------|
| `DASHSCOPE_API_KEY` | 测试功能必填 | 阿里云千问 API Key，获取地址：https://dashscope.aliyuncs.com/ |
| `NOTION_TOKEN` | Notion 同步必填 | Notion Integration Token |
| `NOTION_DATABASE_ID` | Notion 同步必填 | Notion 数据库 ID |

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
| Notion 同步 | 从 Notion 数据库拉取 Prompt，或将本地 Prompt 推送到 Notion |

## 支持的模型

- `qwen-turbo` — 快速响应
- `qwen-plus` — 均衡性能
- `qwen-max` — 最强能力
- `qwen-long` — 超长上下文

## Notion 同步说明

- **拉取（Pull）**：从 Notion 数据库读取所有 Prompt，按更新时间合并到本地，新增或覆盖更新。
- **推送（Push）**：将单条本地 Prompt 写入 Notion，已关联的记录执行更新，否则新建页面。
- 变量格式自动转换：Notion 中使用 `${var}`，本地使用 `{{var}}`。
- Notion 数据库需包含以下属性：`Name`（title）、`Description`（rich_text）、`Category`（select）、`Status`（status）。
- 支持的 Category 值：`Technical`、`Role`、`Tool`、`Workflow`。

## 数据存储

Prompt 数据持久化存储在项目根目录的 `prompts.json` 文件中，由后端服务读写
