# Additional Dashboard Components

## Overview

This document describes additional components specifically designed for large screen dashboards. These components complement the core components defined in the main SKILL.md file.

## 1. Status Monitor Component

```tsx
// components/dashboard/StatusMonitor.tsx
'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Wifi, Server, Zap } from "lucide-react"

interface ServiceStatus {
  name: string
  status: 'operational' | 'degraded' | 'offline' | 'warning'
  responseTime: number
  uptime: number
}

export function StatusMonitor({ services }: { services: ServiceStatus[] }) {
  const getStatusColor = (status: ServiceStatus['status']) => {
    switch(status) {
      case 'operational': return 'bg-emerald-500'
      case 'warning': return 'bg-yellow-500'
      case 'degraded': return 'bg-orange-500'
      case 'offline': return 'bg-rose-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch(status) {
      case 'operational': return <Activity className="w-5 h-5 text-emerald-500" />
      case 'warning': return <Wifi className="w-5 h-5 text-yellow-500" />
      case 'degraded': return <Zap className="w-5 h-5 text-orange-500" />
      case 'offline': return <Server className="w-5 h-5 text-rose-500" />
      default: return <Activity className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 h-full">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="w-5 h-5" />
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {services.map((service, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(service.status)}
                <span className="text-white font-medium">{service.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`${getStatusColor(service.status)} text-xs`}>
                  {service.status.toUpperCase()}
                </Badge>
                <span className="text-slate-300 text-sm">{service.responseTime}ms</span>
                <span className="text-slate-400 text-sm">{service.uptime}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

## 2. Data Table Component

```tsx
// components/dashboard/DataTable.tsx
'use client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DataTableProps<T> {
  title: string;
  columns: Array<{ key: keyof T; header: string; align?: 'left' | 'center' | 'right'; formatter?: (value: T[keyof T]) => string }>;
  data: T[];
  maxHeight?: string;
}

