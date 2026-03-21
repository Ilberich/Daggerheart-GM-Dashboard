# GM Dashboard — Toolkit Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible right-side Toolkit Panel with three tabs — Rules Reference (searchable Daggerheart rules cheat sheet), Session Notes (scratchpad + pinned cards), and Generators (NPC names, loot roller, environment stat block generator + library).

**Prerequisites:** Plan A (`2026-03-21-gm-dashboard-storage-foundation.md`) must be complete. This plan depends on `db_*` helpers, `showToast()`, and `--arcane`/`--green-hi` CSS variables defined there.

**Architecture:** All new code lives in `app.js` and `styles.css` using `§ANCHOR` comments. The Toolkit Panel is a `position:fixed` right-side column. When open it shifts `.tab-panel` content left via a `body.toolkit-open` class. On mobile it overlays as a drawer. Panel state (open/closed, active tab) persists to IndexedDB `settings` store.

**Spec reference:** `docs/superpowers/specs/2026-03-21-gm-dashboard-toolkit-panel-design.md` — sections "Shell Layout", "Tab 1: Rules Reference", "Tab 2: Session Notes", "Tab 3: Generators", and all "Implementation Notes" subsections.

---

## File Map

| File | Changes |
|------|---------|
| `index.html` | Add `#toolkit-panel` after `#dynamic-panels`; add `#toolkit-overlay` |
| `styles.css` | Add `§TOOLKIT_PANEL`, `§RULES_TAB`, `§NOTES_TAB`, `§GENERATORS` CSS sections; update `§MOBILE_768` |
| `app.js` | Add `§TOOLKIT`, `§RULES_TAB`, `§NOTES_TAB`, `§GENERATORS` sections; update `§INIT` to restore panel state |

---

## Task 1: Toolkit Panel Shell — HTML, CSS, Toggle

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`

- [ ] **Step 1: Add panel HTML to `index.html`** — after `<!-- Dynamic tab panels injected here -->` and before `<!-- CUSTOM ADVERSARY MODAL -->`:

```html
<!-- TOOLKIT PANEL -->
<div id="toolkit-overlay" onclick="closeToolkit()"></div>
<div id="toolkit-panel">
  <button id="toolkit-toggle" onclick="toggleToolkit()" title="Toggle Toolkit Panel">‹</button>
  <div id="toolkit-tabs">
    <button class="tk-tab active" data-tktab="rules" onclick="switchToolkitTab('rules')">🔍 Rules</button>
    <button class="tk-tab" data-tktab="notes" onclick="switchToolkitTab('notes')">📝 Notes</button>
    <button class="tk-tab" data-tktab="gen" onclick="switchToolkitTab('gen')">🎲 Generators</button>
  </div>
  <div class="tk-panel active" id="tkp-rules"></div>
  <div class="tk-panel" id="tkp-notes"></div>
  <div class="tk-panel" id="tkp-gen"></div>
</div>
```

- [ ] **Step 2: Add `§TOOLKIT_PANEL` CSS** — append before `§MOBILE_768` in `styles.css`:

```css
/* §TOOLKIT_PANEL ════════════════════════════════════════════════
   TOOLKIT PANEL SHELL
════════════════════════════════════════════════ */
:root{--toolkit-w:300px;}

#toolkit-panel{
  position:fixed;top:var(--tabbar-h);right:0;bottom:0;
  width:var(--toolkit-w);
  background:var(--surface);border-left:1px solid var(--border);
  display:flex;flex-direction:column;
  transform:translateX(100%);
  transition:transform .3s;
  z-index:150;overflow:hidden;
}
#toolkit-panel.open{transform:translateX(0);}

/* Shift content panels when toolkit is open (desktop only) */
body.toolkit-open .tab-panel{right:var(--toolkit-w);}

#toolkit-toggle{
  position:absolute;top:50%;left:0;
  transform:translate(-100%,-50%);
  width:20px;height:48px;
  background:var(--surface);border:1px solid var(--border);border-right:none;
  border-radius:6px 0 0 6px;
  color:var(--text-muted);font-size:14px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:color .15s,background .15s;
}
#toolkit-toggle:hover{color:var(--gold);background:var(--surface2);}

#toolkit-tabs{
  display:flex;border-bottom:1px solid var(--border);flex-shrink:0;
}
.tk-tab{
  flex:1;padding:10px 4px;background:transparent;border:none;
  color:var(--text-muted);font-size:12px;font-family:'Crimson Pro',serif;
  font-weight:700;cursor:pointer;transition:color .15s,background .15s;
  border-bottom:2px solid transparent;letter-spacing:.03em;
}
.tk-tab:hover{color:var(--text-dim);background:var(--surface2);}
.tk-tab.active{color:var(--gold);border-bottom-color:var(--gold);}

.tk-panel{display:none;flex:1;overflow-y:auto;flex-direction:column;}
.tk-panel.active{display:flex;}

/* Toolkit overlay (mobile only) */
#toolkit-overlay{
  display:none;position:fixed;inset:0;z-index:149;
  background:rgba(0,0,0,.45);
}
```

- [ ] **Step 3: Add mobile styles** — inside the `@media(max-width:768px)` block in `styles.css`, add:

```css
  /* Toolkit panel: full-width overlay drawer on mobile */
  body.toolkit-open .tab-panel{right:0;}  /* no content shift on mobile */
  #toolkit-panel{width:min(320px,100vw);}
  #toolkit-overlay.active{display:block;}
```

- [ ] **Step 4: Add `§TOOLKIT` JS section to `app.js`** — after `§EXPORT_IMPORT`:

```js
// §TOOLKIT ════════════════════════════════════════════════════════
// TOOLKIT PANEL SHELL — toggle, tab switching, state persistence
// ═════════════════════════════════════════════════════════════════
var _toolkitOpen=false;
var _toolkitTab='rules';

function openToolkit(){
  _toolkitOpen=true;
  document.getElementById('toolkit-panel').classList.add('open');
  document.getElementById('toolkit-toggle').textContent='›';
  if(window.innerWidth<=768)document.getElementById('toolkit-overlay').classList.add('active');
  else document.body.classList.add('toolkit-open');
  db_setting('toolkit_open',true).catch(function(){});
}
function closeToolkit(){
  _toolkitOpen=false;
  document.getElementById('toolkit-panel').classList.remove('open');
  document.getElementById('toolkit-toggle').textContent='‹';
  document.getElementById('toolkit-overlay').classList.remove('active');
  document.body.classList.remove('toolkit-open');
  db_setting('toolkit_open',false).catch(function(){});
}
function toggleToolkit(){_toolkitOpen?closeToolkit():openToolkit();}

function switchToolkitTab(tab){
  _toolkitTab=tab;
  document.querySelectorAll('.tk-tab').forEach(function(b){
    b.classList.toggle('active',b.dataset.tktab===tab);
  });
  document.querySelectorAll('.tk-panel').forEach(function(p){
    p.classList.toggle('active',p.id==='tkp-'+tab);
  });
  db_setting('toolkit_tab',tab).catch(function(){});
  // Lazy render tab content on first open
  if(tab==='rules'&&!_rulesRendered)renderRulesTab();
  if(tab==='notes')renderNotesTab();
  if(tab==='gen'&&!_genRendered)renderGeneratorsTab();
}

function restoreToolkitState(){
  return Promise.all([
    db_setting('toolkit_open'),
    db_setting('toolkit_tab')
  ]).then(function(vals){
    var wasOpen=vals[0],savedTab=vals[1]||'rules';
    switchToolkitTab(savedTab);
    if(wasOpen)openToolkit();
  }).catch(function(){});
}
```

- [ ] **Step 5: Call `restoreToolkitState()` in `init()`** — add after `statusBar();` in the async init function:

```js
  restoreToolkitState();
```

- [ ] **Step 6: Verify** — open the app, click the `‹` toggle on the right edge. The panel should slide in and the combat area should shift left. Click the tab buttons to switch between Rules / Notes / Generators. The chevron should flip to `›` when open. Reload — panel state should restore.

- [ ] **Step 7: Commit**

```bash
git add app.js styles.css index.html
git commit -m "feat: toolkit panel shell with toggle, tab switching, and state persistence"
```

---

## Task 2: Rules Reference Tab — Data + UI

**Spec reference:** "Tab 1: Rules Reference" section and the full rules content in the spec (lines covering Core Rolls through Equipment Rules and Leveling Up). Convert each spec entry to a JS object in `RULES[]`.

**Files:**
- Modify: `app.js` — add `§RULES_TAB` section
- Modify: `styles.css` — add `§RULES_TAB` CSS

- [ ] **Step 1: Add `§RULES_TAB` CSS** — append after `§TOOLKIT_PANEL`:

```css
/* §RULES_TAB ════════════════════════════════════════════════════
   RULES REFERENCE TAB
════════════════════════════════════════════════ */
.rules-search{
  padding:10px;border-bottom:1px solid var(--border);flex-shrink:0;
}
.rules-search-input{
  width:100%;background:var(--surface2);border:1px solid var(--border2);
  color:var(--text);padding:7px 10px;border-radius:7px;font-size:13px;
}
.rules-search-input:focus{outline:none;border-color:var(--gold-dim);}

.rules-cats{
  display:flex;flex-wrap:wrap;gap:5px;padding:8px 10px;
  border-bottom:1px solid var(--border);flex-shrink:0;
}
.rules-cat-pill{
  padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;
  border:1px solid var(--border2);background:transparent;color:var(--text-muted);
  cursor:pointer;transition:all .15s;font-family:'Crimson Pro',serif;letter-spacing:.04em;
  text-transform:uppercase;
}
.rules-cat-pill.active{background:var(--surface3);border-color:var(--gold-dim);color:var(--gold);}

.rules-list{flex:1;overflow-y:auto;padding:6px;}

.rule-card{border:1px solid var(--border);border-radius:7px;margin-bottom:5px;overflow:hidden;}
.rule-card-header{
  display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;
  background:var(--surface2);transition:background .15s;
}
.rule-card-header:hover{background:var(--surface3);}
.rule-card-name{flex:1;font-size:13px;font-weight:700;color:var(--text-dim);}
.rule-card-summary{font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;}
.rule-card-chevron{font-size:11px;color:var(--text-muted);flex-shrink:0;}
.rule-card-body{display:none;padding:8px 10px;font-size:13px;color:var(--text-muted);line-height:1.6;border-top:1px solid var(--border);}
.rule-card-body.open{display:block;}
.rule-card.custom{border-color:var(--gold-dim);}

.rules-add-btn{
  display:block;width:100%;margin:6px 0 0;padding:7px;
  background:transparent;border:1px dashed var(--border2);border-radius:7px;
  color:var(--text-muted);font-size:13px;cursor:pointer;transition:all .15s;
}
.rules-add-btn:hover{border-color:var(--gold-dim);color:var(--gold);}

.rules-inline-form{
  background:var(--surface2);border:1px solid var(--border2);border-radius:7px;
  padding:10px;margin-top:5px;display:none;
}
.rules-inline-form.open{display:block;}
.rif-input,.rif-select,.rif-textarea{
  width:100%;background:var(--surface3);border:1px solid var(--border2);
  color:var(--text);padding:6px 8px;border-radius:5px;font-size:13px;margin-bottom:6px;
  font-family:'Crimson Pro',serif;
}
.rif-textarea{resize:vertical;min-height:60px;}
.rif-actions{display:flex;gap:6px;}
.rif-save,.rif-cancel{
  flex:1;padding:5px;border-radius:5px;font-size:12px;font-weight:700;
  cursor:pointer;border:1px solid var(--border2);background:var(--surface3);color:var(--text-dim);
}
.rif-save{border-color:var(--green-dim);color:var(--green);}
.rule-edit-btn,.rule-del-btn{
  background:transparent;border:none;font-size:11px;cursor:pointer;
  color:var(--text-muted);padding:0 4px;transition:color .15s;
}
.rule-edit-btn:hover{color:var(--gold);}
.rule-del-btn:hover{color:var(--fear);}
```

- [ ] **Step 2: Add `§RULES_TAB` JS** — after `§TOOLKIT`:

```js
// §RULES_TAB ══════════════════════════════════════════════════════
// RULES REFERENCE TAB
// ═════════════════════════════════════════════════════════════════

