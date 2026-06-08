# ResearchFlow

智能调研助手 —— 基于 [DeepAgent](https://github.com/langchain-ai/deepagents) 框架的 AI 驱动调研报告生成器。

输入一个主题，AI 自动完成：规划调研步骤 → 联网搜索资料 → 数据分析 → 撰写报告 → 审阅定稿。

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，输入调研主题，配置你的 API Key 即可开始。

## 你需要准备

- **LLM API Key**: OpenAI / Anthropic / DeepSeek 任选一个
- **博查 API Key**: 在 [open.bochaai.com](https://open.bochaai.com/) 免费注册获取

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| Agent | LangChain `deepagents` |
| 搜索 | 博查 Web Search API |
| 报告渲染 | react-markdown |

## 许可证

MIT
