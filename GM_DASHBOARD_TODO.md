# GM Dashboard — Refactor To-Do List

> **Status key:** ✅ Complete · 🔲 Pending · 💡 Suggested (not originally requested)

---

## Required Tasks

### ✅ 1. Go Fully Local (No CDN)
All external dependencies removed. The app now works with no internet connection.

- [x] Replace `marked.js` CDN with local `vendor/marked-compat.js` (custom drop-in parser)
- [x] Remove Google Fonts CDN link — existing CSS already has `Georgia`, `serif`, `monospace` fallbacks
- [x] No external URLs remain in the HTML

**Files changed:** `index.html`, `styles.css`, `app.js`, `vendor/marked-compat.js`

---

### ✅ 2. Abilities & Status Effects on Combat Cards
Once an adversary enters combat, GMs can now view their abilities and track conditions directly on the card.

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

### 🔲 3. Full Session Persistence (localStorage)
Currently only custom adversaries persist. Combat state and lore tabs are lost on page refresh.

- [ ] Persist `round` counter, `battleStarted` flag, `playerCount`
- [ ] Persist `combatants` array (HP dots, Stress dots, Defeated state, Status effects)
- [ ] Persist `cart` (pre-battle encounter queue)
- [ ] Persist open dynamic tabs: `{ id, title, icon, rawMd }` — re-render on reload
- [ ] Save on every mutation; restore on `init()`

**Files:** `app.js` (§SESSION section)

---

### 🔲 4. Character Sheet Theme System
Port the 9-theme system from the Daggerheart Character Sheet repo.

**Themes:** Pulse · Canopy · Roots · Trunk · Gilded · Dusk · Loam · Mist · Hearth

- [ ] Add theme definitions (colours from `Daggerheart-character-sheet/data/themes.js`)
- [ ] Add theme picker to the tab bar (right side) — coloured dot per theme
- [ ] Apply via CSS custom properties (`--bg`, `--surface`, `--hope`, `--fear`, `--gold`, etc.)
- [ ] Persist selected theme to localStorage

**Files:** `styles.css` (theme definitions, picker styles), `index.html` (picker HTML), `app.js` (`applyTheme()`)

---

### 🔲 5. Browser-Style Tab System Redesign
Current tabs look like nav buttons. Requested: Chrome/Firefox style.

- [ ] Rounded top corners (`border-radius: 8px 8px 0 0`), flat bottom edge
- [ ] Active tab visually raised — lighter background, connects to panel below
- [ ] Inactive tabs slightly dimmer/recessed
- [ ] Icon (emoji "favicon") left of each tab label
- [ ] `+` New Tab button pinned at the right end of the tab bar
- [ ] Close `×` button on all tabs except Combat Tracker (which is permanent)
- [ ] Horizontal scroll when tabs overflow

**Files:** `styles.css` (tab CSS rules), `index.html` (tab bar HTML)

---

### 🔲 6. Replace Custom Adversary Modal with "Upload Adversary" Button
Single clean workflow: write a `.md` file → upload → adversary appears in Arsenal sidebar.

- [ ] Remove existing "Create Custom Adversary" modal and its trigger button
- [ ] Add **"Upload Adversary"** button to the sidebar header
- [ ] File picker opens on click (`accept=".md"`)
- [ ] Parse `.md` frontmatter into adversary object (see Task 7 format)
- [ ] Validate required fields — show inline error if malformed
- [ ] Add parsed adversary to Arsenal, save to localStorage
- [ ] Uploaded adversaries show a `Custom` badge in the sidebar

**Files:** `index.html` (sidebar HTML, remove modal), `app.js` (new `parseAdvMd()` function)

---

### 🔲 7. Adversary `.MD` Format + Sample File
Users need a template to write their own adversary files.

#### File Format

```markdown
---
name: Cave Ogre
type: bruiser
dc: 13
hp: 6
st: 4
maj: 5
sev: 10
atk: +4
wpn: Club · Melee
dmg: 2d8+4 phy
motives: protect lair, hoard treasure
---

## Abilities

### Thick Hide
**passive** — Reduce all physical damage by 1.

### Crushing Blow
**action** — Make an attack. On a hit, the target is Restrained until end of their next turn.

### Cornered Rage
**fear** — When the Ogre is reduced to half HP, it immediately makes a free attack against a random target.

## Tactics

> The Ogre hangs back until a player enters melee range, then focuses the squishiest target.
> Use Cornered Rage dramatically at the mid-point of the fight.
```

#### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Display name |
| `type` | ✅ | `solo` / `bruiser` / `leader` / `horde` / `ranged` / `skulk` / `standard` / `minion` / `support` / `social` |
| `dc` | ✅ | Difficulty Class |
| `hp` | ✅ | Hit Point slots |
| `st` | ✅ | Stress slots |
| `maj` | ✅ | Major damage threshold |
| `sev` | ❌ | Severe damage threshold (omit if none) |
| `atk` | ✅ | Attack modifier, e.g. `+3` or `-1` |
| `wpn` | ✅ | Weapon name · Range, e.g. `Club · Melee` |
| `dmg` | ✅ | Damage formula, e.g. `1d8+2 phy` |
| `motives` | ❌ | Comma-separated GM notes on behaviour |
| `## Abilities` | ✅ | `### Ability Name` then `**tag** — description` |
| `## Tactics` | ❌ | Blockquote (`>`) — private GM notes, not shown to players |

**Ability tags:** `passive` · `action` · `reaction` · `fear`

- [ ] Create `sample_adversary.md` in the repo root
- [ ] Write `parseAdvMd()` function in `app.js`

---

## Suggested Additions

### 💡 S2. Session Export / Import
- "Export Session" → downloads `session_YYYY-MM-DD.json`
- "Import Session" → restores full state from a previously exported file
- Useful for: backing up campaigns, sharing encounter setups between GMs

### 💡 S4. Adversary Search in Arsenal
- Text search box at the top of the Arsenal sidebar
- Filters adversary list by name as you type
- Useful as the custom adversary list grows

---

## Progress

| # | Task | Status |
|---|------|--------|
| 1 | Go fully local (no CDN) | ✅ Done |
| 2 | Abilities & Status Effects on combat cards | ✅ Done |
| 3 | Full session persistence | 🔲 |
| 4 | Character sheet theming | 🔲 |
| 5 | Browser-style tabs | 🔲 |
| 6 | Upload Adversary button | 🔲 |
| 7 | Adversary .MD format + sample file | 🔲 |
| S2 | Session export / import | 🔲 |
| S4 | Adversary search in Arsenal | 🔲 |
