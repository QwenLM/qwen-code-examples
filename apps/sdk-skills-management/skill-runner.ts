/**
 * Qwen Code SDK Chimp - Skill Runner
 * 
 * Core Design:
 * 1. System prompt explicitly instructs LLM to execute scripts using tools
 * 2. Directly includes test_task.md content in the prompt
 * 3. LLM processes user input → calls tools → gets results → replies to user
 */

import {
  query,
  isSDKAssistantMessage,
  isSDKPartialAssistantMessage,
  isSDKResultMessage,
  isSDKSystemMessage,
  type SDKUserMessage,
} from '@qwen-code/sdk';
import type {
  SkillContent,
  SkillExecuteOptions,
  SkillExecuteResult,
} from './skill-types';
import { createAuthConfig, getSDKEnv, getSDKAuthType } from './auth';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/** User input queue */
class InputQueue {
  private queue: string[] = [];
  private resolvers: ((value: string | null) => void)[] = [];
  private closed = false;

  async getNext(): Promise<string | null> {
    if (this.closed) return null;
    if (this.queue.length > 0) return this.queue.shift()!;

    return new Promise((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  add(input: string): void {
    if (this.closed) return;

    if (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!;
      resolve(input);
    } else {
      this.queue.push(input);
    }
  }

  close(): void {
    this.closed = true;
    this.resolvers.forEach((resolve) => resolve(null));
    this.resolvers = [];
  }

  isClosed(): boolean {
    return this.closed;
  }
}

/** Skill Runner */
export class SkillRunner {
  private skillContent: SkillContent;
  private sessionId: string;
  private inputQueue: InputQueue;
  private currentQuery: ReturnType<typeof query> | null = null;
  private isInitialized = false;
  private history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private turnPromise: { resolve: (r: SkillExecuteResult) => void; reject: (e: Error) => void; options: SkillExecuteOptions } | null = null;

  constructor(skillContent: SkillContent, sessionId?: string) {
    this.skillContent = skillContent;
    this.sessionId = sessionId || crypto.randomUUID();
    this.inputQueue = new InputQueue();
  }

  /**
   * Execute Skill script
   */
  private executeScript(userInput: string): { status: string; output: string; error?: string; data?: any } {
    try {
      const scriptPath = path.join(this.skillContent.path, 'scripts', 'main.py');
      
      if (!fs.existsSync(scriptPath)) {
        return { 
          status: 'error', 
          output: '', 
          error: `Script not found: ${scriptPath}` 
        };
      }

      const result = execSync(`python3 "${scriptPath}" "${userInput}"`, {
        encoding: 'utf-8',
        timeout: 30000,
        cwd: this.skillContent.path,
      });

      // Try to parse JSON output
      try {
        const jsonResult = JSON.parse(result);
        return { status: 'success', output: result, data: jsonResult };
      } catch {
        return { status: 'success', output: result };
      }
    } catch (error: any) {
      console.error(`[SkillRunner] Script execution failed:`, error.message);
      return { 
        status: 'error', 
        output: '', 
        error: error.message || String(error) 
      };
    }
  }

  /**
   * Create system prompt - includes skill info, lets LLM decide whether to execute script
   */
  private createSystemPrompt(): string {
    const parts: string[] = [];

    // Load SKILL.md content
    parts.push('# Skill Information');
    parts.push('');
    parts.push(this.skillContent.skillMd);
    parts.push('');

    // If there's README.md, include it as reference
    if (this.skillContent.readmeMd) {
      parts.push('# Additional Information');
      parts.push('');
      parts.push(this.skillContent.readmeMd);
      parts.push('');
    }

    // Explain how to request script execution
    parts.push('# How to Use');
    parts.push('');
    parts.push('**Important**: The reference data above has been fully provided to you, do not attempt to read files.');
    parts.push('');
    parts.push('When you receive user input, if you need to execute a script to complete the task, include the following marker in your response:');
    parts.push('');
    parts.push('```');
    parts.push('[EXECUTE_SCRIPT]');
    parts.push('user_input: <user\'s original input>');
    parts.push('[/EXECUTE_SCRIPT]');
    parts.push('```');
    parts.push('');
    parts.push('After the script executes, you will receive the result, then reply to the user based on the result.');
    parts.push('');
    return parts.join('\n');
  }

  /**
   * Create message stream
   */
  private async *createMessageStream(): AsyncIterable<SDKUserMessage> {
    while (!this.inputQueue.isClosed()) {
      const input = await this.inputQueue.getNext();
      if (input === null) break;

      yield {
        type: 'user',
        session_id: this.sessionId,
        message: {
          role: 'user',
          content: input,
        },
        parent_tool_use_id: null,
      } as SDKUserMessage;

      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /**
   * Start message consumer loop
   */
  private async startConsumer(options: SkillExecuteOptions): Promise<void> {
    const authConfig = createAuthConfig();
    const sdkEnv = getSDKEnv(authConfig);
    const authType = getSDKAuthType(authConfig);

    const q = query({
      prompt: this.createMessageStream(),
      options: {
        env: sdkEnv,
        authType: authType,
        model: options.model || authConfig.model,
        includePartialMessages: true,
        // Disable tool calls, let LLM analyze directly
        canUseTool: async (toolName, input) => {
          console.log(`[SkillRunner] LLM attempted to call tool: ${toolName}, but we don't support tool calls`);
          return { 
            behavior: 'deny', 
            message: 'Please analyze directly based on the provided reference data, do not call tools' 
          };
        },
      },
    });

    this.currentQuery = q;
    
    await q.initialized;
    this.isInitialized = true;

    // Continuously consume messages
    let fullResponse = '';

    try {
      for await (const message of q) {
        // System message - ignore
        if (isSDKSystemMessage(message)) {
          continue;
        }

        // Streaming text
        if (isSDKPartialAssistantMessage(message)) {
          if (message.event.type === 'content_block_delta') {
            const delta = message.event.delta;
            if (delta.type === 'text_delta') {
              fullResponse += delta.text;

              // Filter out [EXECUTE_SCRIPT] markers from streaming output
              if (this.turnPromise?.options.onChunk) {
                // Only check for [EXECUTE_SCRIPT] marker, not just [
                const hasScriptMarker = fullResponse.includes('[EXECUTE_SCRIPT]');
                
                if (!hasScriptMarker) {
                  // No marker detected, output normally
                  this.turnPromise.options.onChunk(delta.text);
                }
                // If script marker detected, stop streaming output
              }
            }
          }
        }

        // Complete assistant message
        else if (isSDKAssistantMessage(message)) {
          for (const block of message.message.content) {
            if (block.type === 'text' && !fullResponse) {
              fullResponse = block.text;
            } else if (block.type === 'tool_use') {
              console.log(`[SkillRunner] LLM called tool: ${block.name}`);
            }
          }
        }

        // Result message - end of turn
        else if (isSDKResultMessage(message)) {
          if (message.subtype === 'success') {
            // Detect if contains script execution request
            const scriptRequest = this.detectScriptExecutionRequest(fullResponse);
            
            if (scriptRequest) {
              // First add LLM's response to history (including script execution request)
              this.history.push({ role: 'assistant', content: fullResponse });
              
              // Execute script
              const scriptResult = this.executeScript(scriptRequest);
              
              // Send script result as new message to LLM
              const resultMessage = this.buildScriptResultMessage(scriptResult);
              this.inputQueue.add(resultMessage);
              
              // Reset response buffer, wait for LLM's new response based on script result
              fullResponse = '';
              
              // Don't end this turn, continue waiting for LLM's new response
              continue;
            }
            
            
            // No script execution request, end turn normally
            // Add to history
            if (fullResponse) {
              this.history.push({ role: 'assistant', content: fullResponse });
            }

            // Return result
            if (this.turnPromise) {
              this.turnPromise.resolve({
                status: 'success',
                content: fullResponse,
                needMoreInput: false,
                sessionId: this.sessionId,
                history: [...this.history],
              });
              this.turnPromise = null;
            }

            // Reset response buffer
            fullResponse = '';
          } else {
            if (this.turnPromise) {
              this.turnPromise.reject(new Error(message.error?.message || 'Execution failed'));
              this.turnPromise = null;
            }
          }
        }
      }
    } catch (error) {
      console.error('[SkillRunner] Consumer loop error:', error);
      if (this.turnPromise) {
        this.turnPromise.reject(error as Error);
        this.turnPromise = null;
      }
    }
  }

  /**
   * Build complete message with skill information
   * Always includes skill info to ensure LLM can always see complete context
   */
  private buildMessageWithSkillContext(userPrompt: string): string {
    const parts: string[] = [];
    
    // Always include complete skill information
    parts.push(this.createSystemPrompt());
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push(`User Input: ${userPrompt}`);
    
    return parts.join('\n');
  }

  /**
   * Execute/continue conversation
   */
  async execute(
    prompt: string,
    options: SkillExecuteOptions = {}
  ): Promise<SkillExecuteResult> {
    // Add to history
    this.history.push({ role: 'user', content: prompt });

    // Always build complete message with skill context
    const messageWithContext = this.buildMessageWithSkillContext(prompt);

    // First execution: start consumer loop
    if (!this.isInitialized) {
      // Create promise for this turn
      const promise = new Promise<SkillExecuteResult>((resolve, reject) => {
        this.turnPromise = { resolve, reject, options };
      });

      // Start consumer loop
      this.startConsumer(options);

      // Send message with skill context
      this.inputQueue.add(messageWithContext);

      return promise;
    }

    // Subsequent execution: also send complete message with skill context
    const promise = new Promise<SkillExecuteResult>((resolve, reject) => {
      this.turnPromise = { resolve, reject, options };
    });

    // Always send complete message with skill information
    this.inputQueue.add(messageWithContext);

    return promise;
  }

  /**
   * Detect if LLM response contains script execution request
   */
  private detectScriptExecutionRequest(response: string): string | null {
    const match = response.match(/\[EXECUTE_SCRIPT\]\s*user_input:\s*([\s\S]+?)\s*\[\/EXECUTE_SCRIPT\]/);
    if (match) {
      return match[1].trim();
    }
    return null;
  }

  /**
   * Build script execution result message
   */
  private buildScriptResultMessage(scriptResult: { status: string; output: string; error?: string; data?: any }): string {
    const parts: string[] = [];
    
    parts.push('[SCRIPT_RESULT]');
    parts.push('');
    
    if (scriptResult.status === 'success') {
      parts.push('Script executed successfully, results are as follows:');
      parts.push('');
      parts.push('```json');
      parts.push(scriptResult.output);
      parts.push('```');
      parts.push('');
      parts.push('Please reply to the user based on the above results. If the results contain multiple options, clearly list them and ask the user to choose.');
    } else {
      parts.push('Script execution failed:');
      parts.push(scriptResult.error || 'Unknown error');
      parts.push('');
      parts.push('Please answer the user directly based on the reference data.');
    }
    
    parts.push('[/SCRIPT_RESULT]');
    
    return parts.join('\n');
  }

  /**
   * Continue conversation
   */
  async continue(prompt: string, options?: SkillExecuteOptions): Promise<SkillExecuteResult> {
    return this.execute(prompt, options);
  }

  /**
   * Get history
   */
  getHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return [...this.history];
  }

  /**
   * End session
   */
  async end(): Promise<void> {
    this.inputQueue.close();
    if (this.currentQuery) {
      await this.currentQuery.close();
    }
    this.isInitialized = false;
  }

  /**
   * Check if more input is needed
   */
  private checkNeedMoreInput(response: string): boolean {
    const indicators = [
      'please provide more information',
      'please tell me',
      'please specify',
      'please confirm',
      'need to know',
      'please supplement',
    ];

    const lowerResponse = response.toLowerCase();
    return indicators.some((indicator) =>
      lowerResponse.includes(indicator.toLowerCase())
    );
  }

  /**
   * 尝试解析 JSON
   */
  private tryParseJson(text: string): Record<string, unknown> | undefined {
    const patterns = [
      /```json\s*([\s\S]*?)```/,
      /```\s*([\s\S]*?)```/,
      /({[\s\S]*})/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          return JSON.parse(match[1] || match[0]);
        } catch {
          continue;
        }
      }
    }

    return undefined;
  }
}

export default SkillRunner;
