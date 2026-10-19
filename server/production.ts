import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, relative, resolve } from 'node:path';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { runRoute } from './routes.js';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const root = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const indexFile = join(root, 'index.html');

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(payload);
}

function staticFile(pathname: string): string | null {
  const requested = normalize(join(root, pathname));
  const relativePath = relative(root, requested);
  if (relativePath.startsWith('..') || relativePath.includes(`..${'\\'}`) || !existsSync(requested) || !statSync(requested).isFile()) {
    return null;
  }
  return requested;
}

async function handleApi(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  const body = await readBody(req);
  const route = pathname.slice('/api/'.length).split('/')[0];
  const out = body === null
    ? { status: 400, body: { error: 'Invalid JSON' } }
    : await runRoute(route, req.method, body);
  sendJson(res, out.status, out.body);
}

const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    const file = staticFile(pathname === '/' ? '/index.html' : pathname) ?? indexFile;
    const contentType = contentTypes[extname(file)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    if (req.method === 'HEAD') {
      res.end();
    } else {
      createReadStream(file).pipe(res);
    }
  } catch (error) {
    console.error('[server]', error);
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`ReadyCheck listening on http://0.0.0.0:${port}`);
});
