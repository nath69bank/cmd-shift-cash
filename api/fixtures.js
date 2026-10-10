import { json, query } from '../lib/http.js';
import { clampDate, fixturesFor } from '../lib/data.js';

// Public fixtures board data (no tips). Used by the pages for live refreshes.
export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  const data = await fixturesFor(clampDate(query(req).date));
  return json(res, 200, data, { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' });
}
