'use strict';

/**
 * Universal Web Service & URL Destination Resolver for PIXEL / ODVPA
 * 
 * Automatically maps natural language goals, services, and queries
 * to their authoritative web destinations without requiring hardcoded URLs.
 */

const POPULAR_SERVICES = {
  // Social & Media
  instagram: 'https://www.instagram.com',
  twitter: 'https://x.com',
  x: 'https://x.com',
  facebook: 'https://www.facebook.com',
  fb: 'https://www.facebook.com',
  reddit: 'https://www.reddit.com',
  linkedin: 'https://www.linkedin.com',
  threads: 'https://www.threads.net',
  pinterest: 'https://www.pinterest.com',
  quora: 'https://www.quora.com',
  tiktok: 'https://www.tiktok.com',
  whatsapp: 'https://web.whatsapp.com',
  discord: 'https://discord.com',
  twitch: 'https://www.twitch.tv',

  // Video, Music & Streaming
  youtube: 'https://www.youtube.com',
  spotify: 'https://open.spotify.com',
  netflix: 'https://www.netflix.com',
  primevideo: 'https://www.primevideo.com',
  hotstar: 'https://www.hotstar.com',
  jiocinema: 'https://www.jiocinema.com',

  // E-Commerce & Retail
  amazon: 'https://www.amazon.com',
  flipkart: 'https://www.flipkart.com',
  myntra: 'https://www.myntra.com',
  meesho: 'https://www.meesho.com',
  ajio: 'https://www.ajio.com',
  nykaa: 'https://www.nykaa.com',
  ebay: 'https://www.ebay.com',
  walmart: 'https://www.walmart.com',
  target: 'https://www.target.com',
  bestbuy: 'https://www.bestbuy.com',

  // Food & Grocery
  zomato: 'https://www.zomato.com',
  swiggy: 'https://www.swiggy.com',
  blinkit: 'https://www.blinkit.com',
  zepto: 'https://www.zeptonow.com',
  instamart: 'https://www.swiggy.com/instamart',
  doordash: 'https://www.doordash.com',
  ubereats: 'https://www.ubereats.com',

  // Travel & Booking
  makemytrip: 'https://www.makemytrip.com',
  irctc: 'https://www.irctc.co.in',
  booking: 'https://www.booking.com',
  expedia: 'https://www.expedia.com',
  airbnb: 'https://www.airbnb.com',
  agoda: 'https://www.agoda.com',

  // Developer, Knowledge & Research
  wikipedia: 'https://en.wikipedia.org',
  wikihow: 'https://www.wikihow.com',
  britannica: 'https://www.britannica.com',
  github: 'https://github.com',
  gitlab: 'https://gitlab.com',
  stackoverflow: 'https://stackoverflow.com',
  huggingface: 'https://huggingface.co',
  kaggle: 'https://www.kaggle.com',
  medium: 'https://medium.com',
  hackernews: 'https://news.ycombinator.com',
  ycombinator: 'https://news.ycombinator.com',
  isro: 'https://www.isro.gov.in',
  nasa: 'https://www.nasa.gov',

  // Search & Portals
  google: 'https://www.google.com',
  gmail: 'https://mail.google.com',
  yahoo: 'https://www.yahoo.com',
  bing: 'https://www.bing.com',
  duckduckgo: 'https://duckduckgo.com',
  perplexity: 'https://www.perplexity.ai',

  // News & Sports
  cricbuzz: 'https://www.cricbuzz.com',
  espn: 'https://www.espn.com',
  bbc: 'https://www.bbc.com',
  cnn: 'https://www.cnn.com',
  reuters: 'https://www.reuters.com',
  nytimes: 'https://www.nytimes.com',
};

const SITE_SEARCH_TEMPLATES = {
  google: 'https://www.google.com/search?q=',
  youtube: 'https://www.youtube.com/results?search_query=',
  amazon: 'https://www.amazon.com/s?k=',
  wikipedia: 'https://en.wikipedia.org/wiki/Special:Search?search=',
  github: 'https://github.com/search?q=',
  reddit: 'https://www.reddit.com/search/?q=',
  flipkart: 'https://www.flipkart.com/search?q=',
  twitter: 'https://x.com/search?q=',
  x: 'https://x.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  bing: 'https://www.bing.com/search?q=',
};

