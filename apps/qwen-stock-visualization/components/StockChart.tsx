'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart, Area } from 'recharts';

type ChartData = {
  timestamp: string;
  price: number;
  volume?: number;
};

type StockChartProps = {
  data: ChartData[];
  title: string;
  type?: 'line' | 'bar' | 'area';
};

export default function StockChart({ data, title, type = 'line' }: StockChartProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()} 
              />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip 
                formatter={(value) => [`$${value}`, '价格']}
                labelFormatter={(value) => `日期: ${new Date(value).toLocaleString()}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                name="价格"
              />
            </LineChart>
          ) : type === 'bar' ? (
            <BarChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()} 
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`${value}`, '成交量']}
                labelFormatter={(value) => `日期: ${new Date(value).toLocaleString()}`}
              />
              <Legend />
              <Bar dataKey="volume" fill="#82ca9d" name="成交量" />
            </BarChart>
          ) : (
            <ComposedChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()} 
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => 
                  name === 'price' ? [`$${value}`, '价格'] : [`${value}`, '成交量']
                }
                labelFormatter={(value) => `日期: ${new Date(value).toLocaleString()}`}
              />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="price" fill="#8884d8" stroke="#8884d8" name="价格" />
              <Bar yAxisId="right" dataKey="volume" barSize={20} fill="#82ca9d" name="成交量" />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}