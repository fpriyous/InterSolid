import app from '../server.js';

export default function handler(req: any, res: any) {
  // Ensure forwarded path is preserved in Vercel rewrites
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];
  if (matchedPath && typeof matchedPath === 'string') {
    req.url = matchedPath;
  }
  return app(req, res);
}

