// Email subscribers for the free daily banker. One blob per subscriber, keyed
// by a hash of the address, so concurrent sign-ups never overwrite each other.
import { createHash } from 'node:crypto';
import { deleteKey, listKeys, readJSON, writeJSON } from './store.js';
import { sign, verify } from './session.js';

const PREFIX = 'subscribers/';
const keyFor = (email) => createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32);

export async function addSubscriber(email) {
  const id = keyFor(email);
  const existing = await readJSON(`${PREFIX}${id}.json`);
  if (!existing) await writeJSON(`${PREFIX}${id}.json`, { email: email.trim(), created_at: new Date().toISOString() });
  return id;
}

export async function listSubscribers() {
  const keys = await listKeys(PREFIX);
  const subs = await Promise.all(keys.map((k) => readJSON(k)));
  return subs.filter(Boolean).map((s) => ({ ...s, id: keyFor(s.email) }));
}

// Unsubscribe links never expire, so they work from any old email.
export const unsubscribeToken = (id) => sign({ id, p: 'unsub', exp: 4102444800 });

export async function removeByToken(token) {
  const payload = verify(token);
  if (!payload || payload.p !== 'unsub' || !/^[a-f0-9]{32}$/.test(payload.id)) return false;
  await deleteKey(`${PREFIX}${payload.id}.json`);
  return true;
}
