const { execSync } = require('child_process');
const projectDir = '/home/hulizheng/projects/cortex';
const homedir = require('os').homedir();

execSync(`rm -f ${homedir}/.cortex/memory.db`, { cwd: projectDir });

function run(cmd) {
  try {
    const out = execSync(`cd ${projectDir} && node dist/index.js ${cmd}`, { encoding: 'utf8', timeout: 10000 });
    console.log(`$ cortex ${cmd}`);
    console.log(out.trim().split('\n').slice(0, 8).join('\n'));
    console.log();
    return out;
  } catch(e) {
    console.log(`$ cortex ${cmd}`);
    console.log('ERROR:', (e.stderr || e.message || '').substring(0, 300));
    console.log();
    return null;
  }
}

run('init');
run('add "Phase 1 complete. Memory engine with 4 tiers, tags, and links." -t milestone -c setup --important');
run('add "Quick instant note for testing" --instant');
run('add "Project idea about local AI agents working together" -t idea -t ai -c projects');
run('list');
run('stats');
run('search "Phase 1"');

console.log('=== CLI TESTS COMPLETE ===');