// Rules data — derived from spec "Tab 1: Rules Reference" content.
// Shape: { id, cat, name, summary, body, _custom? }
// See spec lines covering "Core Rolls" through "Equipment Rules / Leveling Up"
// for the full authoritative text of each entry.
//
// Category list (matches spec):
//   'Core Rolls' | 'Hope & Fear' | 'Attack & Defense' |
//   'Damage & HP' | 'Conditions' | 'Stress' | 'Countdowns' |
//   'Ranges' | 'Downtime' | 'Death' | 'GM Moves' |
//   'Adversaries' | 'Social Conflict' | 'Optional Rules' |
//   'Equipment' | 'Leveling Up'
//
// IMPLEMENTER: populate RULES[] by converting each bulleted entry in the
// spec's "Pre-loaded Rule Categories and Content" section into the object
// shape below. Every spec entry becomes one object. Do not paraphrase —
// use the spec text verbatim for `body`.

var RULES=[
  // ── Core Rolls ──
  {id:'r-action-roll',cat:'Core Rolls',name:'Action Roll',
   summary:'Roll 2d12, add modifier, meet/exceed Difficulty.',
   body:'Roll 2d12 (Hope Die + Fear Die), add trait modifier. Meet or exceed Difficulty to succeed. If Hope > Fear: Success with Hope. If Fear > Hope: Success with Fear. If equal: Success with Hope (ties favor Hope).'},
  {id:'r-crit',cat:'Core Rolls',name:'Critical Success',
   summary:'Both dice show the same number.',
   body:'Both dice show the same number. Exceptional narrative outcome.'},
  {id:'r-advantage',cat:'Core Rolls',name:'Advantage',
   summary:'Roll extra die, keep highest.',
   body:'Roll an extra die, keep the highest result.'},
  {id:'r-disadvantage',cat:'Core Rolls',name:'Disadvantage',
   summary:'Roll extra die, keep lowest.',
   body:'Roll an extra die, keep the lowest result.'},
  {id:'r-fate',cat:'Core Rolls',name:'Fate Roll',
   summary:'Optional — GM asks player to roll one die for narrative.',
   body:'(Optional) GM asks a player to roll only their Hope or Fear Die to let chance decide a narrative outcome; the die type adds flavor but does not grant Hope or Fear.'},
  {id:'r-difficulty',cat:'Core Rolls',name:'Difficulty',
   summary:'Standard values: 8 / 11 / 14 / 17 / 20 / 23 / 26.',
   body:'Standard Difficulty values: 8 (Very Easy), 11 (Easy), 14 (Moderate/T2 standard), 17 (Hard/T3 standard), 20 (Very Hard/T4 standard), 23 (Extreme), 26 (Impossible). Difficulty = 11 + (2 × Tier) as a baseline.'},
  // ── Hope & Fear ──
  {id:'r-gain-hope',cat:'Hope & Fear',name:'Gaining Hope',
   summary:'Gain 1 Hope on success with Hope. Max 6.',
   body:'Players gain 1 Hope on a success with Hope. Max Hope = 6.'},
  {id:'r-spend-hope',cat:'Hope & Fear',name:'Spending Hope',
   summary:'Activate abilities, power attacks, or help allies (+1d6).',
   body:'Spend to activate abilities, power attacks, help allies (give +1d6 to another\'s roll), or use features that cost Hope.'},
  {id:'r-gain-fear',cat:'Hope & Fear',name:'Gaining Fear',
   summary:'GM gains 1 Fear when a PC rolls with Fear.',
   body:'GM gains 1 Fear when a PC rolls with Fear. Stored in the Fear pool.'},
  {id:'r-spend-fear',cat:'Hope & Fear',name:'Spending Fear',
   summary:'GM makes moves, activates adversary abilities, or causes complications.',
   body:'GM spends Fear to make GM moves (including Fear Feature adversary moves), activate adversary abilities, or introduce complications.'},
  {id:'r-fear-pool',cat:'Hope & Fear',name:'Fear Pool',
   summary:'GM keeps Fear in reserve for interruptions.',
   body:'GM keeps Fear in reserve; recommended to keep some in reserve, especially in combat, to interrupt scenes.'},
  // ── Attack & Defense ──
  {id:'r-atk-roll',cat:'Attack & Defense',name:'Attack Roll',
   summary:'Action Roll using weapon\'s trait vs. adversary\'s Difficulty.',
   body:'Make an Action Roll using the weapon\'s trait vs. the adversary\'s Difficulty. On success, deal damage.'},
  {id:'r-adv-dc',cat:'Attack & Defense',name:'Adversary Difficulty',
   summary:'Adversaries use listed Difficulty, not Evasion.',
   body:'Adversaries do not have Evasion; players roll against their listed Difficulty number.'},
  {id:'r-evasion',cat:'Attack & Defense',name:'Evasion',
   summary:'PC passive defense. Adversaries roll d20 + mod vs. Evasion.',
   body:'PC passive defense score. Adversaries roll a d20 + modifier vs. a PC\'s Evasion to hit. Critical hit if roll equals or exceeds Evasion by 10+.'},
  {id:'r-unarmed',cat:'Attack & Defense',name:'Unarmed Attack',
   summary:'Roll Finesse or Strength. Damage = 1d6+1 phy.',
   body:'Roll Finesse or Strength (player\'s choice). Damage = 1d6+1 phy. No features.'},
  {id:'r-damage',cat:'Attack & Defense',name:'Damage',
   summary:'Roll weapon dice (count = Proficiency) + flat bonus.',
   body:'On a successful attack, roll the weapon\'s damage dice (number of dice = Proficiency) and add the flat bonus.'},
  {id:'r-proficiency',cat:'Attack & Defense',name:'Proficiency',
   summary:'Starts at 1; number of damage dice rolled on an attack.',
   body:'Starts at 1; number of damage dice rolled on an attack. Increases at certain advancement options.'},
  {id:'r-dmg-types',cat:'Attack & Defense',name:'Damage Types',
   summary:'Physical (phy) and Magic (mag).',
   body:'Physical (phy) and Magic (mag). Some adversaries have resistance or immunity to one type.'},
  // ── Damage & HP ──
  {id:'r-hp',cat:'Damage & HP',name:'Hit Points',
   summary:'Characters have limited HP slots; mark when taking damage.',
   body:'Characters have a limited number of HP slots. Mark them when taking damage.'},
  {id:'r-thresholds',cat:'Damage & HP',name:'Damage Thresholds',
   summary:'Minor: 1 HP. Major: 2 HP. Severe: 3 HP. Below minor: nothing.',
   body:'Minor threshold: marks 1 HP. Major threshold: marks 2 HP. Severe threshold: marks 3 HP. Damage below the Minor threshold = no HP marked.'},
  {id:'r-armor-mark',cat:'Damage & HP',name:'Marking Armor',
   summary:'Mark 1 Armor Slot to reduce damage severity by one tier.',
   body:'Before marking an HP, mark 1 Armor Slot instead to reduce damage severity by one tier (Severe → Major → Minor → Nothing). Each attack allows only 1 Armor Slot marked.'},
  {id:'r-armor-score',cat:'Damage & HP',name:'Armor Score',
   summary:'Max armor slots. Cannot exceed 12.',
   body:'Max armor slots available. Cannot exceed 12. After all slots marked, armor unusable until repaired during downtime.'},
  {id:'r-tier-thresholds',cat:'Damage & HP',name:'Thresholds by Tier',
   summary:'T1: 5/11. T2: 7/16. T3: 11/22. T4: 15/30 (approximate).',
   body:'Adversaries scale: T1: Minor 5, Major 11; T2: Minor 7, Major 16; T3: Minor 11, Major 22; T4: Minor 15, Major 30 (approximate — varies by adversary).'},
  // ── Conditions ──
  {id:'r-hidden',cat:'Conditions',name:'Hidden',
   summary:'Can\'t be directly attacked. Ends when observed or revealed.',
   body:'A hidden target can\'t be directly attacked; attackers must succeed on an action to locate them first. Being observed by any creature removes Hidden. Actions that reveal position (attacking, casting loudly) end Hidden.'},
  {id:'r-restrained',cat:'Conditions',name:'Restrained',
   summary:'Can\'t move. Disadvantage on Agility/Finesse. Attackers have advantage.',
   body:'A restrained creature can\'t move from their position. They have disadvantage on Agility and Finesse rolls. Attackers have advantage against them.'},
  {id:'r-vulnerable',cat:'Conditions',name:'Vulnerable',
   summary:'Marks extra HP when taking damage. Defeated immediately if Stress full.',
   body:'A vulnerable creature marks an additional Hit Point when they would mark one or more HP. A creature that is Vulnerable while their Stress is full is defeated immediately when they would take any damage.'},
  // ── Stress ──
  {id:'r-stress-mark',cat:'Stress',name:'Marking Stress',
   summary:'Failed rolls, adversary abilities, narrative consequences.',
   body:'Players mark Stress in response to failed rolls, certain adversary abilities, and narrative consequences. Stress slots are limited.'},
  {id:'r-stress-full',cat:'Stress',name:'Full Stress',
   summary:'PC becomes Vulnerable when Stress track is full.',
   body:'When a PC\'s Stress track is full, they become Vulnerable.'},
  {id:'r-stress-clear',cat:'Stress',name:'Clearing Stress',
   summary:'Some abilities clear Stress. Short Rest clears all.',
   body:'Some abilities clear Stress. Short Rest clears all Stress (and repairs armor). Long Rest also clears Stress, plus clears all Hit Points and removes Vulnerable condition.'},
  // ── Countdowns ──
  {id:'r-countdown',cat:'Countdowns',name:'Standard Countdown',
   summary:'Die ticking down by 1 per trigger. At 0, consequence fires.',
   body:'A die (d4, d6, d8, d10) that ticks down by 1 each time its trigger occurs. When it hits 0, the consequence triggers.'},
  {id:'r-progress',cat:'Countdowns',name:'Progress Countdown',
   summary:'Ticks toward a goal on successes. For long-term tasks.',
   body:'Ticks down toward a goal. Ticks on successes or certain conditions. Used for long-term tasks, environmental changes, or campaign events.'},
  {id:'r-looping',cat:'Countdowns',name:'Looping Countdown',
   summary:'When it hits 0, it triggers and resets.',
   body:'When it hits 0, it triggers and resets to its starting value.'},
  {id:'r-dyn-countdown',cat:'Countdowns',name:'Dynamic Advancement',
   summary:'Crit: 3 ticks. Hope: 2 ticks. Fear: 1 tick. Failure: 0.',
   body:'Critical success: 3 ticks. Success with Hope: 2 ticks. Success with Fear: 1 tick. Failure: 0 ticks (or 1 tick on GM\'s discretion for project work).'},
  // ── Ranges ──
  {id:'r-melee',cat:'Ranges',name:'Melee',summary:'Within arm\'s reach.',body:'Within arm\'s reach (same square/zone).'},
  {id:'r-vclose',cat:'Ranges',name:'Very Close',summary:'Just a few steps away.',body:'Just a few steps away.'},
  {id:'r-close',cat:'Ranges',name:'Close',summary:'Across a small room.',body:'Across a small room.'},
  {id:'r-far',cat:'Ranges',name:'Far',summary:'Across a large room or open space.',body:'Across a large room or open space.'},
  {id:'r-vfar',cat:'Ranges',name:'Very Far',summary:'At the limit of sight/effective range.',body:'At the limit of sight/effective range.'},
  {id:'r-movement',cat:'Ranges',name:'Movement',summary:'Free move to Close range on your turn.',body:'On their turn, a character can move freely to Close range from their current position without spending an action.'},
  // ── Downtime ──
  {id:'r-short-rest',cat:'Downtime',name:'Short Rest',
   summary:'Clear all Stress, repair armor. GM gains 1d4 Fear.',
   body:'Clear all Stress, repair armor (clear all marked Armor Slots). Takes time in the fiction (1+ hours). GM gains 1d4 Fear.'},
  {id:'r-long-rest',cat:'Downtime',name:'Long Rest',
   summary:'Clear Stress, HP, armor, Vulnerable. GM gains Fear = PCs + 1d4.',
   body:'Clear all Stress, all Hit Points, all marked Armor Slots. Remove Vulnerable condition. Takes a significant in-fiction rest (overnight or equivalent). GM gains Fear = (number of PCs + 1d4) and advances a long-term countdown.'},
  {id:'r-downtime-moves',cat:'Downtime',name:'Downtime Moves',
   summary:'Good Night\'s Rest, Repair, Prepare, Work on a Project, etc.',
   body:'Get a Good Night\'s Rest (clear stress/HP), Repair Your Equipment (restore armor slots and item features), Prepare (gain advantage on next related roll), Work on a Project (tick a progress countdown), or others as described in class features.'},
  // ── Death ──
  {id:'r-death-move',cat:'Death',name:'Death Move',
   summary:'When last HP marked: Blaze of Glory / Avoid Death / Risk It All.',
   body:'When a PC marks their last Hit Point, they must immediately choose: Blaze of Glory (heroic death, critical-success action), Avoid Death (unconscious until healed; roll at next long rest for Scar), or Risk It All (roll Duality Dice — Hope higher: clear HP/Stress equal to Hope die; Fear higher: cross through death; Equal: clear all HP and Stress).'},
  {id:'r-scars',cat:'Death',name:'Scars',
   summary:'Cross out a Hope slot permanently. Retire if last slot lost.',
   body:'Cross out a Hope slot permanently. Can be narratively healed as a downtime project reward. If last Hope slot crossed out, retire the character.'},
  // ── GM Moves ──
  {id:'r-when-move',cat:'GM Moves',name:'When to Make a Move',
   summary:'After a roll with Fear, after a failed roll, or when fiction demands.',
   body:'After a roll with Fear, after a failed roll, or when the fiction demands it.'},
  {id:'r-soft-move',cat:'GM Moves',name:'Soft Move',
   summary:'Foreshadows consequence; players can react first.',
   body:'Foreshadows a consequence; players can react before it fully hits.'},
  {id:'r-hard-move',cat:'GM Moves',name:'Hard Move',
   summary:'Consequence lands immediately and fully.',
   body:'A consequence lands immediately and fully.'},
  {id:'r-common-moves',cat:'GM Moves',name:'Common GM Moves',
   summary:'Put in danger, use feature, introduce adversary, tick countdown…',
   body:'Put a PC in danger, have an adversary use a feature, activate an environment feature, introduce a new adversary, tick a countdown, use Fear to activate an adversary\'s Fear Feature, make a GM NPC act.'},
  // ── Adversaries ──
  {id:'r-adv-atk',cat:'Adversaries',name:'Adversary Attack',
   summary:'Roll d20 + mod vs. PC Evasion. Hit if meets or exceeds.',
   body:'Roll d20 + modifier vs. PC\'s Evasion. Hit if result meets or exceeds Evasion.'},
  {id:'r-adv-hp',cat:'Adversaries',name:'Adversary HP',
   summary:'Mark HP slots. When all marked and hit again: Defeated.',
   body:'Adversaries track HP slots. When all HP slots are marked and they take additional damage: Severely Damaged adversaries are Defeated.'},
  {id:'r-adv-types',cat:'Adversaries',name:'Adversary Types',
   summary:'Mook, Standard, Bruiser, Solo, Skulk, Leader, Social.',
   body:'Mooks: 1-3 HP, group well. Standard: 3-5+ HP. Bruisers: high HP, hard hitting, fewer abilities. Solos: designed for 1-vs-party, multiple activations. Skulks: low HP, Hidden, hit hard then vanish. Leaders: boost allies. Social: uses Stress as HP for social conflicts.'},
  {id:'r-defeated',cat:'Adversaries',name:'Defeated Adversaries',
   summary:'GM chooses: flee, surrender, or die. Not automatic death.',
   body:'GM chooses: flee, surrender, or die. They don\'t automatically die.'},
  // ── Social Conflict ──
  {id:'r-social',cat:'Social Conflict',name:'Influencing NPCs',
   summary:'Minor requests: one success. Major: fill adversary Stress track.',
   body:'One successful action roll may be enough for minor requests. Major requests or hostile NPCs may require filling their Stress track.'},
  {id:'r-social-stress',cat:'Social Conflict',name:'Adversary Stress (Social)',
   summary:'Stress slots = influence meter. Full = Vulnerable.',
   body:'Use adversary Stress slots as the influence meter. Each successful social action causes them to mark Stress. Vulnerable when full; defeated (convinced) if hit while Vulnerable.'},
  // ── Optional Rules ──
  {id:'r-falling',cat:'Optional Rules',name:'Falling Damage',
   summary:'Very Close: 1d10+3. Close: 1d20+5. Far+: 1d100+15 or death.',
   body:'Very Close range: 1d10+3 phy. Close range: 1d20+5 phy. Far/Very Far: 1d100+15 phy or death (GM\'s discretion). Collision: 1d20+5 direct physical.'},
  {id:'r-underwater',cat:'Optional Rules',name:'Underwater Combat',
   summary:'Disadvantage unless suited. Countdown for breath.',
   body:'Attack rolls have disadvantage unless the creature is suited for underwater combat. For breath: countdown (d4 or higher), ticks down when PCs take actions or fail rolls. When it ends, mark a Stress each time they take an action.'},
  {id:'r-pc-conflict',cat:'Optional Rules',name:'PC vs PC Conflict',
   summary:'Attacker rolls vs. Evasion or reaction roll Difficulty.',
   body:'On attack roll, attacker rolls vs. defender\'s Evasion. On other conflicts, instigator rolls an action roll vs. Difficulty = total value of the target\'s reaction roll.'},
  // ── Equipment ──
  {id:'r-weapons',cat:'Equipment',name:'Primary Weapons',
   summary:'One equipped. Trait, Range, Damage Die, Burden, Feature.',
   body:'One equipped at a time. Listed by Trait, Range, Damage Die, Burden, Feature. Roll number of damage dice = Proficiency.'},
  {id:'r-secondary',cat:'Equipment',name:'Secondary Weapons',
   summary:'Augment primary. Shields, daggers. Can\'t use with two-handed primary.',
   body:'Augment primary. Shields, daggers, etc. One equipped at a time. Two-handed primary = cannot equip secondary.'},
  {id:'r-switching',cat:'Equipment',name:'Switching Weapons in Danger',
   summary:'Mark a Stress to equip an Inventory Weapon.',
   body:'Mark a Stress to equip an Inventory Weapon. Free in calm situations.'},
  {id:'r-unarmored',cat:'Equipment',name:'Unarmored',
   summary:'Armor Score 0. Major = level. Severe = 2 × level.',
   body:'Armor Score 0, Major threshold = character level, Severe threshold = 2 × character level.'},
  {id:'r-throwing',cat:'Equipment',name:'Throwing a Weapon',
   summary:'Throwable weapons to Very Close using Finesse. You lose it until retrieved.',
   body:'Throwable weapons (dagger, axe) can be thrown to Very Close range using Finesse. Deal normal damage on success. You lose the weapon until retrieved.'},
  // ── Leveling Up ──
  {id:'r-tiers',cat:'Leveling Up',name:'Tiers of Play',
   summary:'T1: L1. T2: L2-4. T3: L5-7. T4: L8-10.',
   body:'Tier 1 (level 1), Tier 2 (levels 2-4), Tier 3 (levels 5-7), Tier 4 (levels 8-10).'},
  {id:'r-advancements',cat:'Leveling Up',name:'Advancements',
   summary:'Choose 2 per level: +trait, +HP, +Stress, +Exp, domain card, +Evasion, +Prof, Multiclass.',
   body:'Choose 2 per level up: +1 to two unmarked traits (mark them), +1 HP slot, +1 Stress slot, +1 to two Experiences, domain card (your level or lower), +1 Evasion, +1 Proficiency (mark both slots first), Multiclass (level 5+).'},
  {id:'r-achievements',cat:'Leveling Up',name:'Level Achievements',
   summary:'At L2, L5, L8: +1 Exp at +2, +1 Proficiency, clear trait marks.',
   body:'At levels 2, 5, and 8: +1 Experience at +2, +1 Proficiency, clear trait marks (at 5 and 8).'},
];

