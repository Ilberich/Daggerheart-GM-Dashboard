# GM Dashboard — Cloud Sync Design Spec

**Date:** 2026-03-22
**Feature:** GitHub-backed cloud sync with per-store incremental push/pull
**Goal:** Allow a GM to seamlessly switch between devices (e.g. laptop → phone) and pick up exactly where they left off, with full offline support and no data loss.

---

## Overview

Campaign data is synced to a user-owned private GitHub repository using the GitHub Contents API. Authentication uses a Personal Access Token (PAT) — no OAuth app, no server, no third-party service the developer needs to maintain. Each IndexedDB store is a separate file in the repo; only stores that have changed since the last sync are uploaded. On app open, the app checks whether any remote files have changed and pulls them automatically.

This feature is entirely opt-in. Users who do not configure it see no sync UI whatsoever.

---

## Implementation Prerequisites

Before this feature can be implemented, two existing localStorage write paths must be migrated to IndexedDB:

1. **`saveSession()` / `loadSession()`** — currently writes `combat_session` to `localStorage` (line ~1015 in `app.js`). Must write to the `combat_session` IndexedDB store via `db_put()` instead. The IndexedDB store already exists and `importData()` already writes to it correctly — only the ongoing save path needs updating.

2. **`saveCustomAdvStorage()`** — currently writes `custom_adversaries` to `localStorage` (line ~876). `db_migrate()` handles one-time migration of existing data, but ongoing saves still bypass IndexedDB. Must write via `db_put()` to the `custom_adversaries` store.

Until both of these are resolved, dirty tracking will silently miss changes to those two stores. These are pre-conditions, not part of the sync feature task itself.

---

## Architecture

### Storage Backend
- **Service:** GitHub Contents API (REST)
- **Auth:** GitHub Fine-Grained Personal Access Token, `Contents: Read and Write` permission
- **Repo:** User-created private repository (e.g. `username/daggerheart-campaign`)
- **Files:**
  ```
  sync/combat_session.json
  sync/custom_adversaries.json
  sync/saved_encounters.json
  sync/toolkit_notes.json
  sync/generator_library.json
  ```

### Sync File Format
Each sync file is a wrapper object containing `_synced_at` (Unix timestamp in ms) and `data` (the raw store content). Example `sync/saved_encounters.json`:
```json
{
  "_synced_at": 1737000000000,
  "data": [
    { "id": "goblin-ambush", "name": "Goblin Ambush", ... }
  ]
}
```
`combat_session.json` uses the same wrapper, with `data` containing the session state object (minus the `key` field added by `db_put`).

The `_synced_at` timestamp is the authoritative record of when that store was last pushed. It is used for per-store conflict resolution — whichever side (local or remote) has the newer timestamp wins for that store independently.

### New IndexedDB `settings` Keys

| Key | Value |
|-----|-------|
| `sync_token` | GitHub PAT (string) |
| `sync_repo` | `username/repo-name` (string) |
| `sync_interval` | Minutes between auto-sync (integer, min 5, default 15) |
| `sync_sha_<store>` | Last known GitHub SHA for each file — required by the API to update a file |
| `sync_last_pushed_<store>` | Timestamp of last successful push per store |
| `sync_last_modified_<store>` | Timestamp updated every time that store's data changes |

### Existing Code Integration
- `db_put()` calls for each store are wrapped to update `sync_last_modified_<store>` with `Date.now()` on every write. No changes to any calling code.
- Per-store serialisation is new code adapted from `exportData()` — it is not a direct call to `exportData()` since that produces a multi-store envelope; each sync file is the raw store array only.
- Per-store import is adapted from `importData()` — individual store writes, not the full import flow.
- `showToast()` used for all sync notifications.
- `db_setting()` used for all sync settings reads and writes.
- Sync UI lives in the existing settings modal, extended below the Export/Import section.

---

## Sync Flow

All three sync triggers (app open, auto-sync timer, Sync Now button) use the same `runSync()` function. There is no separate pull-only or push-only path.

