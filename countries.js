// Maps free-text profile locations ("Berlin", "NYC", "São Paulo, Brasil")
// to an ISO country code. Matching is token-based against lowercase keys.
// Exposed as globals consumed by content.js (both run in the same
// isolated content-script world).

const TCB_COUNTRY_BY_KEYWORD = {
  // --- Country names (English + common native/short forms) -> ISO code ---
  "united states": "US", "usa": "US", "u.s.a": "US", "u.s": "US", "us": "US",
  "america": "US", "estados unidos": "US",
  "united kingdom": "GB", "uk": "GB", "great britain": "GB", "britain": "GB",
  "england": "GB", "scotland": "GB", "wales": "GB", "northern ireland": "GB",
  "canada": "CA", "australia": "AU", "new zealand": "NZ", "aotearoa": "NZ",
  "ireland": "IE", "éire": "IE",
  "germany": "DE", "deutschland": "DE", "france": "FR", "spain": "ES",
  "españa": "ES", "portugal": "PT", "italy": "IT", "italia": "IT",
  "netherlands": "NL", "nederland": "NL", "holland": "NL", "belgium": "BE",
  "belgië": "BE", "belgique": "BE", "switzerland": "CH", "schweiz": "CH",
  "suisse": "CH", "austria": "AT", "österreich": "AT",
  "sweden": "SE", "sverige": "SE", "norway": "NO", "norge": "NO",
  "denmark": "DK", "danmark": "DK", "finland": "FI", "suomi": "FI",
  "iceland": "IS", "poland": "PL", "polska": "PL", "czech republic": "CZ",
  "czechia": "CZ", "česko": "CZ", "slovakia": "SK", "hungary": "HU",
  "magyarország": "HU", "romania": "RO", "românia": "RO", "bulgaria": "BG",
  "greece": "GR", "ελλάδα": "GR", "turkey": "TR", "türkiye": "TR",
  "ukraine": "UA", "україна": "UA", "украина": "UA",
  "russia": "RU", "россия": "RU", "belarus": "BY", "moldova": "MD",
  "lithuania": "LT", "latvia": "LV", "estonia": "EE", "eesti": "EE",
  "serbia": "RS", "srbija": "RS", "croatia": "HR", "hrvatska": "HR",
  "slovenia": "SI", "bosnia": "BA", "bosnia and herzegovina": "BA",
  "montenegro": "ME", "north macedonia": "MK", "macedonia": "MK",
  "albania": "AL", "kosovo": "XK", "malta": "MT", "cyprus": "CY",
  "luxembourg": "LU", "monaco": "MC", "andorra": "AD", "liechtenstein": "LI",
  "georgia country": "GE", "armenia": "AM", "azerbaijan": "AZ",
  "kazakhstan": "KZ", "uzbekistan": "UZ", "kyrgyzstan": "KG",
  "tajikistan": "TJ", "turkmenistan": "TM", "mongolia": "MN",
  "china": "CN", "中国": "CN", "prc": "CN", "hong kong": "HK", "香港": "HK",
  "taiwan": "TW", "台灣": "TW", "台湾": "TW", "macau": "MO",
  "japan": "JP", "日本": "JP", "south korea": "KR", "korea": "KR",
  "한국": "KR", "대한민국": "KR", "north korea": "KP",
  "india": "IN", "भारत": "IN", "pakistan": "PK", "bangladesh": "BD",
  "sri lanka": "LK", "nepal": "NP", "bhutan": "BT", "maldives": "MV",
  "afghanistan": "AF", "iran": "IR", "iraq": "IQ", "syria": "SY",
  "lebanon": "LB", "jordan": "JO", "israel": "IL", "ישראל": "IL",
  "palestine": "PS", "saudi arabia": "SA", "ksa": "SA",
  "united arab emirates": "AE", "uae": "AE", "dubai": "AE", "abu dhabi": "AE",
  "qatar": "QA", "kuwait": "KW", "bahrain": "BH", "oman": "OM", "yemen": "YE",
  "egypt": "EG", "مصر": "EG", "morocco": "MA", "algeria": "DZ",
  "tunisia": "TN", "libya": "LY", "sudan": "SD", "ethiopia": "ET",
  "kenya": "KE", "nigeria": "NG", "ghana": "GH", "south africa": "ZA",
  "tanzania": "TZ", "uganda": "UG", "rwanda": "RW", "senegal": "SN",
  "ivory coast": "CI", "côte d'ivoire": "CI", "cameroon": "CM",
  "zimbabwe": "ZW", "zambia": "ZM", "botswana": "BW", "namibia": "NA",
  "mozambique": "MZ", "angola": "AO", "somalia": "SO", "mali": "ML",
  "thailand": "TH", "ประเทศไทย": "TH", "vietnam": "VN", "việt nam": "VN",
  "philippines": "PH", "pilipinas": "PH", "indonesia": "ID",
  "malaysia": "MY", "singapore": "SG", "myanmar": "MM", "burma": "MM",
  "cambodia": "KH", "laos": "LA", "brunei": "BN", "timor-leste": "TL",
  "papua new guinea": "PG", "fiji": "FJ",
  "mexico": "MX", "méxico": "MX", "guatemala": "GT", "honduras": "HN",
  "el salvador": "SV", "nicaragua": "NI", "costa rica": "CR", "panama": "PA",
  "panamá": "PA", "cuba": "CU", "jamaica": "JM", "haiti": "HT",
  "dominican republic": "DO", "puerto rico": "PR", "bahamas": "BS",
  "trinidad": "TT", "barbados": "BB",
  "brazil": "BR", "brasil": "BR", "argentina": "AR", "chile": "CL",
  "colombia": "CO", "peru": "PE", "perú": "PE", "venezuela": "VE",
  "ecuador": "EC", "bolivia": "BO", "paraguay": "PY", "uruguay": "UY",
  "guyana": "GY", "suriname": "SR",

  // --- Major cities / regions -> country ---
  "new york": "US", "nyc": "US", "los angeles": "US", "san francisco": "US",
  "sf": "US", "bay area": "US", "silicon valley": "US", "chicago": "US",
  "houston": "US", "austin": "US", "dallas": "US", "seattle": "US",
  "boston": "US", "miami": "US", "atlanta": "US", "denver": "US",
  "philadelphia": "US", "phoenix": "US", "san diego": "US", "portland": "US",
  "washington dc": "US", "d.c": "US", "dc": "US", "las vegas": "US",
  "brooklyn": "US", "manhattan": "US", "nashville": "US", "new orleans": "US",
  "london": "GB", "manchester": "GB", "birmingham uk": "GB", "leeds": "GB",
  "liverpool": "GB", "glasgow": "GB", "edinburgh": "GB", "bristol": "GB",
  "toronto": "CA", "vancouver": "CA", "montreal": "CA", "montréal": "CA",
  "ottawa": "CA", "calgary": "CA", "edmonton": "CA",
  "sydney": "AU", "melbourne": "AU", "brisbane": "AU", "perth": "AU",
  "auckland": "NZ", "wellington": "NZ", "dublin": "IE",
  "berlin": "DE", "munich": "DE", "münchen": "DE", "hamburg": "DE",
  "frankfurt": "DE", "cologne": "DE", "köln": "DE", "stuttgart": "DE",
  "paris": "FR", "lyon": "FR", "marseille": "FR", "toulouse": "FR",
  "madrid": "ES", "barcelona": "ES", "valencia": "ES", "sevilla": "ES",
  "lisbon": "PT", "lisboa": "PT", "porto": "PT",
  "rome": "IT", "roma": "IT", "milan": "IT", "milano": "IT", "naples": "IT",
  "amsterdam": "NL", "rotterdam": "NL", "the hague": "NL",
  "brussels": "BE", "antwerp": "BE", "zurich": "CH", "zürich": "CH",
  "geneva": "CH", "vienna": "AT", "wien": "AT",
  "stockholm": "SE", "gothenburg": "SE", "oslo": "NO", "copenhagen": "DK",
  "københavn": "DK", "helsinki": "FI", "reykjavik": "IS",
  "warsaw": "PL", "warszawa": "PL", "krakow": "PL", "kraków": "PL",
  "prague": "CZ", "praha": "CZ", "budapest": "HU", "bucharest": "RO",
  "athens": "GR", "istanbul": "TR", "ankara": "TR",
  "kyiv": "UA", "kiev": "UA", "київ": "UA", "lviv": "UA", "львів": "UA",
  "kharkiv": "UA", "odesa": "UA", "odessa": "UA", "dnipro": "UA",
  "moscow": "RU", "москва": "RU", "saint petersburg": "RU",
  "beijing": "CN", "shanghai": "CN", "shenzhen": "CN", "guangzhou": "CN",
  "tokyo": "JP", "東京": "JP", "osaka": "JP", "kyoto": "JP",
  "seoul": "KR", "서울": "KR", "busan": "KR",
  "mumbai": "IN", "delhi": "IN", "new delhi": "IN", "bangalore": "IN",
  "bengaluru": "IN", "hyderabad": "IN", "chennai": "IN", "kolkata": "IN",
  "pune": "IN", "karachi": "PK", "lahore": "PK", "islamabad": "PK",
  "dhaka": "BD", "colombo": "LK", "kathmandu": "NP",
  "tehran": "IR", "baghdad": "IQ", "riyadh": "SA", "jeddah": "SA",
  "doha": "QA", "tel aviv": "IL", "jerusalem": "IL", "amman": "JO",
  "beirut": "LB", "cairo": "EG", "alexandria": "EG", "casablanca": "MA",
  "lagos": "NG", "abuja": "NG", "nairobi": "KE", "accra": "GH",
  "johannesburg": "ZA", "cape town": "ZA", "durban": "ZA",
  "addis ababa": "ET", "dar es salaam": "TZ", "kampala": "UG",
  "bangkok": "TH", "hanoi": "VN", "ho chi minh": "VN", "saigon": "VN",
  "manila": "PH", "quezon city": "PH", "jakarta": "ID", "bali": "ID",
  "kuala lumpur": "MY", "yangon": "MM", "phnom penh": "KH",
  "mexico city": "MX", "cdmx": "MX", "guadalajara": "MX", "monterrey": "MX",
  "havana": "CU", "kingston": "JM", "san juan": "PR",
  "são paulo": "BR", "sao paulo": "BR", "rio de janeiro": "BR", "rio": "BR",
  "brasília": "BR", "brasilia": "BR", "belo horizonte": "BR",
  "buenos aires": "AR", "córdoba": "AR", "santiago": "CL", "bogotá": "CO",
  "bogota": "CO", "medellín": "CO", "medellin": "CO", "lima": "PE",
  "caracas": "VE", "quito": "EC", "guayaquil": "EC", "la paz": "BO",
  "montevideo": "UY", "asunción": "PY",

  // --- US states (full names + postal codes are handled in code) ---
  "alabama": "US", "alaska": "US", "arizona": "US", "arkansas": "US",
  "california": "US", "colorado": "US", "connecticut": "US",
  "delaware": "US", "florida": "US", "georgia": "US", "hawaii": "US",
  "idaho": "US", "illinois": "US", "indiana": "US", "iowa": "US",
  "kansas": "US", "kentucky": "US", "louisiana": "US", "maine": "US",
  "maryland": "US", "massachusetts": "US", "michigan": "US",
  "minnesota": "US", "mississippi": "US", "missouri": "US", "montana": "US",
  "nebraska": "US", "nevada": "US", "new hampshire": "US",
  "new jersey": "US", "new mexico": "US", "north carolina": "US",
  "north dakota": "US", "ohio": "US", "oklahoma": "US", "oregon": "US",
  "pennsylvania": "US", "rhode island": "US", "south carolina": "US",
  "south dakota": "US", "tennessee": "US", "texas": "US", "utah": "US",
  "vermont": "US", "virginia": "US", "west virginia": "US",
  "wisconsin": "US", "wyoming": "US",

  // Canadian provinces
  "ontario": "CA", "quebec": "CA", "québec": "CA", "british columbia": "CA",
  "alberta": "CA", "manitoba": "CA", "saskatchewan": "CA", "nova scotia": "CA"
};

