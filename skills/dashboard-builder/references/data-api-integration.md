# Data API Integration Guide

## Table of Contents
- [Getting Started](#getting-started)
- [Configuring Data Sources](#configuring-data-sources)
- [Express Backend Example](#express-backend-example)
- [Error Handling](#error-handling)

## Getting Started

This guide covers connecting various data sources to your dashboard:

1. REST APIs
2. GraphQL endpoints
3. Database connections (PostgreSQL, MongoDB, etc.)
4. Static JSON files
5. Real-time WebSocket connections

## Configuring Data Sources

### Environment Variables

```
# For API connections
API_BASE_URL=https://your-api.example.com
API_KEY=your_api_key_here
API_TIMEOUT=10000

# For database connections
DATABASE_URL=postgresql://username:password@localhost:5432/mydb
DB_SSL_CERT_PATH=./certs/db-cert.pem
```

### Configuration Schema

```typescript
interface DataSourceConfig {
  type: 'rest' | 'graphql' | 'database' | 'websocket' | 'static';
  url?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  query?: string; // For GraphQL
  reconnectInterval?: number; // For WebSocket
  timeout?: number;
}
```

## Express Backend Example

```typescript
// services/dataService.ts
import axios from 'axios';

const API_KEY = process.env.DATA_API_KEY;
const BASE_URL = process.env.DATA_API_BASE_URL;

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

export async function fetchMetricData(metricName: string, params: any = {}) {
  const cacheKey = `metric_${metricName}_${JSON.stringify(params)}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const response = await axios.get(`${BASE_URL}/metrics/${metricName}`, {
    params,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  const result = response.data;

  cache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

export async function fetchHistoricalData(
  metricName: string,
  startDate: Date,
  endDate: Date,
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily'
) {
  const cacheKey = `historical_${metricName}_${startDate.toISOString()}_${endDate.toISOString()}_${interval}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 5) {
    return cached.data;
  }

  const response = await axios.get(`${BASE_URL}/historical/${metricName}`, {
    params: {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      interval
    },
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });

  const result = response.data.map((item: any) => ({
    date: item.date,
    value: parseFloat(item.value),
    ...item.metadata
  }));

  cache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}
```

## Error Handling

Common error patterns to implement:

```typescript
// Error handling patterns
export function handleApiError(error: any): { message: string; code: string } {
  if (error.response) {
    // Server responded with error status
    switch (error.response.status) {
      case 401:
        return { message: 'Unauthorized access. Please check your API key.', code: 'AUTH_ERROR' };
      case 403:
        return { message: 'Access forbidden. Insufficient permissions.', code: 'FORBIDDEN_ERROR' };
      case 404:
        return { message: 'Requested resource not found.', code: 'NOT_FOUND_ERROR' };
      case 429:
        return { message: 'Rate limit exceeded. Please slow down requests.', code: 'RATE_LIMIT_ERROR' };
      case 500:
        return { message: 'Internal server error. Please try again later.', code: 'SERVER_ERROR' };
      default:
        return { message: `Server error: ${error.response.statusText}`, code: 'UNKNOWN_ERROR' };
    }
  } else if (error.request) {
    // Request made but no response received
    return { message: 'Network error. Please check your connection.', code: 'NETWORK_ERROR' };
  } else {
    // Something else happened
    return { message: error.message, code: 'CLIENT_ERROR' };
  }
}
```