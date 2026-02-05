const pty = require('node-pty');
const os = require('os');

console.log('Node Version:', process.version);
console.log('Platform:', os.platform());
console.log('Shell:', process.env.SHELL);

try {
  const shell = process.env.SHELL || '/bin/bash';
  const term = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
  });

  console.log('PTY Spawned PID:', term.pid);
  
  term.on('data', (data) => {
    console.log('Data received:', JSON.stringify(data));
    process.exit(0);
  });

  term.write('ls\r');
} catch (e) {
  console.error('PTY Build Failed:', e);
}