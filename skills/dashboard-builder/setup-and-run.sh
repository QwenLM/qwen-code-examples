#!/bin/bash

# Dashboard Builder - Automated Setup Script
# This script will create a new Next.js project with all necessary dependencies
# and start the development server automatically

set -e  # Exit immediately if a command exits with a non-zero status

echo "🚀 Starting Dashboard Builder setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Node.js version (should be 18.x or higher)
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current version: $(node --version)"
    exit 1
fi

# Get project name from user or use default
read -p "Enter project name (or press Enter for 'my-dashboard'): " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-my-dashboard}

# Check if directory already exists
if [ -d "$PROJECT_NAME" ]; then
    echo "❌ Directory $PROJECT_NAME already exists. Please choose a different name or remove the existing directory."
    exit 1
fi

echo "📁 Creating new project: $PROJECT_NAME"
npx create-next-app@latest "$PROJECT_NAME" --typescript --tailwind --eslint --app --use-npm --no-import-alias

# Navigate into project directory
cd "$PROJECT_NAME"

echo "📦 Installing additional dependencies..."
npm install shadcn-ui recharts framer-motion lucide-react
npx shadcn-ui@latest init
npx shadcn-ui@latest add card button badge table scroll-area alert

# Copy the quick start template components to the new project
mkdir -p src/app
mkdir -p src/components/ui
mkdir -p src/components/charts
mkdir -p src/components/dashboard
mkdir -p src/components/effects
mkdir -p src/lib

# Create a sample dashboard page
cat > src/app/page.tsx << 'EOF'
// src/app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// KPICard Component
interface KPICardProps {
  title: string
  value: number
  prefix?: string
  suffix?: string
  trend?: number
}

function KPICard({ title, value, prefix = '', suffix = '', trend = 0 }: KPICardProps) {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardContent className="pt-6">
        <p className="text-slate-400 text-sm font-medium mb-2">{title}</p>
        <div className="flex items-end justify-between">
          <span className="text-3xl font-bold text-white">
            {prefix}{value.toFixed(2)}{suffix}
          </span>
          {trend !== 0 && (
            <span className={cn(
              "flex items-center text-sm font-medium",
              trend > 0 ? "text-emerald-500" : "text-rose-500"
            )}>
              {trend > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Live Indicator Component
function LiveIndicator() {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
      </span>
      <span className="text-emerald-500 text-sm font-medium">LIVE</span>
    </div>
  )
}

// Data Card Component
'use client'
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

interface DataCardProps {
  period: string
  currentValue: number
  baselineValue: number
  percentChange: number
  description: string
}

function DataCard({ period, currentValue, baselineValue, percentChange, description }: DataCardProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const isPositive = percentChange >= 0

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
        <div className={cn(
          "h-1",
          isPositive ? "bg-emerald-500" : "bg-rose-500"
        )} />
        <CardContent className="pt-6">
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-bold text-white">{period}</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Baseline Value</span>
              <span className="text-slate-300">{baselineValue}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Current Value</span>
              <span className="text-white font-medium">{currentValue}</span>
            </div>

            {/* Change percentage */}
            <div className={cn(
              "text-2xl font-bold text-center py-3 rounded-lg",
              isPositive ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
            )}>
              {isPositive ? '+' : ''}{percentChange.toFixed(2)}%
            </div>

            <p className="text-slate-400 text-sm">{description}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Animated Number Component
'use client'
import { useEffect, useState } from 'react'
import { animate } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  decimals?: number
  duration?: number
}

function AnimatedNumber({ value, decimals = 2, duration = 1 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(display, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v)
    })
    return () => controls.stop()
  }, [value, duration])

  return <>{display.toFixed(decimals)}</>
}

// Main Dashboard Component
export default function DashboardPage() {
  const [data, setData] = useState({
    kpiValues: [
      { title: 'Revenue', value: 125000.45, prefix: '$', trend: 5.2 },
      { title: 'Users', value: 2340.21, trend: 1.8 },
      { title: 'Conversion', value: 18.5, suffix: '%', trend: 2.3 },
      { title: 'Orders', value: 452.78, trend: -0.5 }
    ],
    timelineData: [
      {
        period: 'Q1',
        currentValue: 45000.50,
        baselineValue: 40000.00,
        percentChange: 12.5,
        description: 'Quarter 1 performance'
      },
      {
        period: 'Q2',
        currentValue: 52000.75,
        baselineValue: 48000.25,
        percentChange: 8.3,
        description: 'Quarter 2 performance'
      },
      {
        period: 'Q3',
        currentValue: 48000.30,
        baselineValue: 50000.60,
        percentChange: -4.0,
        description: 'Quarter 3 performance'
      },
      {
        period: 'Q4',
        currentValue: 58000.90,
        baselineValue: 52000.40,
        percentChange: 11.5,
        description: 'Quarter 4 performance'
      }
    ]
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-4">
          <LiveIndicator />
          <span className="text-slate-400 text-lg">Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </header>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {data.kpiValues.map((kpi, index) => (
          <KPICard
            key={index}
            title={kpi.title}
            value={kpi.value}
            prefix={kpi.prefix}
            suffix={kpi.suffix}
            trend={kpi.trend}
          />
        ))}
      </div>

      {/* Timeline Row - Full width */}
      <div className="col-span-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Trend Analysis</h2>
        <div className="grid grid-cols-4 gap-6">
          {data.timelineData.map((item, index) => (
            <DataCard
              key={index}
              period={item.period}
              currentValue={item.currentValue}
              baselineValue={item.baselineValue}
              percentChange={item.percentChange}
              description={item.description}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
EOF

# Create utils file
cat > src/lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF

# Update tailwind config to include animations
cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
EOF

echo "✅ Project $PROJECT_NAME created successfully!"
echo "✅ Dependencies installed!"
echo "✅ Sample dashboard created!"

echo ""
echo "🚀 Starting development server..."
echo "The dashboard will be available at http://localhost:3000"
echo ""

# Start the development server
npm run dev