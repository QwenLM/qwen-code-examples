# Quick Start Template

## Quick Setup

To get started quickly with the dashboard builder, follow these steps:

### 1. Project Initialization

```bash
npx create-next-app@latest dashboard-project --typescript --tailwind --eslint
cd dashboard-project
npm install shadcn-ui recharts framer-motion lucide-react
npx shadcn-ui@latest init
npx shadcn-ui@latest add card button
```

### 2. Directory Structure

Create the following directory structure:

```
dashboard-project/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── dashboard/
│       └── page.tsx
├── components/
│   ├── ui/
│   ├── charts/
│   ├── dashboard/
│   └── effects/
├── lib/
├── server/
│   ├── index.ts
│   ├── routes/
│   └── services/
└── styles/
```

### 3. Quick Start Component

Here's a complete example to get started immediately:

```tsx
// app/page.tsx
'use client'

import { useState } from 'react'
import { KPICard } from '@/components/dashboard/KPICard'
import { DataCard } from '@/components/dashboard/DataCard'
import { LineChart } from '@/components/charts/LineChart'
import { LiveIndicator } from '@/components/effects/LiveIndicator'

export default function DashboardHome() {
  const [data, setData] = useState({
    kpiValues: [
      { title: 'Revenue', value: 125000, prefix: '$', trend: 5.2 },
      { title: 'Users', value: 2340, trend: 1.8 },
      { title: 'Conversion', value: 18.5, suffix: '%', trend: 2.3 },
      { title: 'Orders', value: 452, trend: -0.5 }
    ],
    chartData: [
      { date: 'Jan', value: 4000 },
      { date: 'Feb', value: 3000 },
      { date: 'Mar', value: 2000 },
      { date: 'Apr', value: 2780 },
      { date: 'May', value: 1890 },
      { date: 'Jun', value: 2390 }
    ],
    timelineData: [
      {
        period: 'Q1',
        currentValue: 45000,
        baselineValue: 40000,
        percentChange: 12.5,
        description: 'Quarter 1 performance'
      },
      {
        period: 'Q2',
        currentValue: 52000,
        baselineValue: 48000,
        percentChange: 8.3,
        description: 'Quarter 2 performance'
      },
      {
        period: 'Q3',
        currentValue: 48000,
        baselineValue: 50000,
        percentChange: -4.0,
        description: 'Quarter 3 performance'
      },
      {
        period: 'Q4',
        currentValue: 58000,
        baselineValue: 52000,
        percentChange: 11.5,
        description: 'Quarter 4 performance'
      }
    ]
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-white">Quick Start Dashboard</h1>
        <div className="flex items-center gap-4">
          <LiveIndicator />
          <span className="text-slate-400 text-lg">Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </header>

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

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 h-[500px]">
            <h2 className="text-xl font-semibold text-white mb-4">Trend Analysis</h2>
            <LineChart data={data.chartData} />
          </div>
        </div>

        <div className="col-span-4 space-y-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-medium text-white mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              {data.kpiValues.slice(0, 2).map((kpi, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-slate-300">{kpi.title}</span>
                  <span className="text-white font-medium">{kpi.prefix}{kpi.value}{kpi.suffix}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Timeline Analysis</h2>
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
    </div>
  )
}
```

This template gives you a complete starting point for building a dashboard with all the essential components pre-configured.