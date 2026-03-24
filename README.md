# The Mother Tree — Daggerheart GM Dashboard

A fully offline, single-page GM tool for running [Daggerheart](https://darringtonpress.com/daggerheart/) tabletop RPG sessions. No server, no internet connection, no installation required — just open a file in your browser.

---

## Features

### Combat Tracker
- **Battle Point budget** — set player count; the app calculates your BP total automatically
- **Arsenal sidebar** — 60+ built-in adversaries across 10 types (Solo, Bruiser, Leader, Horde, Ranged, Skulk, Standard, Minion, Support, Social)
- **Encounter queue** — stage adversaries before starting; save queues as named encounters for reuse
- **Live combat cards** — HP dots, Stress dots, status conditions (Vulnerable, Hidden, Restrained), ability panels, and mid-battle add/remove
- **Multiple battle tabs** — prep several encounters at once and switch between them without losing state; all tabs are closeable including the last one
- **Round tracker** — click the round badge to advance

### Lore Tabs
- Drag-and-drop `.md` files to open them as wiki-style reference tabs
- `[[encounter:Name]]` links — clickable gold links that load a saved encounter directly into combat
- **In-browser editing** — click `✏ Edit` (top-right of any lore tab) to edit the raw markdown; click `👁 Preview` to re-render and save; press `Escape` to cancel without saving
- **Add lore tab** — click the `📜 +` button in the tab bar for a dropdown: **New Blank Tab** or **Upload .md File**

### Saved Encounters
- Save any staged encounter queue with a name
- Load encounters into any battle tab (replace or add to existing)
- Saving an encounter auto-renames the battle tab to match

### Toolkit Panel (right-side drawer)
- **Rules Reference** — searchable Daggerheart cheat sheet (60+ entries across 16 categories); add custom rules
- **Session Notes** — freeform scratchpad + pinnable NPC / Threat / Loot cards
- **Generators**
  - NPC Name Generator (6 cultural styles; pin names to notes)
  - Loot Roller (tiers 1–4)
  - Environment Stat Block Generator (11 seeds × 4 tiers × 3 types; 19 official PHB environments; save to library)

### Custom Adversaries
- **Upload Adversary** — click the "⬆ Upload Adversary" button in the Arsenal sidebar header to import one or more `.md` adversary files
- Each file is parsed from YAML frontmatter; abilities are read from the `## Abilities` section
- Invalid or incomplete files show a toast error indicating the missing field
- Uploaded adversaries appear instantly in the Arsenal and are saved to IndexedDB
- See [`sample_adversary.md`](sample_adversary.md) for the exact file format
- Custom adversaries can still be edited or deleted via the edit/delete buttons in the Arsenal list

### Data Persistence & Backup
- All state saved to **IndexedDB** — survives page refresh
- **Export / Import JSON** — back up your full session (combat, notes, encounters, library) to a file; restore on any device

### Themes
- **9 dark themes** — all designed for GM-screen use; switch instantly via the ⚙ Settings modal
- **Persists across sessions** — your chosen theme is restored on every load
- Themes: Mother Tree *(default)*, Void Court, Ember Keep, Sunken Archive, Iron Reliquary, Crimson Pact, Verdant Spire, Starfall, Ashwood

### Adversary .MD Format

Upload adversaries from `.md` files using YAML frontmatter. Required fields: `name`, `type`, `dc`, `hp`, `st`, `maj`, `atk`, `wpn`, `dmg`. Optional: `sev`, `motives`. Abilities go under `## Abilities` using `### Ability Name` headings followed by `**tag** — description`. A `## Tactics` section is ignored (GM-only notes).

See [`sample_adversary.md`](sample_adversary.md) for a complete working example.

---

## Sidebar Toggle Fix

The Arsenal sidebar toggle button is now 38×38 px (up from 30×30 px) with a larger 20 px icon, positioned slightly inward from the left edge to avoid curved-screen bezel clipping on phones. On mobile it also has `touch-action:manipulation` set for reliable tap behaviour.

---

## Getting Started

1. Download or clone this repository
2. Open `dist/index.html` in any modern browser
3. That's it — no build step needed to use the app

> **Mobile / offline use:** Always open `dist/index.html`, not `index.html`. The dist file is a self-contained bundle with all CSS and JS inlined, which avoids asset-loading failures over `file://`.

---

## File Layout

| File | Purpose |
|------|---------|
| `index.html` | HTML markup (source) |
| `styles.css` | All CSS (source) |
| `app.js` | All JavaScript (source) |
| `vendor/marked-compat.js` | Local Markdown parser — no CDN |
| `build.js` | Node.js bundle script |
| `dist/index.html` | **Self-contained bundle — use this one** |
| `manifest.json` / `sw.js` / `icon.svg` | PWA support files |

---

## Building from Source

Requires Node.js (any recent version).

```bash
node build.js
# Output: dist/index.html (~280 KB, fully self-contained)
```

Rebuild any time you edit `styles.css`, `app.js`, or `vendor/marked-compat.js`.

---

## Adversary Types & Battle Points

| Type | BP Cost | Role |
|------|---------|------|
| Solo | 5 | Boss-level; acts multiple times |
| Bruiser | 4 | High HP, hard-hitting |
| Leader | 3 | Buffs allies, priority target |
| Horde / Ranged / Skulk / Standard | 2 | Core combat roles |
| Minion / Support / Social | 1 | Support roles, group fillers |

BP budget = player count × 3 (default). Adjust in the sidebar.

---

## Lore Tab Tips

- Drag any `.md` file onto the browser window to open it as a tab
- Click `📜 +` in the tab bar → choose **New Blank Tab** or **Upload .md File**
- Click `✏ Edit` (top-right of any lore tab) to edit in-browser; `Escape` cancels, `👁 Preview` saves
- Use `[[encounter:Goblin Ambush]]` to create a clickable gold link that loads that saved encounter

---

## Compatibility

Works in any modern Chromium or Firefox browser. Tested on desktop and mobile (Chrome on Android, Safari on iOS). Requires IndexedDB support (all modern browsers).

---

## License

Built for personal use with Daggerheart content. Daggerheart is © 2025 Darrington Press LLC.
