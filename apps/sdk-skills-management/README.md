# Qwen Code SDK Chimp - Skill SDK

A powerful Skill wrapper SDK built on top of `@qwen-code/sdk`. This SDK enables intelligent skill execution through natural language, where the LLM automatically selects and executes the appropriate skill based on user input. It supports multi-turn conversations with context preservation, allowing for interactive and iterative task completion.

## Requirements

- Node.js >= 20.0
- `@qwen-code/sdk` > 0.1.1

**Note:** From version 0.1.1 onwards, the CLI is bundled with the SDK, so no separate Qwen Code installation is needed.

## Core Features

1. **Load Skills** - Read `SKILL.md` and `README.md`
2. **Build Prompts** - Pass Skill content to LLM
3. **Execute Conversations** - Use `@qwen-code/sdk`'s `query` API
4. **Multi-turn Interaction** - Maintain context, support multiple conversations

## Quick Start

### Interactive Skill Execution

```bash
npx tsx qwen-code-sdk-chimp/skill-interactive.ts [skills]
```

## File Structure

```
qwen-code-sdk-chimp/
├── skill.ts              # Main entry point
├── skill-types.ts        # Type definitions
├── skill-loader.ts       # Skill loader
├── skill-runner.ts       # Skill executor
└── skill-interactive.ts  # Interactive example
```

## Skill Directory Structure

```
skills/
└── test_template_matching_skills_new/
    ├── SKILL.md          # Skill definition (required)
    ├── README.md         # Detailed description (optional)
    └── scripts/          # Skill scripts
```

## Environment Configuration

Copy `.env.example` to `.env` and configure your API credentials:

```bash
cp .env.example .env
```

### Option 1: OpenAI

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
# Optional
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1
```

Get your API key from: https://platform.openai.com/api-keys

### Option 2: Qwen (Tongyi Qianwen)

```bash
QWEN_API_KEY=sk-your-qwen-api-key-here
# or
DASHSCOPE_API_KEY=sk-your-dashscope-api-key-here

# Optional
QWEN_MODEL=qwen-plus
QWEN_ENABLE_SEARCH=false
```

Get your API key from: https://dashscope.aliyun.com/api-key

### Additional Configuration

```bash
# Skills directory (optional, default: ./skills)
SKILLS_DIR=./skills

```

The SDK will automatically detect which service you've configured and use it accordingly.
