import { json, query, readBody, redirect, siteUrl } from '../lib/http.js';
import { addSubscriber, removeByToken } from '../lib/subscribers.js';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  const q = query(req);
  try {
    if (req.method === 'GET' && q.action === 'unsubscribe') {
      const ok = await removeByToken(q.token);
      return redirect(res, `${siteUrl(req)}/?unsubscribed=${ok ? 1 : 0}`);
    }
    if (req.method === 'POST') {
      const { email, consent } = await readBody(req);
      if (consent !== true) return json(res, 400, { error: 'consent_required' });
      if (typeof email !== 'string' || !EMAIL.test(email.trim())) return json(res, 400, { error: 'bad_email' });
      await addSubscriber(email);
      return json(res, 200, { ok: true });
    }
    return json(res, 405, { error: 'method_not_allowed' });
  } catch (e) {
    console.error('subscribe', e);
    return json(res, 503, { error: 'unavailable' });
  }
}
