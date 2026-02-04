# Qwen Bolt Demo

A Bolt.new-inspired AI website builder powered by Qwen Code SDK.

## Features

- 🤖 AI-powered website generation through natural language
- 💬 Real-time streaming chat interface
- 📁 File tree visualization
- 💻 Code preview and editing
- 🎨 Beautiful gradient UI inspired by Bolt.new

## Prerequisites

Make sure you have the Qwen CLI installed:

```bash
qwen --version
```

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **User Input**: Describe what you want to build in natural language
2. **AI Processing**: Qwen Code SDK processes your request and generates code
3. **Real-time Streaming**: See the AI's response in real-time via Server-Sent Events
4. **Code Preview**: View generated files in the code tab

## Project Structure

```
qwen-bolt-demo/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts    # Chat API endpoint
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main page (Bolt-like UI)
│   └── ...
├── package.json
├── tsconfig.json
└── README.md
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI SDK**: @qwen-code/sdk
- **Icons**: Lucide React

## License

MIT
