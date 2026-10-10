import { z } from 'zod';

const Leg = z.object({
  sport: z.enum(['football', 'horse_racing', 'mma', 'boxing']),
  event: z.string().describe('e.g. "Arsenal v Leeds", "3:15 Ascot", "UFC 320: Smith v Jones"'),
  start_uk: z.string().describe('Start time in UK time, 24h, e.g. "15:00"'),
  selection: z.string().describe('e.g. "Saka 1+ shot on target", "Desert Crown (each way)", "Jones by KO/TKO"'),
  odds: z.string().describe('Fractional, e.g. "10/11"'),
  reasoning: z.string().describe('The numbers behind the pick: form, stats, matchup.'),
});

const Bet = z.object({
  tier: z.enum(['enter', 'cmd', 'shift', 'cash']),
  title: z.string().describe('Short, e.g. "Saturday early-kick-off builder"'),
  sport: z.enum(['football', 'horse_racing', 'mma', 'boxing', 'mixed']),
  bet_type: z.enum(['acca', 'bet_builder', 'single', 'each_way', 'multiple']),
  legs: z.array(Leg),
  odds: z.string().describe('Total fractional price, e.g. "22/1"'),
  decimal_odds: z.number().describe('Total decimal price, e.g. 23.0'),
  value_case: z.string().describe('Why the price is bigger than the real chance: your estimated probability vs the implied one.'),
  check: z.string().describe('What to confirm before placing: team sheets, non-runners, weigh-ins.'),
});

// Public, tip-free listings for the fixtures board: sports with no free data feed.
const Guide = z.object({
  racing: z.array(
    z.object({
      course: z.string(),
      country: z.string().describe('e.g. "GB", "IRE", "FR"'),
      going: z.string().describe('Official going, or "" if not found'),
      races: z.array(z.object({ time_uk: z.string(), name: z.string(), runners: z.number().nullable() })),
    }),
  ).describe("Today's UK and Irish race meetings with every race time."),
  fights: z.array(
    z.object({
      sport: z.enum(['mma', 'boxing']),
      event: z.string(),
      date: z.string().describe('YYYY-MM-DD, UK date of the main card'),
      time_uk: z.string().describe('Main card start, UK time, or ""'),
      venue: z.string(),
      main_event: z.string().describe('e.g. "Usyk v Dubois (heavyweight titles)"'),
    }),
  ).describe('Notable boxing and MMA cards in the next 7 days.'),
});

export const CardSchema = z.object({
  summary: z.string().describe('One or two sentences on today\'s card.'),
  bets: z.array(Bet).describe('At most one bet per tier. Always include the ENTER free bet if anything qualifies; leave other tiers out if there is no value today.'),
  guide: Guide,
  passed_on: z.string().describe('What was considered and rejected, and why. One short paragraph.'),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
});

export const SettlementSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      result: z.enum(['won', 'lost', 'void', 'placed', 'pending']),
      profit_pts: z.number().nullable().describe('Only for "placed" each-way results: the net profit or loss in points. Null otherwise.'),
      note: z.string().describe('One line: the score or result that decided it.'),
    }),
  ),
});

export const PreviewSchema = z.object({
  title: z.string().describe('Headline, e.g. "Weekend preview: Arsenal v Liverpool, Ascot and UFC 320"'),
  description: z.string().describe('One or two sentences for search results, under 160 characters.'),
  sections: z.array(
    z.object({
      heading: z.string().describe('e.g. "Arsenal v Liverpool (Sun 16:30)"'),
      body: z.string().describe('2-4 short paragraphs separated by blank lines: form, team news, key stats, what to watch.'),
    }),
  ),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
});
