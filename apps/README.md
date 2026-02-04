# Qwen Code Apps

A collection of production-ready demo applications built on top of the **Qwen Code SDK**, showcasing real-world use cases for different professional personas.

## Overview

These apps demonstrate how to leverage Qwen Code SDK to build powerful, AI-native applications that solve real problems for specific user groups. Each app is designed to be a complete, functional product that can serve as both a learning resource and a starting point for your own projects.

## Apps Catalog

### 1. ProtoFlow — For Product Managers

> **Tagline**: *One sentence to prototype*

A bolt.new-style rapid prototyping tool that enables product managers to create functional product demos with just a simple description.

**Key Features**:
- Natural language to UI/UX prototype conversion
- Real-time preview and iteration
- Export to shareable HTML/React components
- Version history and collaboration support

**Use Cases**:
- Quickly validate product ideas before development
- Create interactive mockups for stakeholder presentations
- Generate functional prototypes for user testing

**Tech Stack**: Next.js, Qwen Code SDK, Tailwind CSS

---

### 2. DesignPrint — For Designers

> **Tagline**: *One sentence to print-ready design*

A lovart-inspired design tool specialized for print materials like A5 brochures, roll-up banners, and event posters. Generate high-resolution, print-ready designs from simple text descriptions.

**Key Features**:
- Pre-configured templates for common print formats:
  - A5 Tri-fold Brochures
  - Roll-up Banners (85×200cm)
  - Event Posters (A2, A3)
- CMYK color mode with bleed area support
- High-resolution output (300 DPI minimum)
- Export to PDF, PNG, and AI-compatible formats

**Use Cases**:
- Create marketing collateral in minutes
- Generate consistent brand materials across formats
- Rapid iteration on design concepts

**Tech Stack**: Next.js, Qwen Code SDK, Wanx Image Generation, PDF-lib

---

### 3. CoWork — For Office Workers

> **Tagline**: *Your AI coworker for daily tasks*

An intelligent assistant that handles everyday office tasks—from drafting emails to organizing meeting notes, creating simple reports, and automating repetitive work.

**Key Features**:
- Email drafting and polishing
- Meeting notes summarization
- Document formatting and conversion
- Schedule management assistance
- Quick data analysis and visualization

**Use Cases**:
- Draft professional emails in seconds
- Transform messy meeting notes into action items
- Create weekly reports from scattered data
- Automate mundane administrative tasks

**Tech Stack**: Next.js, Qwen Code SDK, Office Document APIs

---

### 4. NoteGenius — For Content Creators

> **Tagline**: *Think, write, and illustrate—all in one place*

A Google NotebookLM-style content creation workspace that helps writers, bloggers, and content creators produce complete articles with matching illustrations.

**Key Features**:
- AI-assisted writing and editing
- Automatic outline generation
- Contextual image suggestions and generation
- Multi-format export (Markdown, HTML, Medium, WordPress)
- Research assistant with source management
- SEO optimization suggestions

**Use Cases**:
- Write blog posts with auto-generated hero images
- Create comprehensive articles with inline illustrations
- Transform research notes into polished content
- Generate social media content packages

**Tech Stack**: Next.js, Qwen Code SDK, Wanx Image Generation, Markdown-it

---

### 5. PromoStudio — For Video Creators

> **Tagline**: *From idea to promo video*

A product promotional video creation tool that combines the power of Remotion (programmatic video generation) with Wanx's visual capabilities to produce professional marketing videos.

**Key Features**:
- Text-to-video script generation
- AI-generated scenes and transitions
- Background music and voiceover integration
- Template-based video structures:
  - Product launch videos
  - Feature highlight reels
  - Customer testimonial formats
- Export in multiple resolutions (1080p, 4K)

**Use Cases**:
- Create product demo videos without filming
- Generate social media video ads
- Produce explainer videos for new features
- Build consistent brand video content

**Tech Stack**: Next.js, Qwen Code SDK, Remotion, Wanx Video Generation

---

### 6. StockVisualization — For Stock Traders

> **Tagline**: *Visualize stock market trends*

An AI-powered stock visualization tool built on RDS Supabase, featuring interactive charts and a paper trading simulator to track real-time portfolio performance.

**Key Features**:
- Data-Driven Stock Visualization
- Interactive Portfolio Simulator
- Real-time Portfolio Performance
- Supabase-Powered Data Backend

**Use Cases**:
- Visualize stock market trends
- Track portfolio performance in real-time
- Check stock analysis reports

**Tech Stack**: Next.js, RDS Supabase, Build-in Authentication

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Qwen Code SDK credentials
- DashScope API Key (for Wanx features)

### Installation

```bash
# Clone the repository
git clone https://github.com/QwenLM/qwen-code-examples
cd qwen-code-examples/apps/qwen-cowork

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run the development server
pnpm dev
```

### Project Structure

```text
apps/
├── protoflow/          # Product Manager prototyping tool
├── designprint/        # Designer print material generator
├── cowork/             # Office worker assistant
├── notegenius/         # Content creator workspace
├── promostudio/        # Video creator tool
├── shared/             # Shared components and utilities
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   └── lib/            # Shared utilities
└── README.md
```

## Architecture

All apps share a common architecture pattern:

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│              (Next.js + Tailwind CSS)                   │
├─────────────────────────────────────────────────────────┤
│                  Application Layer                       │
│         (Business Logic + State Management)             │
├─────────────────────────────────────────────────────────┤
│                  Qwen Code SDK                          │
│    (Chat, Code Generation, Reasoning, Tool Use)         │
├─────────────────────────────────────────────────────────┤
│              External Services Layer                     │
│   (Wanx Image/Video, Document APIs, Export Services)    │
└─────────────────────────────────────────────────────────┘
```

## Contributing

We welcome contributions! Each app has its own development guidelines in its respective README. Please read the contribution guide before submitting PRs.

### Development Principles

1. **User-Centric Design**: Every feature should solve a real user problem
2. **SDK Best Practices**: Demonstrate proper Qwen Code SDK usage patterns
3. **Production Quality**: Code should be ready for production deployment
4. **Documentation**: All features should be well-documented with examples

## Roadmap

- [ ] **ProtoFlow** v1.0 - Basic prototyping functionality
- [ ] **DesignPrint** v1.0 - A5 brochure template
- [ ] **CoWork** v1.0 - Email assistant
- [ ] **NoteGenius** v1.0 - Blog writing mode
- [ ] **PromoStudio** v1.0 - Basic video generation
- [ ] **StockVisualization** v1.0 - Visualize stock market trends

## License

MIT License - See [LICENSE](../LICENSE) for details.
