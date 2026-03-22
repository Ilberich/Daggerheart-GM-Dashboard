# GM Dashboard — Storage Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage with IndexedDB for all persistence; add Export/Import JSON backup; add Saved Encounters with `[[encounter:Name]]` lore-link loading.

**Architecture:** A thin async `db_*` helper layer wraps IndexedDB. All existing `saveSession`, `loadSession`, `loadCustomAdv`, and `saveCustomAdvStorage` functions are updated to use this layer. `init()` becomes async to await `loadSession`. A settings gear button opens an Export/Import modal. Saved Encounters live in the `saved_encounters` IndexedDB store and are managed from the combat area.

**Tech Stack:** Vanilla JS (no modules, ES5-compatible), IndexedDB (browser native), existing `build.js` bundler

**Spec reference:** `docs/superpowers/specs/2026-03-21-gm-dashboard-toolkit-panel-design.md` — sections "Storage: IndexedDB Migration", "Export / Import", "Saved Encounters & Lore Tab Links"

---

## File Map

| File | Changes |
|------|---------|
| `app.js` | Add `§DB` (wrapper), `§DB_MIGRATE`, update `§CUSTOM_ADV`, update `§SESSION`, update `§INIT`; add `§SAVED_ENCOUNTERS` |
| `styles.css` | Add toast styles, settings modal styles, saved-encounters section styles |
| `index.html` | Add settings gear button in `#tabbar`, settings modal, save-encounter button + name prompt in combat area, saved-encounters collapsible section |

`build.js`, `sw.js`, `manifest.json` — no changes.

---

## Task 1: IndexedDB Wrapper + Toast Helper

**Files:**
- Modify: `app.js` — insert new `§DB` section before `§CUSTOM_ADV` (line ~522)
- Modify: `styles.css` — add toast styles after `§HINT` section (line ~570)

- [ ] **Step 1: Add toast CSS** — append after the `§HINT` block in `styles.css`:

```css
/* §TOAST */
#toast-msg{
  position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);
  background:var(--surface2);border:1px solid var(--border2);color:var(--text);
  font-family:'Crimson Pro',serif;font-size:15px;padding:10px 20px;border-radius:8px;
  box-shadow:0 4px 20px rgba(0,0,0,.5);opacity:0;pointer-events:none;
  transition:opacity .25s,transform .25s;z-index:2000;white-space:nowrap;
}
#toast-msg.show{opacity:1;transform:translateX(-50%) translateY(0);}
```

- [ ] **Step 2: Add `§DB` section to `app.js`** — insert immediately before the `// §CUSTOM_ADV` comment block:

```js
// §DB ═══════════════════════════════════════════════════════════════
// INDEXEDDB WRAPPER
// ═══════════════════════════════════════════════════════════════════
var DB_NAME='MotherTreeDB',DB_VERSION=1,_db=null,_dbFailed=false;

function db_open(){
  return new Promise(function(res,rej){
    if(_db){res(_db);return;}
    if(typeof indexedDB==='undefined'){_dbFailed=true;rej(new Error('no idb'));return;}
    var req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=function(e){
      var db=e.target.result;
      ['combat_session','custom_adversaries','toolkit_notes',
       'generator_library','saved_encounters'].forEach(function(s){
        if(!db.objectStoreNames.contains(s))
          db.createObjectStore(s,s==='combat_session'?{keyPath:'key'}:{keyPath:'id'});
      });
      if(!db.objectStoreNames.contains('settings'))
        db.createObjectStore('settings',{keyPath:'k'});
    };
    req.onsuccess=function(e){_db=e.target.result;res(_db);};
    req.onerror=function(e){_dbFailed=true;rej(e.target.error);};
    req.onblocked=function(){rej(new Error('idb blocked'));};
  });
}
function db_put(store,val){
  return db_open().then(function(db){
    return new Promise(function(res,rej){
      var req=db.transaction(store,'readwrite').objectStore(store).put(val);
      req.onsuccess=function(){res(req.result);};
      req.onerror=function(){rej(req.error);};
    });
  });
}
function db_get(store,key){
  return db_open().then(function(db){
    return new Promise(function(res,rej){
      var req=db.transaction(store,'readonly').objectStore(store).get(key);
      req.onsuccess=function(){res(req.result);};
      req.onerror=function(){rej(req.error);};
    });
  });
}
function db_getAll(store){
  return db_open().then(function(db){
    return new Promise(function(res,rej){
      var req=db.transaction(store,'readonly').objectStore(store).getAll();
      req.onsuccess=function(){res(req.result);};
      req.onerror=function(){rej(req.error);};
    });
  });
}
function db_delete(store,key){
  return db_open().then(function(db){
    return new Promise(function(res,rej){
      var req=db.transaction(store,'readwrite').objectStore(store).delete(key);
      req.onsuccess=function(){res();};
      req.onerror=function(){rej(req.error);};
    });
  });
}
function db_clear(store){
  return db_open().then(function(db){
    return new Promise(function(res,rej){
      var req=db.transaction(store,'readwrite').objectStore(store).clear();
      req.onsuccess=function(){res();};
      req.onerror=function(){rej(req.error);};
    });
  });
}
function db_setting(key,value){
  if(value===undefined)
    return db_get('settings',key).then(function(r){return r?r.v:undefined;});
  return db_put('settings',{k:key,v:value});
}

function showToast(msg,duration){
  duration=duration||3000;
  var el=document.getElementById('toast-msg');
  if(!el){el=document.createElement('div');el.id='toast-msg';document.body.appendChild(el);}
  el.textContent=msg;el.classList.add('show');
  clearTimeout(el._t);el._t=setTimeout(function(){el.classList.remove('show');},duration);
}
```

