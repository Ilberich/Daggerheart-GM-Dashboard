# GM Dashboard — Project Reference

> Single-page GM tool for running Daggerheart TTRPG sessions. Fully offline — no internet required.
> For pending work, see `GM_DASHBOARD_TODO.md`.

---

## File Layout

| File | Purpose |
|------|---------|
| `index.html` | HTML markup only — structure, tab bar, combat panel, modal |
| `styles.css` | All CSS — custom properties, layout, component styles |
| `app.js` | All JavaScript — tab system, combat tracker, session persistence |
| `vendor/marked-compat.js` | Local Markdown parser (drop-in for marked.js v9.1.6) |
| `build.js` | Node.js bundle script — produces `dist/index.html` |
| `dist/index.html` | **Self-contained mobile bundle** — all CSS+JS inlined, no external files needed |
| `GM_DASHBOARD_TODO.md` | Ordered task list with status |

---

## Build System

The dashboard must be bundled for reliable mobile use. When opened via `file://`, cloud sync,
AirDrop, or a bare HTTP server, relative asset paths can silently fail — leaving a white page
with no styles. The bundle eliminates this by inlining everything into one HTML file.

**Run the build:**
```
node build.js
```
Output: `dist/index.html` — single self-contained file, no external dependencies.

**When to rebuild:** any time you edit `styles.css`, `app.js`, or `vendor/marked-compat.js`.
`index.html` changes are picked up automatically by the build script.

**For mobile:** share or open `dist/index.html` — not `index.html`.

---

## Grep Anchor Map

Every major section in the bundle carries a `§ANCHOR_NAME` comment.
Use these to jump directly to any section in `dist/index.html`:

```
grep -n '§ROOT_VARS'      dist/index.html   # CSS: :root custom properties
grep -n '§TAB_BAR'        dist/index.html   # CSS: #tabbar, .tab, #tab-upload
grep -n '§TAB_PANELS'     dist/index.html   # CSS: .tab-panel
grep -n '§DROP_OVERLAY'   dist/index.html   # CSS: #drop-overlay
grep -n '§MARKDOWN'       dist/index.html   # CSS + JS: markdown viewer & file upload
grep -n '§COMBAT'         dist/index.html   # CSS: #sidebar, #combat-main, .combat-card, .dot
grep -n '§TYPE_COLORS'    dist/index.html   # CSS: .tc-solo … .tc-social
grep -n '§MODAL'          dist/index.html   # CSS: #custom-modal-bg, .cm-*
grep -n '§HINT'           dist/index.html   # CSS: .md-welcome, .hint-grid
grep -n '§MOBILE_768'     dist/index.html   # CSS: @media(max-width:768px)
grep -n '§MOBILE_480'     dist/index.html   # CSS: @media(max-width:480px)
grep -n '§VENDOR_MARKED'  dist/index.html   # JS: inlined marked-compat.js parser
grep -n '§APP_JS'         dist/index.html   # JS: start of inlined app.js
grep -n '§TAB_SYSTEM'     dist/index.html   # JS: switchTab, addTab, closeTab
grep -n '§COMBAT_DATA'    dist/index.html   # JS: COSTS, TYPE_ORDER, ICONS, ADV[]
grep -n '§COMBAT_STATE'   dist/index.html   # JS: global state variables
grep -n '§BP_SIDEBAR'     dist/index.html   # JS: updateBP, syncBP, toggleSidebar
grep -n '§ENCOUNTER_QUEUE' dist/index.html  # JS: addToQueue, removeFromCart, renderStage
grep -n '§COMBAT_FLOW'    dist/index.html   # JS: beginBattle, mkCombatant, resetBattle
grep -n '§COMBAT_RENDER'  dist/index.html   # JS: renderCombat, combatCard, toggleDot
grep -n '§CUSTOM_ADV'     dist/index.html   # JS: custom adversary modal & persistence
grep -n '§SESSION'        dist/index.html   # JS: saveSession, loadSession
grep -n '§ADV_LIST'       dist/index.html   # JS: renderList (Arsenal sidebar)
grep -n '§INIT'           dist/index.html   # JS: init(), loadCustomAdv(), startup
```

The same anchors exist in the source files (`styles.css`, `app.js`) for editing:
```
grep -n '§BP_SIDEBAR' app.js
grep -n '§MOBILE_768' styles.css
```

---

## CSS Architecture (`styles.css`)

### CSS Custom Properties (top of file, `:root`)
Theme tokens used everywhere: `--bg`, `--surface`, `--surface2`, `--surface3`, `--border`, `--border2`, `--text`, `--text-dim`, `--text-muted`, `--hope`, `--fear`, `--gold`, `--green`, `--hp-color`, `--stress-color`, `--sidebar-w`, `--tabbar-h`.

