import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import crypto from 'node:crypto';

const PORT = process.env.PORT || 3000;

// Website files are now in the project root folder
const root = path.resolve('.');
const dataDir = path.resolve('data');
const leadsFile = path.join(dataDir, 'leads.jsonl');

fs.mkdirSync(dataDir, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon'
};

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });

  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', chunk => {
      raw += chunk;

      if (raw.length > 100_000) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host || 'localhost'}`
    );

    // Contact form
    if (req.method === 'POST' && url.pathname === '/api/contact') {
      const raw = await readBody(req);
      const form = new URLSearchParams(raw);

      const name = (form.get('name') || '').trim().slice(0, 120);
      const email = (form.get('email') || '').trim().slice(0, 180);
      const project = (form.get('project') || '').trim().slice(0, 80);
      const message = (form.get('message') || '').trim().slice(0, 2000);

      if (!name || !message) {
        return json(res, 400, {
          ok: false,
          message: 'Please add your name and project details.'
        });
      }

      const lead = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        name,
        email,
        project,
        message
      };

      fs.appendFileSync(
        leadsFile,
        JSON.stringify(lead) + '\n',
        'utf8'
      );

      return json(res, 200, {
        ok: true,
        message: 'Thanks! Your enquiry has been received.'
      });
    }

    // Homepage
    let reqPath = url.pathname === '/'
      ? '/index.html'
      : decodeURIComponent(url.pathname);

    // Remove query-safe path issues
    reqPath = reqPath.split('?')[0];

    const file = path.resolve(root, '.' + reqPath);

    // Security check
    if (
      file !== root &&
      !file.startsWith(root + path.sep)
    ) {
      return json(res, 403, {
        ok: false,
        message: 'Forbidden'
      });
    }

    if (
      !fs.existsSync(file) ||
      fs.statSync(file).isDirectory()
    ) {
      return json(res, 404, {
        ok: false,
        message: 'Not found'
      });
    }

    const ext = path.extname(file).toLowerCase();

    res.writeHead(200, {
      'Content-Type':
        mime[ext] || 'application/octet-stream'
    });

    fs.createReadStream(file).pipe(res);

  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      json(res, 500, {
        ok: false,
        message: 'Server error'
      });
    }
  }
});

server.listen(PORT, () => {
  console.log(
    `Satyam portfolio running at http://localhost:${PORT}`
  );
});