# CMD + SHIFT + CASH ⌘ ⇧ $

AI-researched value bets for **football, horse racing, UFC/MMA and boxing**. Everything that brings people in is free (fixtures, race times, a daily banker, tools, the full results record), and the premium tips sit behind a paywall.

| Key | Tier | Price | Stake | Who sees it |
|---|---|---|---|---|
| ⏎ **ENTER** | Banker | evens to 2/1 | 1pt | everyone (site, email, free Telegram) |
| ⌘ **CMD** | Small | around 4/1 | 1pt | members |
| ⇧ **SHIFT** | Medium | 20/1+ | 0.5pt | members |
| $ **CASH** | Gamble | 100/1+ | 0.25pt | members |

A tier is only posted when the research finds value (estimated chance higher than the price implies). Bets outside a tier's price band are rejected automatically.

## The site

Every page is rendered on the server with its content in the HTML, so search engines can index it. A small script then adds live scores, member unlocks, the chart and the tools.

| Page | What's on it | Search terms it targets |
|---|---|---|
| `/` | Banker, locked premium tips, today's football, record, email sign-up, FAQ, join | brand, "betting tips today" |
| `/free-bet-today` | The banker in full, banker results, email sign-up | "free bet today", "banker of the day" |
| `/tips` | Today's premium bets (locked teasers for non-members) | "betting tips today", "acca tips" |
| `/fixtures`, `/fixtures/<league>` | Kick-off times and live scores, 🔒 badges on games in a premium bet | "premier league fixtures today", etc. |
| `/racing` | UK and Irish meetings, going, race times, next-race countdown | "racing today", "race times today" |
| `/fights` | UFC and boxing cards this week | "UFC tonight", "boxing this weekend" |
| `/results` | Every bet, P/L by tier, chart, monthly table, CSV, fingerprint check | "tipster results" |
| `/tools` | Acca calculator, odds converter | "acca calculator", "odds converter" |
| `/previews` | Friday weekend preview articles | "weekend football preview" |
| `/faq`, `/join`, `/terms`, `/privacy`, `/responsible-gambling` | | |

Also: `sitemap.xml`, `robots.txt`, canonical URLs, Open Graph / Twitter share cards (`public/og.png`), and structured data (WebSite, Organization, FAQPage, SportsEvent lists, Article).

**Conversion:** sticky "🔒 N premium bets today · Unlock" bar on mobile, email capture for the daily banker, optional Stripe free trial, the track record next to every Join button, and tip badges on fixtures.

**Compliance:** 18+ confirmation on first visit, terms, privacy and responsible-gambling pages, essential cookies only, affiliate disclosures, and "Banker" wording instead of "safe bet" (no bet is safe; UK ad rules frown on it).

## Proving the record is honest
Every bet gets a **fingerprint** when it's posted: a SHA-256 hash of its selections and prices (`public/assets/proof.js`). It's shown publicly straight away, on the locked card, in the results table and in Telegram, while the selections are still hidden. After the event anyone can press **Check** to recompute it in their browser. If the bet had been edited, the hash wouldn't match.

## The daily run
```
GitHub Action, 08:15 UTC daily → scripts/daily.js
  1. Settle earlier pending bets (Claude checks results) → post results to Telegram
  2. Research today's value bets + racecards + fight cards → save (private Vercel Blob)
  3. Post: full bets to the premium Telegram group; the banker in full + paid teasers to the free channel
  4. Email the banker to subscribers (Resend, one-click unsubscribe)
  5. Fridays: write and publish the weekend preview article
```

## Affiliate links (how to get them)
1. **Apply to bookmaker partner programmes.** The main UK ones: bet365 Partners, Flutter Partners (Sky Bet, Paddy Power, Betfair), William Hill Affiliates, Betfred Partners, BetVictor Partners, Kindred/Unibet Affiliates. Networks such as Income Access manage several brands. Each programme reviews your site: having the legal pages, 18+ check and a public record helps.
2. **Read their compliance rules.** UK affiliates must follow the CAP/BCAP gambling rules and the operator's licence conditions: 18+ messaging, "T&Cs apply", no appeal to under-18s, offers worded exactly as the bookmaker's terms.
3. **Paste your tracking links into `config/bookmakers.js`** (`url`, and optionally `offer`), then commit. The "Place it at" buttons appear on the banker and on members' bets, and in Telegram posts. They're marked `rel="sponsored"` with the 18+ / T&Cs / commission line. Empty URLs stay hidden.

## Setup

### 1. Vercel
Import this repo. Under **Storage**, create a **private Blob** store and connect it (adds `BLOB_READ_WRITE_TOKEN`). Environment variables:

| Variable | What |
|---|---|
| `SESSION_SECRET` | random, 32+ characters (`openssl rand -hex 32`) |
| `SITE_URL` | e.g. `https://cmdshiftcash.com` (used for canonical URLs and links) |
| `PRICE_LABEL` | e.g. `£19.99/month` |
| `TRIAL_DAYS` | optional, e.g. `7` for a free trial on Stripe Checkout |
| `TELEGRAM_FREE_URL` | public invite link to your free channel |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` | Stripe secret key and monthly price ID |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_PREMIUM_CHAT_ID` | for member invite links |
| `RESEND_API_KEY`, `EMAIL_FROM` | sign-in links |
| `BUSINESS_NAME`, `CONTACT_EMAIL` | shown on the terms and privacy pages |
| `TIP_BADGES` | set to `0` to hide 🔒 badges on fixtures |

### 2. Stripe
Create a product with a monthly price and turn on the Customer portal (Settings → Billing → Customer portal).

### 3. Telegram
Create a bot with @BotFather. Make it an admin of a **private premium group** (with "Invite users via link") and of a **public free channel** (with "Post messages"). Get each chat ID from `https://api.telegram.org/bot<TOKEN>/getUpdates` (it starts with `-100`).

### 4. Resend
Verify your domain at resend.com; set `RESEND_API_KEY` and `EMAIL_FROM`.

### 5. GitHub Actions (the daily run)
In this repo, go to **Settings → Secrets and variables → Actions**:
- Secrets: `ANTHROPIC_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `SESSION_SECRET` (same as Vercel), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_PREMIUM_CHAT_ID`, `TELEGRAM_FREE_CHAT_ID`, `RESEND_API_KEY`, `EMAIL_FROM`
- Variable: `SITE_URL`

Test with **Actions → Daily bets → Run workflow**.

### 6. Google
Add the site in **Google Search Console**, verify the domain, and submit `https://<your-domain>/sitemap.xml`. A custom domain ranks far better than `*.vercel.app`.

## Local preview
```bash
npm install
npm test
SESSION_SECRET=$(openssl rand -hex 32) npm run dev    # http://localhost:3000, data from ./.data
ANTHROPIC_API_KEY=... npm run daily -- --no-post      # real research run, saved to ./.data, nothing posted
```

## Things to know
- **Fixtures feed:** ESPN's scoreboard API is public but unofficial. For a commercial site consider a licensed feed (API-Football, football-data.org); only `lib/fixtures.js` changes.
- **Bets are posted, not placed.** Bookmakers don't offer APIs for placing bets on personal accounts.
- **Prices are estimates** from research time; each bet says what to check before placing.
- **Lapsed members in Telegram** stay in the group until removed; prune it manually for now.
- **Legal pages are a starting point.** Have the terms and privacy policy reviewed before you take payments.
