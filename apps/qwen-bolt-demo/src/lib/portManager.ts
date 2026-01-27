// 端口管理器 - 管理开发服务器端口分配
export class PortManager {
  private static instance: PortManager;
  private usedPorts: Set<number> = new Set();
  private sessionPorts: Map<string, number> = new Map();
  private readonly PORT_RANGE_START = 3001;
  private readonly PORT_RANGE_END = 3100;

  private constructor() {}

  static getInstance(): PortManager {
    if (!PortManager.instance) {
      PortManager.instance = new PortManager();
    }
    return PortManager.instance;
  }

  // 为会话分配端口
  allocatePort(sessionId: string): number {
    // 如果已经分配过，返回现有端口
    if (this.sessionPorts.has(sessionId)) {
      return this.sessionPorts.get(sessionId)!;
    }

    // 查找可用端口
    for (let port = this.PORT_RANGE_START; port <= this.PORT_RANGE_END; port++) {
      if (!this.usedPorts.has(port)) {
        this.usedPorts.add(port);
        this.sessionPorts.set(sessionId, port);
        console.log(`[PortManager] Allocated port ${port} for session ${sessionId}`);
        return port;
      }
    }

    throw new Error('No available ports in range');
  }

  // 释放端口
  releasePort(sessionId: string): void {
    const port = this.sessionPorts.get(sessionId);
    if (port) {
      this.usedPorts.delete(port);
      this.sessionPorts.delete(sessionId);
      console.log(`[PortManager] Released port ${port} for session ${sessionId}`);
    }
  }

  // 获取会话的端口
  getPort(sessionId: string): number | undefined {
    return this.sessionPorts.get(sessionId);
  }

  // 检查端口是否被使用
  isPortUsed(port: number): boolean {
    return this.usedPorts.has(port);
  }
}

// 开发服务器检测器
export class DevServerDetector {
  private static patterns = [
    // Vite
    { regex: /Local:\s+http:\/\/localhost:(\d+)/, framework: 'Vite' },
    { regex: /Local:\s+http:\/\/127\.0\.0\.1:(\d+)/, framework: 'Vite' },
    
    // React (Create React App)
    { regex: /webpack compiled|Compiled successfully|On Your Network:\s+http:\/\/\d+\.\d+\.\d+\.\d+:(\d+)/, framework: 'React' },
    { regex: /Local:\s+http:\/\/localhost:(\d+)/, framework: 'React' },
    
    // Next.js
    { regex: /ready - started server on.*http:\/\/localhost:(\d+)/, framework: 'Next.js' },
    { regex: /Ready on http:\/\/localhost:(\d+)/, framework: 'Next.js' },
    
    // Vue CLI
    { regex: /App running at:\s+- Local:\s+http:\/\/localhost:(\d+)/, framework: 'Vue' },
    
    // Angular
    { regex: /Local:\s+http:\/\/localhost:(\d+)/, framework: 'Angular' },
    
    // 通用模式
    { regex: /http:\/\/localhost:(\d+)/, framework: 'Unknown' },
  ];

  static detect(output: string): { detected: boolean; port?: number; framework?: string } {
    for (const pattern of this.patterns) {
      const match = output.match(pattern.regex);
      if (match) {
        const port = match[1] ? parseInt(match[1], 10) : undefined;
        return {
          detected: true,
          port,
          framework: pattern.framework,
        };
      }
    }
    return { detected: false };
  }
}
