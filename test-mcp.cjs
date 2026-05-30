const { spawn } = require('child_process');

const proc = spawn('node', ['dist/index.js', 'mcp'], {
  cwd: '/home/hulizheng/projects/cortex',
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
proc.stdout.on('data', (data) => {
  output += data.toString();
  const lines = output.split('\n');
  output = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.result) {
        console.log('Response:', JSON.stringify(msg.result).substring(0, 300));
      }
      if (msg.id === 2) {
        // After tools/list, send tools/call
        const callReq = {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'get_stats',
            arguments: {}
          }
        };
        proc.stdin.write(JSON.stringify(callReq) + '\n');
      }
      if (msg.id === 3) {
        proc.kill();
        process.exit(0);
      }
    } catch {}
  }
});

proc.stderr.on('data', (data) => {
  // Ignore stderr
});

// Send initialize
const initReq = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0.1.0' } }
};
proc.stdin.write(JSON.stringify(initReq) + '\n');

// Send tools/list
setTimeout(() => {
  const listReq = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  };
  proc.stdin.write(JSON.stringify(listReq) + '\n');
}, 100);

setTimeout(() => {
  proc.kill();
  process.exit(1);
}, 5000);
