// Vercel serverless entry for every /api/<route>. The logic lives in server/ so `npm run dev` runs the same code.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runRoute } from '../server/routes.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const route = String(req.query.route ?? '');
  const out = await runRoute(route, req.method, req.body);
  res.status(out.status).json(out.body);
}
