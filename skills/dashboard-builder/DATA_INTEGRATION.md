# Data Integration Guide

## Overview

This guide explains how to connect various data sources to your dashboard application. The dashboard builder is designed to work with different types of data sources through a consistent API layer.

## Data Integration Options

### 1. REST API Integration

#### Basic Setup

```typescript
// lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

export async function fetchData<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.API_KEY && { 'Authorization': `Bearer ${process.env.API_KEY}` })
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

#### Usage Example

```typescript
// components/dashboard/DashboardClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchData } from '@/lib/api';
import { KPICard } from '@/components/dashboard/KPICard';

interface DashboardData {
  revenue: number;
  users: number;
  conversion: number;
  orders: number;
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchData<DashboardData>('/dashboard/metrics');
        setData(result);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up auto-refresh every 60 seconds
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (!data) {
    return <div>Failed to load dashboard data</div>;
  }

  return (
    <div className="grid grid-cols-4 gap-6">
      <KPICard title="Revenue" value={data.revenue} prefix="$" trend={2.5} />
      <KPICard title="Users" value={data.users} trend={5.3} />
      <KPICard title="Conversion" value={data.conversion} suffix="%" trend={-1.2} />
      <KPICard title="Orders" value={data.orders} trend={3.8} />
    </div>
  );
}
```

### 2. Backend API Endpoint

#### Express.js Server Example

```typescript
// server/index.ts
import express from 'express';
import cors from 'cors';
import { dataRouter } from './routes/data';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', dataRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### Data Route Example

```typescript
// server/routes/data.ts
import { Router } from 'express';
import { getDataService } from '../services/dataService';

const router = Router();

router.get('/metrics', async (req, res) => {
  try {
    const service = getDataService();
    const metrics = await service.getMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

router.get('/historical/:metric', async (req, res) => {
  try {
    const { metric } = req.params;
    const { start, end, resolution } = req.query;

    const service = getDataService();
    const historicalData = await service.getHistoricalData(
      metric,
      new Date(start as string),
      new Date(end as string),
      resolution as string
    );

    res.json(historicalData);
  } catch (error) {
    console.error('Error getting historical data:', error);
    res.status(500).json({ error: 'Failed to retrieve historical data' });
  }
});

export { router as dataRouter };
```

### 3. Database Integration

#### PostgreSQL Example

```typescript
// server/services/dataService.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

export class DataService {
  async getMetrics() {
    const query = `
      SELECT
        SUM(revenue) as total_revenue,
        COUNT(DISTINCT user_id) as total_users,
        AVG(conversion_rate) as avg_conversion,
        COUNT(order_id) as total_orders
      FROM dashboard_metrics
      WHERE created_at >= NOW() - INTERVAL '1 day'
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }

  async getHistoricalData(metric: string, start: Date, end: Date, resolution: string) {
    let query = '';
    let queryParams = [start, end];

    switch(metric) {
      case 'revenue':
        query = `
          SELECT
            DATE_TRUNC($3, created_at) as date,
            SUM(revenue) as value
          FROM daily_revenue
          WHERE created_at BETWEEN $1 AND $2
          GROUP BY DATE_TRUNC($3, created_at)
          ORDER BY date
        `;
        queryParams = [start, end, resolution];
        break;

      case 'users':
        query = `
          SELECT
            DATE_TRUNC($3, created_at) as date,
            COUNT(user_id) as value
          FROM user_activity
          WHERE created_at BETWEEN $1 AND $2
          GROUP BY DATE_TRUNC($3, created_at)
          ORDER BY date
        `;
        queryParams = [start, end, resolution];
        break;

      default:
        throw new Error(`Unknown metric: ${metric}`);
    }

    const result = await pool.query(query, queryParams);
    return result.rows;
  }
}

export function getDataService() {
  return new DataService();
}
```

### 4. Real-time WebSocket Integration

For real-time dashboards, you can add WebSocket support:

```typescript
// server/services/websocketService.ts
import WebSocket from 'ws';
import { Server } from 'http';

export class WebSocketService {
  private wss: WebSocket.Server | null = null;

  initialize(server: Server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws) => {
      console.log('New client connected');

      // Send initial data
      ws.send(JSON.stringify(this.getInitialData()));

      // Set up periodic updates
      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(this.getRealTimeData()));
        }
      }, 5000);

      ws.on('close', () => {
        console.log('Client disconnected');
        clearInterval(interval);
      });
    });
  }

  getInitialData() {
    return {
      timestamp: new Date(),
      metrics: {
        revenue: 125000,
        users: 2340,
        conversion: 18.5,
        orders: 452
      }
    };
  }

  getRealTimeData() {
    // In a real implementation, this would fetch current data
    // For demo, we'll simulate changing values
    return {
      timestamp: new Date(),
      metrics: {
        revenue: 125000 + Math.random() * 1000,
        users: 2340 + Math.floor(Math.random() * 10),
        conversion: 18.5 + (Math.random() - 0.5) * 0.5,
        orders: 452 + Math.floor(Math.random() * 5)
      }
    };
  }
}
```

### 5. Sample Data for Development

For development and testing, you can create mock data:

```typescript
// lib/mockData.ts
export const mockDashboardData = {
  kpiMetrics: [
    { id: 1, title: 'Total Revenue', value: 125430, prefix: '$', suffix: '', trend: 5.2 },
    { id: 2, title: 'Active Users', value: 24590, prefix: '', suffix: '', trend: 1.8 },
    { id: 3, title: 'Conversion Rate', value: 3.24, prefix: '', suffix: '%', trend: 0.7 },
    { id: 4, title: 'Avg. Order Value', value: 89.50, prefix: '$', suffix: '', trend: -0.3 }
  ],

  chartData: [
    { date: 'Jan', value: 4000, target: 3800 },
    { date: 'Feb', value: 3000, target: 3200 },
    { date: 'Mar', value: 2000, target: 2200 },
    { date: 'Apr', value: 2780, target: 2500 },
    { date: 'May', value: 1890, target: 2100 },
    { date: 'Jun', value: 2390, target: 2400 },
    { date: 'Jul', value: 3490, target: 3200 },
    { date: 'Aug', value: 2490, target: 2600 },
    { date: 'Sep', value: 4000, target: 3800 },
    { date: 'Oct', value: 3490, target: 3600 },
    { date: 'Nov', value: 2800, target: 3000 },
    { date: 'Dec', value: 4300, target: 4200 }
  ],

  timelineData: [
    { period: 'Q1', currentValue: 125000, baselineValue: 120000, percentChange: 4.2, description: 'Q1 Budget vs Actual' },
    { period: 'Q2', currentValue: 132000, baselineValue: 128000, percentChange: 3.1, description: 'Q2 Budget vs Actual' },
    { period: 'Q3', currentValue: 145000, baselineValue: 140000, percentChange: 3.6, description: 'Q3 Budget vs Actual' },
    { period: 'Q4', currentValue: 158000, baselineValue: 150000, percentChange: 5.3, description: 'Q4 Budget vs Actual' }
  ]
};
```

## Best Practices

1. **Caching**: Implement server-side caching for frequently accessed data
2. **Error Handling**: Always include proper error handling and fallbacks
3. **Security**: Validate and sanitize all inputs, especially for database queries
4. **Performance**: Use pagination for large datasets
5. **Monitoring**: Log data access patterns and errors for debugging