// US state postal codes — only matched as a trailing ", XX" token to avoid
// false hits (e.g. "IN" the preposition, "CA" in "CAmeroon").
const TCB_US_STATE_CODES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
]);

// Complete country-name -> ISO map generated by the browser itself. Covers
// every ISO 3166 region in canonical English — exactly what X's About
// endpoint returns — with zero maintenance. Checked before the hand-written
// keyword dict so e.g. the country "Georgia" beats the US state.
const TCB_ISO_BY_NAME = (() => {
  const map = {};
  try {
    const display = new Intl.DisplayNames(["en"], { type: "region" });
    // Deprecated/transitional ISO codes whose display names collide with
    // current countries (DD = "Germany", HV = "Burkina Faso", ...).
    const deprecated = new Set([
      "AN", "BU", "CS", "DD", "FX", "HV", "NT", "SU", "TP", "UK", "YD",
      "YU", "ZR",
    ]);
    const add = (name, code) => {
      // First code wins: keeps GB over deprecated UK, BF over HV, etc.
      if (!(name in map)) map[name] = code;
    };
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a) + String.fromCharCode(b);
        if (deprecated.has(code)) continue;
        const name = display.of(code);
        // Unknown codes echo back the code itself — skip those.
        if (!name || name === code) continue;
        const lower = name.toLowerCase();
        add(lower, code);
        // Intl abbreviates ("St. Lucia", "Antigua & Barbuda"); X spells out.
        add(lower.replace(/\bst\.\s*/g, "saint ").replace(/\s*&\s*/g, " and "), code);
      }
    }
  } catch {
    /* Intl.DisplayNames unavailable — keyword dict still works */
  }
  // Common variants X/users produce that DisplayNames spells differently.
  const aliases = {
    "united states of america": "US",
    "the netherlands": "NL",
    "czech republic": "CZ",
    "republic of korea": "KR",
    "south korea": "KR",
    "north korea": "KP",
    "russia": "RU",
    "democratic republic of the congo": "CD",
    "republic of the congo": "CG",
    "ivory coast": "CI",
    "cape verde": "CV",
    "east timor": "TL",
    "vatican": "VA",
    "palestine": "PS",
    "syria": "SY",
    "iran": "IR",
    "laos": "LA",
    "moldova": "MD",
    "tanzania": "TZ",
    "venezuela": "VE",
    "bolivia": "BO",
    "brunei": "BN",
    "micronesia": "FM",
    "kosovo": "XK",
    "turkey": "TR",
    "burma": "MM",
    "eswatini": "SZ",
    "swaziland": "SZ",
    "saint vincent and the grenadines": "VC",
  };
  for (const [name, code] of Object.entries(aliases)) {
    if (!map[name]) map[name] = code;
  }
  return map;
})();

