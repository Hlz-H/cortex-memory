const { execSync } = require('child_process');
const projectDir = '/home/hulizheng/projects/cortex';

execSync(`rm -f ${require('os').homedir()}/.cortex/memory.db`, { cwd: projectDir });

function run(cmd) {
  return execSync(`cd ${projectDir} && node dist/index.js ${cmd}`, { encoding: 'utf8', timeout: 10000 });
}

run('init');
run('add "AI architecture patterns for local deployment" -t ai -c architecture --important');
run('add "Today meeting notes with the team" -t meeting -c work');
run('add "Quick idea about edge LLMs on mobile" -t idea -t ai --instant');
run('add "Project setup and build instructions" -t setup -c dev --important');

console.log(run('list'));
console.log('--- Running consolidator ---');
const agentOut = run('agent run consolidator');
console.log(agentOut);
