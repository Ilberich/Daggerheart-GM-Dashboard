# GM Dashboard — To-Do List

> **Status key:** 🔲 Pending · 🐛 Bug · 💡 Suggested · ⬇ Low Priority
>
> **Plans:** When a brainstorm session produces an implementation plan, add it here as a `### 🔲 Plan X` section so this file remains the single source of truth for what to do next. Plan detail lives in `docs/superpowers/plans/`.

---

## Required Tasks

### 🔲 Plan C: Cloud Sync

GitHub-backed sync via Fine-Grained PAT + private repo. Opt-in, no server required. Per-store incremental push/pull with auto-sync timer.

**Plan file:** `docs/superpowers/plans/2026-03-22-gm-dashboard-cloud-sync.md`
**Spec:** `docs/superpowers/specs/2026-03-22-gm-dashboard-cloud-sync-design.md`
**Approach:** `superpowers:subagent-driven-development` — fresh subagent per task with code review between tasks.

> ⏸ **Do not begin execution until 2026-03-26 (Thursday).** Token budget resets then.

- [ ] Task 1: Dirty Tracking in `db_put` — `SYNC_STORES`, `_syncImporting` guard
- [ ] Task 2: Tab Bar Sync Button + CSS
- [ ] Task 3: Settings Modal — Cloud Sync Section
- [ ] Task 4: Core GitHub API Helpers (`§CLOUD_SYNC`)
- [ ] Task 5: Push and Pull Store Functions
- [ ] Task 6: `runSync()`
- [ ] Task 7: Connect / Disconnect + Settings Modal UI
- [ ] Task 8: Build Verification + `README.md` update

---


## Suggested Additions

### 🔲 S6. Remove App Title "The Mother Tree"

The app should not be titled "The Mother Tree" — that name is reserved for the default theme only. Remove or replace all instances of the name used as an app/UI title (page title, GM badge, localStorage keys, manifest, etc.). The theme name `Mother Tree` may remain.

---

### ✅ S5. Lore Tab Markdown Editor

Each lore tab should be editable in-browser — no need to edit the `.md` file externally and re-upload.

**UI:**
- A small `✏ Edit` button in the top-right corner of each lore tab panel (absolutely positioned over the content area)
- Clicking it toggles the tab between **read mode** (current rendered view) and **edit mode** (raw markdown textarea)
- In edit mode the button label changes to `👁 Preview`; clicking it re-renders the markdown and saves
- `Escape` in the textarea cancels edits and returns to the last-saved content
- The `📜 +` lore tab button in the tab bar should also offer a "New blank tab" path — create an empty tab that opens directly in edit mode

**Data flow:**
- Raw markdown already lives in `tabRawMd[id]` — the textarea reads and writes this directly
- On exit from edit mode: update `tabRawMd[id]`, call `renderMd(raw, title)`, replace `.md-content` innerHTML, call `saveSession()`
- Session persistence already saves/restores `tabRawMd` — no schema changes needed

**Where to change:**
- `app.js`: `addTab()` — inject edit button into panel HTML; add `toggleLoreEdit(id)`, `commitLoreEdit(id)` functions; add a `newBlankTab()` function
- `styles.css`: `.md-edit-btn` (positioned button), `.md-edit-area` (full-panel textarea, monospace, dark theme)
- `index.html`: wire the `📜 +` button to offer blank tab option (or add a separate `📝 +` button)

---

---
---

# Completed

> Items below are done and kept for reference only.

## ✅ Required Tasks

### ✅ 4. Theme System — GM Dashboard Edition
9 bespoke themes designed for the GM screen. Each evokes a *setting*, not just a colorway. All are dark (GM-screen friendly).

| # | Name | Vibe | Key Accent | BG |
|---|------|------|------------|----|
| — | **Mother Tree** *(default, already live)* | Ancient oak, beeswax, parchment | Amber gold | Warm dark brown |
| 1 | **Void Court** | Midnight fae, cold starlight, silver silk | Pale ice blue | Blue-black |
| 2 | **Ember Keep** | Torchlit stone, war camp, forged iron | Burnt orange | Deep red-brown |
| 3 | **Sunken Archive** | Bioluminescent depths, drowned library | Cyan-teal glow | Deep teal-black |
| 4 | **Iron Reliquary** | Fortress armory, gunmetal, serious | Steel blue | Cool charcoal |
| 5 | **Crimson Pact** | Blood oath, forbidden magic | Rose-magenta | Deep violet-black |
| 6 | **Verdant Spire** | Living tower, druid grove, spore lanterns | Leaf green | Forest black-green |
| 7 | **Starfall** | Astronomical observatory, gold leaf on vellum | Warm star gold | Midnight navy |
| 8 | **Ashwood** | Quiet hearth, elder's study, worn leather | Sage green | Neutral warm grey |

