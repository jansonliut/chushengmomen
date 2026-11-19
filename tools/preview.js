import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSingleFile, DIST_HTML_PATH } from './build.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 8080);

function getLanUrls(port) {
  const urls = [`http://127.0.0.1:${port}/`];
  const nets = os.networkInterfaces();
  for (const [name, list] of Object.entries(nets)) {
    if (!list) continue;
    for (const net of list) {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push(`http://${net.address}:${port}/ (${name})`);
      }
    }
  }
  return urls;
}

await buildSingleFile();

const server = http.createServer((req, res) => {
  const reqPath = (req.url || '/').split('?')[0];
  if (
    reqPath === '/' ||
    reqPath === '/index.html' ||
    reqPath === '/dist/index.html' ||
    reqPath === '/source/demo-mobile.html'
  ) {
    try {
      const html = fs.readFileSync(DIST_HTML_PATH, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      res.end(html);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('读取 dist/index.html 失败: ' + err.message);
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('=== 初圣魔门 · 真机局域网预览服务已启动 ===');
  for (const u of getLanUrls(PORT)) {
    console.log(`  -> ${u}`);
  }
});
