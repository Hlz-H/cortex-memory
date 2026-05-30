import { initDatabase, getDatabase, closeDatabase } from '/home/hulizheng/projects/cortex/dist/db/database.js';

initDatabase();
const db = getDatabase();

const rows = db.prepare("SELECT id, content, tier, category, access_count FROM memories").all();
console.log("Memories:", JSON.stringify(rows, null, 2));

const tags = db.prepare("SELECT * FROM tags").all();
console.log("Tags:", JSON.stringify(tags, null, 2));

const mtags = db.prepare("SELECT * FROM memory_tags").all();
console.log("Memory-Tags:", JSON.stringify(mtags, null, 2));

closeDatabase();
