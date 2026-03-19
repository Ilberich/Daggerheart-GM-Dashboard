# GM Dashboard — Refactor To-Do List

> **Status key:** ✅ Complete · 🔲 Pending · 💡 Suggested (not originally requested)

---

## Required Tasks

### ✅ 1. Go Fully Local (No CDN)
All external dependencies removed. The app now works with no internet connection.

- [x] Replace `marked.js` CDN with local `vendor/marked-compat.js` (custom drop-in parser)
- [x] Remove Google Fonts CDN link — existing CSS already has `Georgia`, `serif`, `monospace` fallbacks
- [x] No external URLs remain in the HTML

**Files changed:** `dm_interface.html`, `vendor/marked-compat.js`

---

### 🔲 2. Full Session Persistence (localStorage)
Currently only custom adversaries persist. Combat state and lore tabs are lost on page refresh.

- [ ] Persist `round` counter, `battleStarted` flag, `playerCount`
- [ ] Persist `combatants` array (HP dots, Stress dots, Defeated state, Status effects)
- [ ] Persist `cart` (pre-battle encounter queue)
- [ ] Persist open dynamic tabs: `{ id, title, icon, rawMd }` — re-render on reload
- [ ] Save on every mutation; restore on `init()`

**Files:** `dm_interface.html` (JS section)

---

### 🔲 3. Browser-Style Tab System Redesign
Current tabs look like nav buttons. Requested: Chrome/Firefox style.

- [ ] Rounded top corners (`border-radius: 8px 8px 0 0`), flat bottom edge
- [ ] Active tab visually raised — lighter background, connects to panel below
- [ ] Inactive tabs slightly dimmer/recessed
- [ ] Icon (emoji "favicon") left of each tab label
- [ ] `+` New Tab button pinned at the right end of the tab bar
- [ ] Close `×` button on all tabs except Combat Tracker (which is permanent)
- [ ] Horizontal scroll when tabs overflow

**Files:** `dm_interface.html` (CSS tab rules, tab bar HTML)

---

### 🔲 4. Replace Custom Adversary Modal with "Upload Adversary" Button
Single clean workflow: write a `.md` file → upload → adversary appears in Arsenal sidebar.

- [ ] Remove existing "Create Custom Adversary" modal and its trigger button
- [ ] Add **"Upload Adversary"** button to the sidebar header
- [ ] File picker opens on click (`accept=".md"`)
- [ ] Parse `.md` frontmatter into adversary object (see Task 5 format)
- [ ] Validate required fields — show inline error if malformed
- [ ] Add parsed adversary to Arsenal, save to localStorage
- [ ] Uploaded adversaries show a `Custom` badge in the sidebar

**Files:** `dm_interface.html` (sidebar HTML, new `parseAdvMd()` function)

---

### 🔲 5. Adversary `.MD` Format + Sample File
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
- [ ] Write `parseAdvMd()` function in `dm_interface.html`

---

### 🔲 6. Status Effects on Combat Cards
Track Daggerheart conditions on adversary cards during combat.

**Statuses included:**
- Conditions: `Vulnerable`, `Hidden`, `Restrained`, `Frightened`
- Tags: `Bolstered`, `Cursed`, `Poisoned`

**Behaviour:**
- [ ] `[+ Status]` button on each combat card (below HP/Stress dots)
- [ ] Click opens inline dropdown — click a status to apply it; dropdown auto-closes
- [ ] Applied statuses show as coloured badges on the card
- [ ] Click a badge to remove it; dropdown re-opens for new additions
- [ ] Status state stored in `combatant.activeStatuses[]`
- [ ] Persisted as part of session state (see Task 2)

**Files:** `dm_interface.html` (`combatCard()`, CSS status badge styles)

---

### 🔲 7. Character Sheet Theme System
Port the 9-theme system from the Daggerheart Character Sheet repo.

**Themes:** Pulse · Canopy · Roots · Trunk · Gilded · Dusk · Loam · Mist · Hearth

- [ ] Add theme definitions (colours from `Daggerheart-character-sheet/data/themes.js`)
- [ ] Add theme picker to the tab bar (right side) — coloured dot per theme
- [ ] Apply via CSS custom properties (`--bg`, `--surface`, `--hope`, `--fear`, `--gold`, etc.)
- [ ] Persist selected theme to localStorage

**Files:** `dm_interface.html` (theme picker HTML/CSS, `applyTheme()` function)

---

## Suggested Additions

### 💡 S1. Split Into Separate Files
`dm_interface.html` is currently 1,177 lines of mixed HTML/CSS/JS. Splitting makes it far easier to maintain.

```
Daggerheart-GM-Dashboard/
├── index.html              ← markup only
├── styles.css              ← all CSS
├── app.js                  ← all JavaScript
├── vendor/
│   └── marked-compat.js    ← local markdown parser ✅
├── fonts/                  ← (optional) local WOFF2 font files
└── sample_adversary.md     ← adversary template
```

### 💡 S2. Session Export / Import
- "Export Session" → downloads `session_YYYY-MM-DD.json`
- "Import Session" → restores full state from a previously exported file
- Useful for: backing up campaigns, sharing encounter setups between GMs

### 💡 S3. Player Character Tracker Panel
- Add PC names and track their HP, Stress, and Hope pips alongside the combat grid
- Persists with session state
- Gives a single-screen view of the entire battlefield

### 💡 S4. Adversary Search in Arsenal
- Text search box at the top of the Arsenal sidebar
- Filters adversary list by name as you type
- Useful as the custom adversary list grows

---

## Progress

| # | Task | Status |
|---|------|--------|
| 1 | Go fully local (no CDN) | ✅ Done |
| 2 | Full session persistence | 🔲 |
| 3 | Browser-style tabs | 🔲 |
| 4 | Upload Adversary button | 🔲 |
| 5 | Adversary .MD format + sample file | 🔲 |
| 6 | Status effects on combat cards | 🔲 |
| 7 | Character sheet theming | 🔲 |
| S1 | File structure refactor | 🔲 |
| S2 | Session export / import | 🔲 |
| S3 | Player character tracker | 🔲 |
| S4 | Adversary search in Arsenal | 🔲 |