- [x] Define `THEMES{}` object in `app.js` with all 9 CSS variable sets
- [x] Add `applyTheme(name)` — sets each CSS variable on `document.documentElement.style`
- [x] Add `restoreTheme()` — reads from `db_setting('theme')`, falls back to `'Mother Tree'`
- [x] Call `restoreTheme()` from `init()`
- [x] Add theme picker button + overlay to `index.html` (tab bar, right side)
- [x] Style picker in `styles.css`: `#theme-btn`, `#theme-picker`, `.theme-swatch`, `.theme-swatch.active`
- [x] Persist selected theme via `db_setting('theme')`

**Files:** `app.js` (THEMES, applyTheme, restoreTheme), `styles.css` (picker styles), `index.html` (picker HTML in tab bar)

---

### ✅ 1. Go Fully Local (No CDN)
All external dependencies removed. The app now works with no internet connection.

- [x] Replace `marked.js` CDN with local `vendor/marked-compat.js` (custom drop-in parser)
- [x] Remove Google Fonts CDN link — existing CSS already has `Georgia`, `serif`, `monospace` fallbacks
- [x] No external URLs remain in the HTML

**Files changed:** `index.html`, `styles.css`, `app.js`, `vendor/marked-compat.js`

---

### ✅ 2. Abilities & Status Effects on Combat Cards

**Abilities:**
- [x] `▼ Abilities` toggle button on each combat card (hidden if adversary has no feats)
- [x] Click expands an inline panel listing each feat with its type tag, name, and description
- [x] Collapsed by default to keep cards compact; cosmetic-only, no persistence needed
- [x] Reuses Arsenal ability styles (`.ability-item`, `.ability-tag`, `.ability-name`, `.ability-desc`)

**Status Effects:**
- [x] `[+ Status]` button on each combat card opens an inline dropdown
- [x] Seven Daggerheart conditions: `Vulnerable`, `Hidden`, `Restrained`, `Frightened`, `Bolstered`, `Cursed`, `Poisoned`
- [x] Applied statuses show as coloured badges; click a badge to remove it
- [x] Already-applied statuses are hidden from the picker (no duplicates)
- [x] `activeStatuses[]` stored in combatant state and persisted to session storage

**Files changed:** `app.js` (`mkCombatant`, `combatCard`, `loadSession`, new status functions), `styles.css` (status badge + picker + abilities panel styles)

---

### ✅ 3. Full Session Persistence (IndexedDB)
All combat state and lore tabs survive page refresh. Migrated from localStorage to IndexedDB.

- [x] Persist `round` counter, `battleStarted` flag, `playerCount`
- [x] Persist `combatants` array (HP dots, Stress dots, Defeated state, Status effects)
- [x] Persist `cart` (pre-battle encounter queue)
- [x] Persist open dynamic tabs: `{ id, title, icon, rawMd }` — re-render on reload
- [x] Save on every mutation; restore on `init()`
- [x] Persist all battle tabs as `battles[]` array; backward-compatible with old single-battle format
- [x] IndexedDB wrapper (`db_*` helpers) + one-time migration from localStorage
- [x] Async `init()` awaits DB open, migration, and session load

**Files:** `app.js` (§DB, §DB_MIGRATE, §SESSION, §BATTLE_TABS)

---

### ✅ 5. Browser-Style Tab System Redesign

- [x] Rounded top corners, flat bottom edge; active tab visually raised
- [x] Icon (emoji "favicon") left of each tab label
- [x] `⚔ +` New Battle button and `+` Add Lore Tab button in the tab bar
- [x] Close `×` button on all tabs except the last remaining battle tab
- [x] Horizontal scroll when tabs overflow
- [x] Drag-to-reorder tabs
- [x] Lore tabs can be renamed via double-click

**Files:** `styles.css`, `index.html`, `app.js` (§BATTLE_TABS)

---

### ✅ 8. Battle Tabs — Multiple Concurrent Encounters