var _rulesRendered=false;
var _rulesFilter={search:'',cat:'All'};
var _ruleEditId=null;

function renderRulesTab(){
  _rulesRendered=true;
  var el=document.getElementById('tkp-rules');
  if(!el)return;
  el.innerHTML=
    '<div class="rules-search"><input class="rules-search-input" placeholder="Search rules…" oninput="filterRules(this.value)" id="rules-search-input"></div>'
   +'<div class="rules-cats" id="rules-cats"></div>'
   +'<div class="rules-list" id="rules-list"></div>';
  renderRulesCats();
  renderRulesList();
}

function renderRulesCats(){
  var el=document.getElementById('rules-cats');if(!el)return;
  var cats=['All'].concat(
    RULES.filter(function(r){return !r._custom;})
         .map(function(r){return r.cat;})
         .filter(function(c,i,a){return a.indexOf(c)===i;})
  );
  el.innerHTML=cats.map(function(c){
    return '<button class="rules-cat-pill'+(c===_rulesFilter.cat?' active':'')+'" onclick="setRulesCat(\''+escH(c)+'\')">'+escH(c)+'</button>';
  }).join('');
}

function setRulesCat(cat){_rulesFilter.cat=cat;renderRulesCats();renderRulesList();}

function filterRules(val){_rulesFilter.search=val.toLowerCase();renderRulesList();}

function renderRulesList(){
  var el=document.getElementById('rules-list');if(!el)return;
  // Load custom rules from IndexedDB then render
  db_getAll('toolkit_notes').then(function(notes){
    var customRules=(notes||[]).filter(function(n){return n._rule;});
    var all=RULES.concat(customRules);
    var filtered=all.filter(function(r){
      var catMatch=_rulesFilter.cat==='All'||r.cat===_rulesFilter.cat;
      var q=_rulesFilter.search;
      var textMatch=!q||(r.name.toLowerCase().includes(q)||r.body.toLowerCase().includes(q)||r.summary.toLowerCase().includes(q));
      return catMatch&&textMatch;
    });
    if(!filtered.length){el.innerHTML='<div style="padding:12px;font-size:13px;color:var(--text-muted)">No rules match.</div>';_appendRulesForm(el);return;}
    el.innerHTML=filtered.map(function(r){
      var customControls=r._rule?'<button class="rule-edit-btn" data-ruleedit="'+escH(r.id)+'">✎</button><button class="rule-del-btn" data-ruledel="'+escH(r.id)+'">×</button>':'';
      return '<div class="rule-card'+(r._rule?' custom':'')+'"><div class="rule-card-header" onclick="toggleRuleCard(\''+escH(r.id)+'\')">'
        +'<span class="rule-card-name">'+escH(r.name)+'</span>'
        +'<span class="rule-card-summary">'+escH(r.summary)+'</span>'
        +customControls
        +'<span class="rule-card-chevron" id="rchev-'+escH(r.id)+'">▼</span>'
        +'</div>'
        +'<div class="rule-card-body" id="rbody-'+escH(r.id)+'">'+escH(r.body)+'</div>'
        +'</div>';
    }).join('');
    _appendRulesForm(el);
  }).catch(function(){
    el.innerHTML='<div style="padding:12px;font-size:13px;color:var(--text-muted)">Could not load rules.</div>';
  });
}