### Sections (in order)
| Section | Selectors |
|---------|-----------|
| Tab bar | `#tabbar`, `.tab`, `.tab-close`, `#tab-upload`, `#gm-badge` |
| Tab panels | `.tab-panel` |
| Drop overlay | `#drop-overlay` |
| Markdown viewer | `.md-panel`, `.md-content`, heading/list/code/table styles, `.wiki-link` |
| Combat tracker | `#sidebar`, `.bp-panel`, `.filter-row`, `.adv-card`, `.adv-abilities`, `#combat-main`, `.combat-card`, `.dot` |
| Type colour badges | `.tc-solo` … `.tc-social` |
| Custom adversary modal | `#custom-modal-bg`, `#custom-modal`, `.cm-*`, `.feat-row` |
| Welcome hint | `.md-welcome`, `.hint-grid` |

---

## HTML Structure (`index.html`)

```
<body>
  #drop-overlay               ← drag-and-drop .md files overlay
  #tabbar
    .tab[data-tab="combat"]   ← permanent Combat Tracker tab
    #dynamic-tabs             ← lore tab buttons injected here
    #tab-upload               ← "Add Lore Tab" file input label
    #gm-badge                 ← "THE MOTHER TREE / GM INTERFACE" badge
  #panel-combat.tab-panel
    #combat-tab-panel
      #sidebar                ← Arsenal sidebar (collapsible)
        .bp-panel             ← player count + battle-point budget
        .filter-row           ← adversary type filter buttons
        .create-custom-btn    ← opens custom adversary modal
        #adv-list             ← adversary cards (rendered by renderList)
      #combat-main
        #topbar               ← title + round badge + Begin/Reset buttons
        #combat-area
          #empty-state        ← shown when no encounter
          #encounter-grid     ← combat/queue cards (rendered by renderCombat/renderStage)
        #status-bar           ← active/defeated counts
  #dynamic-panels             ← lore tab panels injected here
  #custom-modal-bg            ← custom adversary create/edit modal
```

---

## JavaScript Feature Map (`app.js`)

### Tab System — lines 1–41
| Function | What it does |
|----------|-------------|
| `switchTab(id)` | Activates a tab by `data-tab` id; saves session |
| `addTab(title, html, icon, rawMd)` | Creates tab button + panel, stores raw markdown in `tabRawMd`, returns `id` |
| `closeTab(id, e)` | Removes tab button + panel, cleans up `tabRawMd`, saves session |

### File Upload / Markdown — lines 43–95
| Function | What it does |
|----------|-------------|
| `handleFileUpload(files)` | Reads each `.md` file with FileReader → `openMdFile` |
| `openMdFile(filename, raw)` | Picks icon by filename keywords, calls `addTab`, saves session |
| `renderMd(raw, title)` | Strips YAML frontmatter, converts `[[wiki links]]`, runs `marked.parse`, prepends `<h1>` if missing |

Drag-and-drop is wired to `document` `dragover`/`dragleave`/`drop` events (lines ~87–95).

### Combat Tracker Data — lines 98–159
- `COSTS{}` — BP cost per adversary type
- `TYPE_ORDER[]` — display order of types
- `ICONS{}` — emoji per type
- `ADV[]` — built-in adversary array (~55 adversaries); each has the adversary data shape (see below)

### Combat State Globals — lines 161–170
```js
let sidebarOpen, battleStarted, round
let playerCount, bpTotal, bpSpent
let cart[]          // queued adversaries before battle starts
let combatants[]    // active combatants during battle
let filterType, iid // iid = incrementing instance ID counter
let expanded        // Set of adversary IDs with open ability panels
var tabRawMd{}      // tab-id → raw markdown (for session restore)
var _restoring      // true during loadSession() to block saveSession()
var SESSION_KEY     // 'motherTree_session'
```

### BP / Sidebar — lines 172–201
| Function | What it does |
|----------|-------------|
| `toggleSidebar()` / `openSidebar()` | Collapse/expand the Arsenal sidebar |
| `updateBP()` | Reads player count from DOM → recalculates `bpTotal`; saves session |
| `syncBP()` | Recalculates `bpSpent` from cart or combatants; updates all BP display elements |
| `buildFilters()` / `setFilter(t)` | Renders type filter pill buttons |

### Encounter Queue (pre-battle) — lines 206–248
| Function | What it does |
|----------|-------------|
| `addToQueue(id)` | Adds adversary from Arsenal to `cart`; saves session |
| `removeFromCart(_iid)` | Removes by instance ID from `cart`; saves session |
| `renderStage()` | Renders dashed queue cards in `#encounter-grid` when not in battle |

### Combat Flow — lines 219–241
| Function | What it does |
|----------|-------------|
| `beginBattle()` | Converts `cart` → `combatants` via `mkCombatant`; shows Round badge; saves session |
| `mkCombatant(a)` | Spreads adversary data, adds `_iid`, initialises `hp_m[]`, `st_m[]`, `defeated=false` |
| `addCombatant(a)` | Adds adversary mid-battle; saves session |
| `resetBattle()` | Clears all state after confirm; saves session |
| `advanceRound()` | Increments `round`, updates badge; saves session |

