/**
 * Dynamic Data Fetcher for WATCHTOWER
 * Pulls live market data from multiple sources
 * Supports: Crypto (Binance), Forex, Stocks
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));

// API endpoints
const BINANCE_API = 'https://api.binance.com/api/v3';
const FOREX_API = 'https://api.example.com/forex'; // Replace with your forex API
const STOCK_API = 'https://api.example.com/stocks';  // Replace with your stock API

class DataFetcher {
  constructor() {
    this.assets = {};
    this.lastUpdate = null;
    this.errors = [];
  }

  /**
   * Fetch crypto data from Binance
   */
  async fetchCryptoData() {
    try {
      for (const asset of CONFIG.assets.crypto) {
        const symbol = asset.sym + 'USDT';
        const ticker = await this.fetchBinanceTicker(symbol);
        const candles = await this.fetchBinanceCandles(symbol);

        this.assets[asset.sym] = {
          n: asset.name,
          p: parseFloat(ticker.lastPrice),
          ch: parseFloat(ticker.priceChangePercent),
          hi: parseFloat(ticker.highPrice),
          lo: parseFloat(ticker.lowPrice),
          v: parseFloat(ticker.volume),
          candles: candles,
          sentiment: this.calculateSentiment(parseFloat(ticker.priceChangePercent)),
          source: 'binance'
        };
      }
    } catch (err) {
      this.errors.push(`Crypto fetch error: ${err.message}`);
    }
  }

  /**
   * Fetch from Binance REST API
   */
  fetchBinanceTicker(symbol) {
    return new Promise((resolve, reject) => {
      https.get(`${BINANCE_API}/ticker/24hr?symbol=${symbol}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Fetch candle data from Binance
   */
  fetchBinanceCandles(symbol, timeframe = '1h') {
    return new Promise((resolve, reject) => {
      https.get(`${BINANCE_API}/klines?symbol=${symbol}&interval=${timeframe}&limit=70`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const candles = JSON.parse(data);
            resolve({
              1: candles.map(c => [parseFloat(c[1]), parseFloat(c[2]), parseFloat(c[3]), parseFloat(c[4]), parseFloat(c[7])])
            });
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Fetch forex data (implement your API)
   */
  async fetchForexData() {
    try {
      for (const asset of CONFIG.assets.forex) {
        // Replace with actual forex API call
        this.assets[asset.sym] = {
          n: asset.name,
          p: 1.1234,  // Placeholder
          ch: 0.5,
          hi: 1.1350,
          lo: 1.1100,
          v: 0,
          sentiment: 0,
          source: 'forex'
        };
      }
    } catch (err) {
      this.errors.push(`Forex fetch error: ${err.message}`);
    }
  }

  /**
   * Fetch stock data (implement your API)
   */
  async fetchStockData() {
    try {
      for (const asset of CONFIG.assets.stocks) {
        // Replace with actual stock API call
        this.assets[asset.sym] = {
          n: asset.name,
          p: 150.0,  // Placeholder
          ch: 1.2,
          hi: 152.0,
          lo: 149.5,
          v: 1000000,
          sentiment: 0,
          source: 'stocks'
        };
      }
    } catch (err) {
      this.errors.push(`Stock fetch error: ${err.message}`);
    }
  }

  /**
   * Simple sentiment calculation based on price change
   */
  calculateSentiment(priceChange) {
    if (priceChange > 5) return 0.8;
    if (priceChange > 2) return 0.5;
    if (priceChange < -5) return -0.8;
    if (priceChange < -2) return -0.5;
    return 0;
  }

  /**
   * Fetch all data and compile into data.json
   */
  async fetchAll() {
    await this.fetchCryptoData();
    // await this.fetchForexData();  // Uncomment when API is configured
    // await this.fetchStockData();  // Uncomment when API is configured

    return {
      asOf: new Date().toISOString(),
      assets: this.assets,
      global: {
        cap: 2500000000000,  // Placeholder market cap
        dom: 48.5  // BTC dominance
      },
      fng: {
        value: 65,
        label: 'Greed',
        index: 'CMC Fear & Greed'
      },
      news: [],
      stocks: [],
      alerts: [],
      errors: this.errors
    };
  }

  /**
   * Save data to file
   */
  async saveData() {
    const data = await this.fetchAll();
    fs.writeFileSync(
      path.join(__dirname, '../data.json'),
      JSON.stringify(data, null, 2)
    );
    console.log(`[${new Date().toISOString()}] Data updated successfully`);
  }
}

// Run on demand or schedule
if (require.main === module) {
  const fetcher = new DataFetcher();
  fetcher.saveData().catch(console.error);
}

module.exports = DataFetcher;
