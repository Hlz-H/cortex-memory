const path = require('path');
process.chdir('/home/hulizheng/projects/cortex');

const { initDatabase, getDatabase, closeDatabase } = require('./dist/db/database');
initDatabase();
const db = getDatabase();

console.log('=== TEST: Direct DB insert ===');
db.prepare("INSERT INTO memories (id, content, tier, created_at, updated_at, accessed_at, access_count) VALUES ('test1', 'Hello World Test', 'shortterm', datetime('now'), datetime('now'), datetime('now'), 1)").run();
const r = db.prepare("SELECT * FROM memories WHERE id = 'test1'").get();
console.log('  Result:', JSON.stringify(r));

console.log('\n=== TEST: Store module ===');
const store = require('./dist/memory/store');
const m1 = store.createMemory('Phase 1 memory engine test', 'shortterm', 'testing', undefined, ['test-tag', 'debug']);
console.log('  Created:', m1.id.substring(0,8), m1.tier, m1.content);

const m1tags = require('./dist/tags/index').getMemoryTags(m1.id);
console.log('  Tags:', m1tags.map(t => t.name));

console.log('\n=== TEST: List ===');
const list = store.listMemories({ limit: 10 });
console.log('  Count:', list.length);
list.forEach(m => console.log('  ', m.id.substring(0,8), m.tier, m.content.substring(0,40), m.tags?.map(t => t.name)));

console.log('\n=== TEST: Get ===');
const fetched = store.getMemory(m1.id);
console.log('  Content:', fetched.content.substring(0,50));
console.log('  Tags:', fetched.tags?.map(t => t.name));
console.log('  Access count:', fetched.access_count);

console.log('\n=== TEST: Promote ===');
const promoted = store.promoteMemory(m1.id);
console.log('  New tier:', promoted.tier);

console.log('\n=== TEST: Tags module ===');
const tags = require('./dist/tags/index');
const t = tags.createTag('ai-memory', undefined, 'AI memory system');
console.log('  Tag created:', t.name, t.id.substring(0,8));

console.log('\n=== TEST: Links module ===');
const m2 = store.createMemory('Second test memory for linking', 'shortterm');
console.log('  Created m2:', m2.id.substring(0,8));

const links = require('./dist/links/index');
const l = links.createLink(m1.id, m2.id, 'related_to', 0.8);
console.log('  Link created:', l.link_type, l.weight);

const graph = links.getMemoryLinks(m1.id, 1);
console.log('  Graph nodes:', graph.nodes.length, 'edges:', graph.edges.length);

closeDatabase();
console.log('\n=== ALL TESTS PASSED ===');