function _appendRulesForm(el){
  el.innerHTML+='<button class="rules-add-btn" onclick="toggleRulesForm()">＋ Add Custom Rule</button>'
    +'<div class="rules-inline-form" id="rules-add-form">'
    +'<input class="rif-input" id="rif-name" placeholder="Rule name"><input class="rif-input" id="rif-cat" placeholder="Category (e.g. Combat)">'
    +'<input class="rif-input" id="rif-summary" placeholder="One-line summary">'
    +'<textarea class="rif-textarea" id="rif-body" placeholder="Full rule text…"></textarea>'
    +'<div class="rif-actions"><button class="rif-save" onclick="saveCustomRule()">Save</button><button class="rif-cancel" onclick="toggleRulesForm()">Cancel</button></div>'
    +'</div>';
}

function toggleRuleCard(id){
  var body=document.getElementById('rbody-'+id);
  var chev=document.getElementById('rchev-'+id);
  if(!body)return;
  body.classList.toggle('open');
  if(chev)chev.textContent=body.classList.contains('open')?'▲':'▼';
}
function toggleRulesForm(){
  document.getElementById('rules-add-form').classList.toggle('open');
}

function saveCustomRule(){
  var name=document.getElementById('rif-name').value.trim();
  var cat=document.getElementById('rif-cat').value.trim()||'Custom';
  var summary=document.getElementById('rif-summary').value.trim();
  var body=document.getElementById('rif-body').value.trim();
  if(!name||!body){showToast('Name and rule text are required.');return;}
  var rec={
    id:_ruleEditId||('rule_'+Date.now()),
    _rule:true,
    cat:cat,name:name,summary:summary,body:body,createdAt:new Date().toISOString()
  };
  db_put('toolkit_notes',rec).then(function(){
    showToast(_ruleEditId?'Rule updated.':'Rule saved.');
    _ruleEditId=null;
    // Clear form fields
    ['rif-name','rif-cat','rif-summary','rif-body'].forEach(function(id){document.getElementById(id).value='';});
    document.getElementById('rules-add-form').classList.remove('open');
    renderRulesList();
  });
}

function deleteCustomRule(id){
  if(!confirm('Delete this rule?'))return;
  db_delete('toolkit_notes',id).then(function(){showToast('Rule deleted.');renderRulesList();});
}

// Event delegation for rule edit/delete
document.addEventListener('click',function(e){
  var editBtn=e.target.closest('[data-ruleedit]');
  if(editBtn){
    db_get('toolkit_notes',editBtn.dataset.ruleedit).then(function(rec){
      if(!rec)return;
      _ruleEditId=rec.id;
      var form=document.getElementById('rules-add-form');
      if(!form)return;
      document.getElementById('rif-name').value=rec.name||'';
      document.getElementById('rif-cat').value=rec.cat||'';
      document.getElementById('rif-summary').value=rec.summary||'';
      document.getElementById('rif-body').value=rec.body||'';
      form.classList.add('open');
      form.scrollIntoView({behavior:'smooth'});
    });
    return;
  }
  var delBtn=e.target.closest('[data-ruledel]');
  if(delBtn){deleteCustomRule(delBtn.dataset.ruledel);return;}
});
```

- [ ] **Step 3: Verify** — open the Toolkit Panel, click "Rules" tab. Rules list should appear. Type "hope" in the search box — results should filter. Click a category pill. Click a rule card to expand it. Click "+ Add Custom Rule", fill the form, save — the new rule should appear with a custom border.

- [ ] **Step 4: Commit**

```bash
git add app.js styles.css
git commit -m "feat: Rules Reference tab with searchable cheat sheet and custom rules"
```

---

## Task 3: Session Notes Tab — Scratchpad + Pinned Cards

**Spec reference:** "Tab 2: Session Notes" section in spec.

**Files:**
- Modify: `app.js` — add `§NOTES_TAB` section
- Modify: `styles.css` — add `§NOTES_TAB` CSS

- [ ] **Step 1: Add `§NOTES_TAB` CSS** — append after `§RULES_TAB`:

```css
/* §NOTES_TAB ════════════════════════════════════════════════════
   SESSION NOTES TAB
════════════════════════════════════════════════ */
.notes-scratchpad{padding:10px;border-bottom:1px solid var(--border);flex-shrink:0;}
.notes-scratchpad-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:5px;}
.notes-textarea{
  width:100%;background:var(--surface2);border:1px solid var(--border2);
  color:var(--text-dim);padding:8px;border-radius:6px;font-size:13px;
  font-family:'Crimson Pro',serif;resize:none;height:120px;line-height:1.5;
}
.notes-textarea:focus{outline:none;border-color:var(--gold-dim);}

.notes-pinned-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 10px;border-bottom:1px solid var(--border);flex-shrink:0;
}
.notes-pinned-title{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);}
.notes-add-card-btn{
  padding:3px 10px;border-radius:5px;font-size:12px;font-weight:700;
  border:1px solid var(--border2);background:transparent;color:var(--text-muted);cursor:pointer;
  transition:all .15s;
}
.notes-add-card-btn:hover{border-color:var(--gold-dim);color:var(--gold);}

.notes-card-form{
  padding:10px;background:var(--surface2);border-bottom:1px solid var(--border);
  display:none;flex-shrink:0;
}
.notes-card-form.open{display:block;}
.ncf-row{display:flex;gap:6px;margin-bottom:6px;}
.ncf-select,.ncf-input,.ncf-textarea{
  background:var(--surface3);border:1px solid var(--border2);color:var(--text);
  padding:5px 8px;border-radius:5px;font-size:13px;font-family:'Crimson Pro',serif;
}
.ncf-select{flex-shrink:0;}
.ncf-input{flex:1;}
.ncf-textarea{width:100%;resize:none;height:52px;display:block;margin-bottom:6px;}
.ncf-actions{display:flex;gap:6px;}
.ncf-save,.ncf-cancel{
  flex:1;padding:5px;border-radius:5px;font-size:12px;font-weight:700;cursor:pointer;
  border:1px solid var(--border2);background:var(--surface3);color:var(--text-dim);
}
.ncf-save{border-color:var(--green-dim);color:var(--green);}

.notes-cards{flex:1;overflow-y:auto;padding:6px;}
.note-card{
  border:1px solid var(--border);border-radius:7px;padding:8px 10px;
  margin-bottom:6px;position:relative;
}
.note-card.npc{border-left:3px solid var(--gold);}
.note-card.threat{border-left:3px solid var(--fear);}
.note-card.loot{border-left:3px solid var(--green);}
.nc-type{font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:3px;}
.note-card.npc .nc-type{color:var(--gold);}
.note-card.threat .nc-type{color:var(--fear);}
.note-card.loot .nc-type{color:var(--green);}
.nc-name{font-size:14px;font-weight:700;color:var(--text-dim);margin-bottom:4px;}
.nc-notes{font-size:12px;color:var(--text-muted);line-height:1.5;white-space:pre-wrap;}
.nc-actions{position:absolute;top:6px;right:6px;display:flex;gap:4px;}
.nc-del,.nc-edit{
  background:transparent;border:none;font-size:12px;cursor:pointer;color:var(--text-muted);
  padding:2px 4px;
}
.nc-del:hover{color:var(--fear);}
.nc-edit:hover{color:var(--gold);}
```

- [ ] **Step 2: Add `§NOTES_TAB` JS** — after `§RULES_TAB`:

```js
// §NOTES_TAB ══════════════════════════════════════════════════════
// SESSION NOTES TAB — scratchpad + pinned cards
// ═════════════════════════════════════════════════════════════════
var _notesSaveTimer=null;
var _noteEditId=null;

function renderNotesTab(){
  var el=document.getElementById('tkp-notes');if(!el)return;
  el.innerHTML=
    '<div class="notes-scratchpad">'
    +'<div class="notes-scratchpad-label">Scratchpad</div>'
    +'<textarea class="notes-textarea" id="notes-textarea" placeholder="Notes…" oninput="scheduleNotesSave()"></textarea>'
    +'</div>'
    +'<div class="notes-pinned-header">'
    +'<span class="notes-pinned-title">Pinned Cards</span>'
    +'<button class="notes-add-card-btn" onclick="toggleNoteCardForm()">＋ Add Card</button>'
    +'</div>'
    +'<div class="notes-card-form" id="notes-card-form">'
    +'<div class="ncf-row">'
    +'<select class="ncf-select" id="ncf-type"><option value="npc">NPC</option><option value="threat">Threat</option><option value="loot">Loot</option></select>'
    +'<input class="ncf-input" id="ncf-name" placeholder="Name…">'
    +'</div>'
    +'<textarea class="ncf-textarea" id="ncf-notes" placeholder="Notes, stats, description…"></textarea>'
    +'<div class="ncf-actions">'
    +'<button class="ncf-save" onclick="saveNoteCard()">Pin Card</button>'
    +'<button class="ncf-cancel" onclick="toggleNoteCardForm()">Cancel</button>'
    +'</div></div>'
    +'<div class="notes-cards" id="notes-cards"></div>';
  // Load scratchpad
  db_get('toolkit_notes','scratchpad').then(function(rec){
    var ta=document.getElementById('notes-textarea');
    if(ta&&rec)ta.value=rec.text||'';
  }).catch(function(){});
  renderNoteCards();
}

function scheduleNotesSave(){
  clearTimeout(_notesSaveTimer);
  _notesSaveTimer=setTimeout(function(){
    var ta=document.getElementById('notes-textarea');if(!ta)return;
    db_put('toolkit_notes',{id:'scratchpad',text:ta.value}).catch(function(){});
  },500);
}

function toggleNoteCardForm(){
  document.getElementById('notes-card-form').classList.toggle('open');
}

function saveNoteCard(prefill){
  var type=prefill?prefill.type:(document.getElementById('ncf-type').value);
  var name=prefill?prefill.name:(document.getElementById('ncf-name').value.trim());
  var notes=prefill?prefill.notes:(document.getElementById('ncf-notes').value.trim());
  if(!name){showToast('Name is required.');return;}
  var rec={
    id:prefill?undefined:(_noteEditId||Date.now()+'_'+Math.random().toString(36).substr(2,4)),
    type:type,name:name,notes:notes,createdAt:new Date().toISOString()
  };
  if(!rec.id)rec.id=Date.now()+'_'+Math.random().toString(36).substr(2,4);
  db_put('toolkit_notes',rec).then(function(){
    showToast(_noteEditId?'Card updated.':'Card pinned.');
    _noteEditId=null;
    if(!prefill){
      document.getElementById('ncf-name').value='';
      document.getElementById('ncf-notes').value='';
      document.getElementById('notes-card-form').classList.remove('open');
    }
    renderNoteCards();
  });
}

function renderNoteCards(){
  var el=document.getElementById('notes-cards');if(!el)return;
  db_getAll('toolkit_notes').then(function(items){
    var cards=(items||[]).filter(function(n){return n.id!=='scratchpad'&&!n._rule;});
    if(!cards.length){el.innerHTML='<div style="padding:12px;font-size:13px;color:var(--text-muted)">No pinned cards yet.</div>';return;}
    el.innerHTML=cards.map(function(c){
      return '<div class="note-card '+escH(c.type)+'">'
        +'<div class="nc-actions">'
        +'<button class="nc-edit" data-ncedit="'+escH(c.id)+'">✎</button>'
        +'<button class="nc-del" data-ncdel="'+escH(c.id)+'">×</button>'
        +'</div>'
        +'<div class="nc-type">'+escH(c.type)+'</div>'
        +'<div class="nc-name">'+escH(c.name)+'</div>'
        +(c.notes?'<div class="nc-notes">'+escH(c.notes)+'</div>':'')
        +'</div>';
    }).join('');
  }).catch(function(){});
}

