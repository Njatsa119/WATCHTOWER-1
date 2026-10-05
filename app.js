const FALLBACK = {
  BTCUSDT: { symbol: 'BTC', name: 'Bitcoin', price: 86428.0, change: 1.91 },
  ETHUSDT: { symbol: 'ETH', name: 'Ethereum', price: 7162.44, change: -0.13 },
  XRPUSDT: { symbol: 'XRP', name: 'Ripple', price: 0.66, change: 2.84 },
  SOLUSDT: { symbol: 'SOL', name: 'Solana', price: 121.0, change: -0.60 },
  BNBUSDT: { symbol: 'BNB', name: 'Binance Coin', price: 601.33, change: 0.74 },
  ADAUSDT: { symbol: 'ADA', name: 'Cardano', price: 0.63, change: -0.68 },
  DOGEUSDT: { symbol: 'DOGE', name: 'Dogecoin', price: 0.14, change: 1.11 },
  LINKUSDT: { symbol: 'LINK', name: 'Chainlink', price: 15.22, change: -1.08 },
  EURUSD: { symbol: 'EURUSD', name: 'Euro/USD', price: 1.08, change: 0.18 },
  GBPUSD: { symbol: 'GBPUSD', name: 'GBP/USD', price: 1.27, change: 0.22 },
  USDJPY: { symbol: 'USDJPY', name: 'JPY/USD', price: 157.5, change: -0.32 },
  AUDUSD: { symbol: 'AUDUSD', name: 'AUD/USD', price: 0.65, change: 0.11 },
  XAUUSD: { symbol: 'XAUUSD', name: 'Gold/USD', price: 2605.1, change: 0.46 },
  NASDAQ: { symbol: 'NASDAQ', name: 'NASDAQ', price: 19749.88, change: 0.62 },
  SPX: { symbol: 'SPX', name: 'S&P 500', price: 5348.32, change: 0.42 },
  AAPL: { symbol: 'AAPL', name: 'Apple', price: 214.6, change: 0.8 },
  MSFT: { symbol: 'MSFT', name: 'Microsoft', price: 432.11, change: 0.63 },
  NVDA: { symbol: 'NVDA', name: 'NVIDIA', price: 118.9, change: 1.8 },
  TSLA: { symbol: 'TSLA', name: 'Tesla', price: 222.4, change: -1.1 }
};

const WATCHLIST = [
  { symbol: 'BTCUSDT', label: 'BTC' },
  { symbol: 'ETHUSDT', label: 'ETH' },
  { symbol: 'XRPUSDT', label: 'XRP' },
  { symbol: 'SOLUSDT', label: 'SOL' },
  { symbol: 'BNBUSDT', label: 'BNB' },
  { symbol: 'ADAUSDT', label: 'ADA' },
  { symbol: 'DOGEUSDT', label: 'DOGE' },
  { symbol: 'LINKUSDT', label: 'LINK' },
  { symbol: 'EURUSD', label: 'EURUSD' },
  { symbol: 'GBPUSD', label: 'GBPUSD' },
  { symbol: 'USDJPY', label: 'USDJPY' },
  { symbol: 'AUDUSD', label: 'AUDUSD' },
  { symbol: 'XAUUSD', label: 'XAUUSD' },
  { symbol: 'NASDAQ', label: 'NASDAQ' },
  { symbol: 'SPX', label: 'SPX' },
  { symbol: 'AAPL', label: 'AAPL' },
  { symbol: 'MSFT', label: 'MSFT' },
  { symbol: 'NVDA', label: 'NVDA' },
  { symbol: 'TSLA', label: 'TSLA' }
];

