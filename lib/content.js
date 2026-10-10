// Written content: FAQ (also emitted as FAQPage structured data) and the
// legal pages. BUSINESS_NAME and CONTACT_EMAIL fill in the operator details.

const business = () => process.env.BUSINESS_NAME || 'CMD + SHIFT + CASH';
const contact = () => process.env.CONTACT_EMAIL || 'hello@example.com';

export const FAQ = [
  ['What is a value bet?', 'A bet where the price is bigger than the real chance of it winning. If a team wins this fixture 60% of the time, a price of 4/5 (55.6% implied) is value; 1/2 (66.7% implied) is not. Over many bets, only value bets make money.'],
  ['What are CMD, SHIFT, CASH and ENTER?', 'Four tiers, named after the keys. ENTER is the free banker of the day (evens to 2/1). CMD is a small bet around 4/1, SHIFT is a medium bet at 20/1 or bigger, and CASH is a 100/1+ gamble for small stakes. A tier is only posted when the research finds value.'],
  ['How are the tips chosen?', 'Every morning our AI analyst researches the day\'s football, horse racing, UFC and boxing: team news and line-ups, player shot and card stats, racecards and form, fight records and matchups, plus bookmaker prices. It only posts a bet when its estimated chance beats the chance implied by the price.'],
  ['Can I trust the results?', 'Every bet is time-stamped and given a fingerprint (a SHA-256 hash of its selections and prices) the moment it is posted. The fingerprint is public even while the bet is locked. After the event anyone can recompute it on the results page, so a bet can\'t be changed after the fact. Losing bets stay on the record.'],
  ['What do I get with Premium?', 'The CMD, SHIFT and CASH bets in full on the site the moment they are posted, the private Telegram group, and the reasoning behind every leg. The banker, fixtures, tools and full results stay free.'],
  ['How do points work?', 'Results are shown in points at the posted price: ENTER and CMD 1pt, SHIFT 0.5pt, CASH 0.25pt. A 1pt winner at 4/1 is +4pts; a loser is -1pt. Pick a point size you are comfortable losing many times over.'],
  ['Are the odds guaranteed?', 'No. Prices are what we found when the bet was posted and they move. Always check the price, the team sheets and any non-runners before you place a bet.'],
  ['Do you place bets for me?', 'No. We research and publish bets; you decide whether to place them, and where.'],
];

export function terms() {
  return [
    ['About us', `${business()} publishes sports betting research and tips. We are not a bookmaker, we do not take bets, and we do not handle stakes or winnings. Contact: ${contact()}.`],
    ['Age', 'You must be 18 or over to use this site, subscribe, or follow any tip.'],
    ['Tips are opinions', 'Tips are research-based opinions, not advice and not guarantees. Odds change and most bets lose, especially at longer prices. Past results do not predict future results. You are responsible for any bet you place.'],
    ['Premium membership', 'Premium is a monthly subscription billed through Stripe. You can cancel any time from Manage subscription; you keep access until the end of the paid period. If a free trial is offered, you will be charged when it ends unless you cancel first.'],
    ['Acceptable use', 'Premium content is for your personal use. Do not resell, republish or share it, or share your sign-in links.'],
    ['Affiliate links', 'Some links to bookmakers are affiliate links: we may earn a commission if you open an account. This never changes which bets we post, and bookmaker offers are subject to the bookmaker\'s own terms.'],
    ['Liability', 'To the extent the law allows, we are not liable for losses from betting decisions made using this site. Nothing here limits rights you have under consumer law.'],
    ['Changes', 'We may update these terms; the version on this page applies.'],
  ];
}

export function privacy() {
  return [
    ['Who we are', `${business()} is the data controller for this site. Contact: ${contact()}.`],
    ['What we collect', 'If you subscribe to emails: your email address and when you subscribed. If you join Premium: your email and payment details, which are handled by Stripe (we never see your card). If you sign in: a cookie that keeps you signed in.'],
    ['Why', 'To send the emails you asked for (consent), to provide your subscription (contract), and to keep the service secure (legitimate interest).'],
    ['Cookies', 'We only use essential cookies: one that keeps members signed in. Your 18+ confirmation is saved in your browser\'s local storage. We use no advertising or tracking cookies.'],
    ['Who we share it with', 'Stripe (payments), Resend (email delivery), Vercel (hosting) and Telegram if you join our groups. We do not sell your data.'],
    ['How long we keep it', 'Email subscribers until you unsubscribe. Member records while your subscription is active and as long as the law requires for accounting afterwards.'],
    ['Your rights', `You can ask for a copy of your data, correct it, or have it deleted, and you can unsubscribe from emails with one click at any time. Email ${contact()}. You can also complain to the ICO (ico.org.uk).`],
  ];
}

export function responsibleGambling() {
  return [
    ['Keep it fun', 'Only bet what you can afford to lose. Set a budget before you start and stick to it. Never chase losses, and never bet to pay bills or debts.'],
    ['Warning signs', 'Betting more than you meant to, borrowing to bet, hiding it from people close to you, or feeling anxious when you can\'t bet are all signs to stop and get support.'],
    ['Tools that help', 'Most bookmakers offer deposit limits, time-outs and self-exclusion in your account settings. GAMSTOP (gamstop.co.uk) blocks you from all UK-licensed gambling sites at once. Your bank can block gambling payments too.'],
    ['Free, confidential help', 'National Gambling Helpline: 0808 8020 133 (24/7). BeGambleAware: begambleaware.org. GamCare: gamcare.org.uk. Gamblers Anonymous: gamblersanonymous.org.uk.'],
    ['Under 18s', 'This site is for adults only. If you share a device with children, consider parental control software such as Net Nanny or Cyber Patrol.'],
  ];
}