function deleteNoteCard(id){
  if(!confirm('Remove this card?'))return;
  db_delete('toolkit_notes',id).then(function(){renderNoteCards();showToast('Card removed.');});
}

// Pin a card from generators — exposed for use in Generators tab
function pinToNotes(type,name,notes){
  saveNoteCard({type:type,name:name,notes:notes||''});
}

// Event delegation for note card edit/delete
document.addEventListener('click',function(e){
  var nedit=e.target.closest('[data-ncedit]');
  if(nedit){
    db_get('toolkit_notes',nedit.dataset.ncedit).then(function(rec){
      if(!rec)return;
      _noteEditId=rec.id;
      document.getElementById('ncf-type').value=rec.type||'npc';
      document.getElementById('ncf-name').value=rec.name||'';
      document.getElementById('ncf-notes').value=rec.notes||'';
      document.getElementById('notes-card-form').classList.add('open');
    });
    return;
  }
  var ndel=e.target.closest('[data-ncdel]');
  if(ndel){deleteNoteCard(ndel.dataset.ncdel);return;}
});
```

- [ ] **Step 3: Verify** — open the Notes tab. Type in the scratchpad, wait ~0.5s, reload — text should persist. Click "+ Add Card", fill as NPC, save. Card should appear with gold left border. Click × to remove it.

- [ ] **Step 4: Commit**

```bash
git add app.js styles.css
git commit -m "feat: Session Notes tab with scratchpad and pinned NPC/Threat/Loot cards"
```

---

## Task 4: Generators Tab — Shell + NPC Name Generator

**Spec reference:** "Tab 3: Generators" and "Generator 3a: NPC Name Generator" + "Implementation Notes: NPC Name Generator (Offline)" in spec.

**Files:**
- Modify: `app.js` — add `§GENERATORS` section with tab shell + NAME_PARTS + generator function
- Modify: `styles.css` — add `§GENERATORS` CSS

- [ ] **Step 1: Add `§GENERATORS` CSS** — append after `§NOTES_TAB`:

```css
/* §GENERATORS ═══════════════════════════════════════════════════
   GENERATORS TAB
═══════════════════════════════════════════════ */
.gen-section{border-bottom:1px solid var(--border);}
.gen-section-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:10px 12px;cursor:pointer;transition:background .15s;
}
.gen-section-header:hover{background:var(--surface2);}
.gen-section-title{font-family:'Cinzel',serif;font-size:13px;letter-spacing:.06em;color:var(--text-dim);}
.gen-section-body{display:none;padding:10px 12px;}
.gen-section-body.open{display:block;}

/* NPC Name Generator */
.gen-chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;}
.gen-chip{
  padding:3px 10px;border-radius:20px;border:1px solid var(--border2);
  background:transparent;color:var(--text-muted);font-size:12px;cursor:pointer;
  font-family:'Crimson Pro',serif;transition:all .15s;
}
.gen-chip.active{background:var(--surface3);border-color:var(--gold-dim);color:var(--gold);}
.gen-btn{
  width:100%;padding:7px;border-radius:7px;margin-bottom:10px;
  background:var(--surface2);border:1px solid var(--border2);
  color:var(--text-dim);font-size:14px;font-weight:700;cursor:pointer;
  font-family:'Crimson Pro',serif;transition:all .15s;
}
.gen-btn:hover{border-color:var(--gold-dim);color:var(--gold);}
.gen-results{display:flex;flex-direction:column;gap:4px;}
.gen-result-row{
  display:flex;align-items:center;gap:6px;
  background:var(--surface2);border:1px solid var(--border);
  border-radius:6px;padding:6px 10px;
}
.gen-result-name{flex:1;font-size:14px;color:var(--text-dim);}
.gen-copy-btn,.gen-pin-btn{
  padding:2px 8px;border-radius:4px;font-size:11px;cursor:pointer;
  border:1px solid var(--border2);background:transparent;color:var(--text-muted);
  transition:all .15s;
}
.gen-copy-btn:hover{color:var(--gold);border-color:var(--gold-dim);}
.gen-pin-btn:hover{color:var(--green);border-color:var(--green-dim);}

/* Loot Roller */
.gen-row{display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;}
.gen-label{font-size:12px;color:var(--text-muted);white-space:nowrap;}
.gen-select{
  background:var(--surface3);border:1px solid var(--border2);color:var(--text);
  padding:4px 8px;border-radius:5px;font-size:13px;
}
```

- [ ] **Step 2: Add `§GENERATORS` JS — NAME_PARTS + shell** — after `§NOTES_TAB`:

```js
// §GENERATORS ════════════════════════════════════════════════════
// GENERATORS TAB — NPC Names, Loot Roller, Environment Stat Blocks
// ═════════════════════════════════════════════════════════════════

// ── NAME_PARTS ──────────────────────────────────────────────────
// Spec: "Implementation Notes: NPC Name Generator"
// Each style needs min 8 entries per slot (pre/mid/suf).
var NAME_PARTS={
  northern:{
    pre:['Bjorn','Ulf','Sig','Hald','Gunnar','Ragnar','Ivar','Leif','Tor','Dag'],
    mid:['mar','rik','var','ald','bjorn','ulf','hild','grim'],
    suf:['en','heim','son','sten','gar','dor','ulf','ar']
  },
  sylvan:{
    pre:['Ael','Thal','Syl','Mir','Lith','Fen','Aer','Cal','Elys','Tir'],
    mid:['ora','ith','an','aria','wen','dor','ael','ian'],
    suf:['el','ia','wen','ith','ara','or','ael','dan']
  },
  dwarven:{
    pre:['Dor','Brom','Thur','Grim','Kor','Beld','Nor','Mag','Dur','Har'],
    mid:['gar','dur','bal','nar','gor','bel','und','kar'],
    suf:['in','ak','dim','ur','ik','on','din','ar']
  },
  eastern:{
    pre:['Kas','Rha','Yev','Tal','Zar','Mir','Shan','Bek','Kira','Jal'],
    mid:['ara','ini','ous','ira','ani','esh','ali','uri'],
    suf:['ar','an','os','im','ur','ash','ir','on']
  },
  arcane:{
    pre:['Zar','Vel','Nyx','Aur','Mor','Xan','Vis','Kael','Zer','Lix'],
    mid:['ith','ael','on','var','ix','eth','ael','or'],
    suf:['ix','ex','ax','or','is','um','yx','on']
  },
  common:{
    pre:['Mar','Ren','Dal','Cor','Bren','Will','Ash','Tam','Jay','Cole'],
    mid:['win','ton','ley','wick','ford','brook','dale','wood'],
    suf:['y','er','on','en','ie','ley','son','wick']
  }
};

var _nameStyle='common';

function _genName(style){
  var parts=NAME_PARTS[style]||NAME_PARTS.common;
  var roll=Math.random();
  var pre=parts.pre[Math.floor(Math.random()*parts.pre.length)];
  var suf=parts.suf[Math.floor(Math.random()*parts.suf.length)];
  if(roll<0.33){
    var mid=parts.mid[Math.floor(Math.random()*parts.mid.length)];
    return pre+mid+suf;
  } else if(roll<0.66){
    return pre+suf;
  } else {
    var mid2=parts.mid[Math.floor(Math.random()*parts.mid.length)];
    return pre+mid2;
  }
}

function generateNames(){
  var names=[];
  for(var i=0;i<5;i++){
    var n=_genName(_nameStyle);
    n=n.charAt(0).toUpperCase()+n.slice(1).toLowerCase();
    // Capitalize internal capitals (for compound starts like 'Bjorn')
    names.push(n);
  }
  var el=document.getElementById('name-gen-results');if(!el)return;
  el.innerHTML=names.map(function(n){
    return '<div class="gen-result-row">'
      +'<span class="gen-result-name">'+escH(n)+'</span>'
      +'<button class="gen-copy-btn" onclick="navigator.clipboard.writeText(\''+escH(n)+'\').then(function(){showToast(\'Copied!\');})">Copy</button>'
      +'<button class="gen-pin-btn" onclick="pinToNotes(\'npc\',\''+escH(n)+'\',\'\');showToast(\'Pinned as NPC.\')">Pin</button>'
      +'</div>';
  }).join('');
}

var _genRendered=false;

function renderGeneratorsTab(){
  _genRendered=true;
  var el=document.getElementById('tkp-gen');if(!el)return;
  el.innerHTML=
    // ── NPC Name Generator ──
    '<div class="gen-section">'
    +'<div class="gen-section-header" onclick="toggleGenSection(\'gen-names\')">'
    +'<span class="gen-section-title">👤 NPC Name Generator</span><span id="gchev-names">▼</span>'
    +'</div>'
    +'<div class="gen-section-body" id="gen-names">'
    +'<div class="gen-chips" id="name-style-chips">'
    +Object.keys(NAME_PARTS).map(function(s){
      return '<button class="gen-chip'+(s===_nameStyle?' active':'')+'" onclick="setNameStyle(\''+s+'\')">'
        +s.charAt(0).toUpperCase()+s.slice(1)+'</button>';
    }).join('')
    +'</div>'
    +'<button class="gen-btn" onclick="generateNames()">Generate Names</button>'
    +'<div class="gen-results" id="name-gen-results"></div>'
    +'</div></div>'
    // ── Loot Roller ──
    +'<div class="gen-section">'
    +'<div class="gen-section-header" onclick="toggleGenSection(\'gen-loot\')">'
    +'<span class="gen-section-title">💰 Loot Roller</span><span id="gchev-loot">▼</span>'
    +'</div>'
    +'<div class="gen-section-body" id="gen-loot">'
    +'<div class="gen-row">'
    +'<span class="gen-label">Tier:</span>'
    +'<select class="gen-select" id="loot-tier"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select>'
    +'<span class="gen-label">Qty:</span>'
    +'<select class="gen-select" id="loot-qty"><option value="1d4">1d4</option><option value="1d6">1d6</option><option value="2">2</option><option value="3">3</option></select>'
    +'</div>'
    +'<button class="gen-btn" onclick="rollLoot()">Roll Loot</button>'
    +'<div class="gen-results" id="loot-results"></div>'
    +'</div></div>'
    // ── Environment Generator ──
    +'<div class="gen-section">'
    +'<div class="gen-section-header" onclick="toggleGenSection(\'gen-env\')">'
    +'<span class="gen-section-title">🌍 Environment Generator</span><span id="gchev-env">▼</span>'
    +'</div>'
    +'<div class="gen-section-body" id="gen-env" style="padding:0;">'
    +'<div id="env-gen-ui"></div>'
    +'</div></div>'
    // ── Generator Library ──
    +'<div class="gen-section">'
    +'<div class="gen-section-header" onclick="toggleGenSection(\'gen-library\')">'
    +'<span class="gen-section-title">📚 Environment Library</span><span id="gchev-library">▼</span>'
    +'</div>'
    +'<div class="gen-section-body" id="gen-library"></div>'
    +'</div>';
}

function setNameStyle(style){
  _nameStyle=style;
  document.querySelectorAll('#name-style-chips .gen-chip').forEach(function(b){
    b.classList.toggle('active',b.textContent.toLowerCase()===style);
  });
}

