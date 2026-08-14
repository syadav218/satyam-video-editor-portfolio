import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import crypto from 'node:crypto';

const PORT = process.env.PORT || 3000;

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

      if (raw.length > 100000) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function serveFile(req, res, file) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return json(res, 404, {
      ok: false,
      message: 'Not found'
    });
  }

  const ext = path.extname(file).toLowerCase();
  const stat = fs.statSync(file);
  const size = stat.size;
  const contentType = mime[ext] || 'application/octet-stream';

  // Video / media Range support
  if (ext === '.mp4' || ext === '.webm') {
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', contentType);

    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/);

      if (!match) {
        res.writeHead(416, {
          'Content-Range': `bytes */${size}`
        });
        return res.end();
      }

      const start = Number(match[1]);
      const end = match[2]
        ? Number(match[2])
        : size - 1;

      if (start >= size || end >= size || start > end) {
        res.writeHead(416, {
          'Content-Range': `bytes */${size}`
        });
        return res.end();
      }

      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': chunkSize,
        'Accept-Ranges': 'bytes',
        'Content-Type': contentType
      });

      return fs
        .createReadStream(file, { start, end })
        .pipe(res);
    }

    res.writeHead(200, {
      'Content-Length': size,
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType
    });

    return fs.createReadStream(file).pipe(res);
  }

  // Normal files
  res.writeHead(200, {
    'Content-Length': size,
    'Content-Type': contentType
  });

  if (req.method === 'HEAD') {
    return res.end();
  }

  fs.createReadStream(file).pipe(res);
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

    let reqPath =
      url.pathname === '/'
        ? '/index.html'
        : decodeURIComponent(url.pathname);

    const file = path.resolve(root, '.' + reqPath);

    if (
      file !== root &&
      !file.startsWith(root + path.sep)
    ) {
      return json(res, 403, {
        ok: false,
        message: 'Forbidden'
      });
    }

    return serveFile(req, res, file);

  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      return json(res, 500, {
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