// Economic tiers for the GDP text-sizing gag. Roughly World Bank income
// groups: tier 1 = high income, tier 3 = low/lower-middle, everything else
// (and unknown) = tier 2.
const TCB_TIER1 = new Set([
  "US", "CA", "GB", "IE", "FR", "DE", "NL", "BE", "LU", "CH", "AT", "DK",
  "SE", "NO", "FI", "IS", "IT", "ES", "PT", "GR", "MT", "CY", "SI", "CZ",
  "SK", "EE", "LV", "LT", "PL", "HR", "HU", "RO", "BG", "MC", "AD", "LI",
  "SM", "VA", "JP", "KR", "SG", "HK", "TW", "MO", "AU", "NZ", "IL", "AE",
  "QA", "KW", "BH", "SA", "OM", "BN", "CL", "UY", "PA", "PR", "BS", "BB",
  "TT", "SC", "GI", "BM", "KY", "JE", "GG", "IM", "FO", "GL", "AW", "CW",
]);
const TCB_TIER3 = new Set([
  "IN", "PK", "BD", "NP", "LK", "MM", "KH", "LA", "TL", "PH", "VN", "PG",
  "SB", "VU", "KI", "FM", "TV", "WS", "TO", "AF", "YE", "SY", "PS", "EG",
  "MA", "TN", "DZ", "SD", "SS", "ET", "ER", "DJ", "SO", "KE", "UG", "TZ",
  "RW", "BI", "CD", "CG", "CF", "TD", "NE", "NG", "GH", "CI", "SN", "GM",
  "GN", "GW", "SL", "LR", "ML", "BF", "TG", "BJ", "MR", "CM", "GA", "GQ",
  "ST", "CV", "AO", "ZM", "ZW", "MW", "MZ", "MG", "KM", "LS", "SZ", "BO",
  "HN", "NI", "GT", "SV", "HT", "CU", "TJ", "KG", "UZ", "TM", "KP", "UA",
  "MD", "XK",
]);