function toggleGenSection(id){
  var body=document.getElementById(id);
  var chev=document.getElementById('gchev-'+id.replace('gen-',''));
  if(!body)return;
  body.classList.toggle('open');
  if(chev)chev.textContent=body.classList.contains('open')?'▲':'▼';
}
```

- [ ] **Step 3: Verify** — open Generators tab. Click "NPC Name Generator" header to expand. Click "Generate Names". Five names should appear with Copy and Pin buttons. Click different style chips and regenerate. Click Pin — toast should confirm "Pinned as NPC."

- [ ] **Step 4: Commit**

```bash
git add app.js styles.css
git commit -m "feat: Generators tab shell and NPC Name Generator"
```

---

## Task 5: Loot Roller

**Spec reference:** "Generator 3b: Loot Roller" and "Implementation Notes: Loot Generator" in spec. Each tier needs minimum 12 entries. Implementer must author the content; the structure below is the template.

**Files:**
- Modify: `app.js` — add LOOT_TABLES + rollLoot() after the NAME_PARTS block

- [ ] **Step 1: Add LOOT_TABLES + rollLoot to `app.js`** — after the `_genName` function:

```js
// Spec: "Implementation Notes: Loot Generator (Offline)"
// Each tier needs min 12 entries. See spec for tier-appropriate item guidance.
// IMPLEMENTER: author at least 12 entries per tier following spec descriptions
// (gold amounts, consumables, gear, oddities appropriate to each tier).
var LOOT_TABLES={
  1:[
    'Handful of gold (1d6 × 5 gp)',
    'Healing potion (clear 1 HP)',
    'Bundle of torches (8)',
    'Hempen rope (50 ft)',
    'Rations (1 week)',
    'Thieves\' tools (worn)',
    'Strange carved bone token',
    'Vial of antitoxin',
    'Traveler\'s cloak (stained)',
    'Lucky rabbit\'s foot (+1 to one roll, once)',
    'Cracked lantern (still works)',
    'Bag of caltrops (20)'
  ],
  2:[
    'Pouch of gold (2d6 × 10 gp)',
    'Improved healing tonic (clear 2 HP)',
    'Enchanted arrow quiver (1d8 arrows)',
    'Whetstone of sharpness (weapon +1 dmg for 1 encounter)',
    'Spy glass (collapsible)',
    'Map of a nearby dungeon (partially accurate)',
    'Vial of alchemist\'s fire',
    'Silver-tipped crossbow bolts (10)',
    'Finely crafted leather gloves',
    'Potion of feather falling',
    'Set of loaded dice (weighted)',
    'Signet ring (minor noble family)'
  ],
  3:[
    'Gold ingot (3d6 × 25 gp)',
    'Rare healing elixir (clear all HP)',
    'Enchanted weapon component (upgrade one weapon)',
    'Scroll of a Tier 2 spell',
    'Cloak of elvenkind (advantage on Stealth)',
    'Portable hole (2 ft diameter)',
    'Vial of dragon bile (1d12+4 mag, single use)',
    'Ring of feather falling (permanent)',
    'Masterwork artisan\'s tools',
    'Ancient coin hoard (worth 300 gp to a collector)',
    'Bottled storm (thunderclap, 30 ft, once)',
    'Spellbook (3 Tier 1-2 spells, incomplete)'
  ],
  4:[
    'Legendary artifact fragment (GM-defined effect)',
    'Chest of gold (4d6 × 100 gp)',
    'Divine relic (radiant aura, specific worship)',
    'Crystal of true sight (1 use)',
    'Sword of ancient kings (+2, fear aura once per day)',
    'Tome of forbidden knowledge (+1 trait, costs a Scar)',
    'Bottled deity whisper (advantage on one action, lasts 1 session)',
    'Staff of the ley line (recharge one spell slot)',
    'Phylactery of a lich (very dangerous, very valuable)',
    'Plane-touched ore (craft one legendary item)',
    'Mantle of the astral traveler',
    'Crown fragment of a fallen empire'
  ]
};

function _rollDice(expr){
  var m=expr.match(/^(\d+)d(\d+)$/);
  if(m){
    var n=parseInt(m[1]),d=parseInt(m[2]),t=0;
    for(var i=0;i<n;i++)t+=Math.floor(Math.random()*d)+1;
    return t;
  }
  return parseInt(expr)||1;
}

function rollLoot(){
  var tier=parseInt(document.getElementById('loot-tier').value)||1;
  var qtyExpr=document.getElementById('loot-qty').value;
  var count=_rollDice(qtyExpr);
  var table=LOOT_TABLES[tier]||LOOT_TABLES[1];
  var shuffled=table.slice().sort(function(){return Math.random()-.5;});
  var items=shuffled.slice(0,Math.min(count,table.length));
  var el=document.getElementById('loot-results');if(!el)return;
  el.innerHTML=items.map(function(item){
    return '<div class="gen-result-row">'
      +'<span class="gen-result-name" style="font-size:12px">'+escH(item)+'</span>'
      +'<button class="gen-pin-btn" onclick="pinToNotes(\'loot\',\'Loot — T'+tier+'\',\''+escH(items.join('\\n'))+'\');showToast(\'Pinned.\')">Pin</button>'
      +'</div>';
  }).join('');
}
```

- [ ] **Step 2: Verify** — expand Loot Roller section. Select Tier 2, quantity 1d4, click Roll. 1-4 items should appear. Click Pin — a Loot card should appear in Session Notes.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: Loot Roller with tiered tables and pin-to-notes"
```

---

## Task 6: Environment Stat Block Generator

**Spec reference:** "Generator 3c: Environment Stat Block Generator", "Official Daggerheart Environment Stat Block Format", and "Implementation Notes: Environment Generator (Offline)" in spec.

**Files:**
- Modify: `app.js` — add ENV_DATA, ENV_DMG, TIER_ADJ, ENV_DIFFICULTY, OFFICIAL_ENVIRONMENTS, and environment generator functions after the loot roller
- Modify: `styles.css` — add env stat block display styles

This is the largest single task. Keep commits frequent.

- [ ] **Step 1: Add environment generator CSS** — append to `§GENERATORS` CSS in `styles.css`:

```css
/* Environment Generator */
.env-gen-inner{padding:10px 12px;}
.env-seed-chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;}
.env-controls{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;}
.env-stat-block{
  background:var(--surface2);border:1px solid var(--border2);border-radius:8px;
  padding:12px;margin-top:10px;font-size:13px;
}
.esb-name{
  font-family:'Cinzel',serif;font-size:16px;font-weight:700;color:var(--text);
  margin-bottom:2px;
}
.esb-meta{color:var(--text-muted);font-size:11px;margin-bottom:8px;letter-spacing:.04em;}
.esb-desc{font-style:italic;color:var(--text-dim);margin-bottom:10px;line-height:1.5;}
.esb-section-title{
  font-size:10px;text-transform:uppercase;letter-spacing:.1em;
  color:var(--text-muted);margin-bottom:4px;
}
.esb-impulses{margin-bottom:10px;}
.esb-impulse{color:var(--text-dim);line-height:1.5;}
.esb-stat-line{margin-bottom:8px;color:var(--text-muted);}
.esb-features{margin-top:8px;}
.esb-feature{
  border-top:1px solid var(--border);padding:6px 0;
}
.esb-feat-badge{
  display:inline-block;font-size:10px;font-weight:700;text-transform:uppercase;
  letter-spacing:.06em;padding:1px 6px;border-radius:3px;margin-right:6px;
}
.esb-feat-badge.passive{background:rgba(90,158,114,.2);color:var(--green);}
.esb-feat-badge.action{background:rgba(212,168,67,.2);color:var(--gold);}
.esb-feat-badge.reaction{background:rgba(110,86,168,.2);color:var(--arcane-hi);}
.esb-feat-badge.fear{background:rgba(200,64,58,.2);color:var(--fear);}
.esb-feat-name{font-weight:700;color:var(--text-dim);}
.esb-feat-text{color:var(--text-muted);line-height:1.5;margin-top:3px;}
.esb-actions{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;}
.esb-btn{
  flex:1;padding:5px 8px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;
  border:1px solid var(--border2);background:var(--surface3);color:var(--text-muted);
  transition:all .15s;font-family:'Crimson Pro',serif;
}
.esb-btn:hover{border-color:var(--gold-dim);color:var(--gold);}
.lib-card{
  background:var(--surface2);border:1px solid var(--border);border-radius:7px;
  padding:8px 10px;margin-bottom:6px;
}
.lib-card-header{display:flex;align-items:center;gap:6px;margin-bottom:4px;}
.lib-card-name{flex:1;font-size:14px;font-weight:700;color:var(--text-dim);}
.lib-tier-badge,.lib-type-badge{
  font-size:10px;padding:2px 7px;border-radius:10px;
  border:1px solid var(--border2);color:var(--text-muted);
}
.lib-card-actions{display:flex;gap:5px;}
.lib-btn{
  padding:2px 8px;border-radius:4px;font-size:11px;cursor:pointer;
  border:1px solid var(--border2);background:transparent;color:var(--text-muted);
}
.lib-btn:hover{color:var(--gold);border-color:var(--gold-dim);}
.lib-btn.del:hover{color:var(--fear);border-color:var(--fear-dim);}
.lib-add-official{display:flex;gap:6px;margin-bottom:10px;align-items:center;flex-wrap:wrap;}
.lib-add-official select{flex:1;background:var(--surface3);border:1px solid var(--border2);color:var(--text);padding:5px 8px;border-radius:5px;font-size:13px;}
```

- [ ] **Step 2: Add ENV_DATA and constants to `app.js`** — after `rollLoot()`:

