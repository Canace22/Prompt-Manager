# Prompt 管理工具

本地 Prompt 维护工具，支持编辑、测试（调用千问 API）、查看历史，以及与 Notion 数据库双向同步。

## 快速开始

### 1. 安装依赖

```bash
npm install
cd server && npm install && cd ..
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填写配置，或启动后在界面「Settings」页配置
```

| 变量 | 必填 | 说明 |
|------|------|------|
| `DASHSCOPE_API_KEY` | 测试功能必填 | 阿里云千问 API Key，获取：https://dashscope.aliyuncs.com/ |
| `NOTION_TOKEN` | Notion 同步必填 | Notion Integration Token |
| `NOTION_DATABASE_ID` | Notion 同步必填 | Notion 数据库 ID（需为 Database，非普通页面） |
| `ADMIN_PASSWORD` | 可选 | 管理员密码 |

> **提示**：也可以不编辑 `.env`，启动后进入左下角「Settings」页在线填写，保存后立即生效，无需重启。

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
| **Settings** | **在线配置 API Key、Notion Token 等，保存立即生效** |

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
- `NOTION_DATABASE_ID` 需为数据库本身的 ID，而非其所在父页面的 ID。打开数据库独立页面，URL 末尾的 32 位字符串即为 ID。

## Docker 部署

### 快速启动

```bash
# 1. 构建并启动（默认端口 7777）
docker compose up -d --build

# 访问 http://localhost:7777
# 进入「Settings」页填写 API Key 等配置，保存立即生效
```

> **或者**先配置再启动：
> ```bash
> cp .env.example .env  # 编辑 .env 填写配置
> docker compose up -d
> ```

### 常用命令

```bash
# 查看日志
docker compose logs -f

# 停止
docker compose down

# 重新构建（代码更新后）
docker compose up -d --build
```

### 说明

- 前端静态文件由 Nginx 服务，API 请求反代到内置 Express 服务
- 数据文件 `prompts.json` 持久化到 Docker volume `prompts_data`，容器销毁后数据不丢失
- 在「Settings」页保存的配置写入 volume 中的 `.env` 文件，容器重建后不丢失
- 默认端口 `7777`，可在 `docker-compose.yml` 中修改 `ports` 配置

## 数据存储

Prompt 数据持久化存储在项目根目录的 `prompts.json` 文件中，由后端服务读写。Docker 部署时存储在 volume `/data/prompts.json`，Settings 配置存储在 `/data/.env`。
