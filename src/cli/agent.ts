import { getBuiltinAgent, listBuiltinAgents } from '../agent/builtins';
import { runAgent } from '../agent/runner';
import { checkOllama } from '../agent/ollama';

export function agentListCommand(): void {
  const agents = listBuiltinAgents();
  console.log(`\n  ${'ID'.padEnd(15)} ${'Name'.padEnd(25)} ${'Model'.padEnd(12)} ${'Status'}`);
  console.log(`  ${''.padEnd(15, '-')} ${''.padEnd(25, '-')} ${''.padEnd(12, '-')} ${''.padEnd(10, '-')}`);
  for (const a of agents) {
    console.log(`  ${a.id.padEnd(15)} ${a.name.padEnd(25)} ${a.model.padEnd(12)} ${a.status}`);
  }
  console.log();
}

export async function agentRunCommand(id: string): Promise<void> {
  const ollamaReady = await checkOllama();
  if (!ollamaReady) {
    console.error('Ollama is not running. Start it with: ollama serve');
    process.exit(1);
  }

  const agent = getBuiltinAgent(id);
  if (!agent) {
    console.error(`Unknown agent: ${id}`);
    console.error('Available: consolidator, summarizer, link_miner, archivist');
    process.exit(1);
  }

  console.log(`Running agent: ${agent.name}...`);
  const result = await runAgent(agent);

  if (result.status === 'success') {
    console.log(`✓ Agent completed successfully`);
    console.log(`  Tool calls: ${result.tool_calls?.length || 0}`);
    if (result.output) {
      try {
        const output = JSON.parse(result.output);
        console.log(`  Reasoning: ${output.reasoning?.substring(0, 200)}`);
      } catch { /* ignore */ }
    }
  } else {
    console.error(`✗ Agent failed: ${result.error}`);
    process.exit(1);
  }
}
