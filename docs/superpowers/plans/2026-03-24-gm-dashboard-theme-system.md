# Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 9 selectable dark themes to the GM Dashboard via a dropdown in the Settings modal, applied instantly and persisted to IndexedDB.

**Architecture:** A `THEMES` const in `app.js` maps theme names to CSS variable sets. `applyTheme()` writes vars directly to `document.documentElement.style`. `restoreTheme()` reads from IndexedDB and is called fire-and-forget before the synchronous `init()` IIFE so the correct theme is in place before first render.

**Tech Stack:** Vanilla JS, CSS custom properties, IndexedDB (via existing `db_setting()` helper). No build framework — this is a plain HTML/CSS/JS app. After all source edits, run `node build.js` to produce `dist/index.html`.

---

## Spec

`docs/superpowers/specs/2026-03-24-gm-dashboard-theme-system-design.md`

---

## File Map

| File | Change |
|------|--------|
| `app.js` | Add `§THEMES` section before `§COMBAT_DATA` (line 388): `currentTheme` var, `THEMES` object, `applyTheme()`, `restoreTheme()`; add `restoreTheme().catch()` before `init()` IIFE (line 3133); update `openSettingsModal()` (line 771) |
| `index.html` | Add theme `<select>` inside `#settings-modal` `.sm-body`, above existing `.sm-desc` |
| `styles.css` | Add three rules after `§SETTINGS_MODAL` block (after line 694): `.sm-theme-row`, `.sm-theme-label`, `.sm-select` |
| `README.md` | Add Themes section to Features list |
| `dist/index.html` | Rebuilt via `node build.js` — do not edit directly |

---

## Task 1: Add §THEMES section to app.js

**Files:**
- Modify: `app.js:387` — insert before the `§COMBAT_DATA` line

The `§THEMES` block goes between the drag-and-drop event listener (ends at line 386) and the `§COMBAT_DATA` comment (line 388). Insert the entire block at line 387 (before `// §COMBAT_DATA`).

- [ ] **Step 1: Insert the §THEMES block**

Find the line `// §COMBAT_DATA ═══...` in `app.js` (currently line 388). Insert the following immediately before it:

```js
// §THEMES ═══════════════════════════════════════════════════════════════
// THEME SYSTEM
// ═══════════════════════════════════════════════════════════════════════
var currentTheme='Mother Tree';

const THEMES={
  'Mother Tree':{
    '--bg':'#0e0c0a','--surface':'#15120e','--surface2':'#1e1a13','--surface3':'#272019',
    '--border':'#38301f','--border2':'#4e4028',
    '--text':'#e8e0d0','--text-dim':'#c4b89a','--text-muted':'#7a6a54',
    '--hope':'#6366f1','--hope-dim':'#4a4db8','--hope-glow':'rgba(99,102,241,.32)',
    '--fear':'#c8403a','--fear-dim':'#8a2820','--fear-glow':'rgba(200,64,58,.32)',
    '--gold':'#d4a843','--gold-dim':'#8a6a1e',
    '--green':'#5a9e72','--green-dim':'#2e5e3e',
    '--hp-color':'#c8403a','--stress-color':'#6366f1',
    '--ink-line':'rgba(212,168,67,.18)'
  },
  'Void Court':{
    '--bg':'#080c12','--surface':'#0d1220','--surface2':'#131b2e','--surface3':'#1a2438',
    '--border':'#1e2e48','--border2':'#2a3e5e',
    '--text':'#d8e4f0','--text-dim':'#9ab0c8','--text-muted':'#4a6080',
    '--hope':'#6366f1','--hope-dim':'#4a4db8','--hope-glow':'rgba(99,102,241,.32)',
    '--fear':'#c8403a','--fear-dim':'#8a2820','--fear-glow':'rgba(200,64,58,.32)',
    '--gold':'#a8c8e8','--gold-dim':'#5a88b0',
    '--green':'#4a90b8','--green-dim':'#2a5878',
    '--hp-color':'#c8403a','--stress-color':'#6366f1',
    '--ink-line':'rgba(168,200,232,.14)'
  },
  'Ember Keep':{
    '--bg':'#120a06','--surface':'#1e1008','--surface2':'#2a1810','--surface3':'#342018',
    '--border':'#4a2818','--border2':'#603420',
    '--text':'#f0dcc8','--text-dim':'#c8a888','--text-muted':'#786040',
    '--hope':'#6366f1','--hope-dim':'#4a4db8','--hope-glow':'rgba(99,102,241,.32)',
    '--fear':'#c8403a','--fear-dim':'#8a2820','--fear-glow':'rgba(200,64,58,.32)',
    '--gold':'#d4682a','--gold-dim':'#8a3e10',
    '--green':'#7a5a30','--green-dim':'#503a18',
    '--hp-color':'#c8403a','--stress-color':'#6366f1',
    '--ink-line':'rgba(212,104,42,.18)'
  },
  'Sunken Archive':{
    '--bg':'#060f10','--surface':'#0a1820','--surface2':'#102028','--surface3':'#182c34',
    '--border':'#1e3840','--border2':'#284a54',
    '--text':'#c8f0ec','--text-dim':'#7ab8b0','--text-muted':'#3a6860',
    '--hope':'#6366f1','--hope-dim':'#4a4db8','--hope-glow':'rgba(99,102,241,.32)',
    '--fear':'#c8403a','--fear-dim':'#8a2820','--fear-glow':'rgba(200,64,58,.32)',
    '--gold':'#2dd4c8','--gold-dim':'#128a80',
    '--green':'#2a9890','--green-dim':'#106860',
    '--hp-color':'#c8403a','--stress-color':'#6366f1',
    '--ink-line':'rgba(45,212,200,.12)'
  },
  'Iron Reliquary':{
    '--bg':'#0a0c10','--surface':'#10141c','--surface2':'#181c28','--surface3':'#1e2430',
    '--border':'#282e3e','--border2':'#343c50',
    '--text':'#d8dce8','--text-dim':'#9098b0','--text-muted':'#4a5068',
    '--hope':'#6366f1','--hope-dim':'#4a4db8','--hope-glow':'rgba(99,102,241,.32)',
    '--fear':'#c8403a','--fear-dim':'#8a2820','--fear-glow':'rgba(200,64,58,.32)',
    '--gold':'#7a9ab8','--gold-dim':'#485a70',
    '--green':'#5a7898','--green-dim':'#384858',
    '--hp-color':'#c8403a','--stress-color':'#6366f1',
    '--ink-line':'rgba(122,154,184,.15)'
  },
  'Crimson Pact':{
    '--bg':'#0e060e','--surface':'#180a18','--surface2':'#220e22','--surface3':'#2c142c',
    '--border':'#401840','--border2':'#542054',
    '--text':'#f0d0e8','--text-dim':'#c088b0','--text-muted':'#784068',
    '--hope':'#6366f1','--hope-dim':'#4a4db8','--hope-glow':'rgba(99,102,241,.32)',
    '--fear':'#c8403a','--fear-dim':'#8a2820','--fear-glow':'rgba(200,64,58,.32)',
    '--gold':'#d44878','--gold-dim':'#8a2448',
    '--green':'#a03870','--green-dim':'#681848',
    '--hp-color':'#c8403a','--stress-color':'#6366f1',
    '--ink-line':'rgba(212,72,120,.18)'
  },
  'Verdant Spire':{
    '--bg':'#060e08','--surface':'#0a1810','--surface2':'#102018','--surface3':'#162a20',
    '--border':'#1e3828','--border2':'#284a34',
    '--text':'#c8f0d0','--text-dim':'#80b890','--text-muted':'#386848',
    '--hope':'#6366f1','--hope-dim':'#4a4db8','--hope-glow':'rgba(99,102,241,.32)',
    '--fear':'#c8403a','--fear-dim':'#8a2820','--fear-glow':'rgba(200,64,58,.32)',
    '--gold':'#4ab870','--gold-dim':'#1e7840',
    '--green':'#3a9858','--green-dim':'#186038',
    '--hp-color':'#c8403a','--stress-color':'#6366f1',
    '--ink-line':'rgba(74,184,112,.14)'
  },
  'Starfall':{
    '--bg':'#060810','--surface':'#0a0e1c','--surface2':'#101628','--surface3':'#181e32',
    '--border':'#202840','--border2':'#2c3650',
    '--text':'#f0e8c8','--text-dim':'#b8a880','--text-muted':'#5a5030',
    '--hope':'#6366f1','--hope-dim':'#4a4db8','--hope-glow':'rgba(99,102,241,.32)',
    '--fear':'#c8403a','--fear-dim':'#8a2820','--fear-glow':'rgba(200,64,58,.32)',
    '--gold':'#d4b848','--gold-dim':'#887820',
    '--green':'#a08840','--green-dim':'#685818',
    '--hp-color':'#c8403a','--stress-color':'#6366f1',
    '--ink-line':'rgba(212,184,72,.16)'
  },
  'Ashwood':{
    '--bg':'#0c0e0c','--surface':'#141614','--surface2':'#1c1e1c','--surface3':'#242624',
    '--border':'#303430','--border2':'#3e423e',
    '--text':'#dce8dc','--text-dim':'#a0b4a0','--text-muted':'#607060',
    '--hope':'#6366f1','--hope-dim':'#4a4db8','--hope-glow':'rgba(99,102,241,.32)',
    '--fear':'#c8403a','--fear-dim':'#8a2820','--fear-glow':'rgba(200,64,58,.32)',
    '--gold':'#8ab898','--gold-dim':'#4a7858',
    '--green':'#6a9878','--green-dim':'#3a6048',
    '--hp-color':'#c8403a','--stress-color':'#6366f1',
    '--ink-line':'rgba(138,184,152,.14)'
  }
};

function applyTheme(name){
  currentTheme=name||'Mother Tree';
  var t=THEMES[currentTheme]||THEMES['Mother Tree'];
  var root=document.documentElement.style;
  Object.entries(t).forEach(function(e){root.setProperty(e[0],e[1]);});
}

function restoreTheme(){
  return db_setting('theme').then(function(name){
    applyTheme(name||'Mother Tree');
  });
}

```

