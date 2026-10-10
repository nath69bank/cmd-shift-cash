// Login links by email via Resend (https://resend.com). One HTTP call, no SDK.
export async function sendLoginLink(to, link) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error('RESEND_API_KEY and EMAIL_FROM must be set');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: 'Your CMD + SHIFT + CASH login link',
      html: `<p>Tap to sign in. The link works for 30 minutes.</p>
<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a></p>
<p style="color:#666;font-size:13px">If you didn't ask for this, ignore this email.</p>`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`email failed: HTTP ${res.status}`);
}

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// The free banker to every subscriber, in batches of 100 (Resend's limit).
export async function sendBankerEmails(subs, bet, site, unsubscribeToken) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from || !subs.length) return 0;
  const legs = bet.legs
    .map((l) => `<tr><td style="padding:6px 0;color:#666">${escape(l.event)} · ${escape(l.start_uk)}</td></tr><tr><td style="padding:0 0 10px;font-weight:600">${escape(l.selection)} @ ${escape(l.odds)}</td></tr>`)
    .join('');
  let sent = 0;
  for (let i = 0; i < subs.length; i += 100) {
    const batch = subs.slice(i, i + 100).map((s) => {
      const unsub = `${site}/api/subscribe?action=unsubscribe&token=${encodeURIComponent(unsubscribeToken(s.id))}`;
      return {
        from,
        to: s.email,
        subject: `⏎ Today's banker: ${bet.title} @ ${bet.odds}`,
        headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        html: `<div style="font-family:system-ui,sans-serif;max-width:520px">
<p style="color:#16a34a;font-weight:700;letter-spacing:.08em">⏎ ENTER · BANKER OF THE DAY</p>
<h2 style="margin:0 0 4px">${escape(bet.title)}</h2>
<p style="font-size:22px;font-weight:700;margin:0 0 12px">${escape(bet.odds)}</p>
<table>${legs}</table>
<p><b>Why it's value:</b> ${escape(bet.value_case)}</p>
<p><b>Check before placing:</b> ${escape(bet.check)}</p>
<p><a href="${site}/free-bet-today" style="display:inline-block;padding:12px 20px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">See the full reasoning</a></p>
<p style="color:#888;font-size:12px">18+ only. Tips are opinions, not guarantees. Please gamble responsibly: BeGambleAware.org · 0808 8020 133.<br><a href="${unsub}" style="color:#888">Unsubscribe</a></p>
</div>`,
      };
    });
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`batch email failed: HTTP ${res.status}`);
    sent += batch.length;
  }
  return sent;
}