- [ ] **Step 3: Verify in browser console** — open the app in a browser (serve via local HTTP or Chrome with file:// access), then run:

```js
db_open().then(function(db){
  console.log('stores:', Array.from(db.objectStoreNames));
}).catch(console.error);
// Expected: stores: ['combat_session','custom_adversaries','generator_library','saved_encounters','settings','toolkit_notes']
```

- [ ] **Step 4: Commit**

```bash
git add app.js styles.css
git commit -m "feat: add IndexedDB wrapper (db_* helpers) and toast utility"
```

---

## Task 2: localStorage → IndexedDB Migration

**Files:**
- Modify: `app.js` — add `§DB_MIGRATE` section immediately after `§DB`

- [ ] **Step 1: Add migration function** after the `§DB` block:

```js
// §DB_MIGRATE ═══════════════════════════════════════════════════════
// ONE-TIME MIGRATION: localStorage → IndexedDB
// ═══════════════════════════════════════════════════════════════════
function db_migrate(){
  return db_setting('data_migrated').then(function(done){
    if(done)return;
    var promises=[];
    var sessRaw=localStorage.getItem('motherTree_session');
    if(sessRaw){
      try{
        var sess=JSON.parse(sessRaw);
        promises.push(db_put('combat_session',Object.assign({key:'state'},sess)));
      }catch(e){}
    }
    var advRaw=localStorage.getItem('motherTree_customAdv');
    if(advRaw){
      try{
        JSON.parse(advRaw).forEach(function(a){
          if(!a.id)a.id='custom_'+Date.now()+'_'+Math.random().toString(36).substr(2,5);
          promises.push(db_put('custom_adversaries',a));
        });
      }catch(e){}
    }
    return Promise.all(promises)
      .then(function(){return db_setting('data_migrated',true);})
      .then(function(){
        if(sessRaw||advRaw)
          showToast('Your session data has been migrated to IndexedDB for safer storage.');
      });
  });
}
```

- [ ] **Step 2: Verify migration logic in console** — with existing localStorage data present, run:

```js
// Simulate a fresh migration check
db_setting('data_migrated').then(function(v){ console.log('migrated flag:', v); });
// Expected on first run: migrated flag: undefined
```

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add localStorage-to-IndexedDB one-time migration"
```

---

## Task 3: Custom Adversary Persistence via IndexedDB

**Files:**
- Modify: `app.js` — update `loadCustomAdv` and `saveCustomAdvStorage` in `§CUSTOM_ADV`

- [ ] **Step 1: Replace `loadCustomAdv`** (currently at ~line 529):

Old:
```js
function loadCustomAdv(){
  try{var s=localStorage.getItem(STORAGE_KEY);if(s)customAdv=JSON.parse(s);}catch(e){}
  customAdv.forEach(function(a){if(!ADV.find(function(x){return x.id===a.id;}))ADV.push(a);});
}
```

New (returns a Promise — callers must await it):
```js
function loadCustomAdv(){
  return db_getAll('custom_adversaries').then(function(items){
    customAdv=items||[];
    customAdv.forEach(function(a){if(!ADV.find(function(x){return x.id===a.id;}))ADV.push(a);});
  }).catch(function(){
    // Fallback to localStorage if IndexedDB unavailable
    try{var s=localStorage.getItem(STORAGE_KEY);if(s)customAdv=JSON.parse(s);}catch(e){}
    customAdv.forEach(function(a){if(!ADV.find(function(x){return x.id===a.id;}))ADV.push(a);});
  });
}
```

- [ ] **Step 2: Replace `saveCustomAdvStorage`** (currently at ~line 533):

Old:
```js
function saveCustomAdvStorage(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(customAdv));}catch(e){}
}
```

New (fire-and-forget — no await needed at call sites):
```js
function saveCustomAdvStorage(){
  // Write each custom adversary; remove any that were deleted
  var ids=customAdv.map(function(a){return a.id;});
  customAdv.forEach(function(a){db_put('custom_adversaries',a).catch(function(){});});
  // Sync deletes: get all stored, remove any not in current list
  db_getAll('custom_adversaries').then(function(stored){
    (stored||[]).forEach(function(a){
      if(!ids.includes(a.id))db_delete('custom_adversaries',a.id).catch(function(){});
    });
  }).catch(function(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(customAdv));}catch(e){}
  });
}
```

- [ ] **Step 3: Verify in browser** — create a custom adversary, reload the page, verify it appears in the Arsenal sidebar. Run in console:

```js
db_getAll('custom_adversaries').then(function(r){console.log('custom advs:', r);});
// Expected: array containing your custom adversary object
```

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: custom adversary persistence via IndexedDB"
```

