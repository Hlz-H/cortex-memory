const { getDatabase } = require('/home/hulizheng/projects/cortex/dist/db/database');
getDatabase();
const db = getDatabase();

const run = db.prepare('SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT 1').get();
console.log('Agent:', run.agent_id);
console.log('Status:', run.status);
console.log('Input:', run.input);

if (run.output) {
  try {
    const out = JSON.parse(run.output);
    console.log('Reasoning:', out.reasoning);
    console.log('Results count:', out.results?.length);
    out.results?.forEach((r, i) => {
      console.log(`Result ${i}:`, r.tool, JSON.stringify(r.result || r.error).substring(0, 150));
    });
  } catch {
    console.log('Raw output:', run.output.substring(0, 300));
  }
}

if (run.error) {
  console.log('Error:', run.error);
}