```js
// ── Environment Generator Data ──────────────────────────────────
// Spec: "Implementation Notes: Environment Generator (Offline)"
// Data structure per spec. Each seed: names(8+), descs(6+), impulses(8+),
// adversaries(6+), passives(6+), actions(6+), reactions(6+), fears(4+),
// feat_names.{passive,action,reaction,fear}(4+ each).
// {tier_adj} token in descs replaced at generation time.
// {dmg} token in feature text replaced with ENV_DMG[tier].
//
// IMPLEMENTER: Author all content following this structure.
// Two seeds (forest, cave) are provided in full as examples.
// Repeat the same structure for: mountain, city, ruins, coast,
// underground, swamp, desert, arcane, cursed.

var TIER_ADJ={1:'unsettling',2:'treacherous',3:'deadly',4:'legendary'};
var ENV_DMG={1:'1d8+2',2:'2d8+2',3:'3d8+3',4:'4d8+4'};
var ENV_DIFFICULTY={1:11,2:14,3:17,4:20};

var ENV_DATA={
  forest:{
    names:['The Whispering Canopy','Thornwood Hollow','The Verdant Labyrinth',
           'Ashwood Reach','The Dreaming Grove','Silverleaf Expanse',
           'Rootmire Depths','The Ancient Boughs'],
    descs:[
      'A {tier_adj} woodland where the trees seem to watch every step you take.',
      'Ancient roots twist through soil black with centuries of decay, the {tier_adj} canopy blocking all light.',
      'The trees here grow impossibly close together, their branches weaving a {tier_adj} net overhead.',
      'Moss-covered stones mark old paths that lead nowhere reassuring — the forest is {tier_adj} and alive.',
      'Pale fungi cluster around the roots of silver-barked trees in this {tier_adj} and breathless place.',
      'The wind through the leaves sounds almost like language in this {tier_adj} stretch of ancient wood.'
    ],
    impulses:[
      'Consume the light; let the dark reclaim what was taken.',
      'Entangle the unwary; the forest feeds slowly.',
      'Protect what grows here from those who would cut it down.',
      'Draw travelers deeper until they lose their way entirely.',
      'Remember every creature that has walked these paths.',
      'Reclaim the ruins buried beneath the roots.',
      'Silence falls where the old ones slumber.',
      'The canopy turns all paths back upon themselves.'
    ],
    adversaries:['Thornback wolves','Bark wraiths','Feral druids','Vine horrors','Spriggan wardens','Ancient treants'],
    passives:[
      'Difficult Terrain — the forest floor is choked with roots; movement costs double.',
      'Tangled Paths — without a guide, travelers making navigation rolls treat Difficulty as +2.',
      'Canopy Darkness — ranged attacks beyond Close range have disadvantage during the day; beyond Very Close at night.',
      'Resonant Roots — magical effects cast here persist for one additional round after concentration ends.',
      'Living Memory — the forest reveals the history of anyone who sits quietly for 10 minutes.',
      'Thorned Undergrowth — creatures who move More than Close in a single action mark 1 Stress.'
    ],
    actions:[
      'Ensnaring Roots — roots burst from the ground; one target in Close range makes a Strength roll (DC as environment) or is Restrained. {dmg} physical on failure.',
      'Falling Branch — a massive limb drops on a target in Close range. {dmg} physical. Strength roll (DC) to halve.',
      'Blinding Spores — a cloud of spores fills the area. All creatures in Very Close range have disadvantage on attack rolls until they spend an action to clear their eyes.',
      'Bog Mist — a thick fog rises. All creatures treat Far range as Very Far and Very Close as Close for targeting purposes until the end of the next round.',
      'Swarming Insects — a swarm descends on one target. {dmg} physical, and the target marks 1 Stress.',
      'Thrown Stone — a sling-stone from an unseen attacker. {dmg} physical, target pushed Very Close.'
    ],
    reactions:[
      'Protective Thorns — when a creature in the environment is targeted by a melee attack, they gain +2 to their Evasion until the start of their next turn.',
      'Root Grab — when a creature tries to run from a marked adversary, they must succeed on an Agility roll (DC as environment) or fall Prone.',
      'Canopy Shield — when a creature would be hit by a ranged attack, heavy foliage deflects: reduce damage by 1d6.',
      'Sudden Silence — when a creature casts a spell with a verbal component, they mark 1 Stress as the forest absorbs the sound.',
      'Rushing Water — when a creature is knocked back, they are pushed twice as far.',
      'Living Armor — when a creature in melee would be hit, bark and vine wrap around them: mark one Armor slot instead of HP once per round.'
    ],
    fears:[
      'The Hunger Wakes — Spend a Fear: all creatures in the environment hear something massive moving through the trees. Every creature marks 1 Stress. GM introduces a new adversary or escalates an existing one.',
      'Forest Maze — Spend a Fear: the paths shift. One PC loses the group and must make a navigation roll (DC as environment + 3) or be separated for 1d4 rounds.',
      'Wrath of the Ancient — Spend a Fear: the oldest tree in the area lashes out. All creatures in Close range take {dmg} physical and are Restrained until they spend an action to break free.',
      'Predator\'s Call — Spend a Fear: the forest calls its hunters. At the start of the next round, two additional Mook adversaries appropriate to this environment join the encounter.'
    ],
    feat_names:{
      passive:['Tangled Paths','Canopy Veil','Rooted Ground','Living Silence'],
      action:['Ensnaring Roots','Falling Branch','Blinding Spores','Swarming Insects'],
      reaction:['Protective Thorns','Canopy Shield','Root Grab','Living Armor'],
      fear:['The Hunger Wakes','Forest Maze','Wrath of the Ancient','Predator\'s Call']
    }
  },
  cave:{
    names:['The Hollow Dark','Shadowfang Caverns','The Dripping Underhalls',
           'Crystalmaw Depths','The Blind Descent','Echoing Pit',
           'The Bone Warren','Saltstone Delve'],
    descs:[
      'Dripping water and the distant sound of something breathing fill these {tier_adj} tunnels.',
      'The cave walls glisten with {tier_adj} moisture; every sound echoes back wrong.',
      'Strange phosphorescent growth lines the ceiling, casting a {tier_adj} pale light on everything.',
      'The passage narrows and widens unpredictably, a {tier_adj} maze carved by water over centuries.',
      'Cold air flows from deeper passages in this {tier_adj} place where no sunlight has reached in ages.',
      'Salt crystals line the walls, forming {tier_adj} shapes that almost look like faces.'
    ],
    impulses:[
      'Swallow the light; return all things to darkness.',
      'Echo every secret spoken aloud back to the wrong ears.',
      'The deep wants to be seen — and seen by no one.',
      'Everything that falls in here is kept.',
      'The cave breathes; it knows when you are afraid.',
      'What lives here has lived here longer than memory.',
      'Collapse is always one wrong step away.',
      'The passages remember who has walked them.'
    ],
    adversaries:['Giant cave spiders','Blind cave trolls','Shriekers','Darkling scouts','Stone golems','Albino cave serpents'],
    passives:[
      'Darkness — without a light source, creatures are Blinded beyond Very Close range.',
      'Uneven Floor — creatures moving faster than Close speed must make an Agility roll (DC as environment) or fall Prone.',
      'Echoing Sounds — Stealth checks have disadvantage; any sound louder than a whisper can be heard throughout the cavern.',
      'Low Ceiling — in sections marked by GM, jumping and flying are not possible.',
      'Cold Seep — each hour spent in the cave, PCs mark 1 Stress unless they have cold protection.',
      'Loose Rock — areas near blasting or heavy impacts can cause a cave-in (GM move: Collapse).'
    ],
    actions:[
      'Stalactite Drop — a massive spike falls. {dmg} physical to one target in Close range. Agility (DC) to halve.',
      'Blinding Dust — a cloud of powdered stone blinds all creatures in Very Close range until they spend an action to clear their eyes.',
      'Flooded Passage — a surge of underground water fills one path. Creatures must make a Strength roll (DC) or be pushed Close range and knocked Prone.',
      'Collapsing Ceiling — rubble fills a zone Close range. Creatures in the area take {dmg} physical and are Restrained. Strength (DC) to escape.',
      'Spike Trap — hidden spikes spring up. {dmg} physical to one target. Agility (DC) to avoid.',
      'Gas Vent — a toxic gas vent opens. All creatures in Very Close range mark 2 Stress.'
    ],
    reactions:[
      'Echoing Strike — when a creature misses an attack, the noise triggers a swarm; the attacker marks 1 Stress.',
      'Cave-In Warning — when a creature would be hit by an area effect, they can spend their reaction to dive behind rubble for half damage.',
      'Darkness Shroud — when a light source is extinguished, all creatures without darkvision have disadvantage on their next action.',
      'Pressure Crack — when a creature is knocked back into a wall, the impact causes a crack and they take additional 1d6 physical.',
      'Dripping Distraction — when a creature tries to concentrate on a task, the constant dripping causes them to mark 1 Stress.',
      'Narrow Escape — when a creature would be cornered, they may make a Finesse roll (DC) to find a hidden passage.'
    ],
    fears:[
      'The Deep Stirs — Spend a Fear: something massive shifts in the darkness below. Every creature marks 2 Stress. The encounter escalates.',
      'Total Darkness — Spend a Fear: all light sources are snuffed out simultaneously. Creatures without darkvision are Blinded until they relight a source.',
      'Partial Collapse — Spend a Fear: the ceiling gives way in one section. All creatures in the area take {dmg} physical and are Restrained. The passage is now blocked.',
      'The Watcher — Spend a Fear: a creature has been watching from the darkness for several rounds. It acts immediately, targeting the most isolated PC.'
    ],
    feat_names:{
      passive:['Darkness Absolute','Uneven Ground','Echoing Halls','Cold Seep'],
      action:['Stalactite Drop','Blinding Dust','Flooded Passage','Collapsing Ceiling'],
      reaction:['Echoing Strike','Darkness Shroud','Pressure Crack','Narrow Escape'],
      fear:['The Deep Stirs','Total Darkness','Partial Collapse','The Watcher']
    }
  }
  // IMPLEMENTER: Add the following seeds following the exact same structure above:
  // mountain, city, ruins, coast, underground, swamp, desert, arcane, cursed
  // Min counts per array: names(8), descs(6), impulses(8), adversaries(6),
  // passives(6), actions(6), reactions(6), fears(4), feat_names.*(4 each)
};

// Official Environments from Daggerheart Core Rulebook, pp. 243-247.
// IMPLEMENTER: Read those pages and extract every stat block into this array.
// Each entry follows the generator_library record shape (minus id and savedAt).
// Known entries include Burning Heart of the Wood, Abandoned Grove, Ruins of Nix.
// This is a required deliverable — do not leave as empty array.
var OFFICIAL_ENVIRONMENTS=[];
```

- [ ] **Step 3: Add environment generator functions** — after ENV_DATA in `app.js`:

