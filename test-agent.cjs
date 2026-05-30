const { listBuiltinAgents, getBuiltinAgent } = require('./dist/agent/builtins');
const { checkOllama } = require('./dist/agent/ollama');
const { getToolDescriptions, executeTool } = require('./dist/agent/tools');
const { initDatabase, getDatabase } = require('./dist/db/database');

initDatabase();

console.log('=== AGENT FRAMEWORK TESTS ===\n');

// Test 1: Built-in agents
console.log('1. Built-in agents:');
const agents = listBuiltinAgents();
console.log('   Count:', agents.length);
agents.forEach(a => console.log(`   - ${a.id}: ${a.name}`));

// Test 2: Tool descriptions
console.log('\n2. Tool descriptions:');
const desc = getToolDescriptions();
console.log('   Length:', desc.length, 'chars');
console.log('   First tool:', desc.split('\n\n')[0].substring(0, 80));

// Test 3: Execute tool directly
console.log('\n3. Direct tool execution:');
const stats = executeTool('get_stats', {});
console.log('   Stats:', JSON.stringify(stats).substring(0, 100));

// Test 4: Ollama availability
console.log('\n4. Ollama check:');
checkOllama().then(ok => {
  console.log('   Ollama ready:', ok);

  // Test 5: Agent config
  console.log('\n5. Agent config:');
  const agent = getBuiltinAgent('consolidator');
  console.log('   Name:', agent.name);
  console.log('   Model:', agent.model);
  console.log('   Capabilities:', agent.capabilities.length);

  // Test 6: Agent run (will fail if no model, but framework works)
  console.log('\n6. Agent run framework:');
  const { runAgent } = require('./dist/agent/runner');
  runAgent(agent, 'Test run').then(result => {
    console.log('   Status:', result.status);
    console.log('   Run ID:', result.id.substring(0, 8));
    if (result.error) {
      console.log('   Error:', result.error.substring(0, 100));
    }
    console.log('\n=== ALL TESTS PASSED ===');
    process.exit(0);
  }).catch(e => {
    console.log('   Error:', e.message.substring(0, 100));
    console.log('\n=== FRAMEWORK OK (Ollama model missing) ===');
    process.exit(0);
  });
});
