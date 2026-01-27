'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SummaryMessageProps {
  content: string;
}

// Parse summary format from message content
function parseSummary(content: string): { isSummary: boolean; title: string; items: string[]; conclusion: string } {
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
  
  // Check if this is a summary message
  // Summary typically starts with completion phrases and contains structured content
  const completionPhrases = [
    '已完成',
    '完成了',
    'completed',
    'finished',
    'created',
    'built',
    '创建了',
    '构建了',
  ];
  
  const firstLine = lines[0]?.toLowerCase() || '';
  const isSummary = completionPhrases.some(phrase => firstLine.includes(phrase.toLowerCase())) &&
                    lines.length > 3; // Summary should have multiple lines
  
  if (!isSummary) {
    return { isSummary: false, title: '', items: [], conclusion: '' };
  }
  
  const title = lines[0];
  const items: string[] = [];
  let conclusion = '';
  let inItemsSection = false;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line is an item (starts with bullet, dash, or contains dash/colon separator)
    if (line.match(/^[-•·*]\s/) || line.includes(' - ') || line.includes('：') || line.includes(':')) {
      inItemsSection = true;
      items.push(line.replace(/^[-•·*]\s*/, ''));
    } else if (inItemsSection && line.length > 0) {
      // After items section, treat remaining as conclusion
      conclusion = lines.slice(i).join(' ');
      break;
    } else if (!inItemsSection && i === lines.length - 1) {
      // Last line might be conclusion
      conclusion = line;
    }
  }
  
  return { isSummary, title, items, conclusion };
}

export function SummaryMessage({ content }: SummaryMessageProps) {
  const { isSummary, title, items, conclusion } = parseSummary(content);
  
  if (!isSummary) {
    return null;
  }
  
  return (
    <div className="bg-gradient-to-br from-green-900/20 to-blue-900/20 rounded-lg p-4 border border-green-700/30">
      {/* Summary header with icon */}
      <div className="flex items-start gap-3 mb-3">
        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-gray-200 font-medium">{title}</p>
        </div>
      </div>
      
      {/* Summary items */}
      {items.length > 0 && (
        <div className="ml-8 space-y-2 mb-3">
          {items.map((item, index) => (
            <div key={index} className="text-sm text-gray-300">
              {item}
            </div>
          ))}
        </div>
      )}
      
      {/* Conclusion */}
      {conclusion && (
        <div className="ml-8 mt-3 pt-3 border-t border-gray-700/50">
          <p className="text-sm text-gray-400">{conclusion}</p>
        </div>
      )}
    </div>
  );
}

// Check if content contains a summary
export function containsSummary(content: string): boolean {
  const { isSummary } = parseSummary(content);
  return isSummary;
}
