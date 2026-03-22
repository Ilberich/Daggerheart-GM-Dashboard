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
Each sync file contains the raw array (or object) for that store — no version envelope. Example `sync/saved_encounters.json`:
```json
[
  { "id": "goblin-ambush", "name": "Goblin Ambush", ... },
  ...
]
```
`combat_session.json` contains the session state object (same shape as stored in IndexedDB, minus the `key` field added by `db_put`). This avoids coupling the sync format to the Export/Import envelope and keeps each file self-contained.

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

### On App Open — Pull
1. If sync is not configured, skip entirely and proceed with normal init.
2. Fetch metadata (SHA + content) for all 5 files from GitHub **in parallel** via `Promise.all`. GETs are safe to parallelise.
3. For each file, compare returned SHA against stored `sync_sha_<store>`.
4. For any file whose SHA has changed (or where no local SHA exists): decode content from base64, parse JSON, import into local IndexedDB store. When importing `combat_session`, re-add `{key: 'state'}` before calling `db_put` (this field is stripped from the sync file but required by the IndexedDB store's keyPath).
5. After importing: set both `sync_sha_<store>` and `sync_last_modified_<store>` and `sync_last_pushed_<store>` to `Date.now()`. This marks the store as clean — `last_modified === last_pushed` — so the next push-dirty check correctly skips it.
6. If any store is pulled: show toast listing changed stores — e.g. *"Campaign updated from cloud (combat_session, saved_encounters)"*
7. If nothing changed, proceed silently.
8. A 404 on a file means it has never been pushed — treat as "no update needed" for that store, not as an error.

### On Timer / Sync Now — Push
1. **Run a pull first** (steps 1–8 above). Do not push until pull completes. This ensures `sync_sha_<store>` values are current before any PUT.
2. For each store, compare `sync_last_modified_<store>` vs `sync_last_pushed_<store>`. If `modified > pushed`, the store is dirty and needs pushing.
3. Push dirty stores **sequentially** (not in parallel). Each PUT must complete and return a new SHA before the next PUT begins. This is required by the GitHub Contents API — parallel PUTs to the same repo will fail with 409/422 conflicts.
4. For each dirty store:
   a. Serialise store data to JSON.
   b. Encode: `btoa(unescape(encodeURIComponent(json)))`.
   c. If `sync_sha_<store>` exists in settings: include it in the PUT body. If it does not exist (first push for this store): omit the `sha` field entirely.
   d. PUT to GitHub with commit message: `"sync: {store} {YYYY-MM-DD HH:MM}"`.
   e. On success: store the new SHA returned by the API in `sync_sha_<store>`. Set `sync_last_pushed_<store>` to `Date.now()`.
   f. On 422 with SHA present: the remote file changed between pull and push (race condition). Fetch current SHA, update `sync_sha_<store>`, and retry once. If retry fails, mark store as failed and continue to next store.
   g. On 422 without SHA (first create attempt): the file already exists. Fetch its SHA, store it, retry as an update.
5. After all stores processed: update tab bar indicator with last sync time.
6. If any stores failed: show `⚠ Partially synced` state. Failed stores are retried on the next interval.

### Auto-Sync Timer
- Configurable interval: minimum 5 minutes, default 15 minutes, no maximum.
- Enforced in code: `Math.max(5, sync_interval)` — not just the UI input.
- Timer starts after first successful connection.
- If offline when timer fires: skip silently. Retry on next tick.
- Timer is cleared and restarted when the user changes the interval in settings.

### Conflict Rule
Pull always runs before push. If remote has changed AND local has changes for the same store, **remote wins** — local changes for that store are overwritten during pull. Because `sync_last_modified` is set equal to `sync_last_pushed` after a pull, the store is no longer considered dirty, and the local changes are not pushed. This is by design for sequential device use (not simultaneous editing). Users are informed of this behaviour during setup.

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

| State | Display |
|-------|---------|
| Idle | `☁ Synced · 2:32 PM` (muted text, time of last sync) |
| In progress | Spinner |
| No internet | `☁✕ No connection` (crossed-out cloud icon) |
| Sync failed | `⚠ Sync failed` (warning colour) |
| Partial failure | `⚠ Partially synced` (warning colour) |

Clicking any error/warning state opens the settings modal directly to the Cloud Sync section.

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
3. Users who do not configure sync see no sync-related UI anywhere in the app.
4. The app functions fully offline (all existing features work) whether or not sync is configured.
5. A failed push leaves the IndexedDB store unchanged — verified by disconnecting the network mid-push, confirming local data is intact, and confirming no partial write occurred.