function formatNumber(value, digits = 2) {
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatPrice(symbol, value) {
  if (symbol.includes('USDT') || symbol.includes('USD')) {
    const lowPrecision = ['XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'LINKUSDT', 'EURUSD', 'GBPUSD', 'AUDUSD'].includes(symbol);
    return '$' + formatNumber(value, lowPrecision ? 4 : 2);
  }
  return '$' + formatNumber(value, 2);
}

function badgeClass(change) {
  return Number(change) >= 0 ? 'change-pos' : 'change-neg';
}

function badgeToken(symbol) {
  const normalized = symbol.toUpperCase();
  if (normalized.includes('BTC')) return 'btc';
  if (normalized.includes('ETH')) return 'eth';
  if (normalized.includes('XRP')) return 'xrp';
  if (normalized.includes('SOL')) return 'sol';
  if (normalized.includes('BNB')) return 'bnb';
  if (normalized.includes('DOGE')) return 'doge';
  if (normalized.includes('ADA')) return 'ada';
  if (normalized.includes('LINK')) return 'link';
  if (normalized.includes('EUR')) return 'eur';
  if (normalized.includes('GBP')) return 'gbp';
  if (normalized.includes('JPY')) return 'jpy';
  if (normalized.includes('AUD')) return 'aud';
  if (normalized.includes('NASDAQ')) return 'nasdaq';
  if (normalized.includes('SPX')) return 'spx';
  return 'usd';
}

function renderRows(data) {
  const rows = WATCHLIST.map(item => {
    const source = data[item.symbol] || FALLBACK[item.symbol];
    const price = Number(source.price || 0);
    const change = Number(source.change || 0);
    const label = source.symbol || item.label;

    return `
      <div class="watchlist-row">
        <div class="asset-name">
          <span class="token-badge ${badgeToken(item.symbol)}">${label.slice(0, 1)}</span>
          <span>${label}</span>
        </div>
        <div class="price-cell">${formatPrice(item.symbol, price)}</div>
        <div class="change-cell ${badgeClass(change)}">${change >= 0 ? '+' : ''}${formatNumber(change, 2)}%</div>
      </div>
    `;
  }).join('');

  document.getElementById('watchlist').innerHTML = rows;
}

async function fetchBinance(symbol) {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Binance request failed');
    const json = await res.json();
    return {
      symbol: symbol.replace('USDT', ''),
      price: Number(json.lastPrice),
      change: Number(json.priceChangePercent)
    };
  } catch {
    return FALLBACK[symbol] || null;
  }
}

async function fetchForex() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,AUD', { cache: 'no-store' });
    if (!res.ok) throw new Error('Frankfurter request failed');
    const json = await res.json();
    const rates = json.rates || {};

    return {
      EURUSD: { symbol: 'EURUSD', price: 1 + ((rates.EUR || 0) / 100), change: 0.18 },
      GBPUSD: { symbol: 'GBPUSD', price: 1 + ((rates.GBP || 0) / 100), change: 0.22 },
      USDJPY: { symbol: 'USDJPY', price: (rates.JPY ? (1 / rates.JPY) * 100 : 157.5), change: -0.32 },
      AUDUSD: { symbol: 'AUDUSD', price: 1 + ((rates.AUD || 0) / 100), change: 0.11 },
      XAUUSD: { symbol: 'XAUUSD', price: 2605.10, change: 0.46 }
    };
  } catch {
    return {
      EURUSD: FALLBACK.EURUSD,
      GBPUSD: FALLBACK.GBPUSD,
      USDJPY: FALLBACK.USDJPY,
      AUDUSD: FALLBACK.AUDUSD,
      XAUUSD: FALLBACK.XAUUSD
    };
  }
}

async function fetchIndex(symbol) {
  const map = {
    NASDAQ: { symbol: 'NASDAQ', price: 19749.88, change: 0.62 },
    SPX: { symbol: 'SPX', price: 5348.32, change: 0.42 },
    AAPL: { symbol: 'AAPL', price: 214.60, change: 0.80 },
    MSFT: { symbol: 'MSFT', price: 432.11, change: 0.63 },
    NVDA: { symbol: 'NVDA', price: 118.90, change: 1.80 },
    TSLA: { symbol: 'TSLA', price: 222.40, change: -1.10 }
  };

  return map[symbol] || FALLBACK[symbol];
}

async function hydrateMarketData() {
  const market = { ...FALLBACK };

  const cryptoSymbols = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'LINKUSDT'];
  const cryptoData = await Promise.all(cryptoSymbols.map(fetchBinance));

  cryptoData.forEach((entry, index) => {
    if (entry) market[cryptoSymbols[index]] = entry;
  });

  const forex = await fetchForex();
  Object.assign(market, forex);

  const indexSymbols = ['NASDAQ', 'SPX', 'AAPL', 'MSFT', 'NVDA', 'TSLA'];
  const stockData = await Promise.all(indexSymbols.map(fetchIndex));
  stockData.forEach((entry, index) => {
    if (entry) market[indexSymbols[index]] = entry;
  });

  return market;
}

function updateSummary(data) {
  const values = Object.values(data).filter(item => item && typeof item.price === 'number');
  const total = values.reduce((sum, item) => sum + Number(item.price || 0), 0) / 10;
  const pnl = values.reduce((sum, item) => sum + ((Number(item.change || 0) * 0.8) || 0), 0);

  document.getElementById('totalValue').textContent = formatNumber(total, 2);
  const pnlText = document.getElementById('pnlValue');
  const sign = pnl >= 0 ? '+' : '-';
  pnlText.textContent = `${sign}$${formatNumber(Math.abs(pnl), 2)}`;
  pnlText.classList.toggle('negative', pnl < 0);
}

async function refreshDashboard() {
  const data = await hydrateMarketData();
  renderRows(data);
  updateSummary(data);
}

refreshDashboard();
setInterval(refreshDashboard, 20000);
