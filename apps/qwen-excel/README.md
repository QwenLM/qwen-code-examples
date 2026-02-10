# Qwen Excel Agent

> ⚠️ **IMPORTANT**: This is a demo application by Alibaba Cloud. It is intended for local development only and should NOT be deployed to production or used at scale.

A demonstration desktop application powered by Qwen and the [@qwen-code/sdk](https://github.com/QwenLM/qwen-code), showcasing AI-powered spreadsheet creation, analysis, and manipulation capabilities.

## What This Demo Shows

This Electron-based desktop application demonstrates how to:
- Create sophisticated Excel spreadsheets with formulas, formatting, and multiple sheets
- Analyze and manipulate existing spreadsheet data
- Use Qwen to assist with data organization and spreadsheet design
- Work with Python scripts to generate complex spreadsheet structures
- Integrate the @qwen-code/sdk with desktop applications

### Example Use Cases

The `agent/` folder contains Python examples including:
- **Workout Tracker**: A fitness log with automatic summary statistics and multiple sheets
- **Budget Tracker**: Financial tracking with formulas and data validation
- Custom spreadsheet generation with styling, borders, and conditional formatting

## Prerequisites

- [Node.js 20+](https://nodejs.org) or [Bun](https://bun.sh)
- Local LLM service (such as [Ollama](https://ollama.ai) with a Qwen model)
- LibreOffice (optional, for formula recalculation)

## Getting Started

### 1. Preparation

#### 1.1 Set up Python Environment

- Python 3.9+ is required
- Create a virtual environment:
  ```bash
  python -m venv .venv
  source .venv/bin/activate  # On Windows: .venv\Scripts\activate
  ```

#### 1.2 Install Qwen Code CLI

Follow the official documentation to install Qwen Code CLI:
[Qwen Code Documentation](https://qwenlm.github.io/qwen-code-docs/zh/users/overview/)


### 2. Installation

1. Install project dependencies:
```bash
npm install
# or bun install
```

2. Install project dependencies:

```bash
npm start
# or bun start
```

## Features

- **AI-Powered Spreadsheet Generation**: Let Qwen create complex spreadsheets based on your requirements
- **Formula Management**: Work with Excel formulas, calculations, and automatic recalculation
- **Professional Styling**: Generate spreadsheets with headers, colors, borders, and formatting
- **Multi-Sheet Workbooks**: Create workbooks with multiple related sheets
- **Data Analysis**: Analyze existing spreadsheets and extract insights
- **Desktop Integration**: Native desktop application built with Electron

## Resources

- [@qwen-code/sdk Documentation](https://github.com/QwenLM/qwen-code)
- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [openpyxl Documentation](https://openpyxl.readthedocs.io/) (Python library used)

## Support

This is a demo application provided as-is. For issues related to:
- **@qwen-code/sdk**: [SDK Documentation](https://github.com/QwenLM/qwen-code)
- **Demo Issues**: [GitHub Issues](https://github.com/QwenLM/qwen-code/issues)
- **API Questions**: [Alibaba Cloud Support](https://www.alibabacloud.com/support)

## License

MIT - This is sample code for demonstration purposes.

---

Built by Alibaba Cloud to demonstrate the [@qwen-code/sdk](https://github.com/QwenLM/qwen-code)