---

## Task 4: Session Persistence via IndexedDB (Async Init)

**Files:**
- Modify: `app.js` — update `saveSession`, `loadSession`, and `init()` in `§SESSION` and `§INIT`

- [ ] **Step 1: Update `saveSession`** — replace the `localStorage.setItem` line at the end of `saveSession` (currently ~line 673):

Old:
```js
  try{localStorage.setItem(SESSION_KEY,JSON.stringify(state));}catch(e){}
```

New (fire-and-forget):
```js
  db_put('combat_session',Object.assign({key:'state'},state)).catch(function(){
    try{localStorage.setItem(SESSION_KEY,JSON.stringify(state));}catch(e){}
  });
```

- [ ] **Step 2: Update `loadSession` to be async** — replace the function signature and localStorage read at ~line 684:

Old:
```js
function loadSession(){
  _restoring=true;
  try{
    var raw=localStorage.getItem(SESSION_KEY);
    if(!raw){_restoring=false;return;}
```

New:
```js
function loadSession(){
  _restoring=true;
  return db_get('combat_session','state').then(function(record){
    var state=record?Object.assign({},record):null;
    // Fallback: try localStorage if IndexedDB had nothing
    if(!state){
      try{var raw=localStorage.getItem(SESSION_KEY);if(raw)state=JSON.parse(raw);}catch(e){}
    }
    if(!state){_restoring=false;return;}
```

  Also update the closing of `loadSession` — the existing `catch(e)` and `_restoring=false` at the end need to be inside the `.then()` callback. The full new shape is:

  > **Important:** Do not commit until the full function body is pasted in. The comment `// === paste the existing body...` is an instruction to copy-paste lines ~692–784 of `app.js` verbatim into that position. Leaving the comment placeholder in place will cause `loadSession` to silently do nothing on load.

```js
function loadSession(){
  _restoring=true;
  return db_get('combat_session','state').then(function(record){
    var state=record?Object.assign({},record):null;
    if(!state){
      try{var raw=localStorage.getItem(SESSION_KEY);if(raw)state=JSON.parse(raw);}catch(e){}
    }
    if(!state){_restoring=false;return;}
    try{
      // === paste the existing body of loadSession here (lines ~692–784) ===
      // Everything from "if(state.battles&&state.battles.length){" through
      // the final "renderAllTabs();" and active tab restore block.
      // No structural changes needed inside — only the outer wrapper changes.
    }catch(e){console.error('loadSession:',e);}
    _restoring=false;
  }).catch(function(e){
    console.error('loadSession db error:',e);
    _restoring=false;
  });
}
```

- [ ] **Step 3: Update `init()` to async** — replace the IIFE at `§INIT` (~line 865):

Old:
```js
loadCustomAdv();
(function init(){
  loadSession();
  if(battles.length===0){ ... }
  updateBP();buildFilters();renderList();
  ...
})();
```

New:
```js
(async function init(){
  await db_open().catch(function(e){
    showToast('IndexedDB unavailable — data will not persist this session.',5000);
  });
  await db_migrate().catch(function(){});
  await loadCustomAdv();
  await loadSession();
  if(battles.length===0){
    battleTabCounter=1;
    const b={id:'battle-1',name:'Battle 1',battleStarted:false,round:1,playerCount:4,cart:[],combatants:[],iid:0};
    battles.push(b);activeBattleId='battle-1';
    tabOrder=[{type:'battle',id:'battle-1'}];
    renderAllTabs();
  }
  updateBP();buildFilters();renderList();
  if(battleStarted){renderCombat();}else{renderStage();}
  statusBar();
  if(window.innerWidth<=768){
    sidebarOpen=false;
    document.getElementById('sidebar').classList.add('collapsed');
    document.getElementById('sidebar-toggle').textContent='☰';
  }
})();
```

- [ ] **Step 4: Verify in browser** — add adversaries, begin a battle, mark some HP, reload the page. State should restore from IndexedDB. Run:

```js
db_get('combat_session','state').then(function(r){console.log('session:', r);});
// Expected: full session state object with battles array
```

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: session persistence via IndexedDB, async init"
```

---

## Task 5: Export / Import JSON

**Spec reference:** "Export / Import" section in spec.

**Files:**
- Modify: `index.html` — add settings gear button in `#tabbar`, add `#settings-modal`
- Modify: `styles.css` — add `§SETTINGS_MODAL` styles
- Modify: `app.js` — add `§EXPORT_IMPORT` section

