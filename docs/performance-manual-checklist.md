# IDChat Manual Performance Checklist (P0)

## 0. Prepare
1. Open `http://localhost:5173/chat/`.
2. Open browser console and run:
```js
window.__idchatPerf.enable()
window.__idchatPerf.clear()
window.__idchatPerf.verbose(false)
window.__idchatPerf.mark('smoke')
window.__idchatPerf.get().slice(-3)
```

## 1. Scenarios (run in order)
1. Cold open page (hard refresh once).
2. Connect wallet and enter a chat page.
3. Switch channels 10 times (`A -> B -> C -> ...`).
4. Open group member drawer and search 5 different keywords quickly.
5. In chat input, type `@` and search 5 mention keywords quickly.
6. Scroll history up to trigger `loadMoreMessages` 5 times.
7. Send 3 text messages in one group.

## 2. Export data
After all scenarios, run:
```js
window.__idchatPerf.summary()
```

Then run:
```js
window.__idchatPerf.get().slice(-120)
```

Please send both outputs to the developer.

## 3. Optional (verbose trace)
If needed, enable real-time console performance logs:
```js
window.__idchatPerf.verbose(true)
```

Disable after test:
```js
window.__idchatPerf.verbose(false)
```
