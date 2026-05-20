# Oh My Everything

<p align="center">
  <img src="https://img.shields.io/badge/Electron-33.0-47848F?logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-2.3-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white" alt="Windows">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
</p>

<p align="center">
  <b>AI 驱动的自然语言文件搜索工具</b><br>
  用人类语言搜索你的电脑，就像和朋友聊天一样简单。
</p>

---

## ✨ 功能特性

- **🧠 AI 自然语言搜索** — 输入 "今天修改的所有 PDF 文件"，自动转换为 Everything 搜索语法
- **🔌 多模型支持** — 支持 OpenAI、Claude、Ollama（本地模型），随心切换
- **⚡ 极速搜索** — 基于 [Voidtools Everything](https://www.voidtools.com/) 引擎，百万文件秒级定位
- **🎨 精美界面** — 无框窗口设计，支持亮色 / 暗色 / 跟随系统主题
- **🔍 语法预览** — 实时查看 AI 转换后的 Everything 搜索语法，透明可控
- **📦 开箱即用** — 自动检测 es.exe 路径，支持便携版与安装版打包

## 📸 界面预览

> 搜索框输入自然语言，一键获取精准结果。

```
┌─────────────────────────────────────────────────────────┐
│ ⚙  oh-my-everything                          —    ✕    │
├─────────────────────────────────────────────────────────┤
│  [今天修改的所有 PDF 文件..................] [ 搜索 ]   │
│  Everything 语法：dm:today ext:pdf                      │
├─────────────────────────────────────────────────────────┤
│  文件名              路径                    大小  时间 │
│  report.pdf          D:\Work\docs\          2.3MB 今天  │
│  invoice.pdf         D:\Finance\            1.1MB 今天  │
├─────────────────────────────────────────────────────────┤
│  共 2 条结果                                    Ollama  │
└─────────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 环境要求

- Windows 10/11
- [Node.js](https://nodejs.org/) ≥ 18
- [Voidtools Everything](https://www.voidtools.com/) 已安装并运行
- [es.exe](https://github.com/voidtools/ES/releases)（命令行工具，会自动检测或手动配置）

### 安装依赖

```bash
npm install
```

### 开发调试

```bash
npm run dev
```

### 构建打包

```bash
# 构建安装包（NSIS）
npm run package

# 构建便携版
npm run package:portable
```

构建产物位于 `dist/` 目录。

## ⚙️ 配置说明

首次启动后，点击左上角 ⚙️ 图标进入设置：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| **AI 提供者** | 选择使用的 AI 服务 | `Ollama` / `OpenAI` / `Claude` |
| **API Key** | 对应服务的 API 密钥 | `sk-...` / 本地留空 |
| **Base URL** | 自定义 API 地址（可选） | `http://localhost:11434` |
| **模型** | 使用的模型名称 | `llama3.1` / `gpt-4o` |
| **es.exe 路径** | Everything 命令行工具路径 | 自动检测 |
| **最大结果数** | 单次搜索返回上限 | `100` |
| **主题** | 界面主题模式 | `跟随系统` |

### 推荐模型配置

**Ollama（本地免费）**
- 模型：`llama3.1` 或 `qwen2.5`
- Base URL：`http://localhost:11434`
- API Key：留空

**OpenAI**
- 模型：`gpt-4o-mini`（性价比）或 `gpt-4o`
- API Key：从 [OpenAI 平台](https://platform.openai.com/) 获取

**Claude**
- 模型：`claude-sonnet-4-20250514`
- API Key：从 [Anthropic 控制台](https://console.anthropic.com/) 获取

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | [Electron](https://www.electronjs.org/) + [Vite](https://vitejs.dev/) |
| 语言 | [TypeScript](https://www.typescriptlang.org/) |
| 构建 | [electron-vite](https://electron-vite.org/) + [electron-builder](https://www.electron.build/) |
| 搜索引擎 | [Voidtools Everything](https://www.voidtools.com/) (via es.exe) |
| AI 接口 | OpenAI API / Anthropic API / Ollama API |

## 📂 项目结构

```
oh-my-everything/
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── ai/               # AI 提供者实现
│   │   │   ├── provider.ts   # 提供者抽象接口
│   │   │   ├── openai.ts     # OpenAI 支持
│   │   │   ├── claude.ts     # Claude 支持
│   │   │   └── ollama.ts     # Ollama 本地支持
│   │   ├── services/         # 业务服务
│   │   │   ├── search.ts     # Everything 搜索核心
│   │   │   ├── search-ipc.ts # 搜索 IPC 通道
│   │   │   ├── settings.ts   # 配置持久化
│   │   │   └── settings-ipc.ts
│   │   ├── system-prompt.ts  # AI 系统提示词
│   │   ├── ipc-handlers.ts   # IPC 路由注册
│   │   └── index.ts          # 主进程入口
│   ├── preload/              # 预加载脚本（安全桥接）
│   ├── renderer/             # 渲染进程前端
│   │   ├── src/
│   │   │   ├── main.ts       # 界面交互逻辑
│   │   │   ├── search.ts     # 搜索模块
│   │   │   ├── results.ts    # 结果表格渲染
│   │   │   ├── settings-panel.ts
│   │   │   └── syntax-preview.ts
│   │   ├── assets/styles.css
│   │   └── index.html
│   └── shared/               # 共享类型与常量
│       ├── types.ts
│       └── constants.ts
├── electron.vite.config.ts   # Vite 构建配置
├── electron-builder.yml      # 打包配置
└── package.json
```

## 🔍 搜索示例

| 自然语言查询 | 转换后的 Everything 语法 |
|-------------|------------------------|
| "今天修改的所有 PDF 文件" | `dm:today ext:pdf` |
| "上周创建的超过 10MB 的视频" | `dc:past1week size:>10mb ext:mp4;avi;mkv` |
| "D 盘里名字包含 report 的 Excel" | `D:\ report ext:xlsx;xls` |
| "过去 3 个月里修改过的代码文件" | `dm:2025-02-20..2025-05-20 ext:js;ts;py;java` |

## 🤝 贡献指南

欢迎 Issue 和 PR！

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 打开 Pull Request

## 📄 开源协议

[MIT](LICENSE) © [cunninger](https://github.com/cunninger)

---

<p align="center">
  Made with ❤️ and AI
</p>