- [ ] **Step 1: Add gear button to `index.html`** — inside `#tabbar`, immediately before `#gm-badge`:

```html
<button id="settings-btn" onclick="openSettingsModal()" title="Export / Import data">⚙</button>
```

- [ ] **Step 2: Add settings modal to `index.html`** — before the closing `</body>`:

```html
<!-- SETTINGS / EXPORT-IMPORT MODAL -->
<div id="settings-modal-bg" onclick="if(event.target===this)closeSettingsModal()">
  <div id="settings-modal">
    <div class="sm-header">
      <span class="sm-title">⚙ Data Management</span>
      <button class="sm-close" onclick="closeSettingsModal()">✕</button>
    </div>
    <div class="sm-body">
      <p class="sm-desc">Export your data as a JSON backup or restore from a previous export. Import overwrites all current data.</p>
      <div class="sm-actions">
        <button class="sm-btn sm-btn-export" onclick="exportData()">⬇ Export JSON</button>
        <label class="sm-btn sm-btn-import">
          ⬆ Import JSON
          <input type="file" accept=".json" style="display:none" onchange="importData(this)">
        </label>
      </div>
      <div id="sm-status" class="sm-status"></div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add CSS** — append `§SETTINGS_MODAL` block to `styles.css`:

```css
/* §SETTINGS_MODAL */
#settings-btn{
  padding:0 12px;height:100%;background:transparent;border:none;
  border-left:1px solid var(--border);color:var(--text-muted);font-size:16px;
  cursor:pointer;transition:color .15s;flex-shrink:0;
}
#settings-btn:hover{color:var(--gold);}

#settings-modal-bg{
  display:none;position:fixed;inset:0;z-index:500;
  background:rgba(0,0,0,.6);align-items:center;justify-content:center;
}
#settings-modal-bg.open{display:flex;}
#settings-modal{
  background:var(--surface);border:1px solid var(--border2);border-radius:12px;
  width:min(440px,92vw);padding:0;overflow:hidden;
  box-shadow:0 8px 40px rgba(0,0,0,.7);
}
.sm-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px;border-bottom:1px solid var(--border);
}
.sm-title{font-family:'Cinzel',serif;font-size:15px;letter-spacing:.08em;color:var(--gold);}
.sm-close{background:transparent;border:none;color:var(--text-muted);font-size:16px;cursor:pointer;}
.sm-close:hover{color:var(--text);}
.sm-body{padding:20px;}
.sm-desc{font-size:14px;color:var(--text-muted);margin-bottom:20px;line-height:1.6;}
.sm-actions{display:flex;gap:12px;flex-wrap:wrap;}
.sm-btn{
  flex:1;padding:10px 16px;border-radius:8px;font-family:'Crimson Pro',serif;
  font-size:15px;font-weight:700;cursor:pointer;text-align:center;transition:all .15s;
  border:1px solid var(--border2);background:var(--surface2);color:var(--text);
}
.sm-btn:hover{border-color:var(--gold);color:var(--gold);}
.sm-btn-import{display:flex;align-items:center;justify-content:center;gap:6px;}
.sm-status{margin-top:14px;font-size:13px;color:var(--text-muted);min-height:20px;}
```

- [ ] **Step 4: Add `§EXPORT_IMPORT` to `app.js`** — after `§DB_MIGRATE`:

```js
// §EXPORT_IMPORT ═══════════════════════════════════════════════════
// EXPORT / IMPORT JSON BACKUP
// ═══════════════════════════════════════════════════════════════════
function openSettingsModal(){document.getElementById('settings-modal-bg').classList.add('open');}
function closeSettingsModal(){
  document.getElementById('settings-modal-bg').classList.remove('open');
  document.getElementById('sm-status').textContent='';
}

function exportData(){
  Promise.all([
    db_get('combat_session','state'),
    db_getAll('custom_adversaries'),
    db_getAll('toolkit_notes'),
    db_getAll('generator_library'),
    db_getAll('saved_encounters')
  ]).then(function(results){
    var payload={
      version:1,
      exported_at:new Date().toISOString(),
      combat_session:results[0]||null,
      custom_adversaries:results[1]||[],
      toolkit_notes:results[2]||[],
      generator_library:results[3]||[],
      saved_encounters:results[4]||[]
    };
    var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;
    a.download='mother-tree-backup-'+new Date().toISOString().slice(0,10)+'.json';
    a.click();
    URL.revokeObjectURL(url);
    document.getElementById('sm-status').textContent='Export complete.';
  }).catch(function(e){
    document.getElementById('sm-status').textContent='Export failed: '+e.message;
  });
}

