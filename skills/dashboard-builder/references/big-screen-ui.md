# Big Screen UI Guidelines

## Layout Principles

### Screen Ratios
- **16:9** - Standard monitors, TVs
- **21:9** - Ultra-wide displays
- **4K (3840x2160)** - High-resolution displays

### Safe Areas
Keep critical content within 90% of screen width/height to account for display bezels.

```css
.dashboard-container {
  padding: 2vh 2vw;
  max-width: 95vw;
  margin: 0 auto;
}
```

## Typography for Big Screens

### Font Sizes (viewport-relative)
```css
:root {
  --text-hero: clamp(3rem, 5vw, 6rem);      /* Main numbers */
  --text-title: clamp(1.5rem, 2.5vw, 3rem); /* Section titles */
  --text-body: clamp(1rem, 1.5vw, 1.5rem);  /* Body text */
  --text-label: clamp(0.75rem, 1vw, 1rem);  /* Labels */
}
```

### Readability
- Use high contrast (white on dark, or dark on light)
- Minimum font weight: 400 for body, 600 for numbers
- Line height: 1.2-1.4 for large text

## Color Schemes

### Dark Theme (Recommended for dashboards)
```css
:root {
  --bg-primary: #0F172A;    /* Main background */
  --bg-secondary: #1E293B;  /* Card background */
  --bg-tertiary: #334155;   /* Hover states */
  --text-primary: #F8FAFC;  /* Main text */
  --text-secondary: #94A3B8; /* Secondary text */
  --accent-green: #10B981;  /* Positive values */
  --accent-red: #EF4444;    /* Negative values */
  --accent-blue: #3B82F6;   /* Neutral accent */
}
```

### Tailwind Config
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        dashboard: {
          bg: '#0F172A',
          card: '#1E293B',
          border: '#334155',
        }
      }
    }
  }
}
```

## Grid Layouts

### 4-Column Dashboard
```tsx
<div className="grid grid-cols-4 gap-4 p-4 min-h-screen bg-dashboard-bg">
  {/* Top row - KPI cards */}
  <Card className="col-span-1">KPI 1</Card>
  <Card className="col-span-1">KPI 2</Card>
  <Card className="col-span-1">KPI 3</Card>
  <Card className="col-span-1">KPI 4</Card>

  {/* Main chart - spans 3 columns */}
  <Card className="col-span-3 row-span-2">Main Chart</Card>

  {/* Side panel */}
  <Card className="col-span-1 row-span-2">Data List</Card>

  {/* Bottom row */}
  <Card className="col-span-2">Chart 1</Card>
  <Card className="col-span-2">Chart 2</Card>
</div>
```

### Responsive Breakpoints
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Adapts from 1 to 4 columns */}
</div>
```

## Animation Guidelines

### Entrance Animations
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-enter {
  animation: fadeInUp 0.5s ease-out forwards;
}

/* Stagger children */
.card-enter:nth-child(1) { animation-delay: 0.1s; }
.card-enter:nth-child(2) { animation-delay: 0.2s; }
.card-enter:nth-child(3) { animation-delay: 0.3s; }
.card-enter:nth-child(4) { animation-delay: 0.4s; }
```

### Value Change Animation
```css
@keyframes highlight {
  0% { background-color: transparent; }
  50% { background-color: rgba(16, 185, 129, 0.2); }
  100% { background-color: transparent; }
}

.value-updated {
  animation: highlight 1s ease-out;
}
```

### Pulse for Live Data
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.live-indicator {
  animation: pulse 2s infinite;
}
```

## Auto-Refresh Pattern

```tsx
import { useEffect, useState } from 'react'

export function useLiveData<T>(fetcher: () => Promise<T>, interval = 60000) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetcher()
        setData(result)
        setLastUpdated(new Date())
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const timer = setInterval(fetchData, interval)
    return () => clearInterval(timer)
  }, [fetcher, interval])

  return { data, loading, lastUpdated }
}
```

## Loading States

```tsx
export function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-4 bg-gray-700 rounded w-1/3" />
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-gray-700 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-700 rounded w-1/4" />
      </CardContent>
    </Card>
  )
}
```

## Empty/Error States

```tsx
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <AlertCircle className="h-12 w-12 mb-4" />
      <p>{message}</p>
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-red-400">
      <XCircle className="h-12 w-12 mb-4" />
      <p className="mb-4">{error}</p>
      <Button variant="outline" onClick={onRetry}>Retry</Button>
    </div>
  )
}
```
