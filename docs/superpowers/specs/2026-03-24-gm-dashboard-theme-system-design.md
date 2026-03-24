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

Each theme defines values for all 24 theme-controlled CSS vars on `:root`:

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

Note: `--hope-glow` and `--fear-glow` must be included in every theme object — they are used for `box-shadow` glows on hope/fear tokens and will silently fall back to the default amber values if omitted.

`--sidebar-w` and `--tabbar-h` are layout constants — not theme-controlled.

---

## Architecture

### `app.js` — new `§THEMES` section

Add a `§THEMES` anchor before the existing `§COMBAT_DATA` section. Introduce a module-level state variable `currentTheme` to track the active theme name (used by `openSettingsModal()` to sync the select):

```js
// §THEMES
var currentTheme = 'Mother Tree';

const THEMES = {
  'Mother Tree': { '--bg': '#0e0c0a', '--surface': '#15120e', ... },
  'Void Court':  { '--bg': '#080c12', '--surface': '#0d1220', ... },
  // ... 7 more
};

function applyTheme(name) {
  currentTheme = name || 'Mother Tree';
  const t = THEMES[currentTheme] || THEMES['Mother Tree'];
  const root = document.documentElement.style;
  Object.entries(t).forEach(function(entry) { root.setProperty(entry[0], entry[1]); });
}

function restoreTheme() {
  return db_setting('theme').then(function(name) {
    applyTheme(name || 'Mother Tree');
  });
}
```

### `init()` — startup integration

`init()` is a synchronous IIFE. `restoreTheme()` is called **before** the IIFE as a fire-and-forget call. Because `db_setting()` uses IndexedDB (async), the theme resolves after the synchronous stack completes but before the browser's first paint (Promise microtasks run before rendering tasks). On first-ever load with no stored theme, `applyTheme('Mother Tree')` is called, which is a no-op since the `:root` defaults are already Mother Tree — so there is no flash in either case.

```js
restoreTheme().catch(function(){});  // fire-and-forget before init IIFE
(function init() {
  loadSession();
  // ... rest of init unchanged
})();
```

### `openSettingsModal()` — sync the select

`openSettingsModal()` is updated to set `#theme-select`'s value to `currentTheme` before displaying the modal. A null-check guards against the HTML and JS being applied in separate steps:

```js
function openSettingsModal() {
  var sel = document.getElementById('theme-select');
  if (sel) sel.value = currentTheme;
  document.getElementById('settings-modal-bg').classList.add('open');
}
```

### `index.html` — settings modal

A new Theme section is added above the existing Export/Import section in `#settings-modal`. No new `.sm-label` class is needed — reuse the existing modal label style if one exists, or add minimal inline styling:

```html
<div class="sm-theme-row">
  <label class="sm-theme-label" for="theme-select">Theme</label>
  <select id="theme-select" class="sm-select"
    onchange="applyTheme(this.value);db_setting('theme',this.value).catch(function(){})">
    <option>Mother Tree</option>
    <option>Void Court</option>
    <option>Ember Keep</option>
    <option>Sunken Archive</option>
    <option>Iron Reliquary</option>
    <option>Crimson Pact</option>
    <option>Verdant Spire</option>
    <option>Starfall</option>
    <option>Ashwood</option>
  </select>
</div>
```

The `db_setting()` call uses `.catch(function(){})` to match the existing codebase convention for fire-and-forget IndexedDB writes (consistent with `restoreToolkitState()` and similar patterns).

### `styles.css` — minor additions

Two new rules for the theme row inside the settings modal. No existing `.sm-select` rule exists — this is a new addition:

```css
.sm-theme-row { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
.sm-theme-label { font-size:12px; color:var(--text-dim); white-space:nowrap; }
.sm-select { background:var(--surface2); border:1px solid var(--border); border-radius:6px;
             color:var(--text); padding:5px 10px; font-size:13px; cursor:pointer; }
```

---

## Data Flow

1. `restoreTheme()` called before `init()` IIFE — reads `db_setting('theme')` → calls `applyTheme(name)` → sets `currentTheme` and updates CSS vars on `documentElement`
2. `init()` IIFE runs synchronously — `loadSession()`, render, etc. Theme is already applied
3. User opens Settings → `openSettingsModal()` sets `#theme-select` value to `currentTheme`
4. User picks a theme → `applyTheme()` updates `currentTheme` + CSS vars immediately → `db_setting('theme', name)` persists asynchronously
5. No page reload needed — all CSS vars update live via inline styles on `:root`

---

## Files Changed

| File | Change |
|------|--------|
| `app.js` | Add `§THEMES` section (`currentTheme`, `THEMES`, `applyTheme`, `restoreTheme`); call `restoreTheme()` before `init()` IIFE; update `openSettingsModal()` |
| `index.html` | Add theme `<select>` to settings modal |
| `styles.css` | Add `.sm-theme-row`, `.sm-theme-label`, and `.sm-select` rules |
| `README.md` | Document the theme system |
| `dist/index.html` | Rebuilt via `node build.js` |

---

## Out of Scope

- Light themes
- Per-tab or per-panel theming
- Custom user-defined themes
- Animated transitions between themes