function importData(input){
  var file=input.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    var payload;
    try{payload=JSON.parse(e.target.result);}catch(err){
      document.getElementById('sm-status').textContent='Invalid backup file — could not import.';
      input.value='';return;
    }
    // Validate
    if(payload.version!==1||
       !['combat_session','custom_adversaries','toolkit_notes','generator_library']
         .some(function(k){return k in payload;})){
      document.getElementById('sm-status').textContent='Invalid backup file — could not import.';
      input.value='';return;
    }
    if(!confirm('This will overwrite your current data. Your existing data will be replaced. Continue?')){
      input.value='';return;
    }
    var stores=['combat_session','custom_adversaries','toolkit_notes','generator_library','saved_encounters'];
    var clears=stores.map(function(s){return db_clear(s);});
    Promise.all(clears).then(function(){
      var writes=[];
      if(payload.combat_session)
        writes.push(db_put('combat_session',Object.assign({key:'state'},payload.combat_session)));
      (payload.custom_adversaries||[]).forEach(function(a){writes.push(db_put('custom_adversaries',a));});
      (payload.toolkit_notes||[]).forEach(function(n){writes.push(db_put('toolkit_notes',n));});
      (payload.generator_library||[]).forEach(function(g){writes.push(db_put('generator_library',g));});
      (payload.saved_encounters||[]).forEach(function(enc){writes.push(db_put('saved_encounters',enc));});
      return Promise.all(writes);
    }).then(function(){
      location.reload();
    }).catch(function(err){
      document.getElementById('sm-status').textContent='Import failed: '+err.message;
    });
  };
  reader.readAsText(file);
  input.value='';
}
```

- [ ] **Step 5: Verify** — open the settings modal, click Export. A `.json` file should download containing your current session data. Then import it back and verify the page reloads with data intact.

- [ ] **Step 6: Commit**

```bash
git add app.js styles.css index.html
git commit -m "feat: Export/Import JSON backup via settings modal"
```

---

## Task 6: Saved Encounters — Storage & Combat UI

**Spec reference:** "Saved Encounters & Lore Tab Links" section in spec.

**Files:**
- Modify: `index.html` — add save-encounter button near `#topbar`, add saved-encounters collapsible section
- Modify: `styles.css` — add `§SAVED_ENCOUNTERS` styles
- Modify: `app.js` — add `§SAVED_ENCOUNTERS` section

- [ ] **Step 1: Add save-encounter button to `index.html`** — inside `#topbar`, after the Reset button:

```html
<button class="topbar-btn btn-save-enc" id="btn-save-enc" onclick="openSaveEncounterPrompt()" style="display:none" title="Save this encounter for later">💾 Save Encounter</button>
```

- [ ] **Step 2: Add save-encounter name prompt** — add after the `#topbar` div (before `#combat-area`):

```html
<div id="save-enc-prompt" style="display:none">
  <div class="sep-row">
    <span class="sep-label">Save as:</span>
    <input class="sep-input" id="sep-name" placeholder="Encounter name…" maxlength="60">
    <button class="sep-btn sep-confirm" onclick="confirmSaveEncounter()">Save</button>
    <button class="sep-btn sep-cancel" onclick="closeSaveEncounterPrompt()">Cancel</button>
  </div>
  <div id="sep-link" class="sep-link-row" style="display:none">
    <span class="sep-link-label">Link:</span>
    <code class="sep-link-code" id="sep-link-code"></code>
    <button class="sep-copy-btn" onclick="copySepLink()">Copy</button>
  </div>
</div>
```

- [ ] **Step 3: Add saved-encounters collapsible section** — inside `#combat-main`, after `#status-bar`:

```html
<div id="saved-encounters-section" class="saved-enc-section">
  <button class="saved-enc-toggle" onclick="toggleSavedEncSection()">
    <span>📋 Saved Encounters</span><span id="saved-enc-chevron">▼</span>
  </button>
  <div id="saved-enc-list" style="display:none"></div>
</div>
```

- [ ] **Step 4: Add CSS** — append `§SAVED_ENCOUNTERS` to `styles.css`:

```css
/* §SAVED_ENCOUNTERS */
#btn-save-enc{background:transparent;border-color:var(--green-dim);color:var(--green);}
#btn-save-enc:hover{background:rgba(90,158,114,.12);border-color:var(--green);}

#save-enc-prompt{padding:8px 16px;background:var(--surface2);border-top:1px solid var(--border);}
.sep-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.sep-label{font-size:13px;color:var(--text-muted);white-space:nowrap;}
.sep-input{
  flex:1;min-width:120px;background:var(--surface3);border:1px solid var(--border2);
  color:var(--text);padding:5px 10px;border-radius:6px;font-size:14px;
}
.sep-btn{
  padding:5px 14px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;
  border:1px solid var(--border2);background:var(--surface3);color:var(--text-dim);
  transition:all .15s;
}
.sep-confirm{border-color:var(--green-dim);color:var(--green);}
.sep-confirm:hover{background:rgba(90,158,114,.15);}
.sep-cancel:hover{background:var(--surface2);}
.sep-link-row{display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap;}
.sep-link-label{font-size:12px;color:var(--text-muted);}
.sep-link-code{
  font-family:'JetBrains Mono',monospace;font-size:12px;
  background:var(--surface3);padding:3px 8px;border-radius:4px;color:var(--gold);
  border:1px solid var(--border);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;
}
.sep-copy-btn{
  padding:3px 10px;border-radius:4px;font-size:12px;cursor:pointer;
  border:1px solid var(--border2);background:transparent;color:var(--text-muted);
}
.sep-copy-btn:hover{color:var(--gold);border-color:var(--gold-dim);}

.saved-enc-section{border-top:1px solid var(--border);flex-shrink:0;}
.saved-enc-toggle{
  width:100%;padding:8px 16px;background:transparent;border:none;
  color:var(--text-muted);font-size:13px;cursor:pointer;display:flex;
  align-items:center;justify-content:space-between;transition:color .15s;
}
.saved-enc-toggle:hover{color:var(--text-dim);}
.saved-enc-row{
  display:flex;align-items:center;gap:8px;padding:6px 16px;
  border-top:1px solid var(--border);font-size:13px;flex-wrap:wrap;
}
.saved-enc-name{flex:1;color:var(--text-dim);font-weight:600;}
.saved-enc-meta{color:var(--text-muted);font-size:12px;}
.saved-enc-load,.saved-enc-del{
  padding:3px 10px;border-radius:5px;font-size:12px;cursor:pointer;
  border:1px solid var(--border2);background:transparent;
}
.saved-enc-load{color:var(--green);border-color:var(--green-dim);}
.saved-enc-load:hover{background:rgba(90,158,114,.12);}
.saved-enc-del{color:var(--fear);border-color:var(--fear-dim);}
.saved-enc-del:hover{background:rgba(200,64,58,.12);}
```

Also add `--green-hi` and `--arcane` / `--arcane-hi` variables to `:root` in `styles.css` (these are referenced by the Toolkit Panel plan):
```css
  --green-hi:#52b788;
  --arcane:#6e56a8;--arcane-hi:#a585e0;
```

- [ ] **Step 5: Add `§SAVED_ENCOUNTERS` to `app.js`** — after `§EXPORT_IMPORT`:

