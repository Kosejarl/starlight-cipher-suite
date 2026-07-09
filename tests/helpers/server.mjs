import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
};

/**
 * Serves the repo's static files (the app under test is a dependency-free static
 * page) on an ephemeral localhost port. Returns { url, close() }.
 */
export async function startStaticServer() {
    const server = http.createServer(async (req, res) => {
        try {
            const requestPath = decodeURIComponent(req.url.split('?')[0]);
            const relative = requestPath === '/' ? '/index.html' : requestPath;
            const filePath = path.join(ROOT, relative);

            // Refuse to serve outside the repo root
            if (!filePath.startsWith(ROOT)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }

            const ext = path.extname(filePath);
            const body = await readFile(filePath);
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
            res.end(body);
        } catch (err) {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();

    return {
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((resolve) => server.close(resolve))
    };
}