### `runSync()` — Per-Store Comparison
1. If sync is not configured, return immediately.
2. Fetch all 5 files from GitHub **in parallel** via `Promise.all` (GETs are safe to parallelise). For each file, retrieve `sha`, `_synced_at` from content, and the raw `data`.
3. A 404 on any file means it has never been pushed — treat `_synced_at` as `0` for that store.
4. For each store **independently**, compare `sync_last_modified_<store>` (local) vs remote `_synced_at`:
   - **Local newer** (`last_modified > _synced_at`): store is dirty — queue for push.
   - **Remote newer** (`_synced_at > last_modified`): remote has updates — queue for pull.
   - **Equal or both zero**: nothing to do — skip.
5. **Apply all pulls first** (in parallel — writes to separate stores, safe):
   - Decode base64 content (strip `\n` before `atob`), parse JSON, extract `data`.
   - Import into local IndexedDB store. For `combat_session`, re-add `{key: 'state'}` before `db_put`.
   - Set `sync_sha_<store>`, `sync_last_modified_<store>`, and `sync_last_pushed_<store>` all to `Date.now()`.
   - If any stores were pulled: show toast — e.g. *"Campaign updated from cloud (saved_encounters)"*
6. **Apply all pushes sequentially** (GitHub Contents API requires sequential PUTs):
   - For each store queued for push:
     a. Serialise: `{ _synced_at: Date.now(), data: <store data> }` to JSON.
     b. Encode: `btoa(unescape(encodeURIComponent(json)))`.
     c. Include `sync_sha_<store>` in PUT body if it exists; omit entirely on first create.
     d. PUT with commit message: `"sync: {store} {YYYY-MM-DD HH:MM}"`.
     e. On success: update `sync_sha_<store>` with the new SHA from the response. Set `sync_last_pushed_<store>` to `Date.now()`.
     f. On 422 with SHA present: fetch current SHA, update `sync_sha_<store>`, retry once. If retry fails, mark store as failed and continue.
     g. On 422 without SHA (first create): file already exists — fetch its SHA, store it, retry as update.
7. Update tab bar indicator: last sync time if all succeeded; `⚠ Partially synced` if any store failed.
8. Failed stores are retried on the next timer tick.

### Conflict Rule
Each store is resolved **independently** by comparing timestamps. **Local wins if local is newer; remote wins if remote is newer.** There is no global "pull first" or "push first" — only per-store timestamp comparison.

This means:
- Offline session (local modified, remote unchanged) → local wins, pushes ✅
- Device swap after Sync Now (remote updated, local clean) → remote wins, pulls ✅
- Both devices edited *different* stores → each store's newer version wins, no data lost ✅
- Both devices edited the *same* store → whichever syncs first wins for that store ⚠ *(known limitation — sync before switching devices)*

### Unsynced Changes Indicator
Any time `sync_last_modified_<store> > sync_last_pushed_<store>` for any store, the tab bar sync button shows the **unsynced changes** state (see UI section). This updates in real time as data changes and clears as soon as a successful push completes.

### Auto-Sync Timer
- Configurable interval: minimum 5 minutes, default 15 minutes, no maximum.
- Enforced in code: `Math.max(5, sync_interval)` — not just the UI input.
- Timer starts after first successful connection.
- If offline when timer fires: skip silently, show `☁✕ No connection`. Retry on next tick.
- Timer is cleared and restarted when the user changes the interval in settings.

---

## Connect / Validation Flow

When the user clicks **Connect**:

1. Perform `GET /repos/{owner}/{repo}/contents/sync/combat_session.json`.
2. **401 response:** Bad token. Show: *"Couldn't connect — check that your token is correct and hasn't expired."*
3. **404 response with repo-not-found message:** Bad repo name. Show: *"Couldn't connect — check your repository name is exactly `username/repo-name`."*
4. **404 response with file-not-found message (but repo exists):** Valid connection, repo is empty. This is expected on first connect. Proceed to first push. Distinguish from case 3 by checking `response.message` in the JSON body — GitHub returns `"Repository not found"` for a bad repo name and `"Not Found"` for a missing file in a valid repo. If the body is unexpected or unparseable, treat as case 3 (bad repo name) as a safe fallback.
5. **200 response:** Valid connection, existing sync data found. Proceed to pull (restore existing campaign data), then mark as connected.
6. On success (cases 4 or 5): show *"Connected"* status, start auto-sync timer, render sync button in tab bar.

