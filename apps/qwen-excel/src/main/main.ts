/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import { query, type SDKMessage } from '@qwen-code/sdk';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import fs from 'fs';
import path from 'path';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

// Handle file download requests
ipcMain.handle('download-file', async (event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: path.basename(filePath),
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'Word Files', extensions: ['docx', 'doc'] },
      ],
    });

    if (!result.canceled && result.filePath) {
      await fs.promises.copyFile(filePath, result.filePath);
      return { success: true, savedPath: result.filePath };
    }

    return { success: false, error: 'Download cancelled' };
  } catch (error) {
    console.error('Download error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

// Handle requests to open output directory
ipcMain.handle('open-output-directory', async () => {
  const outputDir = path.join(process.cwd(), 'agent');
  try {
    if (fs.existsSync(outputDir)) {
      shell.openPath(outputDir);
      return { success: true };
    } else {
      return { success: false, error: 'Output directory not found' };
    }
  } catch (error) {
    console.error('Error opening directory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

ipcMain.on(
  'claude-code:query',
  async (
    event,
    data:
      | string
      | { content: string; files?: { name: string; buffer: ArrayBuffer }[] },
  ) => {
    const abortController = new AbortController();
    const cwd = path.join(process.cwd(), 'agent');
    const problemsDir = path.join(cwd, 'problems');
    const outputDir = cwd; // Watch the agent directory itself, not a subdirectory
    console.log('Querying!', cwd);

    // Track files in output directory before starting
    let initialOutputFiles: string[] = [];
    try {
      if (fs.existsSync(outputDir)) {
        initialOutputFiles = fs.readdirSync(outputDir).filter(file => {
          // Only include .xlsx and .csv files
          const filePath = path.join(outputDir, file);
          const ext = path.extname(file).toLowerCase();
          return fs.statSync(filePath).isFile() &&
                 (ext === '.xlsx' || ext === '.csv');
        });
      }
    } catch (error) {
      console.warn('Could not read initial output directory:', error);
    }

    const BASE_PROMPT = ``;

    // Handle both old string format and new object format for backward compatibility
    let prompt: string = BASE_PROMPT;
    let files: { name: string; buffer: ArrayBuffer }[] | undefined;

    if (typeof data === 'string') {
      prompt += data;
    } else {
      prompt += data.content;
      files = data.files;
    }

    try {
      // Save uploaded files to problems directory
      if (files && files.length > 0) {
        const fs = require('fs').promises;

        // Ensure problems directory exists
        try {
          await fs.access(problemsDir);
        } catch {
          await fs.mkdir(problemsDir, { recursive: true });
        }

        for (const file of files) {
          try {
            // Validate file size (10MB limit)
            if (file.buffer.byteLength > 10 * 1024 * 1024) {
              console.warn(
                `File ${file.name} is too large (${Math.round(file.buffer.byteLength / 1024 / 1024)}MB), skipping`,
              );
              event.reply(
                'claude-code:error',
                `File ${file.name} is too large. Maximum size is 10MB.`,
              );
              continue;
            }

            // Generate unique filename to avoid conflicts
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const ext = path.extname(file.name);
            const baseName = path.basename(file.name, ext);
            const uniqueFileName = `${baseName}_${timestamp}_${randomSuffix}${ext}`;
            const filePath = path.join(problemsDir, uniqueFileName);

            // Convert ArrayBuffer to Buffer and save
            const buffer = Buffer.from(file.buffer);
            await fs.writeFile(filePath, buffer);

            console.log(`Saved file: ${uniqueFileName} to ${problemsDir}`);

            // Append file information to prompt
            prompt += `\n\nUploaded file: ${uniqueFileName} (saved to ${filePath})`;
          } catch (fileError) {
            console.error(`Error processing file ${file.name}:`, fileError);
            event.reply(
              'claude-code:error',
              `Failed to save file ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
            );
          }
        }
      }

      const messages: SDKMessage[] = [];

      const queryIterator = query({
        prompt,
        options: {
          cwd,
          abortController,
          maxSessionTurns: 100,
          permissionMode: 'yolo', 
          allowedTools: [
            'run_terminal_cmd',
            'read_file',
            'write_file',
            'edit_file',
            'web_search',
            'grep',
            'skill',
            'todo_write',
            'todo_edit',
          ],
          // Pass environment variables to ensure skills are discoverable
          env: {
            ...process.env,
            QWEN_SKILLS_DIR: path.join(cwd, '.qwen', 'skills'), // Explicitly set skills directory
          },
          // Enable agents/subagents for skill functionality
          agents: [],
          // Use local Qwen Code CLI
          pathToQwenExecutable: 'qwen', // Assumes qwen CLI is installed globally
          authType: undefined, // Skip cloud authentication for local execution
        },
      });

      // eslint-disable-next-line no-restricted-syntax
      for await (const message of queryIterator) {
        messages.push(message);
        console.log(JSON.stringify(message));
        event.reply('claude-code:response', message);
        // 如果是结果消息，也要发送完成信号
        if (message.type === 'result') {
          console.log('Received result message, but continuing to ensure generator does not end prematurely');
        }
      }

      // 确保在所有消息处理完成后才继续执行后续逻辑
      console.log('All messages processed, proceeding with file check');

      // Check for new output files after completion
      try {
        if (fs.existsSync(outputDir)) {
          const finalOutputFiles = fs.readdirSync(outputDir);
          const newFiles = finalOutputFiles.filter((file) => {
            // Only include new files that are .xlsx or .csv
            if (initialOutputFiles.includes(file)) {
              return false;
            }
            const filePath = path.join(outputDir, file);
            const ext = path.extname(file).toLowerCase();
            return fs.statSync(filePath).isFile() &&
                   (ext === '.xlsx' || ext === '.csv');
          });

          if (newFiles.length > 0) {
            const outputFiles = newFiles.map((fileName) => ({
              name: fileName,
              path: path.join(outputDir, fileName),
              size: fs.statSync(path.join(outputDir, fileName)).size,
              created: fs.statSync(path.join(outputDir, fileName)).mtime,
            }));

            console.log('New output files detected:', outputFiles);
            event.reply('claude-code:output-files', outputFiles);
          }
        }
      } catch (error) {
        console.warn('Error checking for output files:', error);
      }

      console.log('FINISHED CLAUDE CODE EVALUATION!');
    } catch (error) {
      console.error('Claude Code SDK error:', error);
      event.reply(
        'claude-code:error',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  },
);

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  console.log('createWindow called');
  if (isDebug) {
    console.log('Installing extensions...');
    await installExtensions();
    console.log('Extensions installed');
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  console.log('Creating main window...');
  mainWindow = new BrowserWindow({
    show: true, // show immediately for debugging
    width: 1024,
    height: 728,
    // icon: getAssetPath('icon.png'), // temporarily disabled for debugging
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  console.log('Main window created successfully');

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    console.log('App ready, creating window...');
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