```js
var _envSeed='forest';
var _envTier=1;
var _envType='Traversal';
var _currentEnvBlock=null;
var _editingEnvId=null;

function renderEnvGenerator(){
  var el=document.getElementById('env-gen-ui');if(!el)return;
  var seeds=Object.keys(ENV_DATA);
  el.innerHTML='<div class="env-gen-inner">'
    +'<div class="env-seed-chips">'+seeds.map(function(s){
      return '<button class="gen-chip'+(s===_envSeed?' active':'')+'" onclick="setEnvSeed(\''+s+'\')">'
        +s.charAt(0).toUpperCase()+s.slice(1)+'</button>';
    }).join('')+'</div>'
    +'<div class="env-controls">'
    +'<select class="gen-select" id="env-tier" onchange="_envTier=parseInt(this.value)">'
    +'<option value="1">Tier 1</option><option value="2">Tier 2</option>'
    +'<option value="3">Tier 3</option><option value="4">Tier 4</option>'
    +'</select>'
    +'<select class="gen-select" id="env-type" onchange="_envType=this.value">'
    +'<option>Traversal</option><option>Exploration</option>'
    +'<option>Social</option><option>Event</option>'
    +'</select>'
    +'</div>'
    +'<button class="gen-btn" onclick="generateEnv()">Generate Environment</button>'
    // Advanced Options (collapsed by default)
    +'<details style="margin-bottom:8px;font-size:12px;color:var(--text-muted)">'
    +'<summary style="cursor:pointer;padding:4px 0;color:var(--text-muted)">Advanced Options</summary>'
    +'<div style="padding:8px 0;display:flex;flex-direction:column;gap:6px">'
    +'<div class="gen-row"><span class="gen-label">Difficulty override:</span>'
    +'<input type="number" id="env-dc-override" class="gen-select" style="width:60px" placeholder="auto" min="1" max="30"></div>'
    +'<div class="gen-row"><span class="gen-label">Feature count:</span>'
    +'<input type="number" id="env-feat-count" class="gen-select" style="width:60px" value="3" min="1" max="6"></div>'
    +'<div class="gen-row" style="gap:10px">'
    +'<label><input type="checkbox" id="env-feat-passive" checked> Passive</label>'
    +'<label><input type="checkbox" id="env-feat-action" checked> Action</label>'
    +'<label><input type="checkbox" id="env-feat-reaction" checked> Reaction</label>'
    +'<label><input type="checkbox" id="env-feat-fear" checked> Fear</label>'
    +'</div>'
    +'<div class="gen-row"><span class="gen-label">Adversary hint:</span>'
    +'<input type="text" id="env-adv-override" class="gen-select" style="flex:1" placeholder="e.g. bandits, wolves"></div>'
    +'</div></details>'
    +'<div id="env-result"></div>'
    +'</div>';
}

function setEnvSeed(seed){
  _envSeed=seed;
  document.querySelectorAll('.env-seed-chips .gen-chip').forEach(function(b){
    b.classList.toggle('active',b.textContent.toLowerCase()===seed);
  });
}

function _pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function _pickN(arr,n){
  var s=arr.slice().sort(function(){return Math.random()-.5;});
  return s.slice(0,n);
}

function generateEnv(){
  var data=ENV_DATA[_envSeed];
  if(!data){showToast('No data for this seed yet.');return;}
  var tier=_envTier;
  var tierAdj=TIER_ADJ[tier]||'dangerous';
  var dmg=ENV_DMG[tier]||'1d8+2';
  var dc=ENV_DIFFICULTY[tier]||11;
  var name=_pick(data.names);
  var desc=_pick(data.descs).replace(/\{tier_adj\}/g,tierAdj);
  var impulses=_pickN(data.impulses,2);
  var adversaries=_pickN(data.adversaries,3).join(', ');
  // Read advanced options (fall back to defaults if elements not present)
  var dcOverrideEl=document.getElementById('env-dc-override');
  var dcOverride=dcOverrideEl&&dcOverrideEl.value?parseInt(dcOverrideEl.value):null;
  var featCountEl=document.getElementById('env-feat-count');
  var featureCount=featCountEl?Math.min(6,Math.max(1,parseInt(featCountEl.value)||3)):3;
  var advHintEl=document.getElementById('env-adv-override');
  var advHint=advHintEl&&advHintEl.value.trim()?advHintEl.value.trim():null;
  // Build allowed types from checkboxes
  var allWeights=[{type:'passive',w:40},{type:'action',w:30},{type:'reaction',w:20},{type:'fear',w:10}];
  var weights=allWeights.filter(function(w){
    var cb=document.getElementById('env-feat-'+w.type);
    return !cb||cb.checked;
  });
  if(!weights.length)weights=allWeights; // fallback: all types if all unchecked

  if(dcOverride)dc=dcOverride;
  if(advHint)adversaries=advHint;

  var features=[];
  // Re-normalise weights to 100
  var total=weights.reduce(function(s,w){return s+w.w;},0);
  for(var i=0;i<featureCount;i++){
    var roll=Math.random()*total;
    var cumul=0;var ftype=weights[0].type;
    for(var j=0;j<weights.length;j++){cumul+=weights[j].w;if(roll<cumul){ftype=weights[j].type;break;}}
    var fname=_pick(data.feat_names[ftype]);
    var fpool=ftype==='fear'?data.fears:data[ftype+'s'];
    var ftext=_pick(fpool).replace(/\{dmg\}/g,dmg);
    features.push({type:ftype,name:fname,text:ftext});
  }
  _currentEnvBlock={name,tier,type:_envType,desc,impulses,dc,adversaries,features,seed:_envSeed};
  _editingEnvId=null;
  renderEnvBlock(_currentEnvBlock,'env-result',false);
}

function renderEnvBlock(env,targetId,readOnly){
  var el=document.getElementById(targetId);if(!el)return;
  var featHtml=env.features.map(function(f){
    return '<div class="esb-feature">'
      +'<span class="esb-feat-badge '+f.type+'">'+f.type+'</span>'
      +'<span class="esb-feat-name">'+escH(f.name)+'</span>'
      +'<div class="esb-feat-text">'+escH(f.text)+'</div>'
      +'</div>';
  }).join('');
  // When editing an existing library entry, show both Save (overwrite) and Save as New
  var saveButtons=_editingEnvId
    ?'<button class="esb-btn" onclick="saveEnvToLibrary(false)">Save (Update)</button>'
     +'<button class="esb-btn" onclick="saveEnvToLibrary(true)">Save as New</button>'
    :'<button class="esb-btn" onclick="saveEnvToLibrary(false)">Save to Library</button>';
  var actHtml=readOnly?''
    :'<div class="esb-actions">'
    +saveButtons
    +'<button class="esb-btn" onclick="pinEnvToNotes()">Pin to Notes</button>'
    +'<button class="esb-btn" onclick="copyEnvText()">Copy Text</button>'
    +'<button class="esb-btn" onclick="generateEnv()">Regenerate</button>'
    +'</div>';
  el.innerHTML='<div class="env-stat-block">'
    +'<div class="esb-name">'+escH(env.name)+'</div>'
    +'<div class="esb-meta">Tier '+env.tier+' · '+escH(env.type)+'</div>'
    +'<div class="esb-desc">'+escH(env.desc)+'</div>'
    +'<div class="esb-section-title">Impulses</div>'
    +'<div class="esb-impulses">'+env.impulses.map(function(i){return '<div class="esb-impulse">• '+escH(i)+'</div>';}).join('')+'</div>'
    +'<div class="esb-stat-line">Difficulty: <strong>'+env.dc+'</strong></div>'
    +'<div class="esb-stat-line">Potential Adversaries: '+escH(env.adversaries)+'</div>'
    +'<div class="esb-features">'+featHtml+'</div>'
    +actHtml
    +'</div>';
}

function saveEnvToLibrary(asNew){
  if(!_currentEnvBlock)return;
  var id=(asNew||!_editingEnvId)?('env_'+Date.now()):_editingEnvId;
  var rec=Object.assign({},_currentEnvBlock,{id:id,savedAt:new Date().toISOString()});
  db_put('generator_library',rec).then(function(){
    showToast((!asNew&&_editingEnvId)?'Environment updated.':'"'+rec.name+'" saved to library.');
    if(!asNew)_editingEnvId=null;
    renderEnvLibrary();
  });
}

function pinEnvToNotes(){
  if(!_currentEnvBlock)return;
  pinToNotes('threat',_currentEnvBlock.name,
    'T'+_currentEnvBlock.tier+' '+_currentEnvBlock.type+' | DC '+_currentEnvBlock.dc);
  showToast('Pinned to Notes.');
}

function copyEnvText(){
  if(!_currentEnvBlock)return;
  var env=_currentEnvBlock;
  var text=env.name+'\nTier '+env.tier+' · '+env.type
    +'\n\n'+env.desc
    +'\n\nIMPULSES\n'+env.impulses.map(function(i){return '• '+i;}).join('\n')
    +'\n\nDifficulty: '+env.dc
    +'\nPotential Adversaries: '+env.adversaries
    +'\n\n'+env.features.map(function(f){return f.type.toUpperCase()+' — '+f.name+'\n'+f.text;}).join('\n\n');
  navigator.clipboard.writeText(text).then(function(){showToast('Copied to clipboard.');});
}

function renderEnvLibrary(){
  var el=document.getElementById('gen-library');if(!el||!document.getElementById('gen-library').classList.contains('open'))return;
  var officialSelect='<div class="lib-add-official">'
    +'<select id="official-env-select">'
    +OFFICIAL_ENVIRONMENTS.map(function(e,i){return '<option value="'+i+'">'+escH(e.name)+'</option>';}).join('')
    +'</select>'
    +'<button class="gen-btn" style="flex:0;white-space:nowrap;padding:5px 10px" onclick="addOfficialEnv()">Add to Library</button>'
    +'</div>';
  db_getAll('generator_library').then(function(encs){
    el.innerHTML=(OFFICIAL_ENVIRONMENTS.length?officialSelect:'')
      +(encs&&encs.length?encs.map(function(env){
        return '<div class="lib-card">'
          +'<div class="lib-card-header">'
          +'<span class="lib-card-name">'+escH(env.name)+'</span>'
          +'<span class="lib-tier-badge">T'+env.tier+'</span>'
          +'<span class="lib-type-badge">'+escH(env.type)+'</span>'
          +'</div>'
          +'<div class="lib-card-actions">'
          +'<button class="lib-btn" data-envload="'+escH(env.id)+'">Edit</button>'
          +'<button class="lib-btn" data-envpin="'+escH(env.id)+'">Pin</button>'
          +'<button class="lib-btn del" data-envdel="'+escH(env.id)+'">Delete</button>'
          +'</div></div>';
      }).join(''):'<div style="padding:8px;font-size:13px;color:var(--text-muted)">Library is empty.</div>');
  });
}

function addOfficialEnv(){
  var sel=document.getElementById('official-env-select');if(!sel)return;
  var env=OFFICIAL_ENVIRONMENTS[parseInt(sel.value)];if(!env)return;
  var rec=Object.assign({},env,{id:'env_'+Date.now(),savedAt:new Date().toISOString()});
  db_put('generator_library',rec).then(function(){showToast('"'+rec.name+'" added to library.');renderEnvLibrary();});
}

// Event delegation for env library actions
document.addEventListener('click',function(e){
  var loadBtn=e.target.closest('[data-envload]');
  if(loadBtn){
    db_get('generator_library',loadBtn.dataset.envload).then(function(env){
      if(!env)return;
      _currentEnvBlock=env;_editingEnvId=env.id;
      renderEnvBlock(env,'env-result',false);
      // Scroll env-gen-ui into view
      var ui=document.getElementById('env-gen-ui');if(ui)ui.scrollIntoView({behavior:'smooth'});
    });return;
  }
  var pinBtn=e.target.closest('[data-envpin]');
  if(pinBtn){
    db_get('generator_library',pinBtn.dataset.envpin).then(function(env){
      if(!env)return;
      pinToNotes('threat',env.name,'T'+env.tier+' '+env.type+' | DC '+env.dc);
      showToast('Pinned to Notes.');
    });return;
  }
  var delBtn=e.target.closest('[data-envdel]');
  if(delBtn){
    db_get('generator_library',delBtn.dataset.envdel).then(function(env){
      if(!env)return;
      if(!confirm('Delete "'+env.name+'"?'))return;
      db_delete('generator_library',delBtn.dataset.envdel).then(function(){
        showToast('Environment deleted.');renderEnvLibrary();
      });
    });return;
  }
});
```

- [ ] **Step 4: Wire env generator into `renderGeneratorsTab()`** — after the call to build the gen tab HTML, add:

```js
  // Render env gen UI after DOM is set
  setTimeout(renderEnvGenerator, 0);
```

- [ ] **Step 5: Wire library render into `toggleGenSection`** — inside `toggleGenSection`, add after the `classList.toggle`:

```js
  if(id==='gen-library'&&body.classList.contains('open'))renderEnvLibrary();
```

- [ ] **Step 6: Complete ENV_DATA** — add the remaining 9 seeds (mountain, city, ruins, coast, underground, swamp, desert, arcane, cursed) following the same structure as forest and cave. Each seed needs: names(8+), descs(6+), impulses(8+), adversaries(6+), passives(6+), actions(6+), reactions(6+), fears(4+), feat_names with 4+ entries each type. Refer to the spec for thematic guidance on each seed.

- [ ] **Step 7: Populate OFFICIAL_ENVIRONMENTS** — **requires physical or PDF access to the Daggerheart Core Rulebook.** Read pages 243-247 and extract all official environment stat blocks. If rulebook access is not available, leave the array empty and skip the "Add Official Environments" dropdown — the generator will still work fully. Each entry shape:
```js
{ name, tier, type, desc, impulses:[], dc, adversaries:'', features:[{type,name,text}] }
```

- [ ] **Step 8: Verify** — open Generators, expand Environment Generator. Select Forest + Tier 1 + Traversal, click Generate. A styled stat block should appear with name, description, impulses, difficulty, adversaries, and features with colored type badges. Click Save to Library. Expand Environment Library — the saved entry should appear. Click Edit — it should load back into the generator.

- [ ] **Step 9: Commit**

```bash
git add app.js styles.css
git commit -m "feat: Environment Stat Block Generator with library, inline editing, and pin-to-notes"
```

---

## Task 7: Build Verification

- [ ] **Step 1: Run the build**

```bash
cd "Daggerheart Apps/Daggerheart-GM-Dashboard-main/Daggerheart-GM-Dashboard-main"
node build.js
# Expected: Built: dist/index.html  (NNN KB)
```

- [ ] **Step 2: Smoke test checklist** — open `dist/index.html` in Chrome (or `npx serve dist`):
  - [ ] Toolkit panel toggle `‹` appears on right edge; clicking opens/closes panel
  - [ ] Content area shifts left on desktop when panel opens; no shift on mobile
  - [ ] Panel state (open/closed + active tab) persists across page reload
  - [ ] Rules tab: search filters results; category pills filter; cards expand; custom rule saves and appears
  - [ ] Notes tab: scratchpad saves on keystroke (verified after reload); add a card of each type; delete works
  - [ ] Generators tab: NPC names generate; loot rolls produce items; environment generates with full stat block
  - [ ] Save generated environment to library; reload tab — it appears in library
  - [ ] Pin NPC name → appears in Notes tab as NPC card
  - [ ] All features from Plan A still work (session persistence, saved encounters, encounter links)
  - [ ] No console errors

- [ ] **Step 3: Commit**

```bash
git add dist/index.html
git commit -m "build: regenerate dist bundle with toolkit panel features"
```

---

## Done

Both plans complete. All features from the spec are implemented:
- **Plan A**: IndexedDB migration, Export/Import, Saved Encounters, encounter links
- **Plan B**: Toolkit Panel (Rules Reference, Session Notes, NPC/Loot/Environment Generators)