- [x] Replace single permanent combat tab with dynamic battle tabs
- [x] Each battle tab has its own isolated state: `cart`, `combatants`, `round`, `battleStarted`, `playerCount`
- [x] `⚔ +` button creates new battle tab (auto-named "Battle 1", "Battle 2", etc.)
- [x] Battle tabs can be renamed (double-click), closed (confirm if battle in progress)
- [x] Session persistence: all battle tabs saved as `battles[]`; backward-compatible
- [x] BP sidebar and combat controls operate on the currently active battle tab only

**Files:** `index.html`, `app.js` (§BATTLE_TABS), `styles.css`

---

## ✅ Low Priority (Completed)

### ✅ 6. Replace Custom Adversary Modal with "Upload Adversary" Button
Single clean workflow: write a `.md` file → upload → adversary appears in Arsenal sidebar.

- [x] Remove "Create Custom Adversary" trigger button from sidebar
- [x] Add "⬆ Upload Adversary" button/label to the sidebar header (`accept=".md"`, multiple)
- [x] File picker opens on click
- [x] Parse `.md` frontmatter into adversary object via `parseAdvMd()`
- [x] Validate required fields — show toast error if malformed
- [x] Add parsed adversary to `ADV[]` and `customAdv[]`, save to IndexedDB via `db_put`
- [x] Custom adversary modal (`#custom-modal-bg`) retained for edit functionality

**Files:** `index.html`, `app.js` (`parseAdvMd`, `handleAdvUpload`), `styles.css` (`.upload-adv-btn`)

---

### ✅ 7. Adversary `.MD` Format + Sample File

- [x] Created `sample_adversary.md` in the repo root with Cave Ogre example
- [x] Wrote `parseAdvMd(raw, filename)` function in `app.js` (§CUSTOM_ADV)
  - Extracts YAML frontmatter using string split on `---`
  - Parses numeric fields (`dc`, `hp`, `st`, `maj`, `sev`) with `parseInt`
  - Parses `## Abilities` / `### Ability Name` / `**tag** — description` into feats array
  - Ignores `## Tactics` section
  - Validates all required fields; returns `{ error }` object on failure
  - Generates `id` as `custom_<kebab-name>_<timestamp>`

**Files:** `app.js`, `sample_adversary.md`

---

## ✅ Suggested Additions

### ✅ S4. Adversary Search in Arsenal
- [x] Text search box at the top of the Arsenal sidebar
- [x] Filters adversary list by name as you type

---

### ✅ S2. Session Export / Import
- [x] "Export Session" → downloads `session_YYYY-MM-DD.json`
- [x] "Import Session" → restores full state from a previously exported file
- [x] Settings gear button in the tab bar opens Export/Import modal

---

## ✅ Bug Fixes

### ✅ B3. Right Sidebar Toggle Arrow Too Small
- [x] Increased `#sidebar-toggle` from 30×30 px to 38×38 px
- [x] Increased font-size from 15 px to 20 px
- [x] Moved from `left:12px` to `left:8px` (inward pull from curved-screen edge)
- [x] Updated `.sidebar-header` padding-left from `50px` to `56px`
- [x] Added `#sidebar-toggle` to mobile `touch-action:manipulation` list

### ✅ B2. Incorrect Condition Descriptions
- [x] Status picker corrected to match PHB — only Hidden, Restrained, Vulnerable; Frightened/Bolstered/Cursed/Poisoned removed

### ✅ B1. Saving an Encounter Doesn't Rename the Battle Tab
- [x] `confirmSaveEncounter()` now calls `renameBattle()` after save to sync the tab label

---

## ✅ Plan A: Storage Foundation

- [x] IndexedDB wrapper (`db_open`, `db_put`, `db_get`, `db_getAll`, `db_delete`, `db_setting`)
- [x] Toast notification helper (`showToast`)
- [x] One-time localStorage → IndexedDB migration
- [x] Custom adversary persistence via IndexedDB
- [x] Session persistence via IndexedDB with async init
- [x] Export/Import JSON backup modal
- [x] Saved Encounters — save, load, delete from combat area
- [x] `[[encounter:Name]]` links in lore tabs trigger saved encounter loading
- [x] dist bundle rebuilt

---

## ✅ Plan B: Toolkit Panel

- [x] Toolkit panel shell — fixed right-side column, toggle, tab switching, state persistence
- [x] Rules Reference tab — searchable cheat sheet with custom rule support
- [x] Session Notes tab — scratchpad + pinned NPC/Threat/Loot cards
- [x] Generators tab — NPC Name Generator
- [x] Loot Roller with tiered tables and pin-to-notes
- [x] Environment Stat Block Generator with library, inline editing, and pin-to-notes
- [x] dist bundle rebuilt
