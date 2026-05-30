import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { initDatabase, closeDatabase } from '../db/database';
import { apiRoutes } from './routes';

export function startServer(port: number = 3456): void {
  initDatabase();

  const app = new Hono();

  app.use('*', logger());
  app.use('*', cors({ origin: '*' }));

  // API routes
  app.route('/api', apiRoutes);

  // PWA manifest
  app.get('/manifest.json', (c) => {
    return c.json({
      name: 'Cortex - AI Memory Engine',
      short_name: 'Cortex',
      description: 'Local AI Memory Engine with four-tier storage and agent system',
      start_url: '/',
      display: 'standalone',
      background_color: '#0f0f23',
      theme_color: '#00d4aa',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    });
  });

  // Simple colored square icons
  app.get('/icon-192.png', (c) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192"><rect width="192" height="192" fill="#00d4aa" rx="24"/><text x="96" y="120" font-size="80" text-anchor="middle" fill="#0f0f23" font-family="Arial">🧠</text></svg>`;
    c.header('Content-Type', 'image/svg+xml');
    return c.body(svg);
  });

  app.get('/icon-512.png', (c) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#00d4aa" rx="64"/><text x="256" y="320" font-size="220" text-anchor="middle" fill="#0f0f23" font-family="Arial">🧠</text></svg>`;
    c.header('Content-Type', 'image/svg+xml');
    return c.body(svg);
  });

  // Service Worker
  app.get('/sw.js', (c) => {
    c.header('Content-Type', 'application/javascript');
    c.header('Cache-Control', 'no-cache');
    return c.body(`self.addEventListener('install',e=>e.waitUntil(caches.open('cortex-v1').then(c=>c.addAll(['/','/app.js','/manifest.json'])))));self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!=='cortex-v1').map(n=>caches.delete(n))))));`);
  });

  // Static web UI
  app.use('/*', serveStatic({ root: './src/web/', index: 'index.html' }));

  const server = serve({ fetch: app.fetch, port });

  console.log(`🧠 Cortex server running at http://localhost:${port}`);

  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    closeDatabase();
    server.close();
    process.exit(0);
  });
}
