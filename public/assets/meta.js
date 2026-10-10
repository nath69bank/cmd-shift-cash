// Names, tiers and leagues shared by the server and the browser.

export const BRAND = 'CMD + SHIFT + CASH';

export const TIERS = {
  enter: {
    key: '⏎',
    name: 'ENTER',
    label: 'Banker',
    target: 'evens to 2/1',
    // decimal odds window: 1/2 to 2/1
    min: 1.5,
    max: 3,
    stake: 1,
    free: true,
    blurb: 'Your way in. The banker of the day, free for everyone.',
  },
  cmd: {
    key: '⌘',
    name: 'CMD',
    label: 'Small',
    target: 'around 4/1',
    // decimal odds window: 3/1 to 6/1
    min: 4,
    max: 7,
    stake: 1,
    blurb: 'The controlled one. A short acca, bet builder or single priced around 4/1.',
  },
  shift: {
    key: '⇧',
    name: 'SHIFT',
    label: 'Medium',
    target: '20/1+',
    min: 21,
    max: 100,
    stake: 0.5,
    blurb: 'Shifts the bank. Accas and bet builders at 20/1+ where the numbers stack up.',
  },
  cash: {
    key: '$',
    name: 'CASH',
    label: 'Gamble',
    target: '100/1+',
    min: 101,
    max: Infinity,
    stake: 0.25,
    blurb: 'The big swing. 100/1+ for small stakes, only when every leg has a reason.',
  },
};

export const TIER_ORDER = ['enter', 'cmd', 'shift', 'cash'];
export const PAID_TIERS = ['cmd', 'shift', 'cash'];

export const SPORTS = { football: 'Football', horse_racing: 'Horse racing', mma: 'UFC / MMA', boxing: 'Boxing', mixed: 'Multi-sport' };
export const BET_TYPES = { acca: 'Acca', bet_builder: 'Bet builder', single: 'Single', each_way: 'Each way', multiple: 'Multiple' };
export const RESULTS = { won: 'Won', lost: 'Lost', void: 'Void', placed: 'Placed', pending: 'Pending' };

// ESPN league ids, with the slugs used for /fixtures/<slug> pages.
export const LEAGUES = [
  { id: 'eng.1', slug: 'premier-league', name: 'Premier League' },
  { id: 'uefa.champions', slug: 'champions-league', name: 'Champions League' },
  { id: 'eng.2', slug: 'championship', name: 'Championship' },
  { id: 'esp.1', slug: 'la-liga', name: 'LaLiga' },
  { id: 'ita.1', slug: 'serie-a', name: 'Serie A' },
  { id: 'ger.1', slug: 'bundesliga', name: 'Bundesliga' },
  { id: 'fra.1', slug: 'ligue-1', name: 'Ligue 1' },
  { id: 'sco.1', slug: 'scottish-premiership', name: 'Scottish Premiership' },
  { id: 'uefa.europa', slug: 'europa-league', name: 'Europa League' },
];
