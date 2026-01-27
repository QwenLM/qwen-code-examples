'use client';

import React from 'react';
import { Check, Circle } from 'lucide-react';

interface PlanTask {
  text: string;
  completed: boolean;
}

interface PlanMessageProps {
  content: string;
}

// Parse plan format from message content
function parsePlan(content: string): { isPlan: boolean; tasks: PlanTask[]; isCompleted: boolean } {
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
  
  // Check if this is a plan message
  const isPlan = lines.some(line => 
    line.includes('Plan') || 
    line.match(/^[☰≡]\s*Plan/i) ||
    line.match(/^#+\s*Plan/i)
  );
  
  if (!isPlan) {
    return { isPlan: false, tasks: [], isCompleted: false };
  }
  
  const tasks: PlanTask[] = [];
  let isCompleted = false;
  
  for (const line of lines) {
    // Skip plan header
    if (line.match(/^[☰≡#]\s*Plan/i)) continue;
    
    // Check for completion status
    if (line.match(/Plan\s+completed/i) || line.match(/^✓\s*Plan\s+completed/i)) {
      isCompleted = true;
      continue;
    }
    
    // Parse task lines
    // Format: "✓ Task description" or "○ Task description" or "- Task description"
    const completedMatch = line.match(/^[✓✔☑]\s*(.+)$/);
    const pendingMatch = line.match(/^[○◯⭕-]\s*(.+)$/);
    
    if (completedMatch) {
      tasks.push({ text: completedMatch[1], completed: true });
    } else if (pendingMatch) {
      tasks.push({ text: pendingMatch[1], completed: false });
    } else if (line && !line.match(/^[☰≡#]/)) {
      // If line doesn't start with a marker but looks like a task, treat as pending
      tasks.push({ text: line, completed: false });
    }
  }
  
  return { isPlan, tasks, isCompleted };
}

export function PlanMessage({ content }: PlanMessageProps) {
  const { isPlan, tasks, isCompleted } = parsePlan(content);
  
  if (!isPlan) {
    return null;
  }
  
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      {/* Plan header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
        <span className="text-gray-400">☰</span>
        <span className="font-semibold text-white">Plan</span>
      </div>
      
      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <div key={index} className="flex items-start gap-2">
            {task.completed ? (
              <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
            )}
            <span className={`text-sm ${task.completed ? 'text-gray-300' : 'text-gray-400'}`}>
              {task.text}
            </span>
          </div>
        ))}
      </div>
      
      {/* Completion status */}
      {isCompleted && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-700">
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-400 font-medium">Plan completed</span>
        </div>
      )}
    </div>
  );
}

// Check if content contains a plan
export function containsPlan(content: string): boolean {
  const { isPlan } = parsePlan(content);
  return isPlan;
}
