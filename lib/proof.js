// A fingerprint of each bet, published the moment it's posted (even while the
// selections are locked). Anyone can recompute it later from the public bet and
// confirm nothing was changed after the event.
import { createHash } from 'node:crypto';
import { canonical } from '../public/assets/proof.js';

export { canonical };
export const fingerprint = (bet) => createHash('sha256').update(canonical(bet)).digest('hex');
