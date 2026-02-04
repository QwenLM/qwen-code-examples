import { join } from 'path';
import { readFile, access } from 'fs/promises';
import { readdirSync } from 'fs';

export type ProjectType = 'react' | 'vue' | 'vite' | 'static' | 'unknown';

export interface ProjectInfo {
  type: ProjectType;
  framework: string;
  startCommand: string;
  actualWorkspaceDir: string;
}

export async function detectProjectType(workspaceDir: string): Promise<ProjectInfo> {
  try {
    // 先检查根目录是否有 package.json
    let packageJsonPath = join(workspaceDir, 'package.json');
    let actualWorkspaceDir = workspaceDir;
    
    try {
      await access(packageJsonPath);
    } catch {
      // 根目录没有 package.json，检查是否有子目录包含项目
      const entries = readdirSync(workspaceDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDirPath = join(workspaceDir, entry.name);
          const subPackageJsonPath = join(subDirPath, 'package.json');
          
          try {
            await access(subPackageJsonPath);
            // 找到了包含 package.json 的子目录
            packageJsonPath = subPackageJsonPath;
            actualWorkspaceDir = subDirPath;
            console.log(`[DevServer] Found project in subdirectory: ${entry.name}`);
            break;
          } catch {
            // 继续检查下一个子目录
          }
        }
      }
    }
    
    // 再次检查是否找到了 package.json
    try {
      await access(packageJsonPath);
    } catch {
      throw new Error('No package.json found');
    }
    
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

    // 获取可用的脚本
    const scripts = packageJson.scripts || {};
    
    // 优先级：dev > start > serve
    let startCommand = 'npm start'; // 默认
    if (scripts.dev) {
      startCommand = 'npm run dev';
    } else if (scripts.start) {
      startCommand = 'npm start';
    } else if (scripts.serve) {
      startCommand = 'npm run serve';
    }

    // 检测 React
    if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
      if (packageJson.dependencies?.vite || packageJson.devDependencies?.vite) {
        return {
          type: 'vite',
          framework: 'React + Vite',
          startCommand,
          actualWorkspaceDir,
        };
      }
      return {
        type: 'react',
        framework: 'React',
        startCommand,
        actualWorkspaceDir,
      };
    }

    // 检测 Vue
    if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
      return {
        type: 'vue',
        framework: 'Vue',
        startCommand,
        actualWorkspaceDir,
      };
    }

    // 检测 Vite
    if (packageJson.dependencies?.vite || packageJson.devDependencies?.vite) {
      return {
        type: 'vite',
        framework: 'Vite',
        startCommand,
        actualWorkspaceDir,
      };
    }

    // 有 package.json 但不确定类型
    return {
      type: 'unknown',
      framework: 'Node.js',
      startCommand,
      actualWorkspaceDir,
    };
  } catch {
    // 没有 package.json，可能是静态 HTML
    return {
      type: 'static',
      framework: 'Static HTML',
      startCommand: '',
      actualWorkspaceDir: workspaceDir,
    };
  }
}
