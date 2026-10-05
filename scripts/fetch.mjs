// Node 20+, no dependencies. Each source is isolated: if one fails, old values are kept.
import fs from 'node:fs';
const H = { 'User-Agent': 'watchtower/1.0', Accept: 'application/json' };
const j = async u => { const r = await fetch(u, { headers: H }); if (!r.ok) throw new Error(r.status + ' ' + u); return r.json(); };
const POSITIVE_WORDS = [
  'surge', 'rally', 'breakout', 'bullish', 'support', 'momentum', 'uptrend', 'strong', 'gain',
  'boost', 'rebound', 'approval', 'adoption', 'inflow', 'bulls', 'hype', 'pump'
];
const NEGATIVE_WORDS = [
  'drop', 'selloff', 'bearish', 'panic', 'liquidity', 'crash', 'risk', 'weak', 'decline', 'down',
  'pressure', 'dump', 'fraud', 'hack', 'warning', 'concern', 'volatility', 'slump'
];
const RUMOR_WORDS = [
  'rumor', 'allegedly', 'whistleblower', 'leak', 'speculation', 'insider', 'possible', 'unconfirmed',
  'secret', 'mystery', 'frenzy', 'pump', 'manipulation', 'suspicious'
];

let old = {}; try { old = JSON.parse(fs.readFileSync('data.json', 'utf8')); } catch {}
const D = { ...old, errors: [] };
D.assets = D.assets || {};

const step = async (name, fn) => { try { await fn(); } catch (e) { D.errors.push(name + ': ' + e.message); } };

const scoreHeadline = title => {
  const text = (title || '').toLowerCase();
  const pos = POSITIVE_WORDS.reduce((n, word) => n + (text.includes(word) ? 1 : 0), 0);
  const neg = NEGATIVE_WORDS.reduce((n, word) => n + (text.includes(word) ? 1 : 0), 0);
  const rumor = RUMOR_WORDS.reduce((n, word) => n + (text.includes(word) ? 1 : 0), 0);
  const sentiment = (pos - neg) / Math.max(1, pos + neg + 1);
  const rumorIndex = Math.min(1, rumor / 5);
  return {
    sentiment: Number(sentiment.toFixed(2)),
    rumor_index: Number(rumorIndex.toFixed(2))
  };
};

const enrichNews = (items = []) => items.map(item => {
  const score = scoreHeadline(item.title || item.summary || 'Market update');
  return {
    ...item,
    summary: item.summary || item.title || 'Market update',
    sentiment: score.sentiment,
    rumor_index: score.rumor_index,
    category: item.category || 'markets'
  };
});

// 1) Prices (CoinGecko, no key) - include BTC, ETH, and XRP
await step('prices', async () => {
  const m = await j('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,ripple&price_change_percentage=24h');
  for (const x of m) {
    const k = x.symbol.toUpperCase();
    D.assets[k] = {
      ...(D.assets[k] || {}),
      n: x.name,
      p: x.current_price,
      ch: +(x.price_change_percentage_24h || 0).toFixed(2),
      hi: x.high_24h,
      lo: x.low_24h,
      sentiment: Number((D.assets[k]?.sentiment ?? 0.55).toFixed(2)),
      rumor_index: Number((D.assets[k]?.rumor_index ?? 0.35).toFixed(2)),
      asset_type: 'crypto'
    };
  }
  D.asOf = new Date().toISOString();
});

// 2) Candles (Coinbase public API, no key). Stored as [open, high, low, close, volume], oldest first.
for (const [k, pid] of [['BTC', 'BTC-USD'], ['ETH', 'ETH-USD']]) {
  await step('candles ' + k, async () => {
    const a = (D.assets[k] = D.assets[k] || {}); a.candles = a.candles || {};
    for (const [tf, g] of [[1, 3600], [6, 21600], [24, 86400]]) {
      const r = await j(`https://api.exchange.coinbase.com/products/${pid}/candles?granularity=${g}`);
      a.candles[tf] = r.slice(0, 80).reverse().map(([t, l, h, o, c, v]) => [o, h, l, c, +Number(v).toFixed(2)]);
    }
  });
}

