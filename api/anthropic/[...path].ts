import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'node:stream';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';

/** Headers that should not be forwarded to the upstream API. */
const HOP_BY_HOP = new Set([
  'host', 'connection', 'keep-alive', 'transfer-encoding',
  'te', 'trailer', 'upgrade', 'proxy-authorization',
  'proxy-authenticate', 'accept-encoding',
  // Vercel-specific headers that shouldn't be forwarded
  'x-vercel-id', 'x-vercel-proxy-signature', 'x-vercel-proxy-signature-ts',
  'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto',
  'x-real-ip', 'x-vercel-deployment-url', 'x-vercel-forwarded-for',
  'x-middleware-invoke', 'x-invoke-path', 'x-invoke-query',
]);

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

  // Forward all request headers except hop-by-hop and Vercel internals
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(key) && value != null) {
      headers[key] = Array.isArray(value) ? value[0] : value;
    }
  }

  const hasApiKey = 'x-api-key' in headers;
  console.log(`[anthropic-proxy] API key: ${hasApiKey ? `present (${headers['x-api-key'].slice(0, 10)}...)` : 'MISSING'}`);
  console.log(`[anthropic-proxy] Forwarding to: ${url}`);
  console.log(`[anthropic-proxy] Forwarded headers: ${Object.keys(headers).join(', ')}`);

  const body = JSON.stringify(req.body);
  console.log(`[anthropic-proxy] Body (${body.length} chars): ${body.slice(0, 200)}...`);

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    console.log(`[anthropic-proxy] Upstream response: ${upstream.status} ${upstream.statusText}`);

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
