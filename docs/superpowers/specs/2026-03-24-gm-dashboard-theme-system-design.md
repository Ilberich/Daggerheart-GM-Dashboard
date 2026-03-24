# GM Dashboard — Theme System Design

**Date:** 2026-03-24
**Status:** Approved

---

## Overview

Add a theme system to the GM Dashboard. Players choose from 9 dark themes via a dropdown in the Settings modal. The selected theme is applied instantly and persisted to IndexedDB.

---

## Goals

- 9 bespoke dark themes, all GM-screen friendly
- Zero flash on load — theme restored before first render
- Minimal footprint — no new files, no new HTML elements beyond the modal section
- Persisted via existing `db_setting()` helper

---

## Themes

All themes are dark. `Mother Tree` is the existing default and remains unchanged.

| Name | Accent | Background | Vibe |
|------|--------|------------|------|
| Mother Tree *(default)* | Amber gold `#d4a843` | Warm dark brown `#0e0c0a` | Ancient oak, beeswax, parchment |
| Void Court | Pale ice blue `#a8c8e8` | Blue-black `#080c12` | Midnight fae, cold starlight, silver silk |
| Ember Keep | Burnt orange `#d4682a` | Deep red-brown `#120a06` | Torchlit stone, war camp, forged iron |
| Sunken Archive | Cyan-teal glow `#2dd4c8` | Deep teal-black `#060f10` | Bioluminescent depths, drowned library |
| Iron Reliquary | Steel blue `#7a9ab8` | Cool charcoal `#0a0c10` | Fortress armory, gunmetal, serious |
| Crimson Pact | Rose-magenta `#d44878` | Deep violet-black `#0e060e` | Blood oath, forbidden magic |
| Verdant Spire | Leaf green `#4ab870` | Forest black-green `#060e08` | Living tower, druid grove, spore lanterns |
| Starfall | Warm star gold `#d4b848` | Midnight navy `#060810` | Astronomical observatory, gold leaf on vellum |
| Ashwood | Sage green `#8ab898` | Neutral warm grey `#0c0e0c` | Quiet hearth, elder's study, worn leather |

---

## CSS Custom Properties Per Theme

Each theme defines values for all 22 CSS vars currently on `:root`:

```
--bg, --surface, --surface2, --surface3
--border, --border2
--text, --text-dim, --text-muted
--hope, --hope-dim, --hope-glow
--fear, --fear-dim, --fear-glow
--gold, --gold-dim
--green, --green-dim
--hp-color, --stress-color
--ink-line
```

`--sidebar-w` and `--tabbar-h` are layout constants — not theme-controlled.

---

## Architecture

### `app.js` — new `§THEMES` section

```js
// §THEMES
const THEMES = {
  'Mother Tree': { '--bg': '#0e0c0a', '--surface': '#15120e', ... },
  'Void Court':  { '--bg': '#080c12', '--surface': '#0d1220', ... },
  // ... 7 more
};

function applyTheme(name) {
  const t = THEMES[name] || THEMES['Mother Tree'];
  const root = document.documentElement.style;
  Object.entries(t).forEach(([k, v]) => root.setProperty(k, v));
}

function restoreTheme() {
  return db_setting('theme').then(function(name) {
    applyTheme(name || 'Mother Tree');
  });
}
```

### `init()` — updated promise chain

`restoreTheme()` is called at the start of the `init()` promise chain, before `loadSession()`, so the correct theme is in place before any UI renders.

### `index.html` — settings modal

A new Theme section is added above the existing Export/Import section in `#settings-modal`:

```html
<div class="sm-theme-row">
  <label class="sm-label" for="theme-select">Theme</label>
  <select id="theme-select" class="sm-select" onchange="applyTheme(this.value);db_setting('theme',this.value)">
    <option>Mother Tree</option>
    <option>Void Court</option>
    <!-- ... -->
  </select>
</div>
```

`openSettingsModal()` is updated to sync the select value to the currently active theme before showing the modal.

### `styles.css` — minor additions

Two new rules for the theme row inside the settings modal:

```css
.sm-theme-row { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
.sm-select { background:var(--surface2); border:1px solid var(--border); border-radius:6px;
             color:var(--text); padding:5px 10px; font-size:13px; cursor:pointer; }
```

---

## Data Flow

1. `init()` calls `restoreTheme()` → reads `db_setting('theme')` → calls `applyTheme(name)`
2. User opens Settings → `openSettingsModal()` syncs `#theme-select` value to active theme
3. User picks a theme → `applyTheme()` sets CSS vars on `documentElement` immediately → `db_setting('theme', name)` persists asynchronously
4. No page reload needed — all CSS vars update live via inline styles on `:root`

---

## Files Changed

| File | Change |
|------|--------|
| `app.js` | Add `§THEMES` const + `applyTheme()` + `restoreTheme()`; update `init()` |
| `index.html` | Add theme `<select>` to settings modal; update `openSettingsModal()` call |
| `styles.css` | Add `.sm-theme-row` and `.sm-select` rules |
| `README.md` | Document the theme system |
| `dist/index.html` | Rebuilt via `node build.js` |

---

## Out of Scope

- Light themes
- Per-tab or per-panel theming
- Custom user-defined themes
- Animated transitions between themes
