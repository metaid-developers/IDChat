# Production Load Baseline - 2026-05-31

Target: `https://www.idchat.io/chat/`

Final route after SPA redirect: `https://www.idchat.io/chat/talk/channels/public/welcome`

Measured at: `2026-05-31T13:51:54.586Z` (`2026-05-31 21:51:54` Asia/Shanghai)

Environment and method:

- Browser automation: Playwright Chromium
- Viewport: `1440x900`
- Cache mode: cold browser context for every run
- Runs: 5
- Network throttling: none
- Wait points recorded: `load`, `networkidle`, paint entries, LCP observer
- Resource sizes: browser PerformanceResourceTiming `transferSize` / `encodedBodySize`

## Summary

| Metric | Median | Average | Range |
| --- | ---: | ---: | ---: |
| Load wall time | 1645 ms | 1882.4 ms | 1292-3354 ms |
| Network idle wall time | 3212 ms | 3740.4 ms | 2892-5660 ms |
| First Contentful Paint | 1988 ms | 2303.2 ms | 1880-3600 ms |
| Largest Contentful Paint | 2268 ms | 2633.6 ms | 2164-4036 ms |
| Long task total | 686 ms | 687.4 ms | 655-742 ms |
| Request count | 48 | 48 | 48 |
| Same-origin transfer | 3,841,453 bytes | 3,841,453 bytes | stable |
| Same-origin encoded body | 3,827,953 bytes | 3,827,953 bytes | stable |
| Total transfer | 4,010,724 bytes | 4,010,724 bytes | stable |

## Per-Run Data

| Run | Load | Network idle | FCP | LCP | Long tasks | Requests | Same-origin transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1460 ms | 3890 ms | 1880 ms | 2164 ms | 686 ms | 48 | 3,841,453 B |
| 2 | 1292 ms | 2892 ms | 1920 ms | 2268 ms | 662 ms | 48 | 3,841,453 B |
| 3 | 1661 ms | 3048 ms | 1988 ms | 2256 ms | 655 ms | 48 | 3,841,453 B |
| 4 | 3354 ms | 5660 ms | 3600 ms | 4036 ms | 742 ms | 48 | 3,841,453 B |
| 5 | 1645 ms | 3212 ms | 2128 ms | 2444 ms | 692 ms | 48 | 3,841,453 B |

## Largest First-Load Resources

Measured from run 1.

| Resource | Type | Transfer | Encoded | Decoded | Duration |
| --- | --- | ---: | ---: | ---: | ---: |
| `/chat/index.c7499b03.js` | script | 1,888,758 B | 1,888,458 B | 6,375,010 B | 432 ms |
| `/chat/secp256k1.5cbbcb8a.wasm` | fetch | 1,243,088 B | 1,242,788 B | 1,242,788 B | 332 ms |
| `/favicon.ico` | other | 169,271 B | 168,971 B | 168,971 B | 130 ms |
| `/chat/Channel.60a601da.js` | script | 134,495 B | 134,195 B | 493,141 B | 214 ms |
| `/chat/Jersey20-Regular.5431134f.ttf` | css/font | 127,916 B | 127,616 B | 127,616 B | 84 ms |
| `/chat/LoginedUserOperate.850ccbab.js` | script | 117,814 B | 117,514 B | 360,447 B | 234 ms |
| `/chat/ConnectWalletModal.323f12b2.js` | script | 42,292 B | 41,992 B | 127,504 B | 190 ms |
| `/chat/index.0ef63fe0.css` | stylesheet | 33,882 B | 33,582 B | 241,045 B | 140 ms |
| `/chat/index.1097200f.js` | script | 28,407 B | 28,107 B | 83,468 B | 150 ms |
| `/chat/whitneybold.2c8c45bd.otf` | css/font | 27,944 B | 27,644 B | 27,644 B | 100 ms |
| `/chat/whitneybook.f31c365f.otf` | css/font | 27,408 B | 27,108 B | 27,108 B | 37 ms |

## Unwanted First-Load Signals To Compare After Optimization

These requests appeared on the unauthenticated welcome route during every cold run:

- `/chat/secp256k1.5cbbcb8a.wasm`
- `/chat/ConnectWalletModal.323f12b2.js`
- `/chat/ConnectWalletModal.268aaf17.css`
- `/chat/WalletMissingModal.74e713d7.js`
- `/chat/WalletMissingModal.852f5fe6.css`
- `/chat/LoginedUserOperate.850ccbab.js`
- `/chat/LoginedUserOperate.170df909.css`
- `/chat/FeeModal.812d5bf8.js`
- `/chat/FeeModal.ffb1034b.css`
- `https://api.mvcscan.com/browser/v1/fees/recommended?chain=btc`
- `https://api.mvcscan.com/browser/v1/fees/recommended?net=livenet`
- `https://api.mvcscan.com/browser/v1/fees/recommended?chain=doge`

The first optimization pass should try to remove these from unauthenticated first load. A useful comparison target is:

- No wallet or fee chunks before opening wallet-related UI
- No `secp256k1` WASM before wallet/crypto actions
- No fee API calls before wallet/pay UI
- Same-origin first-load transfer below 1.5 MB
- Main JS gzip/transfer below 900 KB

## Post-Change Local Checkpoint

Measured after the current optimization pass against a local static build served
at `http://127.0.0.1:4175/chat/`.

Measured at: `2026-06-01 00:23:35 CST`

Build artifact checkpoint:

- Main entry: `/chat/index.4842fdab.js`
- Main entry size: `1493.35 KiB`
- Main entry gzip estimate from Vite: `599.15 KiB`
- Main entry no longer contains `secp256k1`, `.wasm`, `crypto-browserify`, `request-sdk`, or `meta-contract` string hits.
- `index.html` does not preload or import a wallet vendor chunk.

This checkpoint is useful for request-shape comparison, but its byte counts are
not directly comparable with production because the local static server does not
serve gzip/brotli responses.

| Metric | Median |
| --- | ---: |
| Load wall time | 121 ms |
| DOMContentLoaded | 41 ms |
| Load event end | 45 ms |
| First Contentful Paint | 100 ms |
| Largest Contentful Paint | 116 ms |
| Request count | 14 |
| Resource count | 13 |
| Same-origin transfer | 1,984,160 bytes |
| Same-origin encoded body | 1,979,960 bytes |
| Total transfer | 1,984,160 bytes |

Removed from unauthenticated welcome first load in 5/5 local runs:

- `secp256k1.5cbbcb8a.wasm`
- `ConnectWalletModal`
- `WalletMissingModal`
- `LoginedUserOperate`
- `FeeModal`
- `ChannelContent`
- `sha256` / crypto-js fallback chunk
- BTC/MVC/DOGE fee API calls
- wallet-heavy chunks such as `hd-wallet`, `userInfo`, `util`, `mvc`, `bip39`

Browser validation result:

- Final route: `http://127.0.0.1:4175/chat/talk/channels/public/welcome`
- Body rendered: `Connect Wallet` and `A Decentralized Messaging App Built on Bitcoin`
- Console errors: `0`
- Failed requests: `0`
