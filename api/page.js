import { query, siteUrl } from '../lib/http.js';
import { renderPage, robots, sitemap } from '../lib/pages.js';

// Serves every HTML page (see the rewrites in vercel.json), plus sitemap.xml
// and robots.txt. Pages are the same for every visitor, so the CDN caches
// them; member-only content is unlocked in the browser via /api/card.
export default async function handler(req, res) {
  const q = query(req);
  const base = siteUrl(req);
  const send = (status, type, body, maxAge = 60) => {
    res.statusCode = status;
    res.setHeader('Content-Type', `${type}; charset=utf-8`);
    res.setHeader('Cache-Control', status === 200 ? `public, s-maxage=${maxAge}, stale-while-revalidate=600` : 'public, s-maxage=60');
    res.end(body);
  };
  try {
    if (q.p === 'sitemap') return send(200, 'application/xml', await sitemap(base), 3600);
    if (q.p === 'robots') return send(200, 'text/plain', robots(base), 86400);
    const ctx = {
      base,
      env: process.env,
      query: q,
      params: { league: q.league, date: q.d },
      trialDays: Number(process.env.TRIAL_DAYS) || 0,
    };
    const { status, html } = await renderPage(q.p || 'home', ctx);
    return send(status, 'text/html', html);
  } catch (e) {
    console.error('page', q.p, e);
    return send(500, 'text/html', '<!doctype html><title>Something went wrong</title><p>Something went wrong. Please refresh in a minute.</p>');
  }
}
