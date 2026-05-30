const { execSync } = require('child_process');
const projectDir = '/home/hulizheng/projects/cortex';

function run(cmd) {
  return execSync(`cd ${projectDir} && node dist/index.js ${cmd}`, { encoding: 'utf8', timeout: 30000 });
}

// Create related memories for summarizer
run('add "React hooks best practices: useState and useEffect patterns" -t react -t frontend -c dev');
run('add "React performance optimization with memo and useMemo" -t react -t frontend -c dev');
run('add "Building reusable React components with composition" -t react -t frontend -c dev');

// Create memories for link miner to connect
run('add "Local LLM deployment on edge devices" -t llm -t edge -c ai');
run('add "Ollama setup guide for local model serving" -t ollama -t llm -c ai');
run('add "Comparing GPT-4 vs local models for privacy" -t llm -t privacy -c ai');

// Create some old instant memories for archivist
run('add "Quick thought: maybe use Redis for cache" -t cache --instant');
run('add "TODO: check docker compose version" -t todo --instant');
run('add "Random idea: voice controlled IDE" -t idea --instant');

console.log('Data created');
console.log(run('stats'));

console.log('\n=== Running Summarizer ===');
console.log(run('agent run summarizer'));

console.log('\n=== Running Link Miner ===');
console.log(run('agent run link_miner'));

console.log('\n=== Running Archivist ===');
console.log(run('agent run archivist'));

console.log('\n=== Final State ===');
console.log(run('stats'));
console.log(run('list'));
