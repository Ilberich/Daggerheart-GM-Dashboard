# GM Dashboard — To-Do List

> **Status key:** 🔲 Pending · 🐛 Bug · 💡 Suggested · ⬇ Low Priority
>
> **Plans:** When a brainstorm session produces an implementation plan, add it here as a `### 🔲 Plan X` section so this file remains the single source of truth for what to do next. Plan detail lives in `docs/superpowers/plans/`.

---

## Inbox

---

## Quick Wins

*Small, independent changes — each fits in one short session with no cross-task dependencies.*

### 🔲 S7. Add LICENSE File — High Priority

Add an MIT License file to the repo root. Without a license, no one has legal permission to use, modify, or distribute the code even if it's publicly visible on GitHub. This should be done before sharing the repo link publicly.

- [ ] Create `LICENSE` file in repo root (MIT License, copyright year + author name)

---

### 🔲 S6. Remove App Title "The Mother Tree"

The app should not be titled "The Mother Tree" — that name is reserved for the default theme only. Remove or replace all instances of the name used as an app/UI title (page title, GM badge, localStorage keys, manifest, etc.). The theme name `Mother Tree` may remain.

---

### 🔲 S9. Adversary Sidebar Reopen Arrow

Once the adversary purchase sidebar is minimized, there is no way to reopen it except clicking "Begin Battle." This is unintuitive — add a persistent left-edge arrow toggle (matching the Toolkit panel's arrow) so the sidebar can be opened at any time.

- [ ] Add a left-edge toggle arrow to `#sidebar` that mirrors the Toolkit panel's toggle behavior
- [ ] Arrow should be visible whenever the sidebar is collapsed, regardless of battle state
- [ ] Wire to `toggleSidebar()` / `openSidebar()`

---

## SRD Compliance Pass

*Do R1 and Plan E together — both touch `ADV[]` and the built-in content lists, so a single editing pass + one build + one README update covers both.*

### 🔲 R1. Remove Non-SRD Content — High Priority

Audit all built-in content (adversaries, environments, rules text) against the Daggerheart SRD and remove anything not covered by the license. Non-SRD material may violate the license terms.

- [ ] Audit `ADV[]` in `app.js` — flag any adversaries not present in the SRD
- [ ] Audit Rules Reference content in the Toolkit panel — remove or replace non-SRD rules text
- [ ] Audit Environments in the Toolkit panel — remove any non-SRD entries
- [ ] Rebuild + update README

---

### 🔲 Plan E: Higher-Tier Adversaries + Filter Redesign

Add Tier 2/3/4 adversaries from the SRD and replace the Arsenal's pill-button type filter with two side-by-side `<select>` dropdowns (Tier + Type). All 129 SRD adversaries will be available; filter state is persisted in session.

**Plan file:** `/home/jpuhalski/.claude/plans/structured-wiggling-starfish.md`

- [ ] Task 1: Add `tier: 1` to all existing ADV[] objects
- [ ] Task 2: Add Tier 2 adversaries (37) from SRD
- [ ] Task 3: Add Tier 3 adversaries (23) from SRD
- [ ] Task 4: Add Tier 4 adversaries (18) from SRD
- [ ] Task 5: Add `filterTier` state + `setTierFilter()` function
- [ ] Task 6: Redesign `buildFilters()` — pill buttons → two `<select>` dropdowns
- [ ] Task 7: Update `renderList()` to filter by tier + type
- [ ] Task 8: CSS for `.filter-dropdowns` layout
- [ ] Task 9: Persist `filterTier` in session
- [ ] Task 10: Build + update README

---

## Toolkit Enhancement

### 🔲 Plan D: Editable SRD Rules

Allow GMs to override any built-in SRD rule with homebrew text. Overrides stored in IndexedDB (`toolkit_notes`, `_override: true`). Restore Default reverts to SRD original. All destructive actions live inside the edit form, not on card faces.

**Plan file:** `docs/superpowers/plans/2026-03-24-editable-srd-rules.md`
**Spec:** `docs/superpowers/specs/2026-03-24-editable-srd-rules-design.md`

- [ ] Task 1: CSS — override card & conditional form buttons
- [ ] Task 2: Update `_appendRulesForm` — form structure
- [ ] Task 3: Add `cancelRulesForm` and `restoreDefaultRule`
- [ ] Task 4: Update `renderRulesList` — override map & universal edit button
- [ ] Task 5: Update click handler
- [ ] Task 6: Update `saveCustomRule` — override branch
- [ ] Task 7: Build + README

---

## Deferred / Maybe Never

### ⬇ Plan C: Cloud Sync

GitHub-backed sync via Fine-Grained PAT + private repo. Deferred — Export/Import JSON already covers the multi-device transfer use case manually, and the GitHub PAT setup adds friction for most GMs. High token cost for marginal gain over what's already there.

**Plan file:** `docs/superpowers/plans/2026-03-22-gm-dashboard-cloud-sync.md`
**Spec:** `docs/superpowers/specs/2026-03-22-gm-dashboard-cloud-sync-design.md`

---

## Future Features

*Larger scope — each warrants its own brainstorm/plan session before starting.*

### 🔲 S8. Home Screen for Managing Multiple Sessions — Medium Priority

A landing/home screen that lets the GM see, name, and switch between multiple saved sessions rather than always loading the single most-recent session.

- [ ] Design home screen UI (session list, create new, delete, rename)
- [ ] Migrate session storage to support multiple named sessions keyed by ID
- [ ] Add routing or modal to switch active session

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
- [x] Add theme `<select>` dropdown to the Settings modal in `index.html`
- [x] Style dropdown in `styles.css`: `.sm-theme-row`, `.sm-theme-label`, `.sm-select`
- [x] Persist selected theme via `db_setting('theme')`

**Files:** `app.js` (§THEMES, applyTheme, restoreTheme), `styles.css` (picker styles), `index.html` (picker `<select>` in Settings modal)

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

### ✅ B4. Theme Branch — "Add Lore" Button Does Nothing

`#lore-add-menu` was `position:absolute; bottom:calc(100%+4px)`, opening above the button. `#tabbar` has `overflow-y:hidden`, clipping the menu entirely (it extended above the viewport). Fixed by switching to `position:fixed; top:var(--tabbar-h)` so the dropdown appears just below the tab bar.

- [x] Reproduce on the theme branch
- [x] Identify regression: `#tabbar` `overflow-y:hidden` clips the absolute-positioned menu
- [x] Fix and verify lore tab creation works

---

### ✅ B5. Theme Branch — Settings Tab Missing

In the theme system PR branch, the settings gear/tab cannot be found. The settings modal (Export/Import) may have been removed or its trigger button dropped during the theme branch refactor.

- [x] Confirm settings button is absent from the tab bar or UI
- [x] Restore `#settings-btn` trigger and modal wiring
- [x] Verify Export/Import still functions

---

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
