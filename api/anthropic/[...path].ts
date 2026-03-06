import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'node:stream';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';

/**
 * Vercel serverless proxy for the Anthropic API.
 * Forwards requests from the browser to api.anthropic.com, bypassing CORS.
 * BYOK: the user's API key is sent from the browser in the x-api-key header.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Build target URL from catch-all path segments
  const segments = req.query.path;
  const subPath = Array.isArray(segments) ? segments.join('/') : (segments ?? '');
  const url = `${ANTHROPIC_API_BASE}/${subPath}`;

  // Forward only the headers Anthropic needs
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  const apiKey = req.headers['x-api-key'];
  if (apiKey) headers['x-api-key'] = String(apiKey);
  const version = req.headers['anthropic-version'];
  if (version) headers['anthropic-version'] = String(version);

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });

    // Mirror status and content-type
    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);

    // Stream body back to client
    if (upstream.body) {
      const readable = Readable.fromWeb(
        upstream.body as import('node:stream/web').ReadableStream,
      );
      readable.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error('[anthropic-proxy]', err);
    res.status(502).json({ error: 'Proxy request failed' });
  }
}
