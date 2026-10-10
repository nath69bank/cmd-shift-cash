# CMD + SHIFT + CASH ⌘ ⇧ $

AI-researched value bets for **football, horse racing, UFC/MMA and boxing**, with a free fixtures board, free tools, a free bet every day, and a fully public results record.

| Key | Tier | Price | Stake | Who sees it |
|---|---|---|---|---|
| ⏎ **ENTER** | Free | evens to 2/1 | 1pt | everyone (site + free Telegram) |
| ⌘ **CMD** | Small | around 4/1 (3/1 to 6/1) | 1pt | members |
| ⇧ **SHIFT** | Medium | 20/1+ | 0.5pt | members |
| $ **CASH** | Gamble | 100/1+ | 0.25pt | members |

## Free for everyone (the lead magnet)
- **Fixtures & times:** live times and scores for the Premier League, Champions League, Championship, LaLiga, Serie A, Bundesliga, Ligue 1, Scottish Premiership and Europa League (ESPN's public feed, no key needed), plus upcoming UFC cards. UK and Irish race meetings with every race time, and boxing cards, are added by the daily research run.
- **ENTER:** one safe bet a day, in full.
- **Tools:** an acca returns calculator and an odds converter (fractional, decimal, US, implied chance).
- **Results:** every bet ever posted, wins and losses, with points P/L per tier, a running-profit chart and a CSV download. Today's paid bets show as locked rows until the day is over.

## Proving the record is honest
Every bet gets a **fingerprint** when it's posted: a SHA-256 hash of its selections and prices (`public/assets/proof.js`). The fingerprint is shown publicly straight away, on the locked card, in the results table and in the Telegram posts, while the selections are still hidden. After the event, the bet is revealed and anyone can press **Check** to recompute the hash in their browser. If someone had edited the bet afterwards, the hash wouldn't match. Bets are never edited; settlement only adds the result.

A tier is only posted when the research finds value (estimated chance higher than the price implies). Bets outside a tier's price band are rejected automatically.

## How it works

```
GitHub Action (08:15 UTC daily)
  └─ scripts/daily.js
       1. Settle: earlier pending bets → Claude checks results → won/lost/void/placed → results posted to Telegram
       2. Pick:   FPL feed (Premier League fixtures + player stats) + Claude web research
                  (team news, line-ups, racecards, fight cards, Opta / Racing Post / UFC Stats…)
                  → up to 3 bets → saved to private Vercel Blob storage
       3. Post:   full bets → premium Telegram group; teasers (tier, price, no selections) → free channel

Website (Vercel)
  public/          the site
  api/card.js      the day's bets: ENTER and past days public; today's paid tiers locked for non-members
  api/results.js   every bet ever posted, for the public results table and chart
  api/fixtures.js  football (ESPN), UFC (ESPN), racing and boxing (daily research run); CDN-cached 2 min
  api/checkout.js  Stripe Checkout (subscription)
  api/auth.js      sign-in after checkout, email sign-in links, sign out, Stripe billing portal
  api/telegram.js  members get a single-use 24-hour invite link to the premium group
```

Membership is an active Stripe subscription. There's no database: the member cookie is signed with `SESSION_SECRET` and re-checked with Stripe when the paid period ends.

**This repo is public**, so bets never go in git. They're stored in a *private* Vercel Blob store, and the Action logs show only tiers and prices.

## Setup

### 1. Vercel (site + storage)
1. Import this repo into Vercel. No build settings are needed (`vercel.json` serves `public/` and `api/`).
2. Go to **Storage → Create → Blob** and pick **private** access. Connect it to the project; this adds `BLOB_READ_WRITE_TOKEN`.
3. Add environment variables:

| Variable | What |
|---|---|
| `SESSION_SECRET` | a random string, 32+ characters (`openssl rand -hex 32`) |
| `SITE_URL` | e.g. `https://cmdshiftcash.com` |
| `PRICE_LABEL` | shown on the site, e.g. `£19.99/month` |
| `TELEGRAM_FREE_URL` | public invite link to your free Telegram channel (shows a "Free Telegram" button) |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` | see step 2 |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_PREMIUM_CHAT_ID` | see step 3 (for member invite links) |
| `RESEND_API_KEY`, `EMAIL_FROM` | see step 4 |

### 2. Stripe (payments)
1. Create a product, "CMD + SHIFT + CASH Premium", with a recurring monthly price. Copy the price ID (`price_…`) into `STRIPE_PRICE_ID`.
2. Copy your secret key into `STRIPE_SECRET_KEY`.
3. Turn on the **Customer portal** (Settings → Billing → Customer portal) so members can cancel or update their card.

### 3. Telegram
1. Message **@BotFather**, send `/newbot`, and copy the token into `TELEGRAM_BOT_TOKEN`.
2. Create a **private group** for premium members. Add the bot as an **admin** with "Invite users via link" turned on.
3. Optional: create a **public channel** for free teasers and results. Add the bot as an admin with "Post messages" turned on.
4. Get each chat ID: post a message in the chat, open `https://api.telegram.org/bot<TOKEN>/getUpdates`, and copy `chat.id` (it starts with `-100`). These are `TELEGRAM_PREMIUM_CHAT_ID` and `TELEGRAM_FREE_CHAT_ID`.

### 4. Email sign-in links (Resend)
Sign up at resend.com, verify your domain, and set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `CMD + SHIFT + CASH <bets@yourdomain.com>`).

### 5. GitHub Action (the daily run)
In this repo, go to **Settings → Secrets and variables → Actions** and add:
- Secrets: `ANTHROPIC_API_KEY`, `BLOB_READ_WRITE_TOKEN` (the same token Vercel shows), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_PREMIUM_CHAT_ID`, `TELEGRAM_FREE_CHAT_ID`
- Variable: `SITE_URL`

Test it from **Actions → Daily bets → Run workflow**. Scheduled runs only fire from the default branch.

## Local preview

```bash
npm install
npm test                                              # offline, no keys needed
SESSION_SECRET=$(openssl rand -hex 32) npm run dev    # http://localhost:3000, cards read from ./.data
ANTHROPIC_API_KEY=... npm run daily -- --no-post      # real research run, saved to ./.data, nothing posted
```

## Running costs (rough)
- Claude: about $1–3 a day (one research run plus one settlement run, each with web search)
- Vercel Hobby, Blob, GitHub Actions, Telegram: free at this scale
- Stripe: per-transaction fees; Resend: free tier

## Things to know
- **Fixtures feed:** ESPN's scoreboard API is public but unofficial. It's fine to get going, but for a commercial site consider a licensed feed (e.g. API-Football or football-data.org); only `lib/fixtures.js` needs to change.
- **Bets are posted, not placed.** Bookmakers don't offer APIs for placing bets on personal accounts. The service researches, builds and publishes the bet, and members place it themselves.
- **Prices are estimates** from previews at research time. Each bet says what to check (team sheets, non-runners, weigh-ins).
- **Lapsed members in Telegram:** invite links are single-use and expire after 24 hours, but members who cancel stay in the group until removed. Prune the group manually for now.
- **UK rules:** paid tipping services must follow the CAP Code (no "guaranteed winners", clear 18+ messaging, no appeal to under-18s). If you add bookmaker affiliate links, the bookmaker's licence conditions apply to you too. Take advice before launch.