---

## UI

### Tab Bar (sync configured only)
A `☁` sync button added to the right side of the tab bar, left of the settings gear. States:

| State | Display | When |
|-------|---------|------|
| Idle | `☁ Synced · 2:32 PM` (muted text) | All stores clean, last sync time shown |
| Unsynced changes | `☁ Unsynced changes` (gold/amber colour) | Any store has local changes not yet pushed |
| In progress | `☁ Syncing…` + spinner | `runSync()` is running |
| No internet | `☁✕ No connection` (crossed-out cloud, muted) | Network unreachable |
| Sync failed | `⚠ Sync failed` (warning colour) | All pushes failed |
| Partial failure | `⚠ Partially synced` (warning colour) | Some stores failed to push |

The **Unsynced changes** state is the key prompt for users to sync before switching devices. It appears the moment any data changes and clears as soon as the push succeeds.

Clicking the button in any state triggers `runSync()` immediately. Clicking an error/warning state also opens the settings modal Cloud Sync section alongside triggering a retry.

### Settings Modal — Cloud Sync Section
Added below the existing Export/Import section:

```
☁ Cloud Sync
─────────────────────────────────────────
[ How to set this up ▼ ]   (collapsible step-by-step guide)

GitHub Token   [••••••••••••••••••••]
Repository     [username/daggerheart-campaign]
Auto-sync every [15] minutes  (min: 5)

[ Connect ]          Status: Not configured
```

Once connected:
```
Status: ✅ Connected · last synced 2:32 PM
[ Sync Now ]  [ Disconnect ]
```

### In-App Setup Guide (collapsible)

> **Step 1:** Create a free account at github.com if you don't have one.
>
> **Step 2:** Create a new **private** repository. Name it anything — `daggerheart-campaign` works well. Tick "Private" and click Create.
>
> **Step 3:** Go to **github.com → your profile picture → Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens → Generate new token.** Set expiration to "No expiration." Under Repository Access, select your new repo. Under Permissions, set **Contents: Read and Write.** Click Generate and copy the token — you won't see it again.
>
> **Step 4:** Paste the token and your repository name (`username/daggerheart-campaign`) into the fields above. Click **Connect.**

---

## Error Handling

| Scenario | Icon / Status | In-App Troubleshooting |
|----------|---------------|------------------------|
| No internet | `☁✕ No connection` | *"The app can't reach GitHub. Check your internet connection and try again. Your local data is safe and will sync automatically when you're back online."* |
| Token expired / revoked | `⚠ Sync failed` | *"Your GitHub token may have expired. To fix: go to github.com → sign in → Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens. Find your token and click Regenerate, or create a new one. Copy the new token, paste it into the Token field above, and click Reconnect."* |
| Wrong token or repo on setup | Inline under Connect | *"Couldn't connect. Check that: (1) your token has Contents: Read and Write permission selected, (2) the token was created for the correct repository, (3) your repository name is exactly `username/repo-name`."* |
| SHA mismatch on push | Auto pull-then-retry once; `⚠ Sync failed` if retry fails | *"A sync conflict was detected — this usually means the campaign was updated on another device at the same time. The most recent cloud version has been kept. If you've lost recent work, make your changes and press Sync Now."* |
| New device, repo has data | Toast on first connect | *"Existing campaign data found in your repository — restoring it now."* |
| Partial failure | `⚠ Partially synced` | *"Some data synced successfully but some did not. The app will retry automatically on the next interval. If this keeps happening, try Sync Now or check your connection."* |
| Disconnect | All sync UI removed | *"Cloud sync has been disconnected. Your local data is untouched. You can reconnect at any time in settings."* |