// 3) Global market + Fear & Greed
await step('global', async () => {
  const g = (await j('https://api.coingecko.com/api/v3/global')).data;
  D.global = { cap: g.total_market_cap.usd, dom: +g.market_cap_percentage.btc.toFixed(1) };
});
await step('fng', async () => {
  const f = (await j('https://api.alternative.me/fng/?limit=1')).data[0];
  D.fng = { value: +f.value, label: f.value_classification };
});

// 4) News via RSS
const rss = async (u, src) => {
  const t = await (await fetch(u, { headers: H })).text();
  return [...t.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 10).map(m => {
    const g = tag => ((m[1].match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`)) || [])[1] || '').trim();
    return { src, title: g('title'), link: g('link'), date: g('pubDate') };
  });
};
await step('news', async () => {
  const all = [];
  for (const [u, s] of [['https://www.coindesk.com/arc/outboundfeeds/rss/', 'CoinDesk'], ['https://cointelegraph.com/rss', 'Cointelegraph']]) {
    try { all.push(...await rss(u, s)); } catch (e) { D.errors.push('rss ' + s + ': ' + e.message); }
  }
  if (all.length) D.news = enrichNews(all.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 16));
});

// 5) Stocks (optional: needs free FINNHUB_KEY secret)
if (process.env.FINNHUB_KEY) {
  await step('stocks', async () => {
    D.stocks = [];
    for (const s of ['SPY', 'QQQ', 'NVDA', 'TSLA', 'COIN']) {
      const q = await j(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${process.env.FINNHUB_KEY}`);
      D.stocks.push({ sym: s, p: q.c, ch: +(q.dp || 0).toFixed(2), sentiment: 0.6, rumor_index: 0.45, asset_type: 'stock' });
    }
  });
}

// 6) Generate alerts from all assets (crypto + stocks)
const assetEntries = [
  ...Object.entries(D.assets || {}),
  ...(Array.isArray(D.stocks) ? D.stocks.map(s => [s.sym, { ch: s.ch ?? 0, sentiment: s.sentiment ?? 0.6, rumor_index: s.rumor_index ?? 0.45, p: s.p, asset_type: 'stock' }]) : [])
];

D.alerts = assetEntries
  .map(([sym, asset]) => {
    const ch = Number(asset?.ch ?? 0);
    const rumor = Number(asset?.rumor_index ?? 0);
    const sentiment = Number(asset?.sentiment ?? 0);
    const price = Number(asset?.p ?? 0);

    if (Math.abs(ch) > 2 || rumor > 0.6 || sentiment > 0.7) {
      const severity = Math.abs(ch) > 5 || rumor > 0.75 ? 'high' : Math.abs(ch) > 2 || rumor > 0.6 ? 'medium' : 'low';
      const triggerReason = Math.abs(ch) > 5 ? `sharp move ${ch > 0 ? '↑' : '↓'}` : Math.abs(ch) > 2 ? `moderate move ${ch > 0 ? '↑' : '↓'}` : rumor > 0.6 ? 'rumor detected' : 'sentiment shift';
      return {
        symbol: sym,
        type: 'market_signal',
        severity,
        price: price > 0 ? `$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}` : 'N/A',
        change: `${ch > 0 ? '+' : ''}${ch.toFixed(2)}%`,
        summary: `${sym} is moving ${ch > 0 ? '+' : ''}${ch.toFixed(2)}% (${triggerReason}) with rumor score ${rumor.toFixed(2)}.`,
        reason: triggerReason,
        sentiment,
        rumor_index: rumor
      };
    }
    return null;
  })
  .filter(Boolean)
  .slice(0, 10);

const strongest = assetEntries.reduce((best, [sym, asset]) => {
  const score = Math.abs(Number(asset?.ch ?? 0));
  if (!best || score > best.score) return { symbol: sym, score, change: asset.ch };
  return best;
}, null) || { symbol: 'N/A', score: 0, change: 0 };

D.market_summary = {
  crypto_count: assetEntries.filter(([sym]) => ['BTC', 'ETH', 'XRP'].includes(sym)).length,
  stock_count: Array.isArray(D.stocks) ? D.stocks.length : 0,
  strongest_signal: strongest.symbol,
  strongest_change: strongest.change,
  alert_count: D.alerts.length
};

fs.writeFileSync('data.json', JSON.stringify(D));
console.log('ok', D.asOf, D.errors);
