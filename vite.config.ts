import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Serves server/ handlers at /api/* during `npm run dev`, mirroring the Vercel function in api/[route].ts. */
function devApi(): Plugin {
  return {
    name: 'readycheck-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        let body: unknown = {};
        try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}; } catch { body = null; }
        const route = (req.url ?? '').replace(/^\//, '').split('?')[0];
        const { runRoute } = (await server.ssrLoadModule('/server/routes.ts')) as typeof import('./server/routes');
        const out = body === null ? { status: 400, body: { error: 'Invalid JSON' } } : await runRoute(route, req.method, body);
        res.statusCode = out.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(out.body));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load GEMINI_* from .env into process.env for the dev API only. They are never exposed to the browser bundle.
  Object.assign(process.env, loadEnv(mode, process.cwd(), 'GEMINI_'));
  return { plugins: [react(), devApi()] };
});