function cleanSearchQuery(query) {
  if (!query) return '';
  return query
    .replace(/^(?:search for|search|look up|find|show me|check|browse|buy|purchase|get)\s+/i, '')
    .replace(/\s+(?:on|in|at)\s+[a-zA-Z0-9_-]+$/i, '')
    .trim();
}

function resolveDestinationUrl(text, currentUrl = '') {
  if (!text || typeof text !== 'string') return null;
  const str = text.trim();
  const lower = str.toLowerCase();
  
  // 1. Explicit http/https or www
  const explicit = str.match(/https?:\/\/[^\s"'<>]+/i) || str.match(/\b(www\.[^\s"'<>]+)/i);
  if (explicit) {
    let u = explicit[0];
    return u.startsWith('http') ? u : 'https://' + u;
  }

  // 2. Bare domain with TLD (check longer composite TLDs like gov.in / co.in first)
  const domainMatch = str.match(/\b([a-zA-Z0-9-]+\.(?:gov\.in|co\.in|nic\.in|ac\.in|res\.in|com|org|gov|in|edu|net|io|ai|tv|co|me)(?:\/[^\s"'<>]*)?)\b/i);
  if (domainMatch) {
    return 'https://' + domainMatch[1];
  }

  // 3. Pattern: "search for X on <service>" or "look up X on <service>"
  const searchOnMatch = str.match(/(?:search for|search|find|look up|watch|buy)\s+(.+?)\s+(?:on|in|at)\s+([a-zA-Z0-9_-]+)/i);
  if (searchOnMatch) {
    const rawQuery = searchOnMatch[1].trim();
    const serviceKey = searchOnMatch[2].toLowerCase();
    if (SITE_SEARCH_TEMPLATES[serviceKey]) {
      return `${SITE_SEARCH_TEMPLATES[serviceKey]}${encodeURIComponent(rawQuery)}`;
    }
    if (POPULAR_SERVICES[serviceKey]) {
      return POPULAR_SERVICES[serviceKey];
    }
  }

  // 4. Pattern: Generic web requests (e.g. "go to a website", "open a website", "browse the web")
  if (/^(?:go to|open|visit|browse|navigate to)\s+(?:a\s+)?(?:website|site|webpage|page|internet|browser|web)$/i.test(lower)) {
    return 'https://www.google.com';
  }

  // 5. Pattern: "login to X", "go to X", "open X", "visit X", "sign in to X"
  const actionMatch = lower.match(/(?:login to|sign in to|go to|open|visit|browse|navigate to)\s+([a-zA-Z0-9_-]+)/i);
  if (actionMatch) {
    const candidate = actionMatch[1].toLowerCase();
    if (POPULAR_SERVICES[candidate]) return POPULAR_SERVICES[candidate];
    if (candidate.length >= 3 && !['the', 'my', 'a', 'an', 'page', 'site', 'tab', 'window', 'website'].includes(candidate)) {
      return `https://www.${candidate}.com`;
    }
  }

  // 5. Named popular services anywhere in the phrase (require length > 2 so 'x' or 'fb' don't match arbitrary words)
  for (const [key, url] of Object.entries(POPULAR_SERVICES)) {
    if (key.length <= 2) continue;
    const re = new RegExp(`\\b${key}\\b`, 'i');
    if (re.test(lower)) {
      return url;
    }
  }

  // 6. If currently on blank/newtab page, search queries or general intent route to Google Search
  const isBlank = !currentUrl || currentUrl === 'about:blank' || currentUrl.startsWith('chrome://');
  if (isBlank) {
    const query = cleanSearchQuery(str);
    if (query.length > 0) {
      return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
    return 'https://www.google.com';
  }

  return null;
}

module.exports = {
  POPULAR_SERVICES,
  SITE_SEARCH_TEMPLATES,
  resolveDestinationUrl,
  cleanSearchQuery,
};
