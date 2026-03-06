import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'node:stream';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';

/**
 * Vercel serverless proxy for the Anthropic API.
 * Forwards requests from the browser to api.anthropic.com, bypassing CORS.
 * BYOK: the user's API key is sent from the browser in the x-api-key header.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[anthropic-proxy] ${req.method} ${req.url}`);

  if (req.method !== 'POST') {
    console.log('[anthropic-proxy] Rejected: method not allowed');
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
  if (apiKey) {
    headers['x-api-key'] = String(apiKey);
    console.log(`[anthropic-proxy] API key present (${String(apiKey).slice(0, 8)}...)`);
  } else {
    console.log('[anthropic-proxy] WARNING: No x-api-key header');
  }
  const version = req.headers['anthropic-version'];
  if (version) headers['anthropic-version'] = String(version);

  console.log(`[anthropic-proxy] Forwarding to: ${url}`);
  console.log(`[anthropic-proxy] Headers: ${Object.keys(headers).join(', ')}`);
  console.log(`[anthropic-proxy] Body size: ${JSON.stringify(req.body).length} chars`);

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });

    console.log(`[anthropic-proxy] Upstream response: ${upstream.status} ${upstream.statusText}`);

    // Log response headers for debugging
    const responseHeaders: Record<string, string> = {};
    upstream.headers.forEach((v, k) => { responseHeaders[k] = v; });
    console.log(`[anthropic-proxy] Response headers: ${JSON.stringify(responseHeaders)}`);

    // If error, read and log the response body for diagnosis
    if (!upstream.ok) {
      const errorBody = await upstream.text();
      console.error(`[anthropic-proxy] Error response body: ${errorBody}`);
      res.status(upstream.status);
      const ct = upstream.headers.get('content-type');
      if (ct) res.setHeader('content-type', ct);
      res.end(errorBody);
      return;
    }

    // Mirror status and content-type
    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);

    // Stream body back to client
    if (upstream.body) {
      console.log('[anthropic-proxy] Streaming response body...');
      const readable = Readable.fromWeb(
        upstream.body as import('node:stream/web').ReadableStream,
      );
      readable.pipe(res);
    } else {
      console.log('[anthropic-proxy] No response body');
      res.end();
    }
  } catch (err) {
    console.error('[anthropic-proxy] Fetch failed:', err);
    res.status(502).json({ error: 'Proxy request failed' });
  }
}
