# Watchtower — hands-off live data

Files: index.html (dashboard) · data.json (auto-updated) · scripts/fetch.mjs · .github/workflows/update.yml

## Setup (about 5 minutes)
1. Create a new GitHub repo (public is easiest) and upload all these files, keeping the folder structure.
2. Settings → Pages → Source: "Deploy from a branch", branch main, folder / (root). Your dashboard goes live at https://YOURNAME.github.io/REPO/
3. Actions tab → "Update Watchtower data" → Run workflow once to test. After that it runs every ~5 minutes.
4. Optional stocks: get a free key at finnhub.io, then Settings → Secrets and variables → Actions → New secret named FINNHUB_KEY.

## Notes
- GitHub's cron can run late (5–15 min) and isn't guaranteed. For tighter updates, move fetch.mjs to a Cloudflare Worker with a cron trigger.
- It makes ~288 small commits per day. To avoid that, publish data.json to a separate branch or to Cloudflare KV instead.
- GitHub disables scheduled workflows on inactive public repos after 60 days without repo activity; re-enable them in the Actions tab if that happens.
- Data comes from CoinGecko, Coinbase, Alternative.me and RSS feeds. Check each provider's current terms and rate limits.
- Twitter/X is not included (the official API is paid).
