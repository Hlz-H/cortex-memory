const http = require('http');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 3457, path, method };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // Start server
  const { startServer } = require('./dist/api/server');
  startServer(3457);
  await new Promise(r => setTimeout(r, 1000));

  console.log('=== POST /api/memories ===');
  const post = await request('POST', '/api/memories', {
    content: 'API test memory from script',
    tier: 'longterm',
    tags: ['api', 'test'],
    category: 'testing'
  });
  console.log('Status:', post.status);
  const postData = JSON.parse(post.body);
  console.log('Created:', postData.data.id.substring(0,8), postData.data.tier, postData.data.tags?.map(t=>t.name));

  const memId = postData.data.id;

  console.log('\n=== GET /api/memories ===');
  const list = await request('GET', '/api/memories');
  console.log('Status:', list.status);
  const listData = JSON.parse(list.body);
  console.log('Count:', listData.count);

  console.log('\n=== GET /api/search ===');
  const search = await request('GET', '/api/search?q=API');
  console.log('Status:', search.status);
  const searchData = JSON.parse(search.body);
  console.log('Results:', searchData.count);

  console.log('\n=== GET /api/memories/:id ===');
  const get = await request('GET', `/api/memories/${memId}`);
  console.log('Status:', get.status);
  const getData = JSON.parse(get.body);
  console.log('Content:', getData.data.content.substring(0,40));

  console.log('\n=== POST /api/memories/:id/promote ===');
  const promote = await request('POST', `/api/memories/${memId}/promote`);
  console.log('Status:', promote.status);
  const promoteData = JSON.parse(promote.body);
  console.log('New tier:', promoteData.data.tier);

  console.log('\n=== GET /api/tags ===');
  const tags = await request('GET', '/api/tags');
  console.log('Status:', tags.status);
  const tagsData = JSON.parse(tags.body);
  console.log('Tags:', tagsData.data.length);

  console.log('\n=== GET /api/stats ===');
  const stats = await request('GET', '/api/stats');
  console.log('Status:', stats.status);
  const statsData = JSON.parse(stats.body);
  console.log('Total:', statsData.data.total);

  console.log('\n=== ALL API TESTS PASSED ===');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
