import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// Execute terminal command with streaming output
export async function POST(request: NextRequest) {
  try {
    const { sessionId, command } = await request.json();

    if (!sessionId || !command) {
      return new Response(
        JSON.stringify({ error: 'sessionId and command are required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const workspaceDir = join(tmpdir(), 'qwen-bolt', sessionId);

    // Find available port for dev server commands
    const findAvailablePort = async (start: number = 5173): Promise<number> => {
      return new Promise((resolve, reject) => {
        const net = require('net');
        const server = net.createServer();
        
        server.listen(start, '0.0.0.0', () => {
          const port = server.address().port;
          server.close(() => resolve(port));
        });
        
        server.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            resolve(findAvailablePort(start + 1));
          } else {
            reject(err);
          }
        });
      });
    };

    // Check if command is a dev server start command
    const isDevServerCommand = command.includes('npm start') || 
                               command.includes('npm run start') || 
                               command.includes('npm run dev') ||
                               command.includes('yarn start') ||
                               command.includes('yarn dev');

    // Get available port if needed
    let port: number | undefined;
    if (isDevServerCommand) {
      port = await findAvailablePort();
    }

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Set environment variables including PORT
        const env = { 
          ...process.env,
          ...(port ? { 
            PORT: String(port),
            VITE_PORT: String(port),
            REACT_APP_PORT: String(port),
            BROWSER: 'none'
          } : {})
        };

        const childProcess = spawn(command, [], {
          cwd: workspaceDir,
          shell: true,
          env,
        });

        // Send port info if this is a dev server command
        if (port) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'output', 
              data: `\n[Starting dev server on port ${port}...]\n` 
            })}\n\n`)
          );
        }

        let hasOutput = false;

        // Send stdout data
        childProcess.stdout?.on('data', (data) => {
          hasOutput = true;
          const text = data.toString();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'output', data: text })}\n\n`)
          );
        });

        // Send stderr data
        childProcess.stderr?.on('data', (data) => {
          hasOutput = true;
          const text = data.toString();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'output', data: text })}\n\n`)
          );
        });

        // Handle process completion
        childProcess.on('close', (code) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'complete', 
              exitCode: code,
              success: code === 0 
            })}\n\n`)
          );
          controller.close();
        });

        // Handle errors
        childProcess.on('error', (error) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: error.message 
            })}\n\n`)
          );
          controller.close();
        });

        // Timeout after 5 minutes
        const timeout = setTimeout(() => {
          childProcess.kill();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: 'Command execution timeout after 5 minutes' 
            })}\n\n`)
          );
          controller.close();
        }, 300000);

        // Clear timeout when process completes
        childProcess.on('close', () => {
          clearTimeout(timeout);
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Terminal API] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
