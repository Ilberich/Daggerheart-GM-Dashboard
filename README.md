# The Mother Tree — Daggerheart GM Dashboard

A fully offline, single-page GM tool for running [Daggerheart](https://darringtonpress.com/daggerheart/) tabletop RPG sessions. No server, no internet connection, no installation required — just open a file in your browser.

---

## Features

### Combat Tracker
- **Battle Point budget** — set player count; the app calculates your BP total automatically
- **Arsenal sidebar** — 60+ built-in adversaries across 10 types (Solo, Bruiser, Leader, Horde, Ranged, Skulk, Standard, Minion, Support, Social)
- **Encounter queue** — stage adversaries before starting; save queues as named encounters for reuse
- **Live combat cards** — HP dots, Stress dots, status conditions (Vulnerable, Hidden, Restrained), ability panels, and mid-battle add/remove
- **Multiple battle tabs** — prep several encounters at once and switch between them without losing state
- **Round tracker** — click the round badge to advance

### Lore Tabs
- Drag-and-drop `.md` files to open them as wiki-style reference tabs
- `[[wiki links]]` between notes; `[[encounter:Name]]` links that load saved encounters directly

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
- Create custom adversaries via the modal form (name, type, stats, abilities)
- Appear in the Arsenal alongside built-in adversaries

### Data Persistence & Backup
- All state saved to **IndexedDB** — survives page refresh
- **Export / Import JSON** — back up your full session (combat, notes, encounters, library) to a file; restore on any device

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
- Use `[[Note Title]]` inside a note to create wiki-style links
- Use `[[encounter:Goblin Ambush]]` to create a clickable link that loads that saved encounter

---

## Compatibility

Works in any modern Chromium or Firefox browser. Tested on desktop and mobile (Chrome on Android, Safari on iOS). Requires IndexedDB support (all modern browsers).

---

## License

Built for personal use with Daggerheart content. Daggerheart is © 2025 Darrington Press LLC.