### Combat Rendering — lines 243–276
| Function | What it does |
|----------|-------------|
| `renderCombat()` | Renders all combatant cards in `#encounter-grid` |
| `combatCard(c)` | Returns HTML string for one combatant card (HP dots, stress dots, defeated state) |
| `toggleDot(kind, _iid, idx)` | Flips one HP or Stress dot; marks defeated if all HP filled; saves session |
| `removeCombatant(_iid)` | Removes a combatant mid-battle; saves session |
| `statusBar()` | Updates active/defeated counts in `#status-bar` |

### Custom Adversary System — lines 278–411
| Function | What it does |
|----------|-------------|
| `loadCustomAdv()` | Loads `motherTree_customAdv` from localStorage, merges into `ADV[]` |
| `saveCustomAdvStorage()` | Writes `customAdv[]` to `motherTree_customAdv` |
| `openCustomModal(editId?)` | Opens the create/edit modal; if `editId` provided, populates form fields |
| `closeCustomModal()` / `clearModal()` | Closes and resets the modal |
| `addFeatRow(feat?)` | Adds an ability row to the modal feat list |
| `saveCustomAdv()` | Validates form, builds adversary object, pushes to `ADV[]` and `customAdv[]`, persists |
| `deleteCustomAdv(id, e)` | Removes adversary from `ADV[]` and `customAdv[]`, persists |

### Adversary List Render — lines 486–555
`renderList()` — Renders the full Arsenal sidebar list. Uses event delegation on `document` for clicks:
- `[data-addid]` → `addToQueue()`
- `[data-expandid]` → `toggleAbilitiesById()`
- `[data-editid]` → `openCustomModal()`
- `[data-delid]` → `deleteCustomAdv()`
- `[data-rowid]` → removes a feat row from the modal

### Session Persistence — lines 412–484
| Function | What it does |
|----------|-------------|
| `saveSession()` | Serialises full session state to `motherTree_session`. Returns early if `_restoring=true` |
| `loadSession()` | Reads `motherTree_session`, restores player count, iid, cart/combatants, and lore tabs. Sets `_restoring=true` during execution |

**What is persisted:** `playerCount`, `round`, `battleStarted`, `iid`, `cart[]`, `combatants[]` (with `hp_m`/`st_m`/`defeated`), `activeTabIdx`, `tabs[]` (title, icon, rawMd).

### Init — lines ~3255+
```js
loadCustomAdv();        // merge persisted custom adversaries into ADV[]
restoreTheme().catch(function(){});  // fire-and-forget theme restore before first render
(function init() {
  loadSession();        // restore session state
  updateBP();           // recalculate BP from restored playerCount
  buildFilters();       // render type filter buttons
  renderList();         // render Arsenal sidebar
  if (battleStarted) { renderCombat(); } else { renderStage(); }
  statusBar();
})();
```

---

## Data Shapes

### Adversary object (in `ADV[]` and `cart[]`)
```js
{
  id: 'cave-ogre',       // kebab-case string, unique
  name: 'Cave Ogre',
  type: 'solo',          // see TYPE_ORDER for valid values
  dc: 13, hp: 8, st: 3,
  maj: 8,                // major damage threshold (null for minions)
  sev: 15,               // severe damage threshold (null if none)
  atk: '+1',
  wpn: 'Club · Very Close',
  dmg: '1d10+2 phy',
  motives: 'Bite off heads, feast',
  feats: [{ k: 'passive'|'action'|'reaction'|'fear', n: 'Name', d: 'Description' }],
  _custom: true          // only on custom adversaries
}
```

### Combatant object (in `combatants[]`)
Adversary object (above) plus:
```js
{
  _iid: 3,               // unique instance ID (auto-incremented from global iid)
  hp_m: [false, false, true, ...],  // length = hp; true = marked
  st_m: [false, true, ...],          // length = st; true = marked
  defeated: false        // true when all hp_m are true
}
```

---

## localStorage Keys

| Key | Contents |
|-----|---------|
| `motherTree_customAdv` | `customAdv[]` — custom adversary definitions |
| `motherTree_session` | Full session snapshot (see Session Persistence above) |

---

## How to Add / Modify Features

**Add a new field to combat cards:** Update `combatCard()` (line 255) for display. If it needs to persist, add it to `mkCombatant()` (line 230) and ensure `loadSession()` handles it via `Object.assign`.

**Add a new persistent field:** Add it to the `state` object in `saveSession()` and read it back in `loadSession()`. Call `saveSession()` wherever the field changes.

**Add a sidebar control:** Add HTML inside `#sidebar-inner` in `index.html`. Wire to a function in `app.js` that calls `updateBP()` or `syncBP()` + `saveSession()` as needed.

**Add a new adversary type:** Add to `COSTS{}`, `TYPE_ORDER[]`, `ICONS[]`, and add a `.tc-<type>` CSS rule in `styles.css`.

**Add a lore tab programmatically:** Call `addTab(title, htmlString, icon, rawMarkdown)`. The raw markdown is required for session persistence.