```js
// §SAVED_ENCOUNTERS ════════════════════════════════════════════════
// SAVED ENCOUNTERS — SAVE, LOAD, MANAGE
// ═══════════════════════════════════════════════════════════════════

// Show/hide Save button based on cart contents (call from renderStage)
function updateSaveEncBtn(){
  var btn=document.getElementById('btn-save-enc');
  if(btn)btn.style.display=(cart.length>0&&!battleStarted)?'':'none';
}

function openSaveEncounterPrompt(){
  var prompt=document.getElementById('save-enc-prompt');
  var linkRow=document.getElementById('sep-link');
  if(!prompt)return;
  document.getElementById('sep-name').value='Encounter '+(Date.now()%10000);
  linkRow.style.display='none';
  prompt.style.display='';
  document.getElementById('sep-name').select();
}
function closeSaveEncounterPrompt(){
  var prompt=document.getElementById('save-enc-prompt');
  if(prompt)prompt.style.display='none';
}

function confirmSaveEncounter(){
  var name=document.getElementById('sep-name').value.trim();
  if(!name)return;
  var enc={
    id:'encounter_'+Date.now(),
    name:name,
    adversaries:JSON.parse(JSON.stringify(cart)),
    savedAt:new Date().toISOString()
  };
  db_put('saved_encounters',enc).then(function(){
    var linkCode='[[encounter:'+name+']]';
    var codeEl=document.getElementById('sep-link-code');
    if(codeEl)codeEl.textContent=linkCode;
    document.getElementById('sep-link').style.display='';
    renderSavedEncounterList();
    showToast('"'+name+'" saved.');
  }).catch(function(e){showToast('Save failed: '+e.message);});
}

function copySepLink(){
  var code=document.getElementById('sep-link-code');
  if(!code)return;
  navigator.clipboard.writeText(code.textContent).then(function(){showToast('Link copied!');});
}

var _savedEncOpen=false;
function toggleSavedEncSection(){
  _savedEncOpen=!_savedEncOpen;
  var list=document.getElementById('saved-enc-list');
  var chev=document.getElementById('saved-enc-chevron');
  if(list)list.style.display=_savedEncOpen?'block':'none';
  if(chev)chev.textContent=_savedEncOpen?'▲':'▼';
  if(_savedEncOpen)renderSavedEncounterList();
}

function renderSavedEncounterList(){
  db_getAll('saved_encounters').then(function(encs){
    var list=document.getElementById('saved-enc-list');if(!list)return;
    if(!encs||!encs.length){list.innerHTML='<div style="padding:10px 16px;font-size:13px;color:var(--text-muted)">No saved encounters yet.</div>';return;}
    list.innerHTML=encs.map(function(enc){
      var date=enc.savedAt?enc.savedAt.slice(0,10):'';
      var count=(enc.adversaries||[]).length;
      return '<div class="saved-enc-row">'
        +'<span class="saved-enc-name">'+escH(enc.name)+'</span>'
        +'<span class="saved-enc-meta">'+count+' adv · '+date+'</span>'
        +'<button class="saved-enc-load" data-loadenc="'+escH(enc.id)+'">Load</button>'
        +'<button class="saved-enc-del" data-delenc="'+escH(enc.id)+'">Delete</button>'
        +'</div>';
    }).join('');
  }).catch(function(){});
}

function loadSavedEncounter(id){
  db_get('saved_encounters',id).then(function(enc){
    if(!enc){showToast('Encounter not found.');return;}
    _doLoadEncounter(enc);
  });
}

function _doLoadEncounter(enc){
  var hasContent=cart.length>0||combatants.length>0;
  if(!hasContent){
    _applyEncounter(enc,'replace');
    return;
  }
  // Show confirmation with three options
  var modal=document.createElement('div');
  modal.className='enc-load-modal-bg';
  modal.innerHTML='<div class="enc-load-modal">'
    +'<div class="elm-title">Load "'+escH(enc.name)+'"</div>'
    +'<div class="elm-body">There are already adversaries in this encounter.</div>'
    +'<div class="elm-actions">'
    +'<button class="elm-btn elm-replace">Replace</button>'
    +'<button class="elm-btn elm-add">Add to Battle</button>'
    +'<button class="elm-btn elm-cancel">Cancel</button>'
    +'</div></div>';
  document.body.appendChild(modal);
  modal.querySelector('.elm-replace').onclick=function(){modal.remove();_applyEncounter(enc,'replace');};
  modal.querySelector('.elm-add').onclick=function(){modal.remove();_applyEncounter(enc,'add');};
  modal.querySelector('.elm-cancel').onclick=function(){modal.remove();};
}

function _applyEncounter(enc,mode){
  if(mode==='replace'){
    battleStarted=false;round=1;cart=[];combatants=[];
    document.getElementById('btn-begin').style.display='';
    document.getElementById('btn-reset').style.display='none';
    document.getElementById('btn-add-more').style.display='none';
    document.getElementById('round-badge').style.display='none';
  }
  var advs=JSON.parse(JSON.stringify(enc.adversaries||[]));
  if(mode==='add'&&battleStarted){
    advs.forEach(function(a){addCombatant(a);});
  } else {
    advs.forEach(function(a){
      cart.push(Object.assign({},a,{_iid:++iid}));
    });
    syncBP();renderList();renderStage();statusBar();saveSession();
  }
  switchBattle(activeBattleId);
  showToast('"'+enc.name+'" loaded.');
  closeSaveEncounterPrompt();
}

function deleteSavedEncounter(id){
  db_get('saved_encounters',id).then(function(enc){
    if(!enc)return;
    if(!confirm('Delete "'+enc.name+'"?'))return;
    db_delete('saved_encounters',id).then(function(){
      renderSavedEncounterList();
      showToast('Encounter deleted.');
    });
  });
}

// Event delegation for saved-encounters load/delete buttons
document.addEventListener('click',function(e){
  var loadBtn=e.target.closest('[data-loadenc]');
  if(loadBtn){loadSavedEncounter(loadBtn.dataset.loadenc);return;}
  var delBtn=e.target.closest('[data-delenc]');
  if(delBtn){deleteSavedEncounter(delBtn.dataset.delenc);return;}
});
```

- [ ] **Step 6: Wire `updateSaveEncBtn()` into `renderStage`** — find `renderStage()` in `app.js` and add `updateSaveEncBtn();` at the end of the function body.

- [ ] **Step 7: Add encounter-load modal CSS** — append to `styles.css`:

```css
/* §ENC_LOAD_MODAL */
.enc-load-modal-bg{
  position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.6);
  display:flex;align-items:center;justify-content:center;
}
.enc-load-modal{
  background:var(--surface);border:1px solid var(--border2);border-radius:12px;
  padding:24px;width:min(380px,90vw);box-shadow:0 8px 40px rgba(0,0,0,.7);
}
.elm-title{font-family:'Cinzel',serif;font-size:15px;color:var(--gold);margin-bottom:10px;}
.elm-body{font-size:14px;color:var(--text-muted);margin-bottom:20px;line-height:1.5;}
.elm-actions{display:flex;gap:10px;flex-wrap:wrap;}
.elm-btn{
  flex:1;padding:8px 12px;border-radius:7px;font-size:14px;font-weight:700;cursor:pointer;
  border:1px solid var(--border2);background:var(--surface2);color:var(--text-dim);
  transition:all .15s;
}
.elm-replace{border-color:var(--fear-dim);color:var(--fear);}
.elm-replace:hover{background:rgba(200,64,58,.12);}
.elm-add{border-color:var(--green-dim);color:var(--green);}
.elm-add:hover{background:rgba(90,158,114,.12);}
.elm-cancel:hover{background:var(--surface3);}
```

