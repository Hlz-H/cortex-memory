const { execSync } = require('child_process');
const path = require('path');
const projectDir = '/home/hulizheng/projects/cortex';

execSync(`rm -f ${require('os').homedir()}/.cortex/memory.db`, { cwd: projectDir });

function run(cmd) {
  const out = execSync(`cd ${projectDir} && node dist/index.js ${cmd}`, { encoding: 'utf8', timeout: 10000 });
  console.log(`$ cortex ${cmd}`);
  console.log(out.trim().split('\n').slice(0,5).join('\n'));
  console.log();
  return out;
}

run('init');
run('add "Phase 1 complete" -t milestone --important');
run('add "Instant note" --instant');
run('add "Normal note" -t normal');
run('list');
run('search "Phase"');
run('search "note"');

console.log('=== DONE ===');
