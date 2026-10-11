import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';

// In-memory / temporary buffer of entries pushed via Webhook
const incomingWebhookEntries: any[] = [];

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'google-form-sync-server',
      configureServer(server) {
        // 1. Webhook endpoint: Google Form Apps Script can POST directly to http://localhost:3000/api/webhook
        server.middlewares.use('/api/webhook', (req: IncomingMessage, res: ServerResponse) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                incomingWebhookEntries.push({
                  ...data,
                  receivedAt: new Date().toISOString()
                });
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, count: incomingWebhookEntries.length }));
              } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
              }
            });
          } else if (req.method === 'GET') {
            // Retrieve queued webhook entries
            const entries = [...incomingWebhookEntries];
            incomingWebhookEntries.length = 0; // drain
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify(entries));
          } else {
            res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' });
            res.end();
          }
        });

        // 2. Proxy endpoint: fetch Google Sheet CSV bypassing CORS
        server.middlewares.use('/api/proxy-sheet', async (req: IncomingMessage, res: ServerResponse) => {
          const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
          const targetUrl = urlObj.searchParams.get('url');

          if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
          }

          try {
            const fetchRes = await fetch(targetUrl);
            const text = await fetchRes.text();
            res.writeHead(200, {
              'Content-Type': 'text/plain; charset=utf-8',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(text);
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Failed to fetch sheet' }));
          }
        });
      }
    }
  ],
  server: {
    port: 3000,
    open: true
  }
});