- [ ] **Step 8: Verify** — add adversaries to queue, click "💾 Save Encounter", name it, confirm. Then clear the queue, open the Saved Encounters section, click Load — the encounter should reload. Export JSON and verify saved encounters appear in the file.

- [ ] **Step 9: Commit**

```bash
git add app.js styles.css index.html
git commit -m "feat: saved encounters with save/load/delete and encounter management UI"
```

---

## Task 7: Encounter Links in Markdown

**Spec reference:** "Lore Tab Link Syntax" and "Loading an Encounter (Click Behavior)" sections in spec.

**Files:**
- Modify: `app.js` — update `renderMd()` and add encounter-link click handler
- Modify: `styles.css` — add `.encounter-link` style

- [ ] **Step 1: Update `renderMd()`** — in the wiki-link conversion line (~line 248), handle `[[encounter:Name]]` before general `[[wiki links]]`:

Old:
```js
content=content.replace(/\[\[([^\]]+)\]\]/g,'<span class="wiki-link">$1</span>');
```

New:
```js
// Encounter links first, then general wiki links
content=content.replace(/\[\[encounter:([^\]]+)\]\]/g,function(_,name){
  return '<a class="encounter-link" data-encounter-name="'+name.replace(/"/g,'&quot;')+'" href="#">⚔ '+name+'</a>';
});
content=content.replace(/\[\[([^\]]+)\]\]/g,'<span class="wiki-link">$1</span>');
```

- [ ] **Step 2: Add encounter-link click handler** — add to the `document.addEventListener('click',...)` delegation block already in `app.js`:

```js
  // encounter links in lore tabs
  var encLink=e.target.closest('.encounter-link');
  if(encLink){
    e.preventDefault();
    var encName=encLink.dataset.encounterName;
    db_getAll('saved_encounters').then(function(encs){
      var enc=(encs||[]).find(function(x){return x.name===encName;});
      if(!enc){showToast('No saved encounter named "'+encName+'" found.');return;}
      _doLoadEncounter(enc);
    });
    return;
  }
```

- [ ] **Step 3: Add CSS** — add to `styles.css` after the `.wiki-link` style block:

```css
a.encounter-link{
  color:var(--gold);font-weight:700;text-decoration:none;
  border-bottom:1px dashed var(--gold-dim);cursor:pointer;
  transition:color .15s,border-color .15s;
}
a.encounter-link:hover{color:var(--text);border-color:var(--text-muted);}
```

- [ ] **Step 4: Verify** — save an encounter named "Goblin Ambush". Create a lore tab with content `[[encounter:Goblin Ambush]]`. The link should render in gold with a sword icon. Clicking it should load the encounter.

- [ ] **Step 5: Commit**

```bash
git add app.js styles.css
git commit -m "feat: [[encounter:Name]] links in lore tabs trigger saved encounter loading"
```

---

## Task 8: Build Verification

- [ ] **Step 1: Run the build**

```bash
cd "Daggerheart Apps/Daggerheart-GM-Dashboard-main/Daggerheart-GM-Dashboard-main"
node build.js
# Expected: Built: dist/index.html  (NNN KB)
```

- [ ] **Step 2: Smoke test checklist**
  - Open `dist/index.html` in Chrome (or serve locally via `npx serve dist`)
  - [ ] App loads without console errors
  - [ ] Add adversaries, begin battle, mark HP — reload — state persists
  - [ ] Create a custom adversary — reload — adversary appears in Arsenal
  - [ ] Settings gear → Export → file downloads with correct JSON structure
  - [ ] Import the exported file → page reloads with data intact
  - [ ] Add adversaries to queue → "💾 Save Encounter" appears → save and name it
  - [ ] Open Saved Encounters section → encounter appears in list → Load works
  - [ ] Create a lore tab with `[[encounter:YourName]]` → link renders → click loads encounter
  - [ ] On mobile viewport (DevTools): sidebar overlay works, layout intact

- [ ] **Step 3: Commit**

```bash
git add dist/index.html
git commit -m "build: regenerate dist bundle with storage foundation features"
```

---

## Done — Handoff to Plan B

Plan B (`2026-03-21-gm-dashboard-toolkit-panel.md`) implements the Toolkit Panel (Rules Reference, Session Notes, Generators). It depends on the `db_*` helpers, `showToast`, and `--arcane`/`--green-hi` CSS variables added in this plan.
