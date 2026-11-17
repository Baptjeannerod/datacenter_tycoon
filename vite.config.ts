import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * Dev only: serve the Vercel functions in /api from the Vite dev server, so the
 * game and /dashboard work locally with the in-memory store (no account needed).
 * In production Vercel runs api/*.ts itself; this plugin is not part of the build.
 */
function localApi(): Plugin {
  return {
    name: 'local-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/api/event' && path !== '/api/stats') return next();
        try {
          const mod = (await server.ssrLoadModule(`/api/${path.slice(5)}.ts`)) as Record<string, ((r: Request) => Promise<Response> | Response) | undefined>;
          const handler = mod[req.method ?? 'GET'];
          if (!handler) {
            res.statusCode = 405;
            return res.end();
          }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const body = req.method === 'POST' ? Buffer.concat(chunks) : undefined;
          const headers = Object.entries(req.headers).filter((e): e is [string, string] => typeof e[1] === 'string');
          const response = await handler(new Request(`http://localhost${req.url}`, { method: req.method, headers, body }));
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
  build: {
    target: 'es2022',
    // Frugal by design: warn if a chunk gets heavy. See docs/ARCHITECTURE.md (performance budget).
    chunkSizeWarningLimit: 350,
    rolldownOptions: {
      // Two pages: the game (/) and the live dashboard (/dashboard/).
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        dashboard: fileURLToPath(new URL('./dashboard/index.html', import.meta.url)),
      },
    },
  },
});
