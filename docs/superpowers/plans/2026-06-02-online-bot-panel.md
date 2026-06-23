# Online Bot Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a left-sidebar `在线Bot` entry that opens a floating online Bot list and lets users start a private chat with a selected Bot.

**Architecture:** Keep the feature inside the existing direct-contact sidebar. Add a small API adapter for the socket online-users endpoint, a focused floating panel component, and wire selection through the existing `simpleTalkStore.createPrivateChat()` / `setActiveChannel()` private-chat flow.

**Tech Stack:** Vue 3 SFC, Pinia, Vue Router, Tailwind utility classes, existing `ChatIcon` and `Icon` components, `VITE_CHAT_API()` runtime config.

---

## Context

Design spec: `docs/ONLINE_BOT_PANEL_FEATURE.md`

Key existing files:

- `src/views/talk/components/direct-contact/List.vue` owns the left direct-contact sidebar.
- `src/views/talk/components/direct-contact/Search.vue` owns the search row and plus button.
- `src/views/talk/components/direct-contact/Item.vue` is the visual baseline for avatar/name/summary rows.
- `src/views/talk/components/direct-contact/SearchModal.vue` shows existing remote user private-chat route behavior.
- `src/stores/simple-talk.ts` has `createPrivateChat(targetGlobalMetaId)` and `setActiveChannel(channelId)`.
- `src/config/app-config.ts` exports `VITE_CHAT_API()`.

Frontend quality requirements:

- Use `frontend-skill` app UI guidance.
- Match the existing sidebar: quiet, dense, restrained, no marketing copy, no decorative gradients, no nested card look.
- The floating panel should feel like a temporary layer over the conversation list, not a new page.
- Text must not overflow its row on desktop or mobile.
- Preserve dark mode support.

Important behavior:

- API endpoint: `${VITE_CHAT_API()}/group-chat/socket/online-users?cursor=0&size=100&withUserInfo=true`
- Online API returns online users, not a proven Bot-only list. For v1, only show rows with `userInfo.chatPublicKey`, and keep code structured so a future Bot identity filter can be added.
- Preserve a clear future precise-Bot filtering position in the API adapter: name the normalization/filter section around Bot eligibility, and leave one short code comment where a backend Bot identity marker should be applied when available.
- Clicking a Bot must create a visible private chat in the left list. Prefer `createPrivateChat(globalMetaId)` before `setActiveChannel(globalMetaId)` because the existing list filters out `isTemporary`.
- Do not modify unrelated existing changes such as `dist.zip`, `.playwright-cli/`, `.playwright-mcp/`, or `idchat-current-network.txt`.
- Do not commit. Leave changed files for controller review.

## Files

- Create: `src/api/online-bots.ts`
- Create: `src/views/talk/components/direct-contact/OnlineBotPanel.vue`
- Modify: `src/views/talk/components/direct-contact/Search.vue`
- Modify: `src/views/talk/components/direct-contact/List.vue`
- Optional modify only if needed: `src/languages/zh.json`, `src/languages/en.json`

## Task 1: Online Bot API Adapter

**Files:**

- Create: `src/api/online-bots.ts`

- [ ] **Step 1: Define response and normalized types**

Add TypeScript interfaces for the online-users response and normalized `OnlineBot`.

```ts
export interface OnlineBot {
  globalMetaId: string
  name: string
  avatar: string
  bio: string
  chatPublicKey: string
  lastSeenAt: number
  lastSeenAgoSeconds: number
  deviceCount: number
}
```

- [ ] **Step 2: Implement normalization**

Normalize one backend item into `OnlineBot | null`:

- Use `userInfo.globalMetaId || item.globalMetaId`.
- Return `null` if there is no `globalMetaId`.
- Return `null` if there is no `userInfo.chatPublicKey`.
- Keep these checks in a clearly named Bot eligibility/filtering helper or section. Add one concise code comment marking where a future backend Bot identity filter belongs.
- Use `userInfo.name` then truncated globalMetaId for display name.
- Use `userInfo.avatarImage || userInfo.avatar || ''` for avatar.
- Use `userInfo.bio || ''` for bio.

- [ ] **Step 3: Implement `getOnlineBots()`**

Use `fetch` and `VITE_CHAT_API()`:

```ts
const baseUrl = VITE_CHAT_API() || import.meta.env.VITE_CHAT_API
const url = `${baseUrl}/group-chat/socket/online-users?cursor=0&size=${size}&withUserInfo=true`
```

Requirements:

- Default `size` to `100`.
- Throw an `Error` when HTTP status is not ok.
- Throw an `Error` when response `code !== 0`.
- Return `{ total, onlineWindowSeconds, bots }`.
- Dedupe by `globalMetaId`.

- [ ] **Step 4: Local sanity check**