- [ ] **Step 2: Verify the block was inserted correctly**

Open `app.js` and confirm:
- `var currentTheme` appears before `const THEMES`
- `THEMES` has exactly 9 keys: `Mother Tree`, `Void Court`, `Ember Keep`, `Sunken Archive`, `Iron Reliquary`, `Crimson Pact`, `Verdant Spire`, `Starfall`, `Ashwood`
- Each theme object has exactly 22 keys (all vars listed in spec — `--sidebar-w` and `--tabbar-h` are NOT included)
- `applyTheme` and `restoreTheme` are defined after the `THEMES` const
- The `§COMBAT_DATA` comment still follows immediately after

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add §THEMES data and applyTheme/restoreTheme functions"
```

---

## Task 2: Wire up init() and openSettingsModal()

**Files:**
- Modify: `app.js:771` — replace `openSettingsModal` function
- Modify: `app.js:3133` — add `restoreTheme()` call before `init()` IIFE

- [ ] **Step 1: Update openSettingsModal()**

Find line 771 (in the `§EXPORT_IMPORT` section):

```js
function openSettingsModal(){document.getElementById('settings-modal-bg').classList.add('open');}
```

Replace it with:

```js
function openSettingsModal(){
  var sel=document.getElementById('theme-select');
  if(sel)sel.value=currentTheme;
  document.getElementById('settings-modal-bg').classList.add('open');
}
```

- [ ] **Step 2: Add restoreTheme() before init() IIFE**

Find the `§INIT` section (around line 3131). It currently reads:

```js
// §INIT
// ── Init ──────────────────────────────────────────────────
loadCustomAdv();
(function init(){
```

Change it to:

```js
// §INIT
// ── Init ──────────────────────────────────────────────────
loadCustomAdv();
restoreTheme().catch(function(){});
(function init(){
```

- [ ] **Step 3: Verify**

Open `app.js` and confirm:
- `openSettingsModal` now has the null-check `if(sel)sel.value=currentTheme` before `classList.add('open')`
- `restoreTheme().catch(function(){})` appears on its own line between `loadCustomAdv()` and the `(function init(){` IIFE
- `closeSettingsModal` is unchanged

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: wire restoreTheme() into startup and sync select in openSettingsModal"
```

---

## Task 3: Add theme select to index.html and CSS to styles.css

**Files:**
- Modify: `index.html:148` — add theme row inside `.sm-body`, before `.sm-desc`
- Modify: `styles.css:694` — add three rules after the `§SETTINGS_MODAL` block

- [ ] **Step 1: Add theme select to index.html**

Find the settings modal body in `index.html` (around line 148):

```html
    <div class="sm-body">
      <p class="sm-desc">Export your data as a JSON backup or restore from a previous export. Import overwrites all current data.</p>
```

Insert the theme row immediately after `<div class="sm-body">`, before the `<p class="sm-desc">`:

```html
    <div class="sm-body">
      <div class="sm-theme-row">
        <label class="sm-theme-label" for="theme-select">Theme</label>
        <select id="theme-select" class="sm-select" onchange="applyTheme(this.value);db_setting('theme',this.value).catch(function(){})">
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
      <p class="sm-desc">Export your data as a JSON backup or restore from a previous export. Import overwrites all current data.</p>
```

- [ ] **Step 2: Add CSS rules to styles.css**

Find the end of the `§SETTINGS_MODAL` block in `styles.css` (after line 694, which ends with `.sm-status{...}`). Append these rules immediately after:

```css
.sm-theme-row{display:flex;align-items:center;gap:12px;margin-bottom:16px;}
.sm-theme-label{font-size:12px;color:var(--text-dim);white-space:nowrap;}
.sm-select{background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:5px 10px;font-size:13px;cursor:pointer;}
```

- [ ] **Step 3: Manual verification — open index.html in browser**

Open `index.html` directly in a browser (Chrome or Firefox). Click the ⚙ settings button.

Expected:
- A "Theme" label appears above the Export/Import section
- A dropdown with all 9 theme names is visible
- Selecting a theme immediately changes the app's color scheme
- Closing and reopening the settings modal shows the currently active theme selected

Also verify on two themes as a quick smoke test:
- Select **Void Court** → background should turn blue-black, gold text/accents should turn ice blue
- Select **Verdant Spire** → background should turn forest black-green, accents should turn leaf green
- Select **Mother Tree** → app returns to original warm amber-on-dark look

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: add theme select to settings modal and CSS rules"
```

---

## Task 4: Rebuild dist, update README, update TODO

**Files:**
- Modify: `README.md` — add Themes section to Features list
- Run: `node build.js` — rebuild `dist/index.html`
- Modify: `GM_DASHBOARD_TODO.md` — mark Theme System tasks complete, move to Completed section

- [ ] **Step 1: Update README.md**

Add a new `### Themes` section to the Features list in `README.md`, after the `### Data Persistence & Backup` section:

```markdown
### Themes
- **9 dark themes** — all designed for GM-screen use; switch instantly via the ⚙ Settings modal
- **Persists across sessions** — your chosen theme is restored on every load
- Themes: Mother Tree *(default)*, Void Court, Ember Keep, Sunken Archive, Iron Reliquary, Crimson Pact, Verdant Spire, Starfall, Ashwood
```

- [ ] **Step 2: Rebuild dist**

```bash
node build.js
```

Expected output:
```
✓ Built dist/index.html (... KB)
```

- [ ] **Step 3: Verify dist in browser**

Open `dist/index.html` in a browser. Repeat the smoke test from Task 3 Step 3:
- Open ⚙ Settings — Theme dropdown is present
- Switch themes — live update works
- Close and reopen browser tab — selected theme is restored (persisted in IndexedDB)

- [ ] **Step 4: Mark Theme System tasks complete in GM_DASHBOARD_TODO.md**

In `GM_DASHBOARD_TODO.md`, find the `### 🔲 4. Theme System — GM Dashboard Edition` section. Change its heading to `### ✅ 4. Theme System — GM Dashboard Edition` and mark all checkboxes `[x]`. Move the entire section to the `## Completed` section at the bottom of the file.

- [ ] **Step 5: Final commit**

```bash
git add dist/index.html README.md GM_DASHBOARD_TODO.md
git commit -m "feat: theme system complete — 9 themes, settings modal picker, dist rebuilt"
```
