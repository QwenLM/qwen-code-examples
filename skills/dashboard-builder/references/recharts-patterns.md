# Recharts Patterns for Dashboard Applications

## Line Chart - Metric Trend

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export function MetricTrendChart({ data }: { data: { date: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
        <YAxis stroke="#9CA3AF" fontSize={12} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
          labelStyle={{ color: '#F9FAFB' }}
        />
        <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

## Area Chart - Metric with Gradient

```tsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function MetricAreaChart({ data }: { data: { date: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9CA3AF" />
        <YAxis stroke="#9CA3AF" domain={['auto', 'auto']} />
        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
        <Area type="monotone" dataKey="value" stroke="#10B981" fill="url(#colorValue)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

## Bar Chart - Comparisons

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function ComparisonChart({ data }: { data: { category: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="category" stroke="#9CA3AF" fontSize={10} />
        <YAxis stroke="#9CA3AF" fontSize={10} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
        />
        <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

## Multi-Line Comparison

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444']

interface ComparisonData {
  date: string
  [metric: string]: string | number
}

export function MultiMetricChart({ data, metrics }: { data: ComparisonData[]; metrics: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9CA3AF" />
        <YAxis stroke="#9CA3AF" />
        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
        <Legend />
        {metrics.map((metric, i) => (
          <Line key={metric} type="monotone" dataKey={metric} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
```

## Pie Chart - Distribution

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6']

export function DistributionChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
          formatter={(value) => [value, 'Count']}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

## Custom Tooltip

```tsx
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-700">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
        </p>
      ))}
    </div>
  )
}

// Usage: <Tooltip content={<CustomTooltip />} />
```

## Animated Number Display

```tsx
import { useEffect, useState } from 'react'

export function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const diff = value - display
    const steps = 20
    const increment = diff / steps
    let current = display
    let step = 0

    const timer = setInterval(() => {
      step++
      current += increment
      setDisplay(current)
      if (step >= steps) {
        setDisplay(value)
        clearInterval(timer)
      }
    }, 20)

    return () => clearInterval(timer)
  }, [value])

  return <span>{prefix}{display.toFixed(2)}{suffix}</span>
}
```