### Disconnect Cleanup
On disconnect, delete all of the following from IndexedDB `settings`:
`sync_token`, `sync_repo`, `sync_interval`,
`sync_sha_combat_session`, `sync_sha_custom_adversaries`, `sync_sha_saved_encounters`, `sync_sha_toolkit_notes`, `sync_sha_generator_library`,
`sync_last_pushed_combat_session`, `sync_last_pushed_custom_adversaries`, `sync_last_pushed_saved_encounters`, `sync_last_pushed_toolkit_notes`, `sync_last_pushed_generator_library`,
`sync_last_modified_combat_session`, `sync_last_modified_custom_adversaries`, `sync_last_modified_saved_encounters`, `sync_last_modified_toolkit_notes`, `sync_last_modified_generator_library`.

Local campaign data (all non-`sync_*` stores) is never touched.

---

## Implementation Notes

### GitHub Contents API — Key Calls

**Get file (pull check + content):**
```
GET /repos/{owner}/{repo}/contents/sync/{store}.json
Authorization: Bearer {token}
```
Returns `sha` and `content` (base64 with line breaks every 60 chars — strip before decoding).

**Create or update file (push):**
```
PUT /repos/{owner}/{repo}/contents/sync/{store}.json
Authorization: Bearer {token}
Content-Type: application/json
Body: {
  "message": "sync: {store} {datetime}",
  "content": "{base64-encoded json}",
  "sha": "{current sha}"   // omit entirely on first create
}
```

### Base64 Encoding / Decoding
- **Encode (handles Unicode):** `btoa(unescape(encodeURIComponent(json)))`
- **Decode (strip GitHub's line breaks first):** `decodeURIComponent(escape(atob(content.replace(/\n/g, ''))))`

The line-break strip is required — GitHub's API inserts `\n` every 60 characters in returned base64. `atob()` will fail in some environments without it.

### Push Ordering
Pushes are sequential. Use a reduce/chain pattern:
```js
var stores = dirtyStores; // array of store names to push
stores.reduce(function(chain, store) {
  return chain.then(function() { return pushStore(store); });
}, Promise.resolve());
```
Do not use `Promise.all` for pushes.

### Dirty Tracking
`db_put()` is the single write path for all stores (after prerequisites are resolved). Wrap it to update `sync_last_modified_<store>` with `Date.now()` on every call. No changes to any calling code — only the `db_put` implementation changes.

**Important guard:** `db_setting()` routes through `db_put('settings', ...)`. The dirty-tracking wrapper must be a no-op when `store === 'settings'` — only the five campaign data stores (`combat_session`, `custom_adversaries`, `saved_encounters`, `toolkit_notes`, `generator_library`) are tracked. Without this guard, every sync settings write (including updating `sync_last_modified_*` itself) would recursively trigger dirty-marking and could cause an infinite loop.

### Token Security
- Stored in IndexedDB `settings` store only — never in localStorage, never in a URL, never logged to console.
- Transmitted only to `api.github.com` over HTTPS.
- Displayed as `type="password"` in the UI — never shown in plain text after initial entry.

---

## Out of Scope

- Simultaneous multi-device editing / conflict merge — sequential use only
- Sync of app settings / theme preferences — campaign data only
- Automatic repo creation — user creates repo manually (covered by setup guide)
- Support for non-GitHub backends in this version

---

## Success Criteria

1. A non-developer can complete setup in under 5 minutes following only the in-app guide.
2. Pressing Sync Now on the laptop, then opening the app on the phone, results in the phone showing the exact same combat state — verified by manual test.
3. Making any change (e.g. ticking an HP dot) causes the tab bar to immediately show "Unsynced changes."
4. Going offline during a session, making changes, reconnecting, and syncing pushes local changes to GitHub without overwriting them — verified by manual test.
5. Users who do not configure sync see no sync-related UI anywhere in the app.
6. The app functions fully offline (all existing features work) whether or not sync is configured.
7. A failed push leaves the IndexedDB store unchanged — verified by disconnecting the network mid-push, confirming local data is intact, and confirming no partial write occurred.