function tcbTierForCode(isoCode) {
  if (TCB_TIER1.has(isoCode)) return 1;
  if (TCB_TIER3.has(isoCode)) return 3;
  return 2;
}

function tcbFlagEmoji(isoCode) {
  if (isoCode === "XK") return "🇽🇰"; // Kosovo — supported by most platforms
  return isoCode
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

// Returns { code, flag } or null.
function tcbCountryFromLocation(rawLocation) {
  if (!rawLocation) return null;
  const text = rawLocation.trim();
  if (!text) return null;

  // Direct flag emoji already in the location string.
  const flagMatch = text.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u);
  if (flagMatch) {
    const cp = [...flagMatch[0]].map((c) => c.codePointAt(0) - 127397);
    const code = String.fromCharCode(...cp);
    return { code, flag: flagMatch[0] };
  }

  const lower = text.toLowerCase();

  // Canonical country names first (this is what the About endpoint returns):
  // exact full string, then comma parts right-to-left ("Tbilisi, Georgia").
  const isoDirect = TCB_ISO_BY_NAME[lower];
  if (isoDirect) return { code: isoDirect, flag: tcbFlagEmoji(isoDirect) };
  const rightToLeft = lower
    .split(/[,/|·•]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .reverse();
  for (const part of rightToLeft) {
    const code = TCB_ISO_BY_NAME[part];
    if (code) return { code, flag: tcbFlagEmoji(code) };
  }

  // Fall back to the hand-written keyword dict (cities, states, native names).
  const candidates = [lower];
  const parts = lower.split(/[,/|·•]+/).map((p) => p.trim()).filter(Boolean);
  candidates.push(...parts.reverse());
  for (const part of parts) {
    candidates.push(...part.split(/\s+/));
  }

  for (const candidate of candidates) {
    const cleaned = candidate.replace(/[.!?()#]/g, "").trim();
    if (!cleaned) continue;
    // "georgia" alone is ambiguous (US state vs country) — dict maps it to US;
    // "georgia country" key covers the explicit case.
    const code = TCB_COUNTRY_BY_KEYWORD[cleaned];
    if (code) return { code, flag: tcbFlagEmoji(code) };
  }

  // Trailing US state postal code: "Austin, TX" / "Miami FL".
  const stateMatch = text.match(/(?:,|\s)\s*([A-Z]{2})\s*$/);
  if (stateMatch && TCB_US_STATE_CODES.has(stateMatch[1])) {
    return { code: "US", flag: tcbFlagEmoji("US") };
  }

  return null;
}