Run:

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: Either pass, or report existing project-wide type issues. If it reports unrelated legacy issues, note them in the worker final answer.

## Task 2: Floating Online Bot Panel

**Files:**

- Create: `src/views/talk/components/direct-contact/OnlineBotPanel.vue`

- [ ] **Step 1: Build panel shell**

Create a Vue SFC that:

- Fetches online Bots when mounted.
- Emits `close`.
- Emits `select` with an `OnlineBot`.
- Has internal loading, error, and empty states.

- [ ] **Step 2: Match sidebar visual language**

Layout requirements:

- Absolute floating panel meant to be rendered inside the existing relative sidebar.
- Use calm white/dark surfaces matching current sidebar.
- Width controlled by parent offsets, not fixed viewport width.
- Max height near `calc(100vh - 112px)` with internal scrolling.
- Close button in the top-right.
- Header text can be utility copy: `在线Bot`.
- No large hero, no decorative gradient, no marketing text.

Suggested classes can be adjusted to fit existing style:

```html
<div class="absolute left-3 right-3 top-[60px] z-[60] overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
```

Keep radius at 8px or less. If it looks too card-like, reduce radius and shadow.

- [ ] **Step 3: Build list rows**

Each row should:

- Use `ChatIcon`.
- Show 48px avatar.
- Show name in one line with truncation.
- Show bio in one or two lines. If bio is empty, show a short online freshness fallback.
- Have hover state consistent with `Item.vue`.
- Preserve dark mode.
- Avoid row height jumps.

- [ ] **Step 4: Add reload affordance**

On error, show compact error text and a retry button. The retry button must not look like a marketing CTA.

- [ ] **Step 5: Local visual self-review**

Compare to `src/views/talk/components/direct-contact/Item.vue` and confirm:

- Avatar size is aligned.
- Name weight and truncation are compatible.
- Summary color is compatible.
- Panel does not cover the plus button row in an awkward way.

## Task 3: Sidebar Wiring and Private Chat Launch

**Files:**

- Modify: `src/views/talk/components/direct-contact/Search.vue`
- Modify: `src/views/talk/components/direct-contact/List.vue`

- [ ] **Step 1: Add `在线Bot` button to `Search.vue`**

Requirements:

- Place it left of the existing search pill.
- Only show when `userStore.isAuthorized`.
- Accept an open-state prop from `List.vue` and apply a subtle selected background/text state while the panel is visible.
- Emit `open-online-bots`.
- Keep existing `open-search` and plus-button behavior.
- Style as a small text button, not a large CTA:

```html
<button class="h-8 shrink-0 rounded-full px-2.5 text-xs font-medium ...">
  在线Bot
</button>
```

The button must not force the search input to overflow on narrow mobile widths.

- [ ] **Step 2: Wire panel in `List.vue`**

Add:

- `isOnlineBotPanelVisible`.
- Async component import for `OnlineBotPanel.vue`.
- `handleOpenOnlineBots()`.
- `handleCloseOnlineBots()`.
- `handleOnlineBotSelect(bot)`.

Render `OnlineBotPanel` inside the relative sidebar container so it overlays the conversation list.

- [ ] **Step 3: Implement private chat launch**

`handleOnlineBotSelect(bot)` should:

- Ignore if no `bot.globalMetaId`.
- Guard against self-chat using `userStore.last?.globalMetaId`.
- Guard against missing `userStore.last?.chatpubkey`.
- Close the panel after a valid selection.
- Call `await simpleTalkStore.createPrivateChat(bot.globalMetaId)`.
- Call `await simpleTalkStore.setActiveChannel(bot.globalMetaId)`.
- Route to `{ name: 'talkAtMe', params: { channelId: bot.globalMetaId } }`.
- On mobile, set `layout.isShowLeftNav = false`.

If `createPrivateChat()` returns null, do not route; show a compact Element Plus message if available in this file pattern.

- [ ] **Step 4: Preserve left-list visibility**

Verify the selected Bot appears in `_allChannels`. If it does not, adjust only this feature path. Preferred solution is using `createPrivateChat()` because it creates a non-temporary channel.

- [ ] **Step 5: Build verification**

Run:

```bash
yarn build:chat
```

Expected: build completes. If it fails, fix feature-caused failures. If it fails due unrelated existing project issues, report exact output.

## Task 4: Controller Review Checklist

The controller, not the implementation worker, owns final review and acceptance.

- [ ] Review diff for scope: only planned files plus plan/spec docs.
- [ ] Check no unrelated files were reverted.
- [ ] Inspect UI code against `frontend-skill` app UI guidance.
- [ ] Run `yarn build:chat`.
- [ ] If a local server can run, inspect in browser at the chat route.
- [ ] Verify online API URL uses `VITE_CHAT_API()` and not a hard-coded production URL.
- [ ] Verify selected online Bot starts a private chat through the existing route/store flow.