export function DataTable<T>({ title, columns, data, maxHeight = "400px" }: DataTableProps<T>) {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="rounded-md border border-slate-700" style={{ maxHeight }}>
          <Table>
            <TableHeader className="bg-slate-700">
              <TableRow>
                {columns.map((column, idx) => (
                  <TableHead
                    key={idx}
                    className="text-white sticky top-0 z-10"
                    style={{ textAlign: column.align || 'left' }}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="border-slate-700 hover:bg-slate-700/50">
                  {columns.map((column, colIndex) => {
                    const value = row[column.key];
                    const formattedValue = column.formatter ? column.formatter(value) : String(value);

                    return (
                      <TableCell
                        key={colIndex}
                        style={{ textAlign: column.align || 'left' }}
                        className="text-slate-200"
                      >
                        {formattedValue}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
```

## 3. Gauge Chart Component

```tsx
// components/charts/GaugeChart.tsx
'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'

interface GaugeChartProps {
  title: string;
  value: number;
  min?: number;
  max?: number;
  segments?: Array<{ min: number; max: number; color: string }>;
}

export function GaugeChart({
  title,
  value,
  min = 0,
  max = 100,
  segments = [
    { min: 0, max: 33, color: "#EF4444" },    // Red for danger
    { min: 33, max: 66, color: "#F59E0B" },   // Yellow for warning
    { min: 66, max: 100, color: "#10B981" }   // Green for good
  ]
}: GaugeChartProps) {
  // Calculate percentage
  const percentage = ((value - min) / (max - min)) * 100;

  // Prepare data for chart
  const chartData = segments.map(segment => {
    const segmentRange = segment.max - segment.min;
    const segmentValue = Math.min(
      segmentRange,
      Math.max(0, value - segment.min)
    );

    return {
      ...segment,
      fill: segment.color,
      value: (segmentValue / segmentRange) * 100
    };
  }).filter(s => s.value > 0); // Only include segments that have a value

  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <div className="mx-auto aspect-square max-w-xs">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="30%"
              outerRadius="100%"
              barSize={16}
              data={chartData}
              startAngle={180}
              endAngle={0}
              dataKey="value"
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              {chartData.map((entry, index) => (
                <RadialBar
                  key={`bar-${index}`}
                  background
                  dataKey="value"
                  cornerRadius={10}
                  fill={entry.fill}
                  className="stroke-transparent stroke-2"
                />
              ))}
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-3xl font-bold fill-white"
              >
                {value}
                <tspan className="text-lg fill-slate-400">{max !== 100 ? '%' : ''}</tspan>
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-4">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-slate-400 text-sm">
                  {segment.min}-{segment.max}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

## 4. World Map Visualization Component

```tsx
// components/charts/WorldMapChart.tsx
'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps"
import { scaleLinear } from "d3-scale"

interface LocationData {
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  value: number;
}

interface WorldMapChartProps {
  title: string;
  data: LocationData[];
  maxValue?: number;
}

// We'll define the world map topology here, but in a real implementation
// you would import this from a geojson file
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export function WorldMapChart({ title, data, maxValue }: WorldMapChartProps) {
  // Determine max value if not provided
  const calculatedMaxValue = maxValue || Math.max(...data.map(d => d.value), 1);

  // Create color scale based on values
  const colorScale = scaleLinear<string>()
    .domain([0, calculatedMaxValue])
    .range(["#94a3b8", "#10b981"]); // From gray to green

  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ center: [0, 40], scale: 100 }}
            className="w-full h-full"
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map(geo => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth={0.5}
                  />
                ))
              }
            </Geographies>

            {data.map((location, index) => (
              <Marker key={index} coordinates={location.coordinates}>
                <circle
                  r={Math.max(2, (location.value / calculatedMaxValue) * 10)}
                  fill={colorScale(location.value)}
                  stroke="#0f172a"
                  strokeWidth={1}
                  opacity={0.8}
                />
              </Marker>
            ))}
          </ComposableMap>
        </div>
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-4">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <div key={index} className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: colorScale(ratio * calculatedMaxValue) }}
                />
                <span className="text-slate-400 text-xs">
                  {Math.round(ratio * calculatedMaxValue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

## 5. Alert/Notification Component

```tsx
// components/dashboard/AlertPanel.tsx
'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react"

type AlertSeverity = 'info' | 'success' | 'warning' | 'error'

interface AlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
}

interface AlertPanelProps {
  alerts: AlertItem[];
  title?: string;
}

export function AlertPanel({ alerts, title = "Recent Alerts" }: AlertPanelProps) {
  const getAlertVariant = (severity: AlertSeverity) => {
    switch(severity) {
      case 'info': return 'border-blue-500/30 bg-blue-500/5';
      case 'success': return 'border-emerald-500/30 bg-emerald-500/5';
      case 'warning': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'error': return 'border-rose-500/30 bg-rose-500/5';
      default: return 'border-slate-500/30 bg-slate-500/5';
    }
  };

  const getAlertIcon = (severity: AlertSeverity) => {
    switch(severity) {
      case 'info': return <Info className="h-5 w-5 text-blue-500" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-rose-500" />;
      default: return <Info className="h-5 w-5 text-slate-500" />;
    }
  };

  const getAlertColor = (severity: AlertSeverity) => {
    switch(severity) {
      case 'info': return 'text-blue-400';
      case 'success': return 'text-emerald-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-rose-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {<AlertTriangle className="w-5 h-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No active alerts</p>
          ) : (
            alerts.map(alert => (
              <Alert
                key={alert.id}
                className={getAlertVariant(alert.severity)}
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.severity)}
                  <div className="flex-1">
                    <AlertTitle className={`font-semibold ${getAlertColor(alert.severity)}`}>
                      {alert.title}
                    </AlertTitle>
                    <AlertDescription className="text-slate-300">
                      {alert.message}
                    </AlertDescription>
                    <p className="text-xs text-slate-500 mt-1">
                      {alert.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Alert>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

These additional components provide enhanced functionality for large screen dashboards, including status monitoring, data tables, gauge charts, world maps, and alert panels.