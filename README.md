# The Mother Tree — Daggerheart GM Dashboard

A fully offline, single-page GM tool for running [Daggerheart](https://darringtonpress.com/daggerheart/) tabletop RPG sessions. No server, no internet connection, no installation required — just open a file in your browser.

---

## Features

### Combat Tracker
- **Battle Point budget** — set player count; the app calculates your BP total automatically; adding adversaries beyond the budget is allowed — the progress bar pulses red as a warning
- **Arsenal sidebar** — 132 built-in SRD adversaries across all 4 tiers and 10 types (Solo, Bruiser, Leader, Horde, Ranged, Skulk, Standard, Minion, Support, Social)
- **Tier + Type filters** — two dropdown menus (Tier and Type); filter state persists across sessions
- **Encounter queue** — stage adversaries before starting; save queues as named encounters for reuse
- **Live combat cards** — HP dots, Stress dots, status conditions (Vulnerable, Hidden, Restrained), ability panels, and mid-battle add/remove
- **Multiple battle tabs** — prep several encounters at once and switch between them without losing state; all tabs are closeable including the last one
- **Round tracker** — click the round badge to advance

### Lore Tabs
- Drag-and-drop `.md` files to open them as wiki-style reference tabs
- `[[encounter:Name]]` links — clickable gold links that load a saved encounter directly into combat
- **In-browser editing** — click `✏ Edit` (top-right of any lore tab) to edit the raw markdown; click `👁 Preview` to re-render and save; press `Escape` to cancel without saving
- **Export tab** — in preview mode, click `⬇ Export` to download the tab's raw markdown as `<tab-title>.md`
- **Smart list continuation** — in the editor, pressing Enter on a bullet (`-` or `*`) or numbered list item auto-starts the next item; pressing Enter on an empty list item exits the list
- **Add lore tab** — click the book-icon `+` button in the tab bar for a dropdown: **New Blank Tab** or **Upload .md File**

### Saved Encounters
- Save any staged encounter queue with a name
- Load encounters into any battle tab (replace or add to existing)
- Saving an encounter auto-renames the battle tab to match

### Toolkit Panel (right-side drawer)
- **Rules Reference** — searchable Daggerheart cheat sheet (60+ entries across 16 categories); add custom rules; click ✎ on any rule to override its text with homebrew content; click ↺ Restore Default to revert. Custom rules can be deleted from the edit form.
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

### Adversary .MD Format

Upload adversaries from `.md` files using YAML frontmatter. Required fields: `name`, `type`, `dc`, `hp`, `st`, `maj`, `atk`, `wpn`, `dmg`. Optional: `sev`, `motives`. Abilities go under `## Abilities` using `### Ability Name` headings followed by `**tag** — description`. A `## Tactics` section is ignored (GM-only notes).

See [`sample_adversary.md`](sample_adversary.md) for a complete working example.

### Data Persistence & Backup
- All state saved to **IndexedDB** — survives page refresh
- **Export / Import JSON** — back up your full session (combat, notes, encounters, library) to a file; restore on any device

### Themes
- **9 dark themes** — all designed for GM-screen use; switch instantly via the gear-icon Settings modal
- **Persists across sessions** — your chosen theme is restored on every load
- Themes: Mother Tree *(default)*, Void Court, Ember Keep, Sunken Archive, Iron Reliquary, Crimson Pact, Verdant Spire, Starfall, Ashwood

---

## Getting Started

**Try it live:** [https://ilberich.github.io/Daggerheart-GM-Dashboard/](https://ilberich.github.io/Daggerheart-GM-Dashboard/)

Or run it locally:

1. Download or clone this repository
2. Open `dist/index.html` in any modern browser
3. That's it — no build step needed to use the app

> **Mobile / offline use:** Always open `dist/index.html`, not `index.html`. The dist file is a self-contained bundle with all CSS and JS inlined, which avoids asset-loading failures over `file://`.

---

## License

Built for personal use with Daggerheart content. Daggerheart is © 2025 Darrington Press LLC.
