// NFL team identity: colors drive the stylized player avatars and squad field.
// Colors are approximations for a fan-made game — not official brand assets.
window.TEAMS = {
  ARI: { name: "Cardinals",  city: "Arizona",       primary: "#97233F", secondary: "#000000", accent: "#FFB612" },
  ATL: { name: "Falcons",    city: "Atlanta",       primary: "#A71930", secondary: "#000000", accent: "#A5ACAF" },
  BAL: { name: "Ravens",     city: "Baltimore",     primary: "#241773", secondary: "#000000", accent: "#9E7C0C" },
  BUF: { name: "Bills",      city: "Buffalo",       primary: "#00338D", secondary: "#C60C30", accent: "#FFFFFF" },
  CAR: { name: "Panthers",   city: "Carolina",      primary: "#0085CA", secondary: "#101820", accent: "#BFC0BF" },
  CHI: { name: "Bears",      city: "Chicago",       primary: "#0B162A", secondary: "#C83803", accent: "#FFFFFF" },
  CIN: { name: "Bengals",    city: "Cincinnati",    primary: "#FB4F14", secondary: "#000000", accent: "#FFFFFF" },
  CLE: { name: "Browns",     city: "Cleveland",     primary: "#311D00", secondary: "#FF3C00", accent: "#FFFFFF" },
  DAL: { name: "Cowboys",    city: "Dallas",        primary: "#041E42", secondary: "#869397", accent: "#FFFFFF" },
  DEN: { name: "Broncos",    city: "Denver",        primary: "#FB4F14", secondary: "#002244", accent: "#FFFFFF" },
  DET: { name: "Lions",      city: "Detroit",       primary: "#0076B6", secondary: "#B0B7BC", accent: "#000000" },
  GB:  { name: "Packers",    city: "Green Bay",     primary: "#203731", secondary: "#FFB612", accent: "#FFFFFF" },
  HOU: { name: "Texans",     city: "Houston",       primary: "#03202F", secondary: "#A71930", accent: "#FFFFFF" },
  IND: { name: "Colts",      city: "Indianapolis",  primary: "#002C5F", secondary: "#A2AAAD", accent: "#FFFFFF" },
  JAX: { name: "Jaguars",    city: "Jacksonville",  primary: "#006778", secondary: "#101820", accent: "#D7A22A" },
  KC:  { name: "Chiefs",     city: "Kansas City",   primary: "#E31837", secondary: "#FFB81C", accent: "#FFFFFF" },
  LAC: { name: "Chargers",   city: "Los Angeles",   primary: "#0080C6", secondary: "#FFC20E", accent: "#FFFFFF" },
  LAR: { name: "Rams",       city: "Los Angeles",   primary: "#003594", secondary: "#FFA300", accent: "#FFFFFF" },
  LV:  { name: "Raiders",    city: "Las Vegas",     primary: "#000000", secondary: "#A5ACAF", accent: "#FFFFFF" },
  MIA: { name: "Dolphins",   city: "Miami",         primary: "#008E97", secondary: "#FC4C02", accent: "#FFFFFF" },
  MIN: { name: "Vikings",    city: "Minnesota",     primary: "#4F2683", secondary: "#FFC62F", accent: "#FFFFFF" },
  NE:  { name: "Patriots",   city: "New England",   primary: "#002244", secondary: "#C60C30", accent: "#B0B7BC" },
  NO:  { name: "Saints",     city: "New Orleans",   primary: "#101820", secondary: "#D3BC8D", accent: "#FFFFFF" },
  NYG: { name: "Giants",     city: "New York",      primary: "#0B2265", secondary: "#A71930", accent: "#A5ACAF" },
  NYJ: { name: "Jets",       city: "New York",      primary: "#125740", secondary: "#000000", accent: "#FFFFFF" },
  PHI: { name: "Eagles",     city: "Philadelphia",  primary: "#004C54", secondary: "#A5ACAF", accent: "#000000" },
  PIT: { name: "Steelers",   city: "Pittsburgh",    primary: "#101820", secondary: "#FFB612", accent: "#FFFFFF" },
  SEA: { name: "Seahawks",   city: "Seattle",       primary: "#002244", secondary: "#69BE28", accent: "#A5ACAF" },
  SF:  { name: "49ers",      city: "San Francisco", primary: "#AA0000", secondary: "#B3995D", accent: "#FFFFFF" },
  TB:  { name: "Buccaneers", city: "Tampa Bay",     primary: "#D50A0A", secondary: "#34302B", accent: "#FF7900" },
  TEN: { name: "Titans",     city: "Tennessee",     primary: "#0C2340", secondary: "#4B92DB", accent: "#C8102E" },
  WAS: { name: "Commanders", city: "Washington",    primary: "#5A1414", secondary: "#FFB612", accent: "#FFFFFF" },
};

// Fallback identity for anything unexpected in the pool.
window.TEAM_FALLBACK = { name: "Free Agent", city: "", primary: "#334155", secondary: "#0f172a", accent: "#e2e8f0" };

window.teamOf = function (abbr) {
  return window.TEAMS[abbr] || window.TEAM_FALLBACK;
};
