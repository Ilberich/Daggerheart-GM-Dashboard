// §TAB_SYSTEM ═══════════════════════════════════════════════════════════
// UNIFIED TAB SYSTEM (battle + lore tabs in one row, drag-to-reorder)
// ═══════════════════════════════════════════════════════════
let activeTab='combat';
let tabCounter=0;

// ── Drag-to-reorder ──
var _dragSrcEl=null;
function _addDragHandlers(tab){
  tab.draggable=true;
  tab.addEventListener('dragstart',function(e){
    _dragSrcEl=tab;_tabDragging=true;
    e.dataTransfer.effectAllowed='move';
    e.dataTransfer.setData('text/plain','');
    requestAnimationFrame(()=>tab.classList.add('dragging'));
  });
  tab.addEventListener('dragend',function(){
    tab.classList.remove('dragging');
    document.querySelectorAll('#all-tabs .tab').forEach(t=>t.classList.remove('drag-left','drag-right'));
    _dragSrcEl=null;_tabDragging=false;
  });
  tab.addEventListener('dragover',function(e){
    if(!_dragSrcEl||_dragSrcEl===tab)return;
    e.preventDefault();e.stopPropagation();
    const r=tab.getBoundingClientRect(),left=e.clientX<r.left+r.width/2;
    document.querySelectorAll('#all-tabs .tab').forEach(t=>t.classList.remove('drag-left','drag-right'));
    tab.classList.add(left?'drag-left':'drag-right');
  });
  tab.addEventListener('dragleave',function(){tab.classList.remove('drag-left','drag-right');});
  tab.addEventListener('drop',function(e){
    e.preventDefault();e.stopPropagation();
    if(!_dragSrcEl||_dragSrcEl===tab)return;
    const r=tab.getBoundingClientRect(),before=e.clientX<r.left+r.width/2;
    const srcId=_dragSrcEl.dataset.battletab||_dragSrcEl.dataset.tab;
    const srcType=_dragSrcEl.dataset.battletab?'battle':'lore';
    const tgtId=tab.dataset.battletab||tab.dataset.tab;
    const tgtType=tab.dataset.battletab?'battle':'lore';
    const si=tabOrder.findIndex(x=>x.id===srcId&&x.type===srcType);
    const ti=tabOrder.findIndex(x=>x.id===tgtId&&x.type===tgtType);
    if(si===-1||ti===-1)return;
    const [moved]=tabOrder.splice(si,1);
    const ni=tabOrder.findIndex(x=>x.id===tgtId&&x.type===tgtType);
    tabOrder.splice(before?ni:ni+1,0,moved);
    renderAllTabs();saveSession();
  });
}

// ── Render all tabs into #all-tabs ──
function renderAllTabs(){
  const container=document.getElementById('all-tabs');
  container.innerHTML='';
  const showClose=battles.length>=1;
  tabOrder.forEach(function(entry){
    const tab=document.createElement('div');
    if(entry.type==='battle'){
      const b=battles.find(x=>x.id===entry.id);if(!b)return;
      tab.className='tab'+(activeTab==='combat'&&b.id===activeBattleId?' active':'');
      tab.dataset.battletab=b.id;
      tab.innerHTML='<span class="tab-icon">⚔</span>'
        +'<span class="tab-title" ondblclick="renameBattle(\''+escH(b.id)+'\');event.stopPropagation()" title="Double-click to rename">'+escH(b.name)+'</span>'
        +(showClose?'<button class="tab-close" onclick="closeBattle(\''+b.id+'\',event)">×</button>':'');
      tab.addEventListener('click',function(){switchBattle(b.id);});
    }else{
      tab.className='tab'+(activeTab===entry.id?' active':'');
      tab.dataset.tab=entry.id;
      tab.innerHTML='<span class="tab-icon">'+escH(entry.icon)+'</span>'
        +'<span class="tab-title" ondblclick="renameLoreTab(\''+entry.id+'\');event.stopPropagation()" title="Double-click to rename">'+escH(entry.title)+'</span>'
        +'<button class="tab-close" onclick="closeTab(\''+entry.id+'\',event)">×</button>';
      tab.addEventListener('click',function(){switchTab(entry.id);});
    }
    _addDragHandlers(tab);
    container.appendChild(tab);
  });
}

// ── Lore tab switch ──
function switchTab(id){
  if(activeTab==='combat')saveBattleState();
  activeTab=id;
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+id));
  document.querySelectorAll('#all-tabs .tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===id));
  saveSession();
}

// ── Panel HTML factory (shared by addTab + loadSession) ──
function _panelHTML(id,html){
  return '<div class="md-panel">'
    +'<div class="md-toolbar">'
    +'<button class="md-help-btn" style="display:none" onclick="toggleMdHelp(\''+id+'\')" title="Markdown reference">?</button>'
    +'<div class="md-help-popover" style="display:none">'
    +'<strong>Markdown reference</strong>'
    +'<table class="md-help-table"><tbody>'
    +'<tr><td><code># Heading 1</code></td><td>Big heading</td></tr>'
    +'<tr><td><code>## Heading 2</code></td><td>Section heading</td></tr>'
    +'<tr><td><code>### Heading 3</code></td><td>Subheading</td></tr>'
    +'<tr><td><code>**text**</code></td><td>Bold</td></tr>'
    +'<tr><td><code>*text*</code></td><td>Italic</td></tr>'
    +'<tr><td><code>- item</code></td><td>Bullet list</td></tr>'
    +'<tr><td><code>1. item</code></td><td>Numbered list</td></tr>'
    +'<tr><td><code>&gt; text</code></td><td>Blockquote</td></tr>'
    +'<tr><td><code>`code`</code></td><td>Inline code</td></tr>'
    +'<tr><td><code>---</code></td><td>Divider</td></tr>'
    +'<tr><td><code>[[encounter:Name]]</code></td><td>Load encounter</td></tr>'
    +'</tbody></table>'
    +'</div>'
    +'<button class="md-edit-btn" onclick="toggleLoreEdit(\''+id+'\')">✏ Edit</button>'
    +'</div>'
    +'<div class="md-content">'+html+'</div>'
    +'</div>';
}

// ── Add lore tab (creates panel + registers in tabOrder) ──
function addTab(title,html,icon='📜',rawMd=''){
  const id='tab-'+(++tabCounter);
  tabRawMd[id]=rawMd;
  const panel=document.createElement('div');
  panel.className='tab-panel';
  panel.id='panel-'+id;
  panel.innerHTML=_panelHTML(id,html);
  document.getElementById('dynamic-panels').appendChild(panel);
  tabOrder.push({type:'lore',id,title,icon});
  renderAllTabs();
  switchTab(id);
  return id;
}

// ── Close lore tab ──
function closeTab(id,e){
  e.stopPropagation();
  tabOrder=tabOrder.filter(x=>!(x.type==='lore'&&x.id===id));
  document.getElementById('panel-'+id)?.remove();
  delete tabRawMd[id];
  if(activeTab===id){
    activeTab='combat';
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-combat'));
  }
  renderAllTabs();saveSession();
}

// ── Lore tab inline editor ──
function toggleLoreEdit(id){
  var panel=document.getElementById('panel-'+id);
  var mdPanel=panel.querySelector('.md-panel');
  if(mdPanel.classList.contains('md-editing')){commitLoreEdit(id);return;}
  var ta=document.createElement('textarea');
  ta.className='md-edit-area';
  ta.value=tabRawMd[id]||'';
  ta.addEventListener('keydown',function(e){
    if(e.key==='Escape'){e.preventDefault();cancelLoreEdit(id);}
  });
  panel.querySelector('.md-content').style.display='none';
  mdPanel.appendChild(ta);
  mdPanel.classList.add('md-editing');
  panel.querySelector('.md-edit-btn').textContent='👁 Preview';
  panel.querySelector('.md-help-btn').style.display='';
  ta.focus();
}

function commitLoreEdit(id){
  var panel=document.getElementById('panel-'+id);
  var mdPanel=panel.querySelector('.md-panel');
  var ta=mdPanel.querySelector('.md-edit-area');
  if(!ta)return;
  tabRawMd[id]=ta.value;
  var entry=tabOrder.find(function(e){return e.type==='lore'&&e.id===id;});
  panel.querySelector('.md-content').innerHTML=renderMd(ta.value,entry?entry.title:'');
  panel.querySelector('.md-content').style.display='';
  ta.remove();
  panel.querySelector('.md-help-btn').style.display='none';
  panel.querySelector('.md-help-popover').style.display='none';
  mdPanel.classList.remove('md-editing');
  panel.querySelector('.md-edit-btn').textContent='✏ Edit';
  saveSession();
}

function cancelLoreEdit(id){
  var panel=document.getElementById('panel-'+id);
  var mdPanel=panel.querySelector('.md-panel');
  var ta=mdPanel.querySelector('.md-edit-area');
  if(!ta)return;
  var entry=tabOrder.find(function(e){return e.type==='lore'&&e.id===id;});
  panel.querySelector('.md-content').innerHTML=renderMd(tabRawMd[id]||'',entry?entry.title:'');
  panel.querySelector('.md-content').style.display='';
  ta.remove();
  panel.querySelector('.md-help-btn').style.display='none';
  panel.querySelector('.md-help-popover').style.display='none';
  mdPanel.classList.remove('md-editing');
  panel.querySelector('.md-edit-btn').textContent='✏ Edit';
}

function toggleMdHelp(id){
  var popover=document.getElementById('panel-'+id).querySelector('.md-help-popover');
  popover.style.display=popover.style.display==='none'?'':'none';
}

function newBlankTab(){
  var id=addTab('New Tab','','📜','');
  toggleLoreEdit(id);
}

function toggleLoreMenu(e){
  e.stopPropagation();
  var m=document.getElementById('lore-add-menu');
  m.style.display=m.style.display==='none'?'':'none';
}
function closeLoreMenu(){
  var m=document.getElementById('lore-add-menu');
  if(m)m.style.display='none';
}

// §BATTLE_TABS ═══════════════════════════════════════════════════════════
// BATTLE TAB MANAGEMENT
// ═══════════════════════════════════════════════════════════
function currentBattle(){return battles.find(b=>b.id===activeBattleId);}

function saveBattleState(){
  const b=currentBattle();if(!b)return;
  Object.assign(b,{battleStarted,round,playerCount,cart,combatants,iid});
}

function loadBattleState(b){
  if(!b)return;
  battleStarted=b.battleStarted;round=b.round;
  playerCount=b.playerCount;bpTotal=3*playerCount+2;
  cart=b.cart;combatants=b.combatants;iid=b.iid;
}

function applyBattleToDOM(){
  document.getElementById('player-count').value=playerCount;
  document.getElementById('btn-begin').style.display=battleStarted?'none':'';
  document.getElementById('btn-reset').style.display=battleStarted?'':'none';
  document.getElementById('btn-add-more').style.display=battleStarted?'':'none';
  document.getElementById('round-badge').style.display=battleStarted?'':'none';
  if(battleStarted)document.getElementById('round-num').textContent=round;
  syncBP();renderList();
  if(battleStarted){renderCombat();}else{renderStage();}
  statusBar();
}

function newBattle(){
  saveBattleState();
  const num=++battleTabCounter;
  const id='battle-'+Date.now();
  const b={id,name:'Battle '+num,battleStarted:false,round:1,playerCount,cart:[],combatants:[],iid:0};
  battles.push(b);
  tabOrder.push({type:'battle',id});
  activeBattleId=id;
  loadBattleState(b);
  activeTab='combat';
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-combat'));
  renderAllTabs();
  applyBattleToDOM();
  saveSession();
}

function switchBattle(id){
  saveBattleState();
  activeBattleId=id;
  const b=currentBattle();if(!b)return;
  loadBattleState(b);
  activeTab='combat';
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-combat'));
  document.querySelectorAll('#all-tabs .tab').forEach(t=>{
    t.classList.toggle('active',t.dataset.battletab===id);
  });
  applyBattleToDOM();
  saveSession();
}

function closeBattle(id,e){
  e.stopPropagation();
  const b=battles.find(x=>x.id===id);
  if(b&&b.battleStarted&&!confirm(`Close "${b.name}"? This battle is in progress.`))return;
  battles=battles.filter(x=>x.id!==id);
  tabOrder=tabOrder.filter(x=>!(x.type==='battle'&&x.id===id));
  if(activeBattleId===id){
    if(battles.length===0){
      activeBattleId=null;
      const firstLore=tabOrder.find(x=>x.type==='lore');
      if(firstLore){
        switchTab(firstLore.id);
      }else{
        activeTab='combat';
        document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-combat'));
        _showNoBattlesState();
      }
    }else{
      activeBattleId=battles[battles.length-1].id;
      loadBattleState(currentBattle());
      activeTab='combat';
      document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-combat'));
      applyBattleToDOM();
    }
  }
  renderAllTabs();saveSession();
}

function _showNoBattlesState(){
  document.getElementById('no-battles-state').style.display='flex';
  document.getElementById('encounter-grid').style.display='none';
  document.getElementById('empty-state').style.display='none';
}

function renameBattle(id){
  const b=battles.find(x=>x.id===id);if(!b)return;
  const span=document.querySelector(`[data-battletab="${id}"] .tab-title`);if(!span)return;
  span.innerHTML=`<input class="inline-edit" value="${escH(b.name)}" style="width:80px" onblur="commitBattleRename('${id}',this)" onkeydown="inlineKey(event,this)">`;
  span.querySelector('input').select();
}

function commitBattleRename(id,inp){
  const b=battles.find(x=>x.id===id);if(!b)return;
  if(!inp.dataset.cancelled){const v=inp.value.trim();if(v)b.name=v;}
  renderAllTabs();saveSession();
}

function renameLoreTab(id){
  const entry=tabOrder.find(x=>x.type==='lore'&&x.id===id);if(!entry)return;
  const span=document.querySelector(`[data-tab="${id}"] .tab-title`);if(!span)return;
  span.innerHTML=`<input class="inline-edit" value="${escH(entry.title)}" style="width:80px" onblur="commitLoreTabRename('${id}',this)" onkeydown="inlineKey(event,this)">`;
  span.querySelector('input').select();
}

function commitLoreTabRename(id,inp){
  const entry=tabOrder.find(x=>x.type==='lore'&&x.id===id);if(!entry)return;
  if(!inp.dataset.cancelled){const v=inp.value.trim();if(v)entry.title=v;}
  renderAllTabs();saveSession();
}

// §MARKDOWN ═══════════════════════════════════════════════════════════
// FILE UPLOAD + MARKDOWN RENDERING
// ═══════════════════════════════════════════════════════════
function handleFileUpload(files){
  [...files].forEach(f=>{
    const reader=new FileReader();
    reader.onload=e=>openMdFile(f.name,e.target.result);
    reader.readAsText(f);
  });
  // Reset input so same file can be re-uploaded
  document.getElementById('tab-upload-input').value='';
}

function openMdFile(filename,raw){
  const title=filename.replace(/\.(md|markdown)$/i,'').replace(/_/g,' ');
  const html=renderMd(raw,title);
  // Pick icon based on filename content
  const lower=title.toLowerCase();
  const icon=lower.includes('combat')||lower.includes('encounter')?'⚔'
    :lower.includes('faction')||lower.includes('guild')?'⚑'
    :lower.includes('npc')||lower.includes('character')?'👤'
    :lower.includes('location')||lower.includes('map')?'🗺'
    :lower.includes('lore')||lower.includes('history')?'📖'
    :lower.includes('rule')||lower.includes('mechanic')?'⚙'
    :lower.includes('session')?'🎲'
    :'📜';
  addTab(title,html,icon,raw);
  saveSession();
}

function renderMd(raw,title){
  // Strip YAML frontmatter
  let content=raw.replace(/^---[\s\S]*?---\n?/,'').trim();
  // Encounter links: [[encounter:Name]] → clickable link
  content=content.replace(/\[\[encounter:([^\]]+)\]\]/g,function(_,name){
    return '<a class="encounter-link" data-encounter-name="'+name.replace(/"/g,'&quot;')+'" href="#">⚔ '+name+'</a>';
  });
  // Parse markdown
  marked.setOptions({breaks:true,gfm:true});
  let html=marked.parse(content);
  // Prefix with title if no h1 found
  if(!/<h1[\s>]/.test(html)){
    html=`<h1>${title}</h1>`+html;
  }
  return html;
}

// Drag and drop — file drops only (tab drags skip via _tabDragging flag)
document.addEventListener('dragover',e=>{if(_tabDragging)return;e.preventDefault();document.getElementById('drop-overlay').classList.add('active');});
document.addEventListener('dragleave',e=>{if(_tabDragging)return;if(e.relatedTarget===null)document.getElementById('drop-overlay').classList.remove('active');});
document.addEventListener('drop',e=>{
  if(_tabDragging)return;
  e.preventDefault();
  document.getElementById('drop-overlay').classList.remove('active');
  const files=[...e.dataTransfer.files].filter(f=>f.name.match(/\.(md|markdown)$/i));
  if(files.length)files.forEach(f=>{const r=new FileReader();r.onload=ev=>openMdFile(f.name,ev.target.result);r.readAsText(f);});
});

// §COMBAT_DATA ═══════════════════════════════════════════════════════════
// COMBAT TRACKER DATA
// ═══════════════════════════════════════════════════════════
const COSTS={solo:5,bruiser:4,leader:3,horde:2,ranged:2,skulk:2,standard:2,minion:1,support:1,social:1};
const TYPE_ORDER=['solo','bruiser','leader','horde','ranged','skulk','standard','minion','support','social'];
const ICONS={solo:'👁',bruiser:'💪',leader:'👑',horde:'🌊',ranged:'🏹',skulk:'🌑',standard:'⚔',minion:'💀',support:'✨',social:'🗣'};
const P='passive',A='action',R='reaction',F='fear';

const ADV=[
  {id:'acid-burrower',name:'Acid Burrower',type:'solo',dc:14,hp:8,st:3,maj:8,sev:15,atk:'+3',wpn:'Claws · Very Close',dmg:'1d12+2 phy',motives:'Tremor sense, burst from ground, acid burn',feats:[{k:P,n:'Relentless (3)',d:'Can be spotlighted up to 3 times per GM turn. Spend Fear as usual each spotlight.'},{k:A,n:'Earth Eruption',d:'Mark a Stress to burst from the ground. All creatures within Very Close must succeed on an Agility Reaction Roll or be knocked Vulnerable until they next act.'},{k:A,n:'Spit Acid',d:'Attack all targets in front within Close. Hits take 2d6 phy and must mark an Armor Slot without its benefit. If no Armor Slot available, mark an additional HP and gain a Fear.'},{k:R,n:'Acid Bath',d:'When the Burrower takes Severe damage, all creatures within Close take 1d10 phy. Ground within Very Close is coated — any non-Burrower moving through takes 1d6 phy.'}]},
  {id:'cave-ogre',name:'Cave Ogre',type:'solo',dc:13,hp:8,st:3,maj:8,sev:15,atk:'+1',wpn:'Club · Very Close',dmg:'1d10+2 phy',motives:'Bite off heads, feast, stomp, throw enemies',feats:[{k:P,n:'Ramp Up',d:'Must spend a Fear to spotlight the Ogre. While spotlighted, they can attack all targets within range with their standard attack.'},{k:P,n:'Bone Breaker',d:"The Ogre's attacks deal direct damage."},{k:A,n:'Hail of Boulders',d:'Mark a Stress to hurl heavy objects at all targets in front within Far. Hits take 1d10+2 phy. If more than one target is hit, gain a Fear.'},{k:R,n:'Rampaging Fury',d:'When the Ogre marks 2 or more HP, move them to a point within Close and deal 2d6+3 direct phy to all targets in their path.'}]},
  {id:'construct',name:'Construct',type:'solo',dc:13,hp:9,st:4,maj:7,sev:15,atk:'+4',wpn:'Fist Slam · Melee',dmg:'1d20 phy',motives:'Destroy environment, serve creator, smash, trample',feats:[{k:P,n:'Relentless (2)',d:'Can be spotlighted up to 2 times per GM turn. Spend Fear as usual.'},{k:P,n:'Weak Structure',d:'When the Construct marks HP from physical damage, they must mark an additional HP.'},{k:A,n:'Trample',d:"Mark a Stress to attack all targets in the Construct's path when they move. Hits take 1d8 phy."},{k:R,n:'Overload',d:"Before rolling damage, mark a Stress to add +10 to the damage roll. The Construct can then take the spotlight again."},{k:R,n:'Death Quake',d:'When the Construct marks their last HP, the magic ruptures in a force explosion. Attack with advantage against all within Very Close. Hits take 1d12+2 mag.'}]},
  {id:'chaos-elemental',name:'Minor Chaos Elemental',type:'solo',dc:14,hp:7,st:3,maj:7,sev:14,atk:'+3',wpn:'Warp Blast · Close',dmg:'1d12+6 mag',motives:'Confound, destabilize, transmogrify',feats:[{k:P,n:'Arcane Form',d:'Resistant to magic damage.'},{k:A,n:'Sickening Flux',d:'Mark a HP to force all targets within Close to mark a Stress and become Vulnerable until their next rest or they clear a HP.'},{k:A,n:'Remake Reality',d:'Spend a Fear to transform the area within Very Close into a different biome. All targets within take 2d6+3 direct mag damage.'},{k:R,n:'Magical Reflection',d:'When the Elemental takes damage from an attack within Close, deal damage to the attacker equal to half the damage they dealt.'},{k:R,n:'Momentum',d:'When the Elemental makes a successful attack against a PC, gain a Fear.'}]},
  {id:'fire-elemental',name:'Minor Fire Elemental',type:'solo',dc:13,hp:9,st:3,maj:7,sev:15,atk:'+3',wpn:'Elemental Blast · Far',dmg:'1d10+4 mag',motives:'Encircle enemies, grow in size, start fires',feats:[{k:P,n:'Relentless (2)',d:'Can be spotlighted up to 2 times per GM turn. Spend Fear as usual.'},{k:A,n:'Scorched Earth',d:'Mark a Stress. Choose a point within Far — ground within Very Close of that point bursts into flames. All creatures there make an Agility Reaction Roll: fail = 2d8 mag; success = half.'},{k:F,n:'Explosion',d:'Spend a Fear to erupt in a fiery explosion. Attack all targets within Close. Hits take 1d8 mag and are knocked back to Far range.'},{k:R,n:'Consume Kindling',d:'Three times per scene, when the Elemental moves onto highly flammable objects, consume them to clear a HP or Stress.'},{k:R,n:'Momentum',d:'When the Elemental makes a successful attack against a PC, gain a Fear.'}]},
  {id:'minor-demon',name:'Minor Demon',type:'solo',dc:14,hp:8,st:4,maj:8,sev:15,atk:'+3',wpn:'Claws · Melee',dmg:'1d8+6 phy',motives:'Act erratically, corral targets, relish pain, torment',feats:[{k:P,n:'Relentless (2)',d:'Can be spotlighted up to 2 times per GM turn. Spend Fear as usual.'},{k:P,n:'All Must Fall',d:'When a PC rolls a failure with Fear while within Close range of the Demon, they lose a Hope.'},{k:F,n:'Hellfire',d:'Spend a Fear to rain hellfire within Far range. All targets must make an Agility Reaction Roll: fail = 1d20+3 mag; success = half.'},{k:R,n:'Reaper',d:"Before rolling damage for the Demon's attack, mark a Stress to add a bonus equal to the Demon's current marked HP count."},{k:R,n:'Momentum',d:'When the Demon makes a successful attack against a PC, gain a Fear.'}]},
  {id:'zombie-hulk',name:'Patchwork Zombie Hulk',type:'solo',dc:13,hp:10,st:3,maj:8,sev:15,atk:'+4',wpn:'Too Many Arms · Very Close',dmg:'1d20 phy',motives:'Absorb corpses, flail, hunger, terrify',feats:[{k:P,n:'Destructible',d:'When the Zombie takes Major or greater damage, they mark an additional HP.'},{k:P,n:'Flailing Limbs',d:'When the Zombie makes a standard attack, they can attack all targets within Very Close range.'},{k:A,n:'Another for the Pile',d:'When the Zombie is within Very Close of a corpse, incorporate it into themselves, clearing a HP and a Stress.'},{k:A,n:'Tormented Screams',d:'Mark a Stress. All PCs within Far make a Presence Reaction Roll (13): fail = lose a Hope (gain a Fear each); success = mark a Stress.'}]},
  {id:'bear',name:'Bear',type:'bruiser',dc:14,hp:7,st:2,maj:9,sev:17,atk:'+1',wpn:'Claws · Melee',dmg:'1d8+3 phy',motives:'Climb, defend territory, pummel, track',feats:[{k:P,n:'Overwhelming Force',d:"Targets who mark HP from the Bear's standard attack are knocked back to Very Close range."},{k:A,n:'Bite',d:'Mark a Stress to attack a target within Melee. On a success, deal 3d4+10 phy and the target is Restrained until they succeed on a Strength Roll.'},{k:R,n:'Momentum',d:'When the Bear makes a successful attack against a PC, gain a Fear.'}]},
  {id:'deeproot',name:'Deeproot Defender',type:'bruiser',dc:10,hp:7,st:3,maj:8,sev:14,atk:'+2',wpn:'Vines · Close',dmg:'1d8+3 phy',motives:'Ambush, grab, protect, pummel',feats:[{k:A,n:'Ground Slam',d:'Slam the ground, knocking all targets within Very Close back to Far range. Each knocked-back target marks a Stress.'},{k:A,n:'Grab and Drag',d:'Attack a target within Close. On a success, spend a Fear to pull them into Melee, deal 1d6+2 phy, and Restrain them until the Defender takes Severe damage.'}]},
  {id:'giant-scorpion',name:'Giant Scorpion',type:'bruiser',dc:13,hp:6,st:3,maj:7,sev:13,atk:'+1',wpn:'Pincers · Melee',dmg:'1d12+2 phy',motives:'Ambush, feed, grapple, poison',feats:[{k:A,n:'Double Strike',d:'Mark a Stress to make a standard attack against two targets within Melee range.'},{k:A,n:'Venomous Stinger',d:'Attack a target within Very Close. On a success, spend a Fear to deal 1d4+4 phy and Poison them until next rest or a Knowledge Roll (16). While Poisoned, roll d6 before each action roll — on 4 or lower, mark a Stress.'},{k:R,n:'Momentum',d:'When the Scorpion makes a successful attack against a PC, gain a Fear.'}]},
  {id:'kneebreaker',name:'Jagged Knife Kneebreaker',type:'bruiser',dc:12,hp:7,st:4,maj:7,sev:14,atk:'−3',wpn:'Club · Melee',dmg:'1d4+6 phy',motives:'Grapple, intimidate, steal',feats:[{k:P,n:"I've Got 'Em",d:'Creatures Restrained by the Kneebreaker take double damage from attacks by other adversaries.'},{k:A,n:'Hold Them Down',d:'Attack a target within Melee. On a success, no damage but target is Restrained and Vulnerable. Freed with a Strength Roll or if Kneebreaker takes Major+ damage.'}]},
  {id:'pirate-tough',name:'Pirate Tough',type:'bruiser',dc:13,hp:5,st:3,maj:8,sev:15,atk:'+1',wpn:'Massive Fists · Melee',dmg:'2d6 phy',motives:'Plunder, raid, smash, terrorize',feats:[{k:P,n:'Swashbuckler',d:'When the Tough marks 2 or fewer HP from a Melee attack, the attacker must mark a Stress.'},{k:A,n:'Clear the Decks',d:'Attack a target within Very Close. On a success, mark a Stress to move into Melee, deal 3d4 phy, and knock the target back to Close.'}]},
  {id:'skeleton-knight',name:'Skeleton Knight',type:'bruiser',dc:13,hp:5,st:2,maj:7,sev:13,atk:'+2',wpn:'Rusty Greatsword · Melee',dmg:'1d10+2 phy',motives:'Cut down the living, steal skin, wreak havoc',feats:[{k:P,n:'Terrifying',d:'When the Knight makes a successful attack, all PCs within Close lose a Hope and you gain a Fear.'},{k:A,n:'Cut to the Bone',d:'Mark a Stress to attack all targets within Very Close. Hits take 1d8+2 phy and must mark a Stress.'},{k:R,n:'Dig Two Graves',d:'When the Knight is defeated, they attack a target within Very Close (priority: their killer). On a success, that target takes 1d4+8 phy and loses 1d4 Hope.'}]},
  {id:'weaponmaster',name:'Weaponmaster',type:'bruiser',dc:14,hp:6,st:3,maj:8,sev:15,atk:'+2',wpn:'Claymore · Very Close',dmg:'1d12+2 phy',motives:'Act first, aim for the weakest, intimidate',feats:[{k:A,n:'Goading Strike',d:"Make a standard attack. On a success, mark a Stress to Taunt the target until their next successful attack. While Taunted, they have disadvantage against targets other than the Weaponmaster."},{k:A,n:'Adrenaline Burst',d:'Once per scene, spend a Fear to clear 2 HP and 2 Stress.'},{k:R,n:'Momentum',d:'When the Weaponmaster makes a successful attack against a PC, gain a Fear.'}]},
  {id:'brawny-zombie',name:'Brawny Zombie',type:'bruiser',dc:10,hp:7,st:4,maj:8,sev:15,atk:'+2',wpn:'Slam · Very Close',dmg:'1d12+3 phy',motives:'Crush, destroy, hail debris, slam',feats:[{k:P,n:'Slow',d:"When spotlighted without a token, place a token — can't act yet. When spotlighted with a token, clear it and act."},{k:A,n:'Rend Asunder',d:'Make a standard attack with advantage against a Restrained target. On a success, the attack deals direct damage.'},{k:R,n:'Rip and Tear',d:'When the Zombie makes a successful standard attack, mark a Stress to temporarily Restrain the target and force them to mark 2 Stress.'}]},
  {id:'head-guard',name:'Head Guard',type:'leader',dc:15,hp:7,st:3,maj:7,sev:13,atk:'+4',wpn:'Mace · Melee',dmg:'1d10+4 phy',motives:'Arrest, close gates, pin down, seek glory',feats:[{k:A,n:'Rally Guards',d:'Spend 2 Fear to spotlight the Head Guard and up to 2d4 allies within Far range.'},{k:R,n:'On My Signal',d:'Countdown (5). When the Head Guard is spotlighted for the first time, activate the countdown — it ticks down when a PC makes an attack roll. When triggered, all Archer Guards within Far attack with advantage against the nearest target. Combine damage if multiple hit the same target.'},{k:R,n:'Momentum',d:'When the Head Guard makes a successful attack against a PC, gain a Fear.'}]},
  {id:'jk-lieutenant',name:'Jagged Knife Lieutenant',type:'leader',dc:13,hp:6,st:3,maj:7,sev:14,atk:'+2',wpn:'Javelin · Close',dmg:'1d8+3 phy',motives:'Bully, command, profit, reinforce',feats:[{k:A,n:'Tactician',d:'When you spotlight the Lieutenant, mark a Stress to also spotlight two allies within Close range.'},{k:A,n:'More Where That Came From',d:'Summon three Jagged Knife Lackeys, who appear at Far range.'},{k:A,n:'Coup de Grâce',d:'Spend a Fear to attack a Vulnerable target within Close. On a success, deal 2d6+12 phy and the target marks a Stress.'},{k:R,n:'Momentum',d:'When the Lieutenant makes a successful attack against a PC, gain a Fear.'}]},
  {id:'pirate-captain',name:'Pirate Captain',type:'leader',dc:14,hp:7,st:5,maj:7,sev:14,atk:'+4',wpn:'Cutlass · Melee',dmg:'1d12+2 phy',motives:"Command, plunder, raid, make 'em walk the plank",feats:[{k:P,n:'Swashbuckler',d:'When the Captain marks 2 or fewer HP from a Melee attack, the attacker must mark a Stress.'},{k:A,n:'Reinforcements',d:'Once per scene, mark a Stress to summon a Pirate Raiders Horde at Far range.'},{k:A,n:'No Quarter',d:'Spend a Fear. Target a PC with 3+ Pirates within Melee. The target makes a Presence Reaction Roll: fail = mark 1d4+1 Stress; success = mark a Stress.'},{k:R,n:'Momentum',d:'When the Captain makes a successful attack against a PC, gain a Fear.'}]},
  {id:'spellblade',name:'Spellblade',type:'leader',dc:14,hp:6,st:3,maj:8,sev:14,atk:'+3',wpn:'Empowered Longsword · Melee',dmg:'1d8+4 phy/mag',motives:'Blast, command, endure',feats:[{k:P,n:'Arcane Steel',d:"Damage dealt by the Spellblade's standard attack is considered both physical and magic."},{k:A,n:'Suppressing Blast',d:'Mark a Stress and target a group within Far. All targets must succeed on an Agility Reaction Roll or take 1d8+2 mag. Gain a Fear for each target who marks HP.'},{k:A,n:'Move as a Unit',d:'Spend 2 Fear to spotlight up to five allies within Far range.'},{k:R,n:'Momentum',d:'When the Spellblade makes a successful attack against a PC, gain a Fear.'}]},
  {id:'young-dryad',name:'Young Dryad',type:'leader',dc:11,hp:6,st:2,maj:6,sev:11,atk:'+0',wpn:'Scythe · Melee',dmg:'1d8+5 phy',motives:'Command, nurture, prune the unwelcome',feats:[{k:A,n:'Voice of the Forest',d:'Mark a Stress to spotlight 1d4 allies within range of a target they can attack without moving. On a success, their attacks deal half damage.'},{k:A,n:'Thorny Cage',d:'Spend a Fear to cage a target within Very Close, Restraining them until freed with a successful Strength Roll. Any creature making an action roll against the cage must mark a Stress.'},{k:R,n:'Momentum',d:'When the Dryad makes a successful attack against a PC, gain a Fear.'}]},
  {id:'mosquitoes',name:'Giant Mosquitoes',type:'horde',dc:10,hp:6,st:3,maj:5,sev:9,atk:'−2',wpn:'Proboscis · Melee',dmg:'1d8+3 phy',motives:'Fly away, harass, steal blood',feats:[{k:P,n:'Horde (1d4+1)',d:'When half or more HP are marked, standard attack deals 1d4+1 phy instead.'},{k:P,n:'Flying',d:'While flying, the Mosquitoes have +2 to their Difficulty.'},{k:R,n:'Bloodsucker',d:'When their attack causes a target to mark HP, mark a Stress to force the target to mark an additional HP.'}]},
  {id:'pirate-raiders',name:'Pirate Raiders',type:'horde',dc:12,hp:4,st:3,maj:5,sev:11,atk:'+1',wpn:'Cutlass · Melee',dmg:'1d8+2 phy',motives:'Gang up, plunder, raid',feats:[{k:P,n:'Horde (1d4+1)',d:'When half or more HP are marked, standard attack deals 1d4+1 phy instead.'},{k:P,n:'Swashbuckler',d:'When the Raiders mark 2 or fewer HP from a Melee attack, the attacker must mark a Stress.'}]},
  {id:'swarm-rats',name:'Swarm of Rats',type:'horde',dc:10,hp:6,st:2,maj:6,sev:10,atk:'−3',wpn:'Claws · Melee',dmg:'1d8+2 phy',motives:'Consume, obscure, swarm',feats:[{k:P,n:'Horde (1d4+1)',d:'When half or more HP are marked, standard attack deals 1d4+1 phy instead.'},{k:P,n:'In Your Face',d:'All targets within Melee range have disadvantage on attacks against targets other than the Swarm.'}]},
  {id:'bramble-swarm',name:'Tangle Bramble Swarm',type:'horde',dc:12,hp:6,st:3,maj:6,sev:11,atk:'+0',wpn:'Thorns · Melee',dmg:'1d6+3 phy',motives:'Digest, entangle, immobilize',feats:[{k:P,n:'Horde (1d4+2)',d:'When half or more HP are marked, standard attack deals 1d4+2 phy instead.'},{k:A,n:'Crush',d:'Mark a Stress to deal 2d6+8 direct phy to a target with 3+ bramble tokens.'},{k:R,n:'Encumber',d:'When the Swarm succeeds on an attack, give the target a bramble token. Any tokens = Restrained. 3+ tokens = also Vulnerable. Remove with Finesse Roll (12 + # tokens) or Major+ damage to the Swarm. Tokens removed via Finesse spawn that many Tangle Bramble Minions within Melee.'}]},
  {id:'zombie-pack',name:'Zombie Pack',type:'horde',dc:8,hp:6,st:3,maj:6,sev:12,atk:'−1',wpn:'Bite · Melee',dmg:'1d10+2 phy',motives:'Eat flesh, hunger, maul, surround',feats:[{k:P,n:'Horde (1d4+2)',d:'When half or more HP are marked, standard attack deals 1d4+2 phy instead.'},{k:R,n:'Overwhelm',d:'When the Zombies mark HP from a Melee attack, mark a Stress to make a standard attack against the attacker.'}]},
  {id:'archer-guard',name:'Archer Guard',type:'ranged',dc:10,hp:3,st:2,maj:4,sev:8,atk:'+1',wpn:'Longbow · Far',dmg:'1d8+3 phy',motives:'Arrest, pin down, make it through the day',feats:[{k:A,n:'Hobbling Shot',d:'Attack a target within Far. On a success, mark a Stress to deal 1d12+3 phy. If the target marks HP, they have disadvantage on Agility Rolls until they clear at least 1 HP.'}]},
  {id:'jk-sniper',name:'Jagged Knife Sniper',type:'ranged',dc:13,hp:3,st:2,maj:4,sev:7,atk:'−1',wpn:'Shortbow · Far',dmg:'1d10+2 phy',motives:'Ambush, hide, profit, reposition',feats:[{k:P,n:'Unseen Strike',d:'If the Sniper is Hidden when they make a successful standard attack, they deal 1d10+4 phy instead of standard.'}]},
  {id:'skeleton-archer',name:'Skeleton Archer',type:'ranged',dc:9,hp:3,st:2,maj:4,sev:7,atk:'+2',wpn:'Shortbow · Far',dmg:'1d8+1 phy',motives:'Perforate distracted targets, play dead',feats:[{k:P,n:'Opportunist',d:'When two or more adversaries are within Very Close of a creature, all damage the Archer deals to that creature is doubled.'},{k:A,n:'Deadly Shot',d:'Attack a Vulnerable target within Far. On a success, mark a Stress to deal 3d4+8 phy.'}]},
  {id:'dire-wolf',name:'Dire Wolf',type:'skulk',dc:12,hp:4,st:3,maj:5,sev:9,atk:'+2',wpn:'Claws · Melee',dmg:'1d6+2 phy',motives:'Defend territory, harry, protect pack, surround',feats:[{k:P,n:'Pack Tactics',d:'If the Wolf makes a successful standard attack and another Dire Wolf is within Melee of the target, deal 1d6+5 phy instead of standard and gain a Fear.'},{k:A,n:'Hobbling Strike',d:'Mark a Stress to attack a target within Melee. On a success, deal 3d4+10 direct phy and make them Vulnerable until they clear at least 1 HP.'}]},
  {id:'green-ooze',name:'Green Ooze',type:'skulk',dc:8,hp:5,st:2,maj:5,sev:10,atk:'+1',wpn:'Ooze Appendage · Melee',dmg:'1d6+1 mag',motives:'Camouflage, consume and multiply, envelop',feats:[{k:P,n:'Slow',d:"When spotlighted without a token, place a token — can't act yet. When spotlighted with a token, clear it and act."},{k:P,n:'Acidic Form',d:"When the Ooze makes a successful attack, the target must mark an Armor Slot without its benefit. If no Armor Slot, mark an additional HP."},{k:A,n:'Envelop',d:"Standard attack within Melee. On a success, the Ooze envelops them — target marks 2 Stress and must mark a Stress with each action roll. Freed if the Ooze takes Severe damage."},{k:R,n:'Split',d:'When the Ooze has 3+ HP marked, spend a Fear to split into two Tiny Green Oozes (no HP or Stress). Immediately spotlight both.'}]},
  {id:'tiny-green-ooze',name:'Tiny Green Ooze',type:'skulk',dc:14,hp:2,st:1,maj:4,sev:null,atk:'−1',wpn:'Ooze Appendage · Melee',dmg:'1d4+1 mag',motives:"Camouflage, creep up (spawned by Green Ooze's Split)",feats:[{k:P,n:'Acidic Form',d:"When the Ooze makes a successful attack, the target must mark an Armor Slot without its benefit. If no Armor Slot, mark an additional HP."}]},
  {id:'red-ooze',name:'Red Ooze',type:'skulk',dc:10,hp:5,st:3,maj:6,sev:11,atk:'+1',wpn:'Ooze Appendage · Melee',dmg:'1d8+3 mag',motives:'Camouflage, consume and multiply, ignite, start fires',feats:[{k:P,n:'Creeping Fire',d:'The Ooze can only move within Very Close range as normal movement. They light any flammable object they touch on fire.'},{k:A,n:'Ignite',d:'Attack a target within Very Close. On a success, deal 1d8 mag and Ignite them until extinguished via Finesse Roll (14). While Ignited, target takes 1d4 mag with each action roll.'},{k:R,n:'Split',d:'When the Ooze has 3+ HP marked, spend a Fear to split into two Tiny Red Oozes (no HP or Stress). Immediately spotlight both.'}]},
  {id:'tiny-red-ooze',name:'Tiny Red Ooze',type:'skulk',dc:11,hp:2,st:1,maj:5,sev:null,atk:'−1',wpn:'Ooze Appendage · Melee',dmg:'1d4+2 mag',motives:"Blaze, camouflage (spawned by Red Ooze's Split)",feats:[{k:R,n:'Burning',d:'When a creature within Melee deals damage to the Ooze, they take 1d6 direct mag damage.'}]},
  {id:'jk-shadow',name:'Jagged Knife Shadow',type:'skulk',dc:12,hp:3,st:3,maj:4,sev:8,atk:'+1',wpn:'Daggers · Melee',dmg:'1d4+4 phy',motives:'Ambush, conceal, divide, profit',feats:[{k:P,n:'Backstab',d:'When the Shadow succeeds on a standard attack that has advantage, they deal 1d6+6 phy instead of standard.'},{k:A,n:'Cloaked',d:"Become Hidden until after the Shadow's next attack. Attacks made while Hidden from this feature have advantage."}]},
  {id:'bladed-guard',name:'Bladed Guard',type:'standard',dc:12,hp:5,st:2,maj:5,sev:9,atk:'+1',wpn:'Longsword · Melee',dmg:'1d6+1 phy',motives:'Arrest, close gates, make it through the day',feats:[{k:P,n:'Shield Wall',d:'A creature who tries to move within Very Close of the Guard must succeed on an Agility Roll. If additional Bladed Guards stand in a line (each within Melee of another), Difficulty increases by the total number of guards in that line.'},{k:A,n:'Detain',d:'Attack a target within Very Close. On a success, mark a Stress to Restrain the target until they break free with a successful attack, Finesse Roll, or Strength Roll.'}]},
  {id:'glass-snake',name:'Glass Snake',type:'standard',dc:14,hp:5,st:3,maj:6,sev:10,atk:'+2',wpn:'Glass Fangs · Very Close',dmg:'1d8+2 phy',motives:'Climb, feed, keep distance, scare',feats:[{k:P,n:'Armor-Shredding Shards',d:'On a successful Melee attack against the Snake, the attacker must mark an Armor Slot without its benefit. If no Armor Slot, they mark an additional HP.'},{k:A,n:'Spinning Serpent',d:'Mark a Stress to attack all targets within Very Close. Hits take 1d6+1 phy.'},{k:A,n:'Spitter',d:"Spend a Fear to introduce a d6 Spitter Die. When the Snake is spotlighted, roll this die — on 5+, all targets in front within Far must succeed on Agility Reaction Roll or take 1d4 phy. The Snake can then take the spotlight a second time this GM turn."}]},
  {id:'harrier',name:'Harrier',type:'standard',dc:12,hp:3,st:3,maj:5,sev:9,atk:'+1',wpn:'Javelin · Close',dmg:'1d6+2 phy',motives:'Flank, harry, kite, profit',feats:[{k:P,n:'Maintain Distance',d:'After making a standard attack, the Harrier can move anywhere within Far range.'},{k:R,n:'Fall Back',d:'When a creature moves into Melee to attack, mark a Stress before the attack roll to move anywhere within Close and make an attack against that creature. On a success, deal 1d10+2 phy.'}]},
  {id:'jk-bandit',name:'Jagged Knife Bandit',type:'standard',dc:12,hp:5,st:3,maj:8,sev:14,atk:'+1',wpn:'Daggers · Melee',dmg:'1d8+1 phy',motives:'Escape, profit, steal, throw smoke',feats:[{k:P,n:'Climber',d:'The Bandit climbs just as easily as they run.'},{k:P,n:'From Above',d:'When the Bandit succeeds on a standard attack from above a target, they deal 1d10+1 phy instead of standard.'}]},
  {id:'skeleton-warrior',name:'Skeleton Warrior',type:'standard',dc:10,hp:3,st:2,maj:4,sev:8,atk:'+0',wpn:'Sword · Melee',dmg:'1d6+2 phy',motives:'Feign death, gang up, steal skin',feats:[{k:P,n:'Only Bones',d:'The Warrior is resistant to physical damage.'},{k:R,n:"Won't Stay Dead",d:"When the Warrior is defeated, spotlight them and roll a d6. On a 6, if other adversaries are on the battlefield, the Warrior re-forms with no marked HP."}]},
  {id:'sylvan-soldier',name:'Sylvan Soldier',type:'standard',dc:11,hp:4,st:2,maj:6,sev:11,atk:'+0',wpn:'Scythe · Melee',dmg:'1d8+1 phy',motives:'Ambush, hide, overwhelm, protect, trail',feats:[{k:P,n:'Pack Tactics',d:'If the Soldier makes a standard attack and another Sylvan Soldier is within Melee of the target, deal 1d8+5 phy instead of standard.'},{k:A,n:'Forest Control',d:'Spend a Fear to pull down a tree within Close. A creature hit must succeed on an Agility Reaction Roll (15) or take 1d10 phy.'},{k:R,n:'Blend In',d:"When the Soldier makes a successful attack, mark a Stress to become Hidden until the Soldier's next attack or a PC succeeds on an Instinct Roll (14) to find them."}]},
  {id:'shambling-zombie',name:'Shambling Zombie',type:'standard',dc:10,hp:4,st:1,maj:4,sev:6,atk:'+0',wpn:'Bite · Melee',dmg:'1d6+1 phy',motives:'Eat flesh, hunger, maul',feats:[{k:P,n:'Too Many to Handle',d:'When the Zombie is within Melee of a creature and at least one other Zombie is within Close range, all attacks against that creature have advantage.'},{k:P,n:'Horrifying',d:"Targets who mark HP from the Zombie's attacks must also mark a Stress."}]},
  {id:'giant-rat',name:'Giant Rat',type:'minion',dc:10,hp:1,st:1,maj:null,sev:null,atk:'−4',wpn:'Claws · Melee',dmg:'1 phy',motives:'Burrow, hunger, scavenge',feats:[{k:P,n:'Minion (3)',d:'Defeated when they take any damage. For every 3 damage dealt, defeat an additional Minion within range the attack would succeed against.'},{k:A,n:'Group Attack',d:'Spend a Fear to spotlight all Giant Rats within Close of a target. Move into Melee, one shared attack. On a success, deal 1 phy each — combine.'}]},
  {id:'jk-lackey',name:'Jagged Knife Lackey',type:'minion',dc:9,hp:1,st:1,maj:null,sev:null,atk:'−2',wpn:'Daggers · Melee',dmg:'2 phy',motives:'Escape, profit, throw smoke',feats:[{k:P,n:'Minion (3)',d:'Defeated when they take any damage. For every 3 damage dealt, defeat an additional Minion within range the attack would succeed against.'},{k:A,n:'Group Attack',d:'Spend a Fear to spotlight all Lackeys within Close of a target. Move into Melee, one shared attack. On a success, deal 2 phy each — combine.'}]},
  {id:'minor-treant',name:'Minor Treant',type:'minion',dc:10,hp:1,st:1,maj:null,sev:null,atk:'−2',wpn:'Clawed Branch · Melee',dmg:'4 phy',motives:'Crush, overwhelm, protect',feats:[{k:P,n:'Minion (5)',d:'Defeated when they take any damage. For every 5 damage dealt, defeat an additional Minion within range the attack would succeed against.'},{k:A,n:'Group Attack',d:'Spend a Fear to spotlight all Minor Treants within Close of a target. Move into Melee, one shared attack. On a success, deal 4 phy each — combine.'}]},
  {id:'rotted-zombie',name:'Rotted Zombie',type:'minion',dc:8,hp:1,st:1,maj:null,sev:null,atk:'−3',wpn:'Bite · Melee',dmg:'2 phy',motives:'Eat flesh, hunger, surround',feats:[{k:P,n:'Minion (3)',d:'Defeated when they take any damage. For every 3 damage dealt, defeat an additional Minion within range the attack would succeed against.'},{k:A,n:'Group Attack',d:'Spend a Fear to spotlight all Rotted Zombies within Close of a target. Move into Melee, one shared attack. On a success, deal 2 phy each — combine.'}]},
  {id:'sellsword',name:'Sellsword',type:'minion',dc:10,hp:1,st:1,maj:null,sev:null,atk:'+3',wpn:'Longsword · Melee',dmg:'3 phy',motives:'Charge, lacerate, overwhelm, profit',feats:[{k:P,n:'Minion (4)',d:'Defeated when they take any damage. For every 4 damage dealt, defeat an additional Minion within range the attack would succeed against.'},{k:A,n:'Group Attack',d:'Spend a Fear to spotlight all Sellswords within Close of a target. Move into Melee, one shared attack. On a success, deal 3 phy each — combine.'}]},
  {id:'skeleton-dredge',name:'Skeleton Dredge',type:'minion',dc:8,hp:1,st:1,maj:null,sev:null,atk:'−1',wpn:'Bone Claws · Melee',dmg:'1 phy',motives:'Fall apart, overwhelm, play dead',feats:[{k:P,n:'Minion (4)',d:'Defeated when they take any damage. For every 4 damage dealt, defeat an additional Minion within range the attack would succeed against.'},{k:A,n:'Group Attack',d:'Spend a Fear to spotlight all Dredges within Close of a target. Move into Melee, one shared attack. On a success, deal 1 phy each — combine.'}]},
  {id:'tangle-bramble',name:'Tangle Bramble',type:'minion',dc:11,hp:1,st:1,maj:null,sev:null,atk:'−1',wpn:'Thorns · Melee',dmg:'2 phy',motives:'Combine, drain, entangle',feats:[{k:P,n:'Minion (4)',d:'Defeated when they take any damage. For every 4 damage dealt, defeat an additional Minion within range the attack would succeed against.'},{k:A,n:'Group Attack',d:'Spend a Fear to spotlight all Tangle Brambles within Close of a target. Move into Melee, one shared attack. On a success, deal 2 phy each — combine.'},{k:R,n:'Drain and Multiply',d:"When an attack causes a target to mark HP and there are 3+ Tangle Bramble Minions within Close range, combine them into a Tangle Bramble Swarm Horde. The Horde's HP = number of Minions combined."}]},
  {id:'jk-hexer',name:'Jagged Knife Hexer',type:'support',dc:13,hp:4,st:4,maj:5,sev:9,atk:'+2',wpn:'Staff · Far',dmg:'1d6+2 mag',motives:'Command, hex, profit',feats:[{k:A,n:'Curse',d:'Choose a target within Far and temporarily Curse them. While Cursed, mark a Stress when that target rolls with Hope to make the roll be with Fear instead.'},{k:A,n:'Chaotic Flux',d:'Attack up to three targets within Very Close. Mark a Stress to deal 2d6+3 mag to any the Hexer succeeded against.'}]},
  {id:'courtier',name:'Courtier',type:'social',dc:12,hp:3,st:4,maj:4,sev:8,atk:'−4',wpn:'Daggers · Melee',dmg:'1d4+2 phy',motives:'Discredit, gain favor, maneuver, scheme',feats:[{k:A,n:'Mockery',d:'Mark a Stress to say something mocking and force a target within Close to make a Presence Reaction Roll (14). Fail = mark 2 Stress and become Vulnerable until the scene ends.'},{k:A,n:'Scapegoat',d:'Spend a Fear and target a PC. The Courtier convinces a crowd or prominent individual that the target is the cause of their current conflict or misfortune.'}]},
  {id:'merchant',name:'Merchant',type:'social',dc:12,hp:3,st:3,maj:4,sev:8,atk:'−4',wpn:'Club · Melee',dmg:'1d4+1 phy',motives:'Buy low and sell high, create demand, inflate prices',feats:[{k:P,n:'Preferential Treatment',d:'A PC who succeeds on a Presence Roll against the Merchant gains a discount on purchases. A PC who fails must pay more and has disadvantage on future Presence Rolls against the Merchant.'},{k:P,n:'The Runaround',d:'When a PC rolls a 14 or lower on a Presence Roll against the Merchant, they must mark a Stress.'}]},
  {id:'petty-noble',name:'Petty Noble',type:'social',dc:14,hp:3,st:5,maj:6,sev:10,atk:'−3',wpn:'Rapier · Melee',dmg:'1d6+1 phy',motives:'Abuse power, gather resources, mobilize minions',feats:[{k:P,n:'My Land, My Rules',d:'All social actions made against the Noble on their own land have disadvantage.'},{k:A,n:'Guards, Seize Them!',d:'Once per scene, mark a Stress to summon 1d4 Bladed Guards, who appear at Far range.'},{k:A,n:'Exile',d:'Spend a Fear and target a PC. The Noble proclaims the target and their allies exiled from their territory. While exiled, all have disadvantage during social situations within the Noble\'s domain.'}]},
];

// §COMBAT_STATE ═══════════════════════════════════════════════════════════
// COMBAT STATE
// ═══════════════════════════════════════════════════════════
let sidebarOpen=true,battleStarted=false,round=1;
let playerCount=4,bpTotal=14,bpSpent=0;
let cart=[],combatants=[],filterType='all',filterSearch='',iid=0;
let expanded=new Set();
var tabRawMd={};
var tabOrder=[];   // [{type:'battle'|'lore', id, title?, icon?}] — unified display order
var _restoring=false;
var SESSION_KEY='motherTree_session';
var _tabDragging=false; // true while a tab is being drag-reordered
// Battle tab management
var battles=[],activeBattleId=null,battleTabCounter=0;
var _sessionHadBattles=false;

// §BP_SIDEBAR
function toggleSidebar(){
  sidebarOpen=!sidebarOpen;
  document.getElementById('sidebar').classList.toggle('collapsed',!sidebarOpen);
  document.getElementById('sidebar-toggle').textContent=sidebarOpen?'✕':'☰';
  // Show/hide mobile tap-to-dismiss overlay
  const overlay=document.getElementById('sidebar-overlay');
  if(overlay)overlay.classList.toggle('active',sidebarOpen);
}
function openSidebar(){if(!sidebarOpen)toggleSidebar();}

function updateBP(){
  playerCount=parseInt(document.getElementById('player-count').value)||4;
  bpTotal=3*playerCount+2;
  const b=currentBattle();if(b)b.playerCount=playerCount;
  syncBP();saveSession();
}
function syncBP(){
  bpSpent=battleStarted?combatants.reduce((s,c)=>s+COSTS[c.type],0):cart.reduce((s,c)=>s+COSTS[c.type],0);
  const rem=bpTotal-bpSpent;
  document.getElementById('bp-total').textContent=bpTotal;
  document.getElementById('bp-spent').textContent=bpSpent;
  document.getElementById('bp-rem').textContent=rem;
  document.getElementById('status-bp').textContent=rem;
  const pct=Math.min(100,(bpSpent/bpTotal)*100);
  const bar=document.getElementById('bp-bar');
  bar.style.width=pct+'%';
  bar.classList.toggle('over',bpSpent>bpTotal);
}

function buildFilters(){
  document.getElementById('filter-row').innerHTML=
    ['all',...TYPE_ORDER].map(t=>`<button class="filter-btn${t===filterType?' active':''}" onclick="setFilter('${t}')">${t==='all'?'All':ICONS[t]+' '+cap(t)}</button>`).join('');
}
function setFilter(t){filterType=t;buildFilters();renderList();}
function setSearch(v){filterSearch=v.trim().toLowerCase();renderList();}
function cap(s){return s[0].toUpperCase()+s.slice(1);}

const TAG_LABEL={passive:'Passive',action:'Action',reaction:'Reaction',fear:'Fear'};
function tagHTML(k){return `<span class="ability-tag tag-${k}">${TAG_LABEL[k]}</span>`;}

const STATUSES=['Vulnerable','Hidden','Restrained'];

// §ENCOUNTER_QUEUE
function addToQueue(id){
  const a=ADV.find(x=>x.id===id);if(!a)return;
  const cost=COSTS[a.type];
  if(bpTotal-bpSpent<cost)return;
  if(battleStarted){addCombatant(a);return;}
  cart.push({...a,_iid:++iid});
  syncBP();renderList();renderStage();statusBar();saveSession();
  if(window.innerWidth<=768&&sidebarOpen)toggleSidebar();
}
function removeFromCart(_iid){
  const idx=cart.findIndex(c=>c._iid===_iid);if(idx<0)return;
  cart.splice(idx,1);syncBP();renderList();renderStage();statusBar();saveSession();
}

// §COMBAT_FLOW
function beginBattle(){
  if(cart.length===0){openSidebar();return;}
  battleStarted=true;round=1;
  combatants=cart.map(c=>mkCombatant(c));cart=[];
  document.getElementById('btn-begin').style.display='none';
  document.getElementById('btn-reset').style.display='';
  document.getElementById('btn-add-more').style.display='';
  document.getElementById('round-badge').style.display='';
  document.getElementById('round-num').textContent=1;
  renderCombat();syncBP();renderList();statusBar();saveSession();
}
function mkCombatant(a){return {...a,_iid:a._iid||++iid,hp_m:new Array(a.hp).fill(false),st_m:new Array(a.st).fill(false),defeated:false,activeStatuses:a.activeStatuses||[]};}
function addCombatant(a){combatants.push(mkCombatant({...a,_iid:++iid}));syncBP();renderList();renderCombat();statusBar();saveSession();}
function resetBattle(){
  if(!confirm('Reset encounter?'))return;
  battleStarted=false;round=1;cart=[];combatants=[];
  document.getElementById('btn-begin').style.display='';
  document.getElementById('btn-reset').style.display='none';
  document.getElementById('btn-add-more').style.display='none';
  document.getElementById('round-badge').style.display='none';
  syncBP();renderList();renderStage();statusBar();saveSession();
}
function advanceRound(){round++;document.getElementById('round-num').textContent=round;saveSession();}

function renderStage(){
  const grid=document.getElementById('encounter-grid');const empty=document.getElementById('empty-state');
  if(!battleStarted&&cart.length===0){grid.style.display='none';empty.style.display='flex';updateSaveEncBtn();return;}
  empty.style.display='none';grid.style.display='grid';
  grid.innerHTML=cart.map(c=>`<div class="combat-card" style="border-style:dashed;opacity:.75"><button class="card-dismiss" onclick="removeFromCart(${c._iid})">✕</button><div class="card-header"><div class="card-name">${c.name}</div><span class="card-type-badge tc-${c.type}">${ICONS[c.type]} ${cap(c.type)}</span></div><div class="card-meta"><span class="card-stat">DC <span>${c.dc}</span></span><span class="card-stat">HP <span>${c.hp}</span></span><span class="card-stat">ST <span>${c.st}</span></span><span class="card-stat">ATK <span>${c.atk}</span></span></div><div style="font-size:12px;color:var(--text-muted);font-style:italic;text-align:center">Queued — hit ▶ Begin Battle</div></div>`).join('');
  updateSaveEncBtn();
}
// §COMBAT_RENDER
function renderCombat(){
  const grid=document.getElementById('encounter-grid');const empty=document.getElementById('empty-state');
  if(combatants.length===0&&cart.length===0){grid.style.display='none';empty.style.display='flex';return;}
  empty.style.display='none';grid.style.display='grid';
  grid.innerHTML=combatants.map(c=>combatCard(c)).join('');
}
function combatCard(c){
  const thrStr=c.maj!=null?`${c.maj}/${c.sev??'—'}`:'—';
  const hpDots=c.hp_m.map((m,i)=>`<div class="dot dot-hp${m?' marked':''}" onclick="toggleDot('hp','${c._iid}',${i})"></div>`).join('');
  const stDots=c.st_m.map((m,i)=>`<div class="dot dot-stress${m?' marked':''}" onclick="toggleDot('st','${c._iid}',${i})"></div>`).join('');
  const statuses=c.activeStatuses||[];
  const badgesHTML=statuses.map(s=>`<button class="status-badge sb-${s.toLowerCase()}" onclick="removeStatus('${c._iid}','${s}')" title="Remove ${s}">${s} ×</button>`).join('');
  const available=STATUSES.filter(s=>!statuses.includes(s));
  const pickerHTML=available.map(s=>`<button class="status-option" onclick="addStatus('${c._iid}','${s}')">${s}</button>`).join('');
  const statusSection=`<div class="card-statuses">${badgesHTML}<button class="status-add-btn" onclick="toggleStatusPicker('${c._iid}')">+ Status</button><div class="status-picker" id="sp-${c._iid}">${pickerHTML}</div></div>`;
  const feats=c.feats||[];
  const abilitiesSection=feats.length?`<button class="card-abilities-toggle" data-cabiid="${c._iid}" onclick="toggleCardAbilities('${c._iid}')">▼ Abilities</button><div class="card-abilities" id="ca-${c._iid}">${feats.map((f,i)=>`<div class="ability-item"><div class="ability-header">${tagHTML(f.k)}<span class="ability-name" data-featidx="${i}" ondblclick="startEditFeatName('${c._iid}',${i})" title="Double-click to rename">${f.n}</span></div><div class="ability-desc">${f.d}</div></div>`).join('')}</div>`:'';
  return `<div class="combat-card${c.defeated?' defeated':''}" id="cc-${c._iid}"><button class="card-dismiss" onclick="removeCombatant('${c._iid}')">✕</button><div class="card-header"><div class="card-name" ondblclick="startEditName('${c._iid}')" title="Double-click to rename">${c.name}</div><span class="card-type-badge tc-${c.type}">${ICONS[c.type]} ${cap(c.type)}</span></div><div class="card-meta"><span class="card-stat">DC <span>${c.dc}</span></span><span class="card-stat">THR <span>${thrStr}</span></span><span class="card-stat">ATK <span>${c.atk}</span></span><span class="card-stat"><span>${c.dmg}</span></span></div>${c.defeated?'<div class="defeated-banner">⚰ Defeated</div>':''}<div class="dots-section"><div class="dots-label" style="color:var(--hp-color)">HP · ${c.hp_m.filter(Boolean).length}/${c.hp}</div><div class="dots-row">${hpDots}</div></div><div class="dots-section"><div class="dots-label" style="color:var(--stress-color)">Stress · ${c.st_m.filter(Boolean).length}/${c.st}</div><div class="dots-row">${stDots}</div></div>${statusSection}${abilitiesSection}</div>`;
}
function toggleDot(kind,_iid,idx){
  const c=combatants.find(x=>String(x._iid)===String(_iid));if(!c)return;
  if(kind==='hp'){c.hp_m[idx]=!c.hp_m[idx];c.defeated=c.hp_m.every(Boolean);}
  else{c.st_m[idx]=!c.st_m[idx];}
  const el=document.getElementById(`cc-${_iid}`);if(el)el.outerHTML=combatCard(c);
  statusBar();saveSession();
}
function removeCombatant(_iid){
  const idx=combatants.findIndex(x=>String(x._iid)===String(_iid));if(idx<0)return;
  combatants.splice(idx,1);syncBP();renderList();renderCombat();statusBar();saveSession();
}
function addStatus(_iid,status){
  const c=combatants.find(x=>String(x._iid)===String(_iid));if(!c)return;
  if(!c.activeStatuses)c.activeStatuses=[];
  if(!c.activeStatuses.includes(status))c.activeStatuses.push(status);
  const el=document.getElementById(`cc-${_iid}`);if(el)el.outerHTML=combatCard(c);
  saveSession();
}
function removeStatus(_iid,status){
  const c=combatants.find(x=>String(x._iid)===String(_iid));if(!c||!c.activeStatuses)return;
  c.activeStatuses=c.activeStatuses.filter(s=>s!==status);
  const el=document.getElementById(`cc-${_iid}`);if(el)el.outerHTML=combatCard(c);
  saveSession();
}
function toggleStatusPicker(_iid){document.getElementById(`sp-${_iid}`)?.classList.toggle('open');}
function toggleCardAbilities(_iid){
  const panel=document.getElementById(`ca-${_iid}`);if(!panel)return;
  panel.classList.toggle('open');
  const btn=document.querySelector(`[data-cabiid="${_iid}"]`);
  if(btn)btn.textContent=panel.classList.contains('open')?'▲ Abilities':'▼ Abilities';
}
function inlineKey(e,inp){
  if(e.key==='Enter'){e.preventDefault();inp.blur();}
  if(e.key==='Escape'){inp.dataset.cancelled='1';inp.blur();}
}
function startEditName(_iid){
  const el=document.querySelector(`#cc-${_iid} .card-name`);if(!el)return;
  const c=combatants.find(x=>String(x._iid)===String(_iid));if(!c)return;
  el.innerHTML=`<input class="inline-edit" value="${escH(c.name)}" onblur="commitEditName('${_iid}',this)" onkeydown="inlineKey(event,this)">`;
  el.querySelector('input').select();
}
function commitEditName(_iid,inp){
  const c=combatants.find(x=>String(x._iid)===String(_iid));if(!c)return;
  if(!inp.dataset.cancelled){const v=inp.value.trim();if(v)c.name=v;}
  const el=document.getElementById(`cc-${_iid}`);if(el)el.outerHTML=combatCard(c);
  saveSession();
}
function startEditFeatName(_iid,idx){
  const el=document.querySelector(`#cc-${_iid} [data-featidx="${idx}"]`);if(!el)return;
  const c=combatants.find(x=>String(x._iid)===String(_iid));if(!c||!c.feats||!c.feats[idx])return;
  el.innerHTML=`<input class="inline-edit feat-name-edit" value="${escH(c.feats[idx].n)}" onblur="commitEditFeatName('${_iid}',${idx},this)" onkeydown="inlineKey(event,this)">`;
  el.querySelector('input').select();
}
function commitEditFeatName(_iid,idx,inp){
  const c=combatants.find(x=>String(x._iid)===String(_iid));if(!c||!c.feats||!c.feats[idx])return;
  if(!inp.dataset.cancelled){const v=inp.value.trim();if(v)c.feats[idx].n=v;}
  const el=document.getElementById(`cc-${_iid}`);if(el)el.outerHTML=combatCard(c);
  saveSession();
}
function statusBar(){
  document.getElementById('status-active').textContent=battleStarted?combatants.filter(c=>!c.defeated).length:cart.length;
  document.getElementById('status-defeated').textContent=battleStarted?combatants.filter(c=>c.defeated).length:0;
  syncBP();
}

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
    req.onsuccess=function(e){
      _db=e.target.result;
      _db.onclose=function(){_db=null;};
      res(_db);
    };
    req.onerror=function(e){_dbFailed=true;rej(e.target.error);};
    req.onblocked=function(){
      showToast('Please close other tabs to allow database upgrade.',5000);
      rej(new Error('idb blocked'));
    };
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

// §DB_MIGRATE ═══════════════════════════════════════════════════════════
// ONE-TIME MIGRATION: localStorage → IndexedDB
// ═══════════════════════════════════════════════════════════════════════
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
      })
      .catch(function(e){
        console.warn('db_migrate: write failed, will retry next load',e);
      });
  });
}

// §EXPORT_IMPORT ═══════════════════════════════════════════════════════
// EXPORT / IMPORT JSON BACKUP
// ═══════════════════════════════════════════════════════════════════════
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
    if(payload.version!==1||
       !['combat_session','custom_adversaries','toolkit_notes','generator_library','saved_encounters']
         .every(function(k){return k in payload;})){
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

// §SAVED_ENCOUNTERS ════════════════════════════════════════════════
// SAVED ENCOUNTERS — SAVE, LOAD, MANAGE
// ═══════════════════════════════════════════════════════════════════

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
  db_getAll('saved_encounters').then(function(existing){
    var dupe=(existing||[]).find(function(e){return e.name.toLowerCase()===name.toLowerCase();});
    if(dupe){showToast('An encounter named "'+name+'" already exists.');return;}
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
    var b=battles.find(function(x){return x.id===activeBattleId;});
    if(b){b.name=name;renderAllTabs();saveSession();}
    }).catch(function(e){showToast('Save failed: '+e.message);});
  });
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
  if(!hasContent){_applyEncounter(enc,'replace');return;}
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

function _openEncounterAsNewBattle(enc){
  saveBattleState();
  var id='battle-'+Date.now();
  var b={id,name:enc.name,battleStarted:false,round:1,playerCount,cart:[],combatants:[],iid:0};
  battles.push(b);
  tabOrder.push({type:'battle',id});
  activeBattleId=id;
  loadBattleState(b);
  var advs=JSON.parse(JSON.stringify(enc.adversaries||[]));
  advs.forEach(function(a){cart.push(Object.assign({},a,{_iid:++iid}));});
  b.cart=cart;b.iid=iid;
  activeTab='combat';
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-combat'));
  renderAllTabs();
  applyBattleToDOM();
  saveSession();
  showToast('"'+enc.name+'" opened.');
}

function _applyEncounter(enc,mode){
  if(mode==='replace'){
    battleStarted=false;round=1;cart=[];combatants=[];
    var beginBtn=document.getElementById('btn-begin');
    var resetBtn=document.getElementById('btn-reset');
    var addMoreBtn=document.getElementById('btn-add-more');
    var roundBadge=document.getElementById('round-badge');
    if(beginBtn)beginBtn.style.display='';
    if(resetBtn)resetBtn.style.display='none';
    if(addMoreBtn)addMoreBtn.style.display='none';
    if(roundBadge)roundBadge.style.display='none';
  }
  var advs=JSON.parse(JSON.stringify(enc.adversaries||[]));
  if(mode==='add'&&battleStarted){
    advs.forEach(function(a){addCombatant(a);});
  } else {
    advs.forEach(function(a){cart.push(Object.assign({},a,{_iid:++iid}));});
    syncBP();renderList();renderStage();statusBar();saveSession();
  }
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

// §CUSTOM_ADV ═══════════════════════════════════════════════════════════
// CUSTOM ADVERSARY SYSTEM
// ═══════════════════════════════════════════════════════════
var customAdv=[];
var STORAGE_KEY='motherTree_customAdv';
var featRowId=0;

function loadCustomAdv(){
  try{var s=localStorage.getItem(STORAGE_KEY);if(s)customAdv=JSON.parse(s);}catch(e){}
  customAdv.forEach(function(a){if(!ADV.find(function(x){return x.id===a.id;}))ADV.push(a);});
}
function saveCustomAdvStorage(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(customAdv));}catch(e){}
}

function parseAdvMd(raw,filename){
  var text=raw.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  // Extract YAML frontmatter between first pair of --- delimiters
  var fm={};
  var parts=text.split('---');
  // parts[0] may be empty string before first ---, parts[1] is frontmatter, rest is body
  if(parts.length<3){return {error:'Missing frontmatter delimiters'};}
  var yamlBlock=parts[1];
  var body=parts.slice(2).join('---');
  // Parse each key: value line in the frontmatter
  var intFields={dc:1,hp:1,st:1,maj:1,sev:1};
  yamlBlock.split('\n').forEach(function(line){
    var colon=line.indexOf(':');
    if(colon<1)return;
    var key=line.slice(0,colon).trim();
    var val=line.slice(colon+1).trim();
    if(!key||val==='')return;
    if(intFields[key])fm[key]=parseInt(val,10);
    else fm[key]=val;
  });
  // sev is optional — set to null if not present
  if(fm.sev===undefined)fm.sev=null;
  // Validate required fields
  var required=['name','type','dc','hp','st','maj','atk','wpn','dmg'];
  for(var ri=0;ri<required.length;ri++){
    var rf=required[ri];
    if(fm[rf]===undefined||fm[rf]===''||fm[rf]===null){
      return {error:'Missing required field: '+rf};
    }
  }
  // Parse ## Abilities section
  var feats=[];
  var abilitiesMatch=body.split('## Abilities');
  if(abilitiesMatch.length>1){
    var abSection=abilitiesMatch[1].split(/^## /m)[0]; // stop at next ## heading
    var abilityBlocks=abSection.split(/^### /m);
    abilityBlocks.forEach(function(block){
      if(!block.trim())return;
      var lines=block.split('\n');
      var abilityName=lines[0].trim();
      if(!abilityName)return;
      // Find the **tag** — description line
      for(var li=1;li<lines.length;li++){
        var l=lines[li].trim();
        if(!l)continue;
        var tagMatch=l.match(/^\*\*([^*]+)\*\*\s*[—–-]+\s*(.+)/);
        if(tagMatch){
          feats.push({k:tagMatch[1].trim(),n:abilityName,d:tagMatch[2].trim()});
        }
        break;
      }
    });
  }
  // Build the adversary object
  var safeName=fm.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  var id='custom_'+safeName+'_'+Date.now();
  var adv={
    id:id,
    name:fm.name,
    type:fm.type,
    dc:fm.dc,
    hp:fm.hp,
    st:fm.st,
    maj:fm.maj,
    sev:fm.sev,
    atk:fm.atk,
    wpn:fm.wpn,
    dmg:fm.dmg,
    motives:fm.motives||'',
    feats:feats,
    _custom:true
  };
  return adv;
}

function handleAdvUpload(files){
  var fileArr=Array.prototype.slice.call(files);
  fileArr.forEach(function(file){
    var reader=new FileReader();
    reader.onload=function(e){
      var raw=e.target.result;
      var result=parseAdvMd(raw,file.name);
      if(result.error){
        showToast('⚠ '+result.error+' in '+file.name);
        return;
      }
      var adv=result;
      ADV.push(adv);
      customAdv.push(adv);
      db_put('custom_adversaries',adv);
      renderList();
      showToast('✅ '+adv.name+' added to Arsenal');
    };
    reader.readAsText(file);
  });
  // Reset file input so the same file can be re-uploaded
  var input=document.getElementById('adv-upload-input');
  if(input)input.value='';
}

function openCustomModal(editId){
  document.getElementById('cm-modal-title').textContent=editId?'✦ Edit Custom Adversary':'✦ Create Custom Adversary';
  if(editId){
    var a=ADV.find(function(x){return x.id===editId;});if(!a)return;
    document.getElementById('cm-name').value=a.name;
    document.getElementById('cm-type').value=a.type;
    document.getElementById('cm-motives').value=a.motives||'';
    document.getElementById('cm-dc').value=a.dc||'';
    document.getElementById('cm-hp').value=a.hp||'';
    document.getElementById('cm-st').value=a.st||'';
    document.getElementById('cm-maj').value=a.maj!=null?a.maj:'';
    document.getElementById('cm-sev').value=a.sev!=null?a.sev:'';
    document.getElementById('cm-atk').value=a.atk||'';
    document.getElementById('cm-wpn').value=a.wpn||'';
    document.getElementById('cm-dmg').value=a.dmg||'';
    document.getElementById('cm-edit-id').value=editId;
    document.getElementById('cm-feat-list').innerHTML='';
    (a.feats||[]).forEach(function(f){addFeatRow(f);});
  } else {
    clearModal();
  }
  document.getElementById('custom-modal-bg').classList.add('open');
  setTimeout(function(){document.getElementById('cm-name').focus();},50);
}
function closeCustomModal(){
  document.getElementById('custom-modal-bg').classList.remove('open');
  clearModal();
}
function clearModal(){
  ['cm-name','cm-motives','cm-dc','cm-hp','cm-st','cm-maj','cm-sev','cm-atk','cm-wpn','cm-dmg']
    .forEach(function(id){document.getElementById(id).value='';});
  document.getElementById('cm-type').value='standard';
  document.getElementById('cm-feat-list').innerHTML='';
  document.getElementById('cm-edit-id').value='';
}

function escH(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;');}

function addFeatRow(feat){
  var id='fr-'+(++featRowId);
  var k=(feat&&feat.k)||'action';
  var n=(feat&&feat.n)||'';
  var d=(feat&&feat.d)||'';
  var row=document.createElement('div');
  row.className='feat-row';
  row.id=id;
  row.innerHTML='<div class="feat-row-top">'
    +'<select class="cm-select feat-select" id="'+id+'-k">'
    +'<option value="passive"'+(k==='passive'?' selected':'')+'>Passive</option>'
    +'<option value="action"'+(k==='action'?' selected':'')+'>Action</option>'
    +'<option value="reaction"'+(k==='reaction'?' selected':'')+'>Reaction</option>'
    +'<option value="fear"'+(k==='fear'?' selected':'')+'>Fear</option>'
    +'</select>'
    +'<input class="cm-input feat-name-input" id="'+id+'-n" placeholder="Ability name" value="'+escH(n)+'" maxlength="60">'
    +'<button type="button" class="feat-remove" data-rowid="'+id+'" title="Remove">✕</button>'
    +'</div>'
    +'<textarea class="cm-textarea feat-desc-input" id="'+id+'-d" placeholder="Describe what this ability does…" rows="2">'+escH(d)+'</textarea>';
  document.getElementById('cm-feat-list').appendChild(row);
  // wire remove btn via event delegation (already handled below)
}

function saveCustomAdv(){
  var name=document.getElementById('cm-name').value.trim();
  if(!name){
    document.getElementById('cm-name').focus();
    document.getElementById('cm-name').style.borderColor='var(--fear)';
    setTimeout(function(){document.getElementById('cm-name').style.borderColor='';},1200);
    return;
  }
  var type=document.getElementById('cm-type').value;
  var dc=parseInt(document.getElementById('cm-dc').value)||12;
  var hp=parseInt(document.getElementById('cm-hp').value)||4;
  var st=parseInt(document.getElementById('cm-st').value)||3;
  var majV=document.getElementById('cm-maj').value.trim();
  var sevV=document.getElementById('cm-sev').value.trim();
  var maj=majV!==''?parseInt(majV):null;
  var sev=sevV!==''?parseInt(sevV):null;
  var atk=document.getElementById('cm-atk').value.trim()||'+0';
  var wpn=document.getElementById('cm-wpn').value.trim()||'Attack · Melee';
  var dmg=document.getElementById('cm-dmg').value.trim()||'1d6 phy';
  var motives=document.getElementById('cm-motives').value.trim();
  var feats=[];
  document.querySelectorAll('#cm-feat-list .feat-row').forEach(function(row){
    var rid=row.id;
    var fk=document.getElementById(rid+'-k');
    var fn=document.getElementById(rid+'-n');
    var fd=document.getElementById(rid+'-d');
    var fkv=fk?fk.value:'action';
    var fnv=fn?fn.value.trim():'';
    var fdv=fd?fd.value.trim():'';
    if(fnv)feats.push({k:fkv,n:fnv,d:fdv});
  });
  var editId=document.getElementById('cm-edit-id').value;
  if(editId){
    var existIdx=ADV.findIndex(function(x){return x.id===editId;});
    var custIdx=customAdv.findIndex(function(x){return x.id===editId;});
    var updated={id:editId,name:name,type:type,dc:dc,hp:hp,st:st,maj:maj,sev:sev,atk:atk,wpn:wpn,dmg:dmg,motives:motives,feats:feats,_custom:true};
    if(existIdx>=0)ADV[existIdx]=updated;
    if(custIdx>=0)customAdv[custIdx]=updated;else customAdv.push(updated);
  } else {
    var id='custom-'+Date.now();
    var adv={id:id,name:name,type:type,dc:dc,hp:hp,st:st,maj:maj,sev:sev,atk:atk,wpn:wpn,dmg:dmg,motives:motives,feats:feats,_custom:true};
    ADV.push(adv);
    customAdv.push(adv);
  }
  saveCustomAdvStorage();
  closeCustomModal();
  syncBP();renderList();buildFilters();
}

function deleteCustomAdv(id,e){
  e.stopPropagation();
  if(!confirm('Delete this custom adversary?'))return;
  var ai=ADV.findIndex(function(x){return x.id===id;});if(ai>=0)ADV.splice(ai,1);
  var ci=customAdv.findIndex(function(x){return x.id===id;});if(ci>=0)customAdv.splice(ci,1);
  saveCustomAdvStorage();
  syncBP();renderList();buildFilters();
}

// §SESSION ═══════════════════════════════════════════════════════════
// SESSION PERSISTENCE
// ═══════════════════════════════════════════════════════════
function saveSession(){
  if(_restoring)return;
  saveBattleState();
  // Build loreTabs map: id → rawMd
  var loreTabs={};
  tabOrder.forEach(function(e){if(e.type==='lore')loreTabs[e.id]=tabRawMd[e.id]||'';});
  var state={
    battles:battles,
    activeBattleId:activeBattleId,
    battleTabCounter:battleTabCounter,
    activeTab:activeTab,
    tabOrder:tabOrder,
    loreTabs:loreTabs
  };
  try{localStorage.setItem(SESSION_KEY,JSON.stringify(state));}catch(e){}
}

function _restoreCombatant(c){
  return Object.assign({},c,{
    hp_m:Array.isArray(c.hp_m)?c.hp_m:new Array(c.hp).fill(false),
    st_m:Array.isArray(c.st_m)?c.st_m:new Array(c.st).fill(false),
    activeStatuses:Array.isArray(c.activeStatuses)?c.activeStatuses:[]
  });
}

function loadSession(){
  _restoring=true;
  try{
    var raw=localStorage.getItem(SESSION_KEY);
    if(!raw){_restoring=false;return;}
    var state=JSON.parse(raw);

    // ── Restore battles ──
    if(state.battles&&Array.isArray(state.battles)){_sessionHadBattles=true;}
    if(state.battles&&state.battles.length){
      battleTabCounter=state.battleTabCounter||state.battles.length;
      battles=state.battles.map(function(b){
        return {
          id:b.id,name:b.name||'Battle 1',
          battleStarted:!!b.battleStarted,round:b.round||1,
          playerCount:b.playerCount||4,iid:b.iid||0,
          cart:b.cart||[],
          combatants:(b.combatants||[]).map(_restoreCombatant)
        };
      });
      activeBattleId=state.activeBattleId||battles[0].id;
      loadBattleState(currentBattle());
    } else if(state.playerCount!=null){
      // Legacy single-battle format
      battleTabCounter=1;
      battles=[{
        id:'battle-1',name:'Battle 1',
        battleStarted:!!state.battleStarted,round:state.round||1,
        playerCount:state.playerCount||4,iid:state.iid||0,
        cart:state.cart||[],
        combatants:(state.combatants||[]).map(_restoreCombatant)
      }];
      activeBattleId='battle-1';
      loadBattleState(currentBattle());
    }

    // Apply battle UI state to DOM
    if(battles.length){
      document.getElementById('player-count').value=playerCount;
      document.getElementById('btn-begin').style.display=battleStarted?'none':'';
      document.getElementById('btn-reset').style.display=battleStarted?'':'none';
      document.getElementById('btn-add-more').style.display=battleStarted?'':'none';
      document.getElementById('round-badge').style.display=battleStarted?'':'none';
      if(battleStarted)document.getElementById('round-num').textContent=round;
    }

    // ── Restore tab order and lore panels ──
    if(state.tabOrder){
      // New format: tabOrder includes both battle and lore entries
      tabOrder=state.tabOrder;
      tabOrder.forEach(function(entry){
        if(entry.type==='lore'){
          var rawMd=(state.loreTabs&&state.loreTabs[entry.id])||'';
          tabRawMd[entry.id]=rawMd;
          var num=parseInt((entry.id||'').split('-')[1]||0);
          if(num>tabCounter)tabCounter=num;
          var html=renderMd(rawMd,entry.title);
          var panel=document.createElement('div');
          panel.className='tab-panel';panel.id='panel-'+entry.id;
          panel.innerHTML=_panelHTML(entry.id,html);
          document.getElementById('dynamic-panels').appendChild(panel);
        }
      });
    } else if(state.tabs&&state.tabs.length){
      // Legacy format: build tabOrder from battles + flat tabs array
      tabOrder=battles.map(function(b){return {type:'battle',id:b.id};});
      state.tabs.forEach(function(t,i){
        var id='tab-'+(i+1);
        if(i+1>tabCounter)tabCounter=i+1;
        tabRawMd[id]=t.rawMd||'';
        tabOrder.push({type:'lore',id:id,title:t.title,icon:t.icon||'📜'});
        var html=renderMd(t.rawMd||'',t.title);
        var panel=document.createElement('div');
        panel.className='tab-panel';panel.id='panel-'+id;
        panel.innerHTML=_panelHTML(id,html);
        document.getElementById('dynamic-panels').appendChild(panel);
      });
    } else {
      // No lore tabs — just battles
      tabOrder=battles.map(function(b){return {type:'battle',id:b.id};});
    }

    renderAllTabs();

    // ── Restore active tab ──
    var savedActive=state.activeTab||'combat';
    if(savedActive!=='combat'&&tabRawMd[savedActive]){
      activeTab=savedActive;
      document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+savedActive));
      document.querySelectorAll('#all-tabs .tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===savedActive));
    } else {
      activeTab='combat';
      document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-combat'));
      // Legacy activeTabIdx fallback
      if(state.activeTabIdx>=0&&state.tabs&&state.tabs[state.activeTabIdx]){
        var lid='tab-'+(state.activeTabIdx+1);
        if(tabRawMd[lid]){activeTab=lid;
          document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+lid));
          document.querySelectorAll('#all-tabs .tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===lid));
        }
      }
    }
  }catch(e){console.error('loadSession:',e);}
  _restoring=false;
}

// §ADV_LIST
// ── Unified renderList (replaces the earlier one) ─────────
function renderList(){
  var rem=bpTotal-bpSpent;
  var filtered=filterType==='all'?ADV:ADV.filter(function(a){return a.type===filterType;});
  if(filterSearch)filtered=filtered.filter(function(a){return a.name.toLowerCase().includes(filterSearch);});
  var groups={};TYPE_ORDER.forEach(function(t){groups[t]=[];});
  filtered.forEach(function(a){groups[a.type].push(a);});
  var html='';
  TYPE_ORDER.forEach(function(type){
    var items=groups[type];if(!items.length)return;
    html+='<div class="type-group"><div class="type-header"><span>'+ICONS[type]+'</span>'+cap(type)+' · '+COSTS[type]+'pt each</div>';
    items.forEach(function(a){
      var oop=rem<COSTS[a.type];
      var thrStr=a.maj!=null?(''+a.maj+(a.sev!=null?'/'+a.sev:'/—')):'None';
      var isOpen=expanded.has(a.id);
      var abilities=(a.feats||[]).map(function(f){return '<div class="ability-item"><div class="ability-header">'+tagHTML(f.k)+'<span class="ability-name">'+f.n+'</span></div><div class="ability-desc">'+f.d+'</div></div>';}).join('');
      var customBadge=a._custom?'<span class="custom-pill">Custom</span>':'';
      var editBtn=a._custom
        ?'<button class="adv-expand-strip" data-editid="'+a.id+'" title="Edit" style="font-size:13px">✎</button>'
         +'<button class="adv-delete-btn" data-delid="'+a.id+'" title="Delete">🗑</button>'
        :'';
      html+='<div class="adv-card'+(oop?' out-of-budget':'')+'"><div class="adv-main">'
        +'<div class="adv-add-zone"'+(oop?'':' data-addid="'+a.id+'"')+'>'
        +'<div class="adv-top"><span class="adv-name">'+a.name+'</span>'+customBadge+'<span class="adv-cost-badge">'+COSTS[a.type]+'pt</span></div>'
        +'<div class="adv-stats"><span class="adv-stat">DC<span>'+a.dc+'</span></span><span class="adv-stat">HP<span>'+a.hp+'</span></span><span class="adv-stat">ST<span>'+a.st+'</span></span><span class="adv-stat">THR<span>'+thrStr+'</span></span><span class="adv-stat">ATK<span>'+a.atk+'</span></span></div>'
        +'<div class="adv-atk-line">'+a.dmg+' · '+a.wpn+'</div>'
        +'</div>'
        +editBtn
        +'<button class="adv-expand-strip'+(isOpen?' open':'')+'" data-expandid="'+a.id+'" title="'+(isOpen?'Hide':'Show')+' abilities">'+(isOpen?'▲':'▼')+'</button>'
        +'</div>'
        +'<div class="adv-abilities'+(isOpen?' open':'')+'" id="ab-'+a.id+'">'+(a.motives?'<div class="motives-line">🎯 '+a.motives+'</div>':'')+abilities+'</div>'
        +'</div>';
    });
    html+='</div>';
  });
  document.getElementById('adv-list').innerHTML=html;
}

// ── Single event-delegated click handler for adv-list ────
document.addEventListener('click',function(e){
  if(!e.target.closest('#lore-add-wrap'))closeLoreMenu();
  var setCatBtn=e.target.closest('[data-setcat]');
  if(setCatBtn){setRulesCat(setCatBtn.dataset.setcat);return;}
  // add to queue
  var addZone=e.target.closest('[data-addid]');
  if(addZone){addToQueue(addZone.dataset.addid);return;}
  // expand abilities
  var expBtn=e.target.closest('[data-expandid]');
  if(expBtn){toggleAbilitiesById(expBtn.dataset.expandid,expBtn);return;}
  // edit custom
  var editBtn=e.target.closest('[data-editid]');
  if(editBtn){openCustomModal(editBtn.dataset.editid);return;}
  // delete custom
  var delBtn=e.target.closest('[data-delid]');
  if(delBtn){deleteCustomAdv(delBtn.dataset.delid,e);return;}
  // remove feat row
  var removeBtn=e.target.closest('[data-rowid]');
  if(removeBtn){document.getElementById(removeBtn.dataset.rowid)?.remove();return;}
  var editRuleBtn=e.target.closest('[data-ruleedit]');
  if(editRuleBtn){
    db_get('toolkit_notes',editRuleBtn.dataset.ruleedit).then(function(rec){
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
  var delRuleBtn=e.target.closest('[data-ruledel]');
  if(delRuleBtn){deleteCustomRule(delRuleBtn.dataset.ruledel);return;}
  var nedit=e.target.closest('[data-ncedit]');
  if(nedit){
    db_get('toolkit_notes',nedit.dataset.ncedit).then(function(rec){
      if(!rec)return;
      _noteEditId=rec.id;
      var typeEl=document.getElementById('ncf-type');
      var nameEl=document.getElementById('ncf-name');
      var notesEl=document.getElementById('ncf-notes');
      if(typeEl)typeEl.value=rec.type||'npc';
      if(nameEl)nameEl.value=rec.name||'';
      if(notesEl)notesEl.value=rec.notes||'';
      document.getElementById('notes-card-form').classList.add('open');
    });
    return;
  }
  var ndel=e.target.closest('[data-ncdel]');
  if(ndel){deleteNoteCard(ndel.dataset.ncdel);return;}
  var nameStyleBtn=e.target.closest('[data-namestyle]');
  if(nameStyleBtn){setNameStyle(nameStyleBtn.dataset.namestyle);return;}
  var copyNameBtn=e.target.closest('[data-copyname]');
  if(copyNameBtn){
    navigator.clipboard.writeText(copyNameBtn.dataset.copyname).then(function(){showToast('Copied!');}).catch(function(){showToast('Copy failed.');});
    return;
  }
  var pinNameBtn=e.target.closest('[data-pinname]');
  if(pinNameBtn){pinToNotes('npc',pinNameBtn.dataset.pinname,'');showToast('Pinned as NPC.');return;}
  var pinLootBtn=e.target.closest('[data-pinloot]');
  if(pinLootBtn){
    pinToNotes('loot','Loot — T'+pinLootBtn.dataset.pintier,pinLootBtn.dataset.pinloot);
    showToast('Pinned.');
    return;
  }
  var envSeedBtn=e.target.closest('[data-envseed]');
  if(envSeedBtn){setEnvSeed(envSeedBtn.dataset.envseed);return;}
  var loadBtn=e.target.closest('[data-envload]');
  if(loadBtn){
    db_get('generator_library',loadBtn.dataset.envload).then(function(env){
      if(!env)return;
      _currentEnvBlock=env;_editingEnvId=env.id;
      renderEnvBlock(env,'env-result',false);
      var ui=document.getElementById('env-gen-ui');if(ui)ui.scrollIntoView({behavior:'smooth'});
    });return;
  }
  var pinLibBtn=e.target.closest('[data-envpin]');
  if(pinLibBtn){
    db_get('generator_library',pinLibBtn.dataset.envpin).then(function(env){
      if(!env)return;
      pinToNotes('threat',env.name,'T'+env.tier+' '+env.type+' | DC '+env.dc);
      showToast('Pinned to Notes.');
    });return;
  }
  var delEnvBtn=e.target.closest('[data-envdel]');
  if(delEnvBtn){
    db_get('generator_library',delEnvBtn.dataset.envdel).then(function(env){
      if(!env)return;
      if(!confirm('Delete "'+env.name+'"?'))return;
      db_delete('generator_library',delEnvBtn.dataset.envdel).then(function(){
        showToast('Environment deleted.');renderEnvLibrary();
      });
    });return;
  }
  var loadEncBtn=e.target.closest('[data-loadenc]');
  if(loadEncBtn){loadSavedEncounter(loadEncBtn.dataset.loadenc);return;}
  var delEncBtn=e.target.closest('[data-delenc]');
  if(delEncBtn){deleteSavedEncounter(delEncBtn.dataset.delenc);return;}
  var encLink=e.target.closest('.encounter-link');
  if(encLink){
    e.preventDefault();
    var encName=encLink.dataset.encounterName;
    db_getAll('saved_encounters').then(function(encs){
      var enc=(encs||[]).find(function(x){return x.name===encName;});
      if(!enc){showToast('No saved encounter named "'+encName+'" found.');return;}
      _openEncounterAsNewBattle(enc);
    });
    return;
  }
});

function toggleAbilitiesById(id,btn){
  expanded.has(id)?expanded.delete(id):expanded.add(id);
  var panel=document.getElementById('ab-'+id);
  var now=expanded.has(id);
  if(panel)panel.classList.toggle('open',now);
  if(btn){btn.classList.toggle('open',now);btn.textContent=now?'▲':'▼';}
}

// ── Wire modal buttons ────────────────────────────────────
document.getElementById('cm-close-btn').addEventListener('click',closeCustomModal);
document.getElementById('cm-cancel-btn').addEventListener('click',closeCustomModal);
document.getElementById('cm-save-btn').addEventListener('click',saveCustomAdv);
document.getElementById('cm-add-feat-btn').addEventListener('click',function(){addFeatRow();});
document.getElementById('custom-modal-bg').addEventListener('click',function(e){
  if(e.target===document.getElementById('custom-modal-bg'))closeCustomModal();
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeCustomModal();});

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
  if(tab==='rules'&&typeof _rulesRendered!=='undefined'&&!_rulesRendered)renderRulesTab();
  if(tab==='notes'&&typeof renderNotesTab==='function')renderNotesTab();
  if(tab==='gen'&&typeof _genRendered!=='undefined'&&!_genRendered)renderGeneratorsTab();
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

// §RULES_TAB ══════════════════════════════════════════════════════
// RULES REFERENCE TAB
// ═════════════════════════════════════════════════════════════════

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
   summary:'Any rolls against this target have disadvantage.',
   body:'Any rolls against this target have disadvantage. Cleared when: the adversary moves into line of sight of a foe, makes an attack, or a foe moves to where they can see them.'},
  {id:'r-restrained',cat:'Conditions',name:'Restrained',
   summary:'Target cannot move until this condition is cleared.',
   body:'Target cannot move until this condition is cleared, but can still take actions from their current position.'},
  {id:'r-vulnerable',cat:'Conditions',name:'Vulnerable',
   summary:'All rolls targeting this creature have advantage.',
   body:'While a creature is Vulnerable, all rolls targeting them have advantage.'},
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
    '<div class="rules-search"><input class="rules-search-input" placeholder="Search rules\u2026" oninput="filterRules(this.value)" id="rules-search-input"></div>'
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
    return '<button class="rules-cat-pill'+(c===_rulesFilter.cat?' active':'')+'" data-setcat="'+escH(c)+'">'+escH(c)+'</button>';
  }).join('');
}

function setRulesCat(cat){_rulesFilter.cat=cat;renderRulesCats();renderRulesList();}

function filterRules(val){_rulesFilter.search=val.toLowerCase();renderRulesList();}

function renderRulesList(){
  var el=document.getElementById('rules-list');if(!el)return;
  db_getAll('toolkit_notes').then(function(notes){
    var customRules=(notes||[]).filter(function(n){return n._rule;});
    var all=RULES.concat(customRules);
    var filtered=all.filter(function(r){
      var catMatch=_rulesFilter.cat==='All'||r.cat===_rulesFilter.cat;
      var q=_rulesFilter.search;
      var textMatch=!q||(r.name.toLowerCase().indexOf(q)!==-1||r.body.toLowerCase().indexOf(q)!==-1||r.summary.toLowerCase().indexOf(q)!==-1);
      return catMatch&&textMatch;
    });
    if(!filtered.length){el.innerHTML='<div style="padding:12px;font-size:13px;color:var(--text-muted)">No rules match.</div>';_appendRulesForm(el);return;}
    el.innerHTML=filtered.map(function(r){
      var customControls=r._rule?'<button class="rule-edit-btn" data-ruleedit="'+escH(r.id)+'">&#x270E;</button><button class="rule-del-btn" data-ruledel="'+escH(r.id)+'">&times;</button>':'';
      return '<div class="rule-card'+(r._rule?' custom':'')+'"><div class="rule-card-header" onclick="toggleRuleCard(\''+escH(r.id)+'\')">'
        +'<span class="rule-card-name">'+escH(r.name)+'</span>'
        +'<span class="rule-card-summary">'+escH(r.summary)+'</span>'
        +customControls
        +'<span class="rule-card-chevron" id="rchev-'+escH(r.id)+'">&#x25BC;</span>'
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
  el.innerHTML+='<button class="rules-add-btn" onclick="toggleRulesForm()">&#xFF0B; Add Custom Rule</button>'
    +'<div class="rules-inline-form" id="rules-add-form">'
    +'<input class="rif-input" id="rif-name" placeholder="Rule name"><input class="rif-input" id="rif-cat" placeholder="Category (e.g. Combat)">'
    +'<input class="rif-input" id="rif-summary" placeholder="One-line summary">'
    +'<textarea class="rif-textarea" id="rif-body" placeholder="Full rule text\u2026"></textarea>'
    +'<div class="rif-actions"><button class="rif-save" onclick="saveCustomRule()">Save</button><button class="rif-cancel" onclick="toggleRulesForm()">Cancel</button></div>'
    +'</div>';
}

function toggleRuleCard(id){
  var body=document.getElementById('rbody-'+id);
  var chev=document.getElementById('rchev-'+id);
  if(!body)return;
  body.classList.toggle('open');
  if(chev)chev.textContent=body.classList.contains('open')?'\u25B2':'\u25BC';
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
    cat:cat,name:name,summary:summary,body:body
  };
  if(!_ruleEditId){rec.createdAt=new Date().toISOString();}
  db_put('toolkit_notes',rec).then(function(){
    showToast(_ruleEditId?'Rule updated.':'Rule saved.');
    _ruleEditId=null;
    ['rif-name','rif-cat','rif-summary','rif-body'].forEach(function(id){document.getElementById(id).value='';});
    document.getElementById('rules-add-form').classList.remove('open');
    renderRulesList();
  });
}

function deleteCustomRule(id){
  if(!confirm('Delete this rule?'))return;
  db_delete('toolkit_notes',id).then(function(){showToast('Rule deleted.');renderRulesList();});
}


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
    type:type,name:name,notes:notes
  };
  if(!rec.id)rec.id=Date.now()+'_'+Math.random().toString(36).substr(2,4);
  if(!_noteEditId){rec.createdAt=new Date().toISOString();}
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
  _noteEditId=null;
  saveNoteCard({type:type,name:name,notes:notes||''});
}

// §GENERATORS ════════════════════════════════════════════════════
// GENERATORS TAB — NPC Names, Loot Roller, Environment Stat Blocks
// ═════════════════════════════════════════════════════════════════

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
    names.push(n);
  }
  var el=document.getElementById('name-gen-results');if(!el)return;
  el.innerHTML=names.map(function(n){
    return '<div class="gen-result-row">'
      +'<span class="gen-result-name">'+escH(n)+'</span>'
      +'<button class="gen-copy-btn" data-copyname="'+escH(n)+'">Copy</button>'
      +'<button class="gen-pin-btn" data-pinname="'+escH(n)+'">Pin</button>'
      +'</div>';
  }).join('');
}

var _genRendered=false;

function renderGeneratorsTab(){
  _genRendered=true;
  var el=document.getElementById('tkp-gen');if(!el)return;
  el.innerHTML=
    '<div class="gen-section">'
    +'<div class="gen-section-header" onclick="toggleGenSection(\'gen-names\')">'
    +'<span class="gen-section-title">👤 NPC Name Generator</span><span id="gchev-names">▼</span>'
    +'</div>'
    +'<div class="gen-section-body" id="gen-names">'
    +'<div class="gen-chips" id="name-style-chips">'
    +Object.keys(NAME_PARTS).map(function(s){
      return '<button class="gen-chip'+(s===_nameStyle?' active':'')+'" data-namestyle="'+escH(s)+'">'
        +s.charAt(0).toUpperCase()+s.slice(1)+'</button>';
    }).join('')
    +'</div>'
    +'<button class="gen-btn" onclick="generateNames()">Generate Names</button>'
    +'<div class="gen-results" id="name-gen-results"></div>'
    +'</div></div>'
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
    +'<div class="gen-section">'
    +'<div class="gen-section-header" onclick="toggleGenSection(\'gen-env\')">'
    +'<span class="gen-section-title">🌍 Environment Generator</span><span id="gchev-env">▼</span>'
    +'</div>'
    +'<div class="gen-section-body" id="gen-env" style="padding:0;">'
    +'<div id="env-gen-ui"></div>'
    +'</div></div>'
    +'<div class="gen-section">'
    +'<div class="gen-section-header" onclick="toggleGenSection(\'gen-library\')">'
    +'<span class="gen-section-title">📚 Environment Library</span><span id="gchev-library">▼</span>'
    +'</div>'
    +'<div class="gen-section-body" id="gen-library"></div>'
    +'</div>';
  setTimeout(renderEnvGenerator,0);
}

function setNameStyle(style){
  _nameStyle=style;
  document.querySelectorAll('#name-style-chips .gen-chip').forEach(function(b){
    b.classList.toggle('active',b.dataset.namestyle===style);
  });
}

function toggleGenSection(id){
  var body=document.getElementById(id);
  var chev=document.getElementById('gchev-'+id.replace('gen-',''));
  if(!body)return;
  body.classList.toggle('open');
  if(chev)chev.textContent=body.classList.contains('open')?'▲':'▼';
  if(id==='gen-library'&&body.classList.contains('open'))renderEnvLibrary();
}

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
    if(n<1||d<1)return 1;
    for(var i=0;i<n;i++)t+=Math.floor(Math.random()*d)+1;
    return t;
  }
  return parseInt(expr)||1;
}

function rollLoot(){
  var tierEl=document.getElementById('loot-tier');
  var qtyEl=document.getElementById('loot-qty');
  if(!tierEl||!qtyEl)return;
  var tier=parseInt(tierEl.value)||1;
  var qtyExpr=qtyEl.value;
  var count=_rollDice(qtyExpr);
  var table=LOOT_TABLES[tier]||LOOT_TABLES[1];
  var shuffled=table.slice().sort(function(){return Math.random()-.5;});
  var items=shuffled.slice(0,Math.min(count,table.length));
  var el=document.getElementById('loot-results');if(!el)return;
  var allText=items.join('\n');
  el.innerHTML=items.map(function(item){
    return '<div class="gen-result-row">'
      +'<span class="gen-result-name" style="font-size:12px">'+escH(item)+'</span>'
      +'<button class="gen-pin-btn" data-pinloot="'+escH(allText)+'" data-pintier="'+escH(String(tier))+'">Pin</button>'
      +'</div>';
  }).join('');
}

// §ENV_GENERATOR ═══════════════════════════════════════════════════════════
// ENVIRONMENT STAT BLOCK GENERATOR
// ═══════════════════════════════════════════════════════════

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
      'Moss-covered stones mark old paths that lead nowhere reassuring \u2014 the forest is {tier_adj} and alive.',
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
      'Difficult Terrain \u2014 the forest floor is choked with roots; movement costs double.',
      'Tangled Paths \u2014 without a guide, travelers making navigation rolls treat Difficulty as +2.',
      'Canopy Darkness \u2014 ranged attacks beyond Close range have disadvantage during the day; beyond Very Close at night.',
      'Resonant Roots \u2014 magical effects cast here persist for one additional round after concentration ends.',
      'Living Memory \u2014 the forest reveals the history of anyone who sits quietly for 10 minutes.',
      'Thorned Undergrowth \u2014 creatures who move more than Close in a single action mark 1 Stress.'
    ],
    actions:[
      'Ensnaring Roots \u2014 roots burst from the ground; one target in Close range makes a Strength roll (DC as environment) or is Restrained. {dmg} physical on failure.',
      'Falling Branch \u2014 a massive limb drops on a target in Close range. {dmg} physical. Strength roll (DC) to halve.',
      'Blinding Spores \u2014 a cloud of spores fills the area. All creatures in Very Close range have disadvantage on attack rolls until they spend an action to clear their eyes.',
      'Bog Mist \u2014 a thick fog rises. All creatures treat Far range as Very Far and Very Close as Close for targeting purposes until the end of the next round.',
      'Swarming Insects \u2014 a swarm descends on one target. {dmg} physical, and the target marks 1 Stress.',
      'Thrown Stone \u2014 a sling-stone from an unseen attacker. {dmg} physical, target pushed Very Close.'
    ],
    reactions:[
      'Protective Thorns \u2014 when a creature in the environment is targeted by a melee attack, they gain +2 to their Evasion until the start of their next turn.',
      'Root Grab \u2014 when a creature tries to run from a marked adversary, they must succeed on an Agility roll (DC as environment) or fall Prone.',
      'Canopy Shield \u2014 when a creature would be hit by a ranged attack, heavy foliage deflects: reduce damage by 1d6.',
      'Sudden Silence \u2014 when a creature casts a spell with a verbal component, they mark 1 Stress as the forest absorbs the sound.',
      'Rushing Water \u2014 when a creature is knocked back, they are pushed twice as far.',
      'Living Armor \u2014 when a creature in melee would be hit, bark and vine wrap around them: mark one Armor slot instead of HP once per round.'
    ],
    fears:[
      'The Hunger Wakes \u2014 Spend a Fear: all creatures in the environment hear something massive moving through the trees. Every creature marks 1 Stress. GM introduces a new adversary or escalates an existing one.',
      'Forest Maze \u2014 Spend a Fear: the paths shift. One PC loses the group and must make a navigation roll (DC as environment + 3) or be separated for 1d4 rounds.',
      'Wrath of the Ancient \u2014 Spend a Fear: the oldest tree in the area lashes out. All creatures in Close range take {dmg} physical and are Restrained until they spend an action to break free.',
      'Predator\'s Call \u2014 Spend a Fear: the forest calls its hunters. At the start of the next round, two additional Mook adversaries appropriate to this environment join the encounter.'
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
      'The deep wants to be seen \u2014 and seen by no one.',
      'Everything that falls in here is kept.',
      'The cave breathes; it knows when you are afraid.',
      'What lives here has lived here longer than memory.',
      'Collapse is always one wrong step away.',
      'The passages remember who has walked them.'
    ],
    adversaries:['Giant cave spiders','Blind cave trolls','Shriekers','Darkling scouts','Stone golems','Albino cave serpents'],
    passives:[
      'Darkness \u2014 without a light source, creatures are Blinded beyond Very Close range.',
      'Uneven Floor \u2014 creatures moving faster than Close speed must make an Agility roll (DC as environment) or fall Prone.',
      'Echoing Sounds \u2014 Stealth checks have disadvantage; any sound louder than a whisper can be heard throughout the cavern.',
      'Low Ceiling \u2014 in sections marked by GM, jumping and flying are not possible.',
      'Cold Seep \u2014 each hour spent in the cave, PCs mark 1 Stress unless they have cold protection.',
      'Loose Rock \u2014 areas near blasting or heavy impacts can cause a cave-in (GM move: Collapse).'
    ],
    actions:[
      'Stalactite Drop \u2014 a massive spike falls. {dmg} physical to one target in Close range. Agility (DC) to halve.',
      'Blinding Dust \u2014 a cloud of powdered stone blinds all creatures in Very Close range until they spend an action to clear their eyes.',
      'Flooded Passage \u2014 a surge of underground water fills one path. Creatures must make a Strength roll (DC) or be pushed Close range and knocked Prone.',
      'Collapsing Ceiling \u2014 rubble fills a zone Close range. Creatures in the area take {dmg} physical and are Restrained. Strength (DC) to escape.',
      'Spike Trap \u2014 hidden spikes spring up. {dmg} physical to one target. Agility (DC) to avoid.',
      'Gas Vent \u2014 a toxic gas vent opens. All creatures in Very Close range mark 2 Stress.'
    ],
    reactions:[
      'Echoing Strike \u2014 when a creature misses an attack, the noise triggers a swarm; the attacker marks 1 Stress.',
      'Cave-In Warning \u2014 when a creature would be hit by an area effect, they can spend their reaction to dive behind rubble for half damage.',
      'Darkness Shroud \u2014 when a light source is extinguished, all creatures without darkvision have disadvantage on their next action.',
      'Pressure Crack \u2014 when a creature is knocked back into a wall, the impact causes a crack and they take additional 1d6 physical.',
      'Dripping Distraction \u2014 when a creature tries to concentrate on a task, the constant dripping causes them to mark 1 Stress.',
      'Narrow Escape \u2014 when a creature would be cornered, they may make a Finesse roll (DC) to find a hidden passage.'
    ],
    fears:[
      'The Deep Stirs \u2014 Spend a Fear: something massive shifts in the darkness below. Every creature marks 2 Stress. The encounter escalates.',
      'Total Darkness \u2014 Spend a Fear: all light sources are snuffed out simultaneously. Creatures without darkvision are Blinded until they relight a source.',
      'Partial Collapse \u2014 Spend a Fear: the ceiling gives way in one section. All creatures in the area take {dmg} physical and are Restrained. The passage is now blocked.',
      'The Watcher \u2014 Spend a Fear: a creature has been watching from the darkness for several rounds. It acts immediately, targeting the most isolated PC.'
    ],
    feat_names:{
      passive:['Darkness Absolute','Uneven Ground','Echoing Halls','Cold Seep'],
      action:['Stalactite Drop','Blinding Dust','Flooded Passage','Collapsing Ceiling'],
      reaction:['Echoing Strike','Darkness Shroud','Pressure Crack','Narrow Escape'],
      fear:['The Deep Stirs','Total Darkness','Partial Collapse','The Watcher']
    }
  },
  mountain:{
    names:['The Shattered Peaks','Ironhorn Summit','The Windswept Crag',
           'Stormcrest Ridge','The Frozen Ascent','Gravetop Heights',
           'Thundering Pass','The Skyward Spine'],
    descs:[
      'Jagged rock faces and howling winds define this {tier_adj} mountain passage.',
      'The air thins as the path climbs higher through {tier_adj} switchbacks carved into bare stone.',
      'Snow and scree cover every surface of this {tier_adj} peak, where one misstep means a long fall.',
      'Lightning-scarred boulders litter the slopes of this {tier_adj} mountain, remnants of ancient storms.',
      'A {tier_adj} silence hangs over these heights, broken only by the distant cry of raptors.',
      'The path narrows to a knife-edge ridge in this {tier_adj} place where the world falls away on both sides.'
    ],
    impulses:[
      'Cast down the unworthy; only the strong reach the summit.',
      'Freeze the slow and punish the unprepared.',
      'Guard the passes against those who do not belong.',
      'Let the wind carry away all that is not anchored.',
      'The mountain remembers every soul it has claimed.',
      'Storms gather without warning to test the bold.',
      'What sleeps beneath the stone must not be disturbed.',
      'The heights demand sacrifice from all who climb.'
    ],
    adversaries:['Giant eagles','Mountain trolls','Stone elementals','Frost drakes','Cliff harpies','Avalanche golems'],
    passives:[
      'Thin Air \u2014 at high altitude, PCs have disadvantage on Strength rolls unless acclimated.',
      'Treacherous Footing \u2014 movement across scree or ice requires an Agility roll (DC as environment) or the creature falls Prone.',
      'Howling Winds \u2014 ranged attacks beyond Close range have disadvantage due to crosswinds.',
      'Exposure \u2014 without cold-weather gear, PCs mark 1 Stress at the end of each scene.',
      'Narrow Path \u2014 only one creature can move through at a time; no flanking is possible.',
      'Echoing Heights \u2014 sounds carry for miles; Stealth checks have disadvantage.'
    ],
    actions:[
      'Rockslide \u2014 a cascade of boulders tumbles down the slope. All creatures in Close range take {dmg} physical. Agility (DC) to halve.',
      'Lightning Strike \u2014 a bolt arcs from the clouds to the highest point. {dmg} magic to one target. The target is knocked Prone.',
      'Gust of Wind \u2014 a violent gust pushes all creatures in the area. Strength (DC) or be pushed Close range toward the cliff edge.',
      'Crevasse Opens \u2014 the ground splits beneath one target. Agility (DC) or fall into a crevasse, taking {dmg} physical and becoming Restrained.',
      'Whiteout \u2014 a sudden blizzard reduces visibility. All creatures are effectively Blinded for 1d4 rounds.',
      'Falling Ice \u2014 icicles and frozen debris rain down. {dmg} physical to one target in Close range.'
    ],
    reactions:[
      'Updraft \u2014 when a creature is knocked off a ledge, a strong updraft gives them one chance: Agility (DC) to catch a handhold.',
      'Stone Shield \u2014 when a creature would be hit by a ranged attack, nearby rock formations provide half cover (+2 to the roll).',
      'Altitude Sickness \u2014 when a creature exerts themselves heavily, they must mark 1 Stress from the thin air.',
      'Crumbling Edge \u2014 when a creature moves to the edge of a cliff, the ground gives way slightly: Agility (DC) or slide one range band closer to the drop.',
      'Wind Deflection \u2014 when a ranged spell is cast, the wind redirects it: the caster must mark 1 Stress or the spell goes wide.',
      'Echo Warning \u2014 when an ambush is triggered, the echo gives a split-second warning: targeted creature gains +1 to their reaction roll.'
    ],
    fears:[
      'Avalanche \u2014 Spend a Fear: the mountain shakes and a wall of snow descends. All creatures take {dmg} physical and are buried (Restrained). Strength (DC+3) to dig free.',
      'The Summit\'s Wrath \u2014 Spend a Fear: a storm of supernatural intensity engulfs the peak. All creatures mark 2 Stress and have disadvantage on all rolls for one round.',
      'Cliffside Collapse \u2014 Spend a Fear: the path crumbles. One PC must make an Agility roll (DC as environment) or fall, taking {dmg} physical and becoming separated from the group.',
      'The Mountain Wakes \u2014 Spend a Fear: tremors shake the mountain. A stone elemental or frost drake emerges from the rock face and immediately takes the spotlight.'
    ],
    feat_names:{
      passive:['Thin Air','Treacherous Footing','Howling Winds','Narrow Path'],
      action:['Rockslide','Lightning Strike','Gust of Wind','Crevasse Opens'],
      reaction:['Updraft','Stone Shield','Altitude Sickness','Crumbling Edge'],
      fear:['Avalanche','The Summit\'s Wrath','Cliffside Collapse','The Mountain Wakes']
    }
  },
  city:{
    names:['The Crooked Quarter','Ashmarket','The Gilded Underbelly',
           'Oldtown Narrows','The Merchant\'s Labyrinth','Lanterngate',
           'The Drowned Ward','Copperbell District'],
    descs:[
      'Narrow streets wind through a {tier_adj} tangle of buildings, alleys, and forgotten courtyards.',
      'The city hums with commerce and conspiracy in this {tier_adj} district where everyone has an angle.',
      'Laundry lines and shop awnings crisscross above the {tier_adj} cobblestone streets, casting patchwork shadows.',
      'A {tier_adj} tension fills the air as guards patrol and pickpockets work the crowd in equal measure.',
      'Crumbling facades hide opulent interiors in this {tier_adj} quarter where wealth and poverty share a wall.',
      'The smell of spice and smoke drifts through this {tier_adj} market where anything can be bought for the right price.'
    ],
    impulses:[
      'Profit from every interaction; nothing is free.',
      'Keep secrets close and sell them dear.',
      'Protect the powerful; crush the desperate.',
      'Every stranger is either a mark or a threat.',
      'The city watches, remembers, and judges.',
      'Order is a mask worn by those who benefit from it.',
      'The crowd swallows individuals without a trace.',
      'Power flows through coin, not courage.'
    ],
    adversaries:['City guards','Thieves\' guild agents','Corrupt merchants','Street gangs','Hired assassins','Courtesans and spies'],
    passives:[
      'Crowded Streets \u2014 movement beyond Close range requires an Agility roll (DC as environment) to navigate the press of bodies.',
      'Eyes Everywhere \u2014 Stealth rolls in the open have disadvantage; someone is always watching.',
      'Black Market \u2014 PCs can find unusual or illegal goods with a Presence roll, but at inflated prices.',
      'Guard Patrols \u2014 violent actions attract guards within 1d4 rounds.',
      'Rumor Mill \u2014 PCs can gather information with a Presence roll, but failures spread their own secrets.',
      'Shifting Alliances \u2014 NPCs in this district change loyalties based on who offers the most.'
    ],
    actions:[
      'Ambush in the Alley \u2014 assailants strike from a side street. {dmg} physical to one target. Instinct (DC) to avoid surprise.',
      'Collapsing Scaffold \u2014 construction debris crashes down. {dmg} physical to all creatures in Very Close range. Agility (DC) to halve.',
      'Pickpocket \u2014 a thief lifts an item from one PC. Instinct (DC) to notice. On failure, lose a random item or pouch of coin.',
      'Crowd Surge \u2014 the crowd panics and surges. All creatures in Close range must make a Strength roll (DC) or be pushed Very Close and knocked Prone.',
      'Poisoned Drink \u2014 a drink or food is tainted. One PC must make a Strength roll (DC) or mark 2 Stress and have disadvantage on their next action.',
      'False Accusation \u2014 a local accuses a PC of a crime. The PC must resolve it with a Presence roll (DC) or face arrest.'
    ],
    reactions:[
      'Bystander Shield \u2014 when a ranged attack misses, a bystander is endangered. The attacker must mark 1 Stress.',
      'Back Alley Escape \u2014 when a creature is cornered, they can make a Finesse roll (DC) to find a hidden passage through the buildings.',
      'Crowd Cover \u2014 when a creature is targeted by a ranged attack, the crowd provides partial cover: reduce damage by 1d6.',
      'Street Vendor Distraction \u2014 when a creature tries to pursue, a vendor\'s cart blocks the way. Agility (DC) to vault over or lose the target.',
      'Rooftop Route \u2014 when a creature is chased, they can make an Agility roll (DC) to take to the rooftops, gaining advantage on their next movement.',
      'City Watch Alert \u2014 when violence erupts, guards arrive in 1d4 rounds. The fight must end or move before then.'
    ],
    fears:[
      'Riot \u2014 Spend a Fear: the streets erupt in chaos. All creatures mark 2 Stress. Movement is impossible without a Strength roll (DC+2) each round.',
      'The Price on Your Head \u2014 Spend a Fear: bounty hunters have tracked the party. Two skilled adversaries appear and target the most visible PC.',
      'Building Collapse \u2014 Spend a Fear: a structure gives way. All creatures in Close range take {dmg} physical and are Restrained under rubble.',
      'Betrayal \u2014 Spend a Fear: an NPC ally reveals they have been working against the party. They steal a key item or reveal the party\'s location to enemies.'
    ],
    feat_names:{
      passive:['Crowded Streets','Eyes Everywhere','Black Market','Guard Patrols'],
      action:['Ambush in the Alley','Collapsing Scaffold','Crowd Surge','Poisoned Drink'],
      reaction:['Bystander Shield','Back Alley Escape','Crowd Cover','Rooftop Route'],
      fear:['Riot','The Price on Your Head','Building Collapse','Betrayal']
    }
  },
  ruins:{
    names:['The Shattered Halls','Dusthaven Remnants','The Crumbling Sanctum',
           'Fallen Spire','The Lost Citadel','Bleached Bone Keep',
           'The Sunken Archive','Hollow Crown Fortress'],
    descs:[
      'Cracked pillars and collapsed walls tell the story of a {tier_adj} place that once held power.',
      'Dust motes drift through shafts of light in these {tier_adj} halls, where murals fade to nothing.',
      'The ground is littered with broken stone and forgotten relics in this {tier_adj} ruin.',
      'Vines have reclaimed the walls of this {tier_adj} place, pulling apart what centuries of war could not.',
      'A {tier_adj} quiet pervades these ruins, broken only by the occasional crack of settling masonry.',
      'Faded inscriptions on crumbling archways hint at the {tier_adj} grandeur that once stood here.'
    ],
    impulses:[
      'Preserve the past, even if it means trapping the present.',
      'Collapse upon those who disturb what rests here.',
      'Guard the secrets buried in these walls.',
      'The old magic seeps through cracks and stirs when touched.',
      'What was taken will be reclaimed by time.',
      'The dead do not forget who built these halls.',
      'Every stone remembers its place and resents its fall.',
      'The ruins test all who enter with puzzles left by the builders.'
    ],
    adversaries:['Animated armor','Restless spirits','Tomb guardians','Carrion crawlers','Rust monsters','Trap constructs'],
    passives:[
      'Unstable Structure \u2014 loud noises or impacts can trigger partial collapses. The GM may call for an Agility roll (DC) to avoid falling debris.',
      'Ancient Wards \u2014 magical traps still function in certain areas. Instinct (DC) to detect them before triggering.',
      'Dust and Debris \u2014 visibility is reduced to Very Close range in enclosed areas.',
      'Echoes of the Past \u2014 PCs with magical sensitivity can hear whispered fragments of ancient conversations.',
      'Crumbling Floors \u2014 certain floors cannot support more than one creature at a time without risk of collapse.',
      'Residual Magic \u2014 spells cast here have unpredictable effects: on a roll with Fear, the GM may alter the spell\'s outcome.'
    ],
    actions:[
      'Collapsing Wall \u2014 a section of wall tumbles inward. {dmg} physical to all creatures in Very Close range. Agility (DC) to dodge.',
      'Triggered Trap \u2014 a pressure plate or tripwire activates. {dmg} physical to one target. Instinct (DC) to spot it in time.',
      'Animated Guardian \u2014 a statue or suit of armor animates and attacks the nearest creature. It has the stats of a Tier-appropriate minion.',
      'Floor Collapse \u2014 the floor gives way beneath one creature. Agility (DC) or fall one level, taking {dmg} physical.',
      'Poison Dart \u2014 a concealed mechanism fires. {dmg} physical to one target and they must mark 1 Stress from the toxin.',
      'Spectral Wail \u2014 restless spirits cry out. All creatures in Close range mark 1 Stress.'
    ],
    reactions:[
      'Crumbling Cover \u2014 when a creature takes cover behind a ruined wall, it provides protection but crumbles after absorbing one hit.',
      'Ancient Lock \u2014 when a creature tries to open a sealed door, they must solve a puzzle or make a Knowledge roll (DC) to proceed.',
      'Shifting Rubble \u2014 when a creature is pushed, loose rubble shifts underfoot: they must make an Agility roll (DC) or fall Prone.',
      'Ghostly Guidance \u2014 when a creature is lost, a spectral figure appears briefly to point the way, then vanishes.',
      'Warded Threshold \u2014 when a creature crosses a magical barrier, they take 1d6 magic damage unless they speak the correct word.',
      'Dust Cloud \u2014 when rubble falls, a cloud of dust fills the area: all creatures in Very Close range have disadvantage on their next attack.'
    ],
    fears:[
      'Total Collapse \u2014 Spend a Fear: the ceiling gives way entirely in one section. All creatures in the area take {dmg} physical and the exit is blocked.',
      'The Guardian Awakens \u2014 Spend a Fear: the ruins\' primary defender activates. A powerful construct or bound spirit appears and targets all intruders.',
      'Curse of the Builders \u2014 Spend a Fear: ancient magic lashes out. One PC must make a Presence roll (DC+3) or suffer a curse: disadvantage on all rolls until the curse is broken.',
      'The Dead Remember \u2014 Spend a Fear: the spirits of those who died here manifest in force. Each PC sees a vision of the ruin\'s fall and marks 2 Stress.'
    ],
    feat_names:{
      passive:['Unstable Structure','Ancient Wards','Dust and Debris','Echoes of the Past'],
      action:['Collapsing Wall','Triggered Trap','Floor Collapse','Spectral Wail'],
      reaction:['Crumbling Cover','Shifting Rubble','Ghostly Guidance','Dust Cloud'],
      fear:['Total Collapse','The Guardian Awakens','Curse of the Builders','The Dead Remember']
    }
  },
  coast:{
    names:['The Storm-Battered Shore','Saltspray Cliffs','The Drowning Strand',
           'Wrecker\'s Cove','The Tidal Maze','Bleached Reef',
           'Mariner\'s Grave','The Singing Shoals'],
    descs:[
      'Waves crash against jagged rocks in this {tier_adj} stretch of coastline where the sea claims everything.',
      'Salt-crusted ruins of old docks jut from the {tier_adj} shoreline like broken teeth.',
      'The tide pools here shimmer with {tier_adj} bioluminescence, hiding creatures beneath the surface.',
      'A {tier_adj} fog rolls in from the sea, turning the coast into a world of muffled sounds and half-seen shapes.',
      'Seabirds wheel overhead, their cries echoing off the {tier_adj} cliffs that rise from the churning water.',
      'The sand here is black with volcanic glass, and the {tier_adj} surf runs red at sunset.'
    ],
    impulses:[
      'Drag the unwary into the deep.',
      'Erode all works of mortal hands.',
      'The tide takes and the tide gives \u2014 never fairly.',
      'Conceal dangers beneath beautiful surfaces.',
      'The sea remembers every ship it has swallowed.',
      'Lure the desperate with promises of treasure.',
      'The fog hides what the water cannot.',
      'Every shore is a threshold between worlds.'
    ],
    adversaries:['Sea serpents','Merfolk raiders','Sahuagin','Ghost pirates','Giant crabs','Sirens'],
    passives:[
      'Treacherous Tide \u2014 the tide shifts unpredictably. Areas that were dry become submerged, and vice versa, every 1d4 rounds.',
      'Slippery Rocks \u2014 movement on wet stone requires an Agility roll (DC) or the creature falls Prone.',
      'Salt Spray \u2014 metal equipment exposed to the salt air for extended periods becomes unreliable: weapons deal -1 damage.',
      'Riptide \u2014 creatures in the water who fail a Strength roll (DC) are pulled one range band toward the open sea.',
      'Fog Bank \u2014 visibility is reduced to Close range. Ranged attacks beyond Close have disadvantage.',
      'Tidal Pools \u2014 shallow pools conceal venomous creatures. Creatures who step in one without looking mark 1 Stress.'
    ],
    actions:[
      'Rogue Wave \u2014 a massive wave crashes over the area. All creatures in Close range take {dmg} physical and are pushed Very Close. Strength (DC) to halve.',
      'Undertow \u2014 the current grabs one creature. Strength (DC) or be dragged into the water and one range band out to sea.',
      'Lightning on the Water \u2014 a bolt strikes the surface. All creatures in the water within Close range take {dmg} magic.',
      'Collapsing Sea Cave \u2014 a coastal cave crumbles. {dmg} physical to creatures inside. Agility (DC) to escape.',
      'Siren Song \u2014 an enchanting voice calls from the water. One PC must make a Presence roll (DC) or move toward the sea on their next turn.',
      'Hurled Debris \u2014 the storm throws driftwood and wreckage. {dmg} physical to one target in Close range.'
    ],
    reactions:[
      'Receding Tide \u2014 when a creature tries to reach the water\'s edge, the tide pulls back, revealing sharp rocks. Agility (DC) or take 1d6 physical.',
      'Sea Mist \u2014 when a creature is targeted by a ranged attack, the mist provides concealment: the attacker has disadvantage.',
      'Barnacle Grip \u2014 when a creature climbs the cliff face, barnacles cut their hands. They mark 1 Stress but gain advantage on climbing rolls.',
      'Wave Shield \u2014 when a creature is targeted by a melee attack near the water, a wave surges and pushes the attacker back Very Close.',
      'Tidal Surge \u2014 when a creature falls into the water, the current carries them 1d4 range bands in a random direction.',
      'Coastal Wind \u2014 when a ranged attack is made, the wind shifts its trajectory: the attacker must reroll and take the lower result.'
    ],
    fears:[
      'The Leviathan Stirs \u2014 Spend a Fear: something enormous moves beneath the surface. All creatures mark 2 Stress. A massive tentacle or wave reshapes the battlefield.',
      'Storm Surge \u2014 Spend a Fear: a wall of water rushes inland. All creatures take {dmg} physical and are pushed Far range inland. The coastline is reshaped.',
      'The Drowned Rise \u2014 Spend a Fear: waterlogged undead emerge from the surf. 1d4+1 drowned adversaries appear at Close range.',
      'Ship Wreck \u2014 Spend a Fear: a vessel is driven onto the rocks. Its crew spills out \u2014 hostile, desperate, or both.'
    ],
    feat_names:{
      passive:['Treacherous Tide','Slippery Rocks','Fog Bank','Riptide'],
      action:['Rogue Wave','Undertow','Siren Song','Collapsing Sea Cave'],
      reaction:['Receding Tide','Sea Mist','Wave Shield','Tidal Surge'],
      fear:['The Leviathan Stirs','Storm Surge','The Drowned Rise','Ship Wreck']
    }
  },
  underground:{
    names:['The Sunless Depths','Ironvein Tunnels','The Worm-Eaten Halls',
           'Obsidian Labyrinth','The Fungal Abyss','Dwarfhome Ruins',
           'The Drowning Dark','Magma Rift'],
    descs:[
      'Miles of twisting passages and yawning chasms make this {tier_adj} underworld a place of madness.',
      'The air is thick with the scent of sulfur and {tier_adj} heat in these deep tunnels.',
      'Bioluminescent fungi cast a {tier_adj} blue-green glow over everything, revealing alien landscapes.',
      'Ancient mining equipment rusts in the corners of this {tier_adj} network of excavated chambers.',
      'A {tier_adj} river of magma flows through a channel carved into the floor, lighting the cavern in orange.',
      'The walls here are smooth as glass, as if something enormous bored through the {tier_adj} stone.'
    ],
    impulses:[
      'Bury intruders in stone and silence.',
      'The deep places are older than the surface; they do not welcome visitors.',
      'Every tunnel leads deeper; none lead back.',
      'Heat and pressure transform all things that linger here.',
      'The underground feeds on light and hope alike.',
      'What was sealed below was sealed for a reason.',
      'The earth groans with the weight of what it holds.',
      'Ancient civilizations left traps and treasures in equal measure.'
    ],
    adversaries:['Purple worms','Duergar raiders','Myconid colonies','Magma elementals','Deepspawn horrors','Phase spiders'],
    passives:[
      'Absolute Darkness \u2014 without a light source, creatures are Blinded. Darkvision functions at half range.',
      'Extreme Heat \u2014 near magma flows, PCs mark 1 Stress at the end of each round without heat protection.',
      'Toxic Air \u2014 in certain chambers, the air is poisonous. PCs must hold their breath or mark 1 Stress per round.',
      'Magnetic Interference \u2014 compasses and navigation tools fail. Navigation rolls have disadvantage.',
      'Echoing Depths \u2014 sounds travel unpredictably. A sound made in one chamber may be heard in a completely different one.',
      'Unstable Ground \u2014 tremors occur regularly. Each hour, roll 1d6: on a 1, a minor tremor causes a hazard.'
    ],
    actions:[
      'Magma Eruption \u2014 a fissure opens and magma spews forth. {dmg} physical (fire) to all creatures in Very Close range.',
      'Tunnel Collapse \u2014 a section of tunnel caves in. {dmg} physical to all creatures in Close range. Strength (DC) to avoid being buried.',
      'Spore Burst \u2014 giant fungi release clouds of spores. All creatures in Close range must make a Strength roll (DC) or be Poisoned for 1d4 rounds.',
      'Chasm Opens \u2014 the floor cracks open, revealing a deep chasm. Agility (DC) or fall, taking {dmg} physical.',
      'Seismic Shock \u2014 a tremor shakes the area. All creatures must make an Agility roll (DC) or fall Prone. Concentration is broken.',
      'Burrowing Attack \u2014 a creature bursts from the ground beneath one target. {dmg} physical. The target is knocked Prone.'
    ],
    reactions:[
      'Thermal Updraft \u2014 when a creature falls into a chasm near magma, a blast of hot air slows their fall: halve the falling damage.',
      'Fungal Shield \u2014 when a creature takes cover behind giant fungi, the mushrooms absorb one attack but release spores: mark 1 Stress.',
      'Tremor Warning \u2014 when a major tremor is about to occur, creatures attuned to stone feel it 1 round early and can warn others.',
      'Crystal Refraction \u2014 when a magical attack hits a crystal formation, the energy refracts: the attacker makes a second attack roll against a random creature.',
      'Gas Pocket \u2014 when fire is used near certain walls, a gas pocket ignites. All creatures in Very Close range take 1d8 fire damage.',
      'Bioluminescent Flare \u2014 when a creature is startled, nearby fungi pulse brightly, briefly illuminating hidden threats.'
    ],
    fears:[
      'The Worm Comes \u2014 Spend a Fear: a massive burrowing creature tears through the area. All creatures take {dmg} physical and the landscape is dramatically altered.',
      'Sealed In \u2014 Spend a Fear: all exits collapse simultaneously. The party must find a new way out or clear the rubble (Progress Countdown 6).',
      'Volcanic Surge \u2014 Spend a Fear: magma levels rise dramatically. The floor becomes lava within 1d4 rounds. PCs must find high ground.',
      'The Deep Hunger \u2014 Spend a Fear: an ancient predator that has waited millennia for prey reveals itself. It targets the most isolated PC.'
    ],
    feat_names:{
      passive:['Absolute Darkness','Extreme Heat','Toxic Air','Magnetic Interference'],
      action:['Magma Eruption','Tunnel Collapse','Spore Burst','Chasm Opens'],
      reaction:['Thermal Updraft','Fungal Shield','Tremor Warning','Gas Pocket'],
      fear:['The Worm Comes','Sealed In','Volcanic Surge','The Deep Hunger']
    }
  },
  swamp:{
    names:['The Rotting Fens','Miremaw Bog','The Drowned Thicket',
           'Blackwater Marsh','The Weeping Mire','Foghollow Swamp',
           'The Festering Delta','Willowbane Wetlands'],
    descs:[
      'Murky water and tangled roots make every step treacherous in this {tier_adj} swamp.',
      'The stench of decay hangs heavy in the {tier_adj} air, and the ground squelches underfoot.',
      'Twisted trees draped with moss rise from {tier_adj} pools of stagnant water.',
      'Fireflies flicker above the {tier_adj} marsh, their lights leading the unwary deeper into the mire.',
      'A {tier_adj} fog clings to the surface of the water, hiding whatever lurks beneath.',
      'The buzzing of insects is constant in this {tier_adj} wetland, drowning out all other sound.'
    ],
    impulses:[
      'Swallow the careless; the bog is patient.',
      'Breed disease and madness in equal measure.',
      'Hide what lies beneath the surface.',
      'The mire remembers what was buried here.',
      'Fog and muck disorient all who enter.',
      'Life and death are indistinguishable in this place.',
      'The swamp resists all attempts to drain or tame it.',
      'Ancient things sleep in the deepest pools.'
    ],
    adversaries:['Bog hags','Swamp trolls','Giant leeches','Will-o\'-wisps','Hydras','Plague-bearing mosquito swarms'],
    passives:[
      'Difficult Terrain \u2014 all movement costs double due to mud and water.',
      'Disease Vector \u2014 PCs who are injured in the swamp must make a Strength roll (DC) at the end of the scene or contract a disease.',
      'Concealing Fog \u2014 visibility is limited to Close range. Creatures beyond that have total concealment.',
      'Quicksand \u2014 certain areas are quicksand. Creatures who step in must make a Strength roll (DC) or begin sinking.',
      'Toxic Water \u2014 drinking or being submerged in the swamp water causes 1 Stress.',
      'Insect Swarms \u2014 biting insects harass all creatures. Concentration-dependent tasks have disadvantage.'
    ],
    actions:[
      'Bog Grasp \u2014 the muck grabs one creature. Strength (DC) or become Restrained. {dmg} physical each round until freed.',
      'Poisoned Mist \u2014 a cloud of toxic vapor rises. All creatures in Close range mark 2 Stress and have disadvantage on their next roll.',
      'Leech Swarm \u2014 leeches attach to one target. {dmg} physical and the target loses 1 Hope.',
      'Sinkhole \u2014 the ground gives way. One creature falls into deep mud. Agility (DC) or be submerged and begin drowning.',
      'Fungal Explosion \u2014 a swamp puffball detonates. {dmg} physical to all creatures in Very Close range.',
      'Tangling Vines \u2014 vines lash out from the undergrowth. One target is Restrained. Finesse (DC) to escape.'
    ],
    reactions:[
      'Mud Shield \u2014 when a creature dives into the mud, they gain cover but are Prone. Ranged attacks against them have disadvantage.',
      'Will-o\'-Wisp Lure \u2014 when a creature follows a light, it leads them into a hazard. Instinct (DC) to realize the trick.',
      'Swamp Gas Ignition \u2014 when fire is used in the swamp, pockets of gas ignite. All creatures in Very Close range take 1d8 fire damage.',
      'Clinging Mud \u2014 when a creature tries to move quickly, the mud resists. Strength (DC) or their movement is halved.',
      'Amphibious Ambush \u2014 when a creature walks near deep water, something lunges from beneath. The target must make an Agility roll (DC) or be dragged in.',
      'Bog Echo \u2014 when a creature calls for help, the swamp distorts the sound. Allies must make an Instinct roll (DC) to locate them.'
    ],
    fears:[
      'The Mire Awakens \u2014 Spend a Fear: the swamp itself seems to come alive. All creatures are targeted by grasping roots and mud. Each takes {dmg} physical and is Restrained.',
      'Plague Wind \u2014 Spend a Fear: a wave of disease sweeps through the area. All creatures mark 3 Stress. PCs must make a Strength roll (DC+3) or contract a wasting sickness.',
      'The Thing in the Deep \u2014 Spend a Fear: a massive creature surfaces from the deepest pool. It targets the nearest creature with a devastating attack.',
      'Witch\'s Curse \u2014 Spend a Fear: a hag\'s curse falls upon one PC. They suffer disadvantage on all rolls until they complete a task set by the hag.'
    ],
    feat_names:{
      passive:['Difficult Terrain','Concealing Fog','Quicksand','Insect Swarms'],
      action:['Bog Grasp','Poisoned Mist','Leech Swarm','Sinkhole'],
      reaction:['Mud Shield','Will-o\'-Wisp Lure','Swamp Gas Ignition','Clinging Mud'],
      fear:['The Mire Awakens','Plague Wind','The Thing in the Deep','Witch\'s Curse']
    }
  },
  desert:{
    names:['The Glass Waste','Sunscorch Expanse','The Burning Reach',
           'Dunewalker\'s Bane','The Mirage Fields','Sandtomb Flats',
           'The Bleached Badlands','Ashwind Desert'],
    descs:[
      'An endless sea of sand stretches to the horizon in this {tier_adj} wasteland where nothing grows.',
      'The {tier_adj} heat shimmers above the dunes, distorting distance and direction.',
      'Bleached bones protrude from the {tier_adj} sand, marking the paths of those who came before.',
      'A {tier_adj} wind carries stinging sand across the barren plain, scouring everything in its path.',
      'Oases shimmer in the {tier_adj} distance \u2014 some real, some the desert\'s cruel deception.',
      'The {tier_adj} sun beats down without mercy on cracked earth and shifting dunes.'
    ],
    impulses:[
      'Parch the body and break the spirit.',
      'Bury all traces of those who pass through.',
      'The desert gives nothing and takes everything.',
      'Mirages promise what the wasteland cannot deliver.',
      'The sun is judge, jury, and executioner.',
      'Ancient things lie preserved beneath the sand.',
      'The wind erases all paths; there is no going back.',
      'Only the cunning and the ruthless survive here.'
    ],
    adversaries:['Sand wurms','Desert bandits','Scorpion swarms','Dust devils','Mummified guardians','Jackalweres'],
    passives:[
      'Extreme Heat \u2014 PCs mark 1 Stress at the end of each scene without adequate water and shade.',
      'Blinding Sun \u2014 ranged attacks made toward the sun have disadvantage.',
      'Shifting Sands \u2014 the terrain changes constantly. Navigation rolls have disadvantage without a guide.',
      'Dehydration \u2014 PCs must consume water each scene or begin suffering exhaustion effects.',
      'Sandstorm Risk \u2014 each hour, roll 1d6: on a 1, a sandstorm begins and lasts 1d4 hours.',
      'Mirage \u2014 PCs may see things that aren\'t there. Instinct (DC) to distinguish real from illusion.'
    ],
    actions:[
      'Sandstorm \u2014 a wall of sand engulfs the area. {dmg} physical to all creatures. Visibility drops to Very Close. Lasts 1d4 rounds.',
      'Sand Pit \u2014 the ground collapses into a pit. Agility (DC) or fall in, taking {dmg} physical.',
      'Scorching Wind \u2014 a blast of superheated air sweeps through. {dmg} physical (fire) to all creatures in Close range.',
      'Buried Trap \u2014 an ancient trap concealed by sand activates. {dmg} physical to one target. Instinct (DC) to detect.',
      'Dust Devil \u2014 a whirlwind forms around one creature. {dmg} physical and the target is lifted and thrown Very Close in a random direction.',
      'Sun Glare \u2014 the sun\'s reflection off glass-like sand blinds one target for 1 round. They have disadvantage on all rolls.'
    ],
    reactions:[
      'Sand Cover \u2014 when a creature drops Prone, the sand provides concealment: ranged attacks against them have disadvantage.',
      'Heat Haze \u2014 when a creature is targeted at Far range, the heat distorts their position: the attacker has disadvantage.',
      'Quicksand Trap \u2014 when a creature is pushed, they may land in quicksand. Strength (DC) or begin sinking.',
      'Dune Slide \u2014 when a creature moves on a dune, the sand shifts. Agility (DC) or slide one range band downhill.',
      'Preserved Relic \u2014 when a creature digs in the sand, they may uncover something: 1-in-6 chance of finding a useful item.',
      'Night Chill \u2014 when the sun sets, the temperature drops drastically. Creatures without shelter mark 1 Stress.'
    ],
    fears:[
      'The Great Sandstorm \u2014 Spend a Fear: a storm of legendary proportions engulfs the area. All creatures take {dmg} physical each round for 1d4 rounds and are Blinded.',
      'The Sand Swallows \u2014 Spend a Fear: the ground opens beneath the party. All creatures must make Agility rolls (DC+3) or be buried alive, taking {dmg} physical and becoming Restrained.',
      'Oasis Mirage \u2014 Spend a Fear: the party has been following a mirage. They are now lost and 1d4 scenes farther from their destination. Each PC marks 2 Stress.',
      'Desert Predator \u2014 Spend a Fear: a massive sand wurm erupts from beneath the dunes and targets the most exposed creature.'
    ],
    feat_names:{
      passive:['Extreme Heat','Blinding Sun','Shifting Sands','Dehydration'],
      action:['Sandstorm','Sand Pit','Scorching Wind','Dust Devil'],
      reaction:['Sand Cover','Heat Haze','Quicksand Trap','Dune Slide'],
      fear:['The Great Sandstorm','The Sand Swallows','Oasis Mirage','Desert Predator']
    }
  },
  arcane:{
    names:['The Shimmering Nexus','Spellwrought Sanctum','The Aetherial Breach',
           'Runeheart Chamber','The Prismatic Void','Arcanum Undone',
           'The Weave-Torn Halls','Crystalbloom Expanse'],
    descs:[
      'Reality bends and warps in this {tier_adj} place where raw magic saturates every surface.',
      'Runes pulse with {tier_adj} light along the walls, responding to the presence of living creatures.',
      'The air itself crackles with {tier_adj} arcane energy, making hair stand on end and metal sing.',
      'Impossible geometry defines this {tier_adj} space where corridors loop and gravity shifts without warning.',
      'Crystals of condensed magic grow from every surface in this {tier_adj} chamber, humming with power.',
      'A {tier_adj} aurora dances overhead, though no sky is visible \u2014 only raw, churning magic.'
    ],
    impulses:[
      'Transform all who linger here into something new.',
      'The magic here has its own will and its own hunger.',
      'Reality is a suggestion, not a rule.',
      'Power calls to power; the magic wants to be used.',
      'What enters this place leaves changed, if it leaves at all.',
      'The boundaries between planes are thin here.',
      'Ancient enchantments layer upon each other in unpredictable ways.',
      'The source of this magic is both prison and throne.'
    ],
    adversaries:['Arcane constructs','Spell wraiths','Rogue familiars','Elemental anomalies','Living spells','Planar intruders'],
    passives:[
      'Wild Magic \u2014 when a creature casts a spell with Fear, roll on a wild magic table or the GM describes an unexpected side effect.',
      'Mana Saturation \u2014 magical attacks deal +2 damage in this area.',
      'Antimagic Pockets \u2014 certain zones suppress all magic. Magical items and spells cease to function within them.',
      'Planar Bleed \u2014 creatures from other planes occasionally phase into view, confused and hostile.',
      'Resonant Crystals \u2014 crystals in the area amplify sound. Verbal spell components echo and may trigger additional effects.',
      'Time Distortion \u2014 time flows unevenly. Some areas move faster, others slower. The GM determines the effect.'
    ],
    actions:[
      'Arcane Surge \u2014 a wave of raw magic pulses outward. {dmg} magic to all creatures in Close range. Spellcasters mark 1 additional Stress.',
      'Reality Tear \u2014 a rift opens, pulling one creature partially into another plane. {dmg} magic and the target is Dazed for 1 round.',
      'Spell Echo \u2014 the last spell cast in the area echoes and fires again at a random target. Use the original damage and effects.',
      'Crystal Shatter \u2014 a magic crystal explodes. {dmg} magic to all creatures in Very Close range. Shards embed in the area, creating difficult terrain.',
      'Gravity Shift \u2014 gravity reverses in a section of the area. Creatures must make Agility (DC) or fall upward, taking {dmg} physical.',
      'Mana Drain \u2014 the area absorbs magical energy. One creature loses their next spell slot or magical ability use. They mark 1 Stress.'
    ],
    reactions:[
      'Spell Reflection \u2014 when a magical attack misses, a crystal surface reflects it. The attacker must make an Agility roll (DC) or be hit by their own spell.',
      'Arcane Feedback \u2014 when a creature casts a spell with Fear, they take 1d6 magic damage from backlash.',
      'Phase Flicker \u2014 when a creature is hit by a melee attack, they briefly phase out: 50% chance to negate the damage entirely.',
      'Rune Activation \u2014 when a creature steps on a rune, it activates. The effect is random: healing, damage, teleportation, or transformation.',
      'Mana Well \u2014 when a creature rests in this area, they absorb ambient magic. They gain advantage on their next spellcast roll.',
      'Reality Anchor \u2014 when a creature is affected by a teleportation effect, they can make a Presence roll (DC) to resist being moved.'
    ],
    fears:[
      'The Weave Unravels \u2014 Spend a Fear: magic in the area becomes completely unstable. All spells cast for the next 1d4 rounds have random additional effects determined by the GM.',
      'Planar Incursion \u2014 Spend a Fear: a rift to another plane tears open. Hostile creatures pour through. 1d4+1 extraplanar adversaries appear.',
      'Arcane Overload \u2014 Spend a Fear: every crystal in the area detonates simultaneously. All creatures take {dmg} magic and are Dazed for 1 round.',
      'The Source Awakens \u2014 Spend a Fear: the source of the area\'s magic becomes sentient and hostile. It targets the most magically powerful creature present.'
    ],
    feat_names:{
      passive:['Wild Magic','Mana Saturation','Antimagic Pockets','Planar Bleed'],
      action:['Arcane Surge','Reality Tear','Spell Echo','Crystal Shatter'],
      reaction:['Spell Reflection','Arcane Feedback','Phase Flicker','Rune Activation'],
      fear:['The Weave Unravels','Planar Incursion','Arcane Overload','The Source Awakens']
    }
  },
  cursed:{
    names:['The Blighted Hollow','Dreadmire','The Ashen Wastes',
           'Soulrot Expanse','The Withering Ground','Grimheart Domain',
           'The Forsaken Threshold','Nightfall Ruin'],
    descs:[
      'A {tier_adj} pall hangs over this land where nothing wholesome grows and shadows move of their own accord.',
      'The ground is blackened and cracked in this {tier_adj} place, as if the earth itself is dying.',
      'A {tier_adj} wrongness pervades the air \u2014 colors are muted, sounds are distorted, and hope feels distant.',
      'Dead trees claw at a {tier_adj} sky that never brightens, their bark weeping a dark, viscous sap.',
      'The {tier_adj} landscape here is a mockery of nature: flowers bloom in wrong colors, and water runs uphill.',
      'A {tier_adj} whisper follows all who enter, speaking their fears back to them in their own voice.'
    ],
    impulses:[
      'Corrupt all that is pure and twist all that is straight.',
      'The curse feeds on hope and excretes despair.',
      'What was cursed here cannot leave; what enters cannot remain unchanged.',
      'The boundary between life and death is worn thin.',
      'Spread the blight to everything that touches this soil.',
      'The source of the curse hungers for company in its misery.',
      'The cursed land rejects healing and wholeness.',
      'Ancient wrongs echo through the generations here.'
    ],
    adversaries:['Wraiths','Blighted beasts','Curse-born horrors','Shadow stalkers','Undead husks','The curse itself'],
    passives:[
      'Cursed Ground \u2014 healing effects restore half their normal value in this area.',
      'Creeping Dread \u2014 PCs mark 1 Stress at the start of each scene in this environment.',
      'Blighted Growth \u2014 natural materials decay rapidly. Wooden equipment and provisions spoil within hours.',
      'Shadow Doubles \u2014 each creature\'s shadow occasionally acts independently, creating distractions.',
      'Muted Magic \u2014 beneficial spells have disadvantage in this area. Harmful spells have advantage.',
      'The Whispering \u2014 all creatures hear constant whispers. Concentration-dependent tasks have disadvantage.'
    ],
    actions:[
      'Curse Pulse \u2014 a wave of dark energy pulses from the center of the blight. {dmg} magic to all creatures in Close range. Affected creatures mark 1 Stress.',
      'Shadow Strike \u2014 a creature\'s own shadow attacks them. {dmg} magic to one target. The target has disadvantage on their next roll.',
      'Blight Eruption \u2014 the cursed ground cracks open, releasing toxic miasma. All creatures in Very Close range mark 2 Stress and are Poisoned.',
      'Soul Drain \u2014 the curse reaches for one creature\'s life force. {dmg} magic. The target loses 1 Hope.',
      'Nightfall \u2014 darkness descends unnaturally. All light sources dim to half strength. Creatures without darkvision have disadvantage on attacks.',
      'Animate Dead \u2014 corpses in the area rise as hostile undead. 1d4 undead minions appear at Close range.'
    ],
    reactions:[
      'Curse Rebound \u2014 when a creature destroys an undead, the curse lashes back. The destroyer marks 1 Stress.',
      'Shadow Meld \u2014 when a creature enters a shadow, they can hide perfectly. Attacks against them automatically miss once, then the shadow ejects them.',
      'Blighted Resilience \u2014 when an undead creature would be destroyed, the curse sustains it for one additional round.',
      'Dread Echo \u2014 when a creature fails a roll, the whispers grow louder. They must mark 1 additional Stress.',
      'Corrupting Touch \u2014 when a creature makes a melee attack against a cursed enemy, they must make a Presence roll (DC) or mark 1 Stress from the contact.',
      'Dark Bargain \u2014 when a creature is about to die, the curse offers a deal: survive at the cost of a permanent mark.'
    ],
    fears:[
      'The Curse Deepens \u2014 Spend a Fear: the curse intensifies. All healing is negated for 1d4 rounds. Every creature marks 2 Stress.',
      'The Source Revealed \u2014 Spend a Fear: the heart of the curse manifests as a terrible entity. It targets all PCs with a wave of despair: Presence (DC+3) or lose all remaining Hope.',
      'Blighted Transformation \u2014 Spend a Fear: one creature begins to transform under the curse\'s influence. They gain a monstrous feature and must make a Presence roll (DC) each round to resist the curse\'s control.',
      'The Dead Walk \u2014 Spend a Fear: every corpse within Far range rises as an undead servant of the curse. The number depends on the location but is always overwhelming.'
    ],
    feat_names:{
      passive:['Cursed Ground','Creeping Dread','Blighted Growth','The Whispering'],
      action:['Curse Pulse','Shadow Strike','Blight Eruption','Soul Drain'],
      reaction:['Curse Rebound','Shadow Meld','Dread Echo','Corrupting Touch'],
      fear:['The Curse Deepens','The Source Revealed','Blighted Transformation','The Dead Walk']
    }
  }
};

// Official Environments from Daggerheart SRD
var OFFICIAL_ENVIRONMENTS=[
  {name:'Abandoned Grove',tier:1,type:'Exploration',desc:'A former druidic grove lying fallow and fully reclaimed by nature.',impulses:['Draw in the curious','Echo the past'],dc:11,adversaries:'Beasts (Bear, Dire Wolf, Glass Snake), Grove Guardians (Minor Treant, Sylvan Soldier, Young Dryad)',features:[{type:'passive',name:'Overgrown Battlefield',text:'There has been a battle here. A PC can make an Instinct Roll to identify evidence. On a success with Hope, learn three details. On a success with Fear, learn two. On a failure, mark a Stress to learn one.'},{type:'action',name:'Barbed Vines',text:'Pick a point within the grove. All targets within Very Close range must succeed on an Agility Reaction Roll or take 1d8+3 physical damage and become Restrained.'},{type:'action',name:'You Are Not Welcome Here',text:'A Young Dryad, two Sylvan Soldiers, and Minor Treants equal to the number of PCs appear to confront the party.'},{type:'action',name:'Defiler',text:'Spend a Fear to summon a Minor Chaos Elemental within Far range of a chosen PC who immediately takes the spotlight.'}]},
  {name:'Ambushed',tier:1,type:'Event',desc:'An ambush is set to catch an unsuspecting party off-guard.',impulses:['Overwhelm','Scatter','Surround'],dc:0,adversaries:'Any',features:[{type:'passive',name:'Relative Strength',text:'The Difficulty of this environment equals that of the adversary with the highest Difficulty.'},{type:'action',name:'Surprise!',text:'The ambushers reveal themselves. You gain 2 Fear, and the spotlight immediately shifts to one of the ambushing adversaries.'}]},
  {name:'Ambushers',tier:1,type:'Event',desc:'An ambush is set by the PCs to catch unsuspecting adversaries off-guard.',impulses:['Escape','Group up','Protect the most vulnerable'],dc:0,adversaries:'Any',features:[{type:'passive',name:'Relative Strength',text:'The Difficulty of this environment equals that of the adversary with the highest Difficulty.'},{type:'reaction',name:'Where Did They Come From?',text:'When a PC starts the ambush, you lose 2 Fear and the first attack roll a PC makes has advantage.'}]},
  {name:'Bustling Marketplace',tier:1,type:'Social',desc:'The economic heart of the settlement, with local artisans, traveling merchants, and patrons across social classes.',impulses:['Buy low and sell high','Tempt and tantalize with wares from near and far'],dc:10,adversaries:'Guards (Bladed Guard, Head Guard), Masked Thief, Merchant',features:[{type:'passive',name:'Tip the Scales',text:'PCs can gain advantage on a Presence Roll by offering a handful of gold as part of the interaction.'},{type:'action',name:'Unexpected Find',text:'Reveal that one of the merchants has something the PCs want or need.'},{type:'action',name:'Sticky Fingers',text:'A thief tries to steal something from a PC. Instinct Roll to notice or lose an item. Chase requires Progress Countdown (6) vs Consequence Countdown (4).'},{type:'reaction',name:'Crowd Closes In',text:'When one of the PCs splits from the group, the crowds shift and cut them off from the party.'}]},
  {name:'Cliffside Ascent',tier:1,type:'Traversal',desc:'A steep, rocky cliffside tall enough to make traversal dangerous.',impulses:['Cast the unready down to a rocky doom','Draw people in with promise of what lies at the top'],dc:12,adversaries:'Construct, Deeproot Defender, Giant Scorpion, Glass Snake',features:[{type:'passive',name:'The Climb',text:'Climbing uses a Progress Countdown (12). Critical Success: tick 3. Success with Hope: tick 2. Success with Fear: tick 1. Failure with Hope: no advancement. Failure with Fear: tick up 1.'},{type:'passive',name:'Pitons Left Behind',text:'Previous climbers left metal rods. If a PC using pitons fails a climb roll, they can mark a Stress instead of ticking the countdown up.'},{type:'action',name:'Fall',text:'Spend a Fear to have a PC\'s handhold fail. If not saved on the next action, they hit the ground and tick up the countdown by 2. Damage scales with countdown progress.'}]},
  {name:'Local Tavern',tier:1,type:'Social',desc:'A lively tavern that serves as the social hub for its town.',impulses:['Provide opportunities for adventurers','Nurture community'],dc:10,adversaries:'Guards (Bladed Guard, Head Guard), Mercenaries (Harrier, Sellsword, Spellblade, Weaponmaster), Merchant',features:[{type:'passive',name:'What\'s the Talk of the Town?',text:'A PC can ask about local events with a Presence Roll. On success, pick two details (three on critical). On failure, pick one and mark a Stress.'},{type:'passive',name:'Sing For Your Supper',text:'A PC can perform for guests with a Presence Roll. On success, earn 1d4 handfuls of gold (2d4 on critical). On failure, mark a Stress.'},{type:'action',name:'Mysterious Stranger',text:'Reveal a stranger concealing their identity, lurking in a shaded booth.'},{type:'action',name:'Someone Comes to Town',text:'Introduce a significant NPC who wants to hire the party or relates to a PC\'s background.'},{type:'action',name:'Bar Fight!',text:'Spend a Fear to have a bar fight erupt. PCs moving through must succeed on Agility or Presence Roll or take 1d6+2 physical damage.'}]},
  {name:'Outpost Town',tier:1,type:'Social',desc:'A small town on the outskirts of a nation or region, close to adventuring destinations.',impulses:['Drive the desperate to certain doom','Profit off of ragged hope'],dc:12,adversaries:'Jagged Knife Bandits, Masked Thief, Merchant',features:[{type:'passive',name:'Rumors Abound',text:'A PC can inquire about major events with a Presence Roll. Results vary by outcome quality.'},{type:'passive',name:'Society of the Broken Compass',text:'An adventuring society maintains a chapterhouse here.'},{type:'passive',name:'Rival Party',text:'Another adventuring party is here, seeking the same treasure or leads as the PCs.'},{type:'action',name:'It\'d Be a Shame If Something Happened to Your Store',text:'The PCs witness agents of a local crime boss shaking down a general goods store.'},{type:'reaction',name:'Wrong Place, Wrong Time',text:'Spend a Fear to introduce thieves at night: a Kneebreaker, Lackeys equal to PCs, and a Lieutenant.'}]},
  {name:'Raging River',tier:1,type:'Traversal',desc:'A swift-moving river without a bridge crossing, deep enough to sweep away most people.',impulses:['Bar crossing','Carry away the unready','Divide the land'],dc:10,adversaries:'Beasts (Bear, Glass Snake), Jagged Knife Bandits',features:[{type:'passive',name:'Dangerous Crossing',text:'Crossing requires a Progress Countdown (4). A PC who rolls failure with Fear is targeted by Undertow without spending Fear.'},{type:'action',name:'Undertow',text:'Spend a Fear to catch a PC in the undertow. Agility Reaction Roll: failure = 1d6+1 physical damage, moved Close distance, Vulnerable. Success = mark a Stress.'},{type:'action',name:'Patient Hunter',text:'Spend a Fear to summon a Glass Snake within Close range who immediately uses Spinning Serpent.'}]},
  {name:'Cult Ritual',tier:2,type:'Event',desc:'A Fallen cult assembles around a sigil of the defeated gods and a bonfire that burns a sickly shade of green.',impulses:['Profane the land','Unite the Mortal Realm with the Circles Below'],dc:14,adversaries:'Cult of the Fallen (Cult Adept, Cult Fang, Cult Initiate, Secret-Keeper)',features:[{type:'passive',name:'Desecrated Ground',text:'Reduce the PCs\' Hope Die to a d10 while in this environment. The desecration can be removed with a Progress Countdown (6).'},{type:'action',name:'Blasphemous Might',text:'Divert ritual power into a cult member. They become Imbued: advantage on attacks, +1d10 damage, or Relentless (2). Spend a Fear for all three.'},{type:'reaction',name:'The Summoning',text:'Countdown (6). Ticks down when a PC rolls with Fear. When triggered, summon a Minor Demon. Defeating the leader ends the ritual.'},{type:'reaction',name:'Complete the Ritual',text:'When the ritual leader is targeted, an ally within Very Close range can mark a Stress to be targeted instead.'}]},
  {name:'Hallowed Temple',tier:2,type:'Social',desc:'A bustling but well-kept temple that provides healing and hosts regular services.',impulses:['Connect the Mortal Realm with the Hallows Above','Display the power of the divine','Provide aid and succor'],dc:13,adversaries:'Guards (Archer Guard, Bladed Guard, Head Guard)',features:[{type:'passive',name:'A Place of Healing',text:'A PC who takes a rest in the Hallowed Temple automatically clears all HP.'},{type:'passive',name:'Divine Guidance',text:'A PC who prays can make an Instinct Roll. Critical: clear info + 1d4 Hope. Success with Hope: clear info. Success with Fear: brief flashes. Failure: vague flashes, mark Stress for one clear image.'},{type:'reaction',name:'Relentless Hope',text:'Once per scene, each PC can mark a Stress to turn a result with Fear into a result with Hope.'},{type:'reaction',name:'Divine Censure',text:'When PCs have trespassed, spend a Fear to summon a High Seraph and 1d4 Bladed Guards.'}]},
  {name:'Haunted City',tier:2,type:'Exploration',desc:'An abandoned city populated by the restless spirits of eras past.',impulses:['Misdirect and disorient','Replay apocalypses both public and personal'],dc:14,adversaries:'Ghosts (Spectral Archer, Spectral Captain, Spectral Guardian)',features:[{type:'passive',name:'Buried Knowledge',text:'A PC who seeks knowledge can make an Instinct or Knowledge Roll. Critical: valuable info + useful item. Success with Hope: valuable info. Success with Fear: vague info. Failure: mark Stress for a lead.'},{type:'passive',name:'Ghostly Form',text:'Adversaries have resistance to physical damage and can mark a Stress to move through solid objects.'},{type:'action',name:'Dead Ends',text:'Ghosts manifest scenes from their bygone era, changing the city layout, blocking paths, or forcing detours.'},{type:'action',name:'Apocalypse Then',text:'Spend a Fear: activate Progress Countdown (5) as a past disaster replays. PCs must overcome fires, stampedes, and collapsing buildings to escape.'}]},
  {name:'Mountain Pass',tier:2,type:'Traversal',desc:'Stony peaks that pierce the clouds, with a twisting path winding up and over through many switchbacks.',impulses:['Exact a chilling toll in supplies and stamina','Reveal magical tampering','Slow down travel'],dc:15,adversaries:'Beasts (Bear, Giant Eagle, Glass Snake), Chaos Skull, Minotaur Wrecker, Mortal Hunter',features:[{type:'passive',name:'Engraved Sigils',text:'Large markings increase the power of icy winds. A Knowledge Roll can recall info about the sigils and how to dispel them.'},{type:'action',name:'Avalanche',text:'Spend a Fear: all PCs must succeed on Agility or Strength Reaction Roll. Failure: knocked Far range, 2d20 physical damage, mark Stress. Success: mark Stress.'},{type:'reaction',name:'Raptor Nest',text:'When PCs enter hunting grounds, two Giant Eagles appear at Very Far range.'},{type:'reaction',name:'Icy Winds',text:'Countdown (Loop 4). When triggered, all characters must succeed on Strength Reaction Roll or mark a Stress. Cold clothing gives advantage.'}]},
  {name:'Burning Heart of the Woods',tier:3,type:'Exploration',desc:'Thick indigo ash fills the air around a towering moss-covered tree that burns eternally with flames a sickly shade of blue.',impulses:['Beat out an uncanny rhythm for all to follow','Corrupt the woods'],dc:16,adversaries:'Beasts, Elementals (Elemental Spark), Verdant Defenders (Dryad, Oak Treant, Stag Knight)',features:[{type:'passive',name:'Chaos Magic Locus',text:'When a PC makes a Spellcast Roll, they must roll two Fear Dice and take the higher result.'},{type:'passive',name:'The Indigo Flame',text:'PCs can make a Knowledge Roll to identify the corruption. Success: learn three details. The corruption can be cleansed with a nature magic ritual Progress Countdown (8).'},{type:'action',name:'Grasping Vines',text:'Animate vines ensnare PCs. Agility Reaction Roll or become Restrained and Vulnerable. Escaping costs 1d8+4 physical damage and losing a Hope.'},{type:'action',name:'Charcoal Constructs',text:'Warped animals wreathed in flame trample through. All targets in Close range: Agility Reaction Roll. Failure: 3d12+3 physical. Success: half damage.'},{type:'reaction',name:'Choking Ash',text:'Countdown (Loop). When triggered, all characters make Strength or Instinct Reaction Roll. Failure: 4d6+5 direct physical. Success: half damage.'}]},
  {name:'Castle Siege',tier:3,type:'Event',desc:'An active siege with an attacking force fighting to gain entry to a fortified castle.',impulses:['Bleed out the will to fight','Breach the walls','Build tension'],dc:17,adversaries:'Mercenaries, Noble Forces (Archer Squadron, Conscript, Elite Soldier, Knight of the Realm)',features:[{type:'passive',name:'Secret Entrance',text:'A PC can find a secret way in with a successful Instinct or Knowledge Roll.'},{type:'action',name:'Siege Weapons',text:'Consequence Countdown (6). When triggered, fortifications are breached. Gain 2 Fear, shift to Pitched Battle.'},{type:'action',name:'Reinforcements!',text:'Summon a Knight of the Realm, Tier 3 Minions equal to PCs, and two adversaries of choice within Far range.'},{type:'reaction',name:'Collateral Damage',text:'When an adversary is defeated, spend a Fear: stray siege weapon attack. Agility Reaction Roll. Failure: 3d8+3 damage + Stress. Success: Stress.'}]},
  {name:'Pitched Battle',tier:3,type:'Event',desc:'A massive combat between two large groups of armed combatants.',impulses:['Seize people, land, and wealth','Spill blood for greed and glory'],dc:17,adversaries:'Mercenaries, Noble Forces',features:[{type:'passive',name:'Adrift on a Sea of Steel',text:'Traversing the battlefield requires an Agility Roll to move up to Close range. If an adversary is in Melee range, mark Stress to attempt movement.'},{type:'action',name:'Raze and Pillage',text:'The attacking force raises stakes by lighting fires, stealing assets, kidnapping, or killing.'},{type:'action',name:'War Magic',text:'Spend a Fear: large-scale destructive magic at a point within Very Far range. All targets in Close range: Agility Reaction Roll. Failure: 3d12+8 magic damage + Stress.'},{type:'action',name:'Reinforcements!',text:'Summon a Knight of the Realm, Tier 3 Minions equal to PCs, and two adversaries of choice. Knight takes spotlight.'}]},
  {name:'Chaos Realm',tier:4,type:'Traversal',desc:'An otherworldly space where the laws of reality are unstable and dangerous.',impulses:['Annihilate certainty','Consume power','Defy logic'],dc:20,adversaries:'Outer Realms Monstrosities (Abomination, Corruptor, Thrall)',features:[{type:'passive',name:'Impossible Architecture',text:'Up is down, gravity is in flux. Movement requires Progress Countdown (8). On failure, mark Stress in addition to other consequences.'},{type:'action',name:'Everything You Are This Place Will Take from You',text:'Countdown (Loop 1d). When triggered, all PCs: Presence Reaction Roll or highest trait reduced by 1d4 unless they mark equal Stress.'},{type:'action',name:'Unmaking',text:'Spend a Fear: PC makes Strength Reaction Roll. Failure: 4d10 direct magic damage. Success: mark Stress.'},{type:'action',name:'Outer Realms Predators',text:'Spend a Fear: summon an Abomination, Corruptor, and 2d6 Thralls at Close range. Spotlight one; spend additional Fear for auto-success attack.'},{type:'reaction',name:'Disorienting Reality',text:'On a result with Fear, the Chaos Realm evokes a vision. The PC loses a Hope. If it is their last Hope, you gain a Fear.'}]},
  {name:'Divine Usurpation',tier:4,type:'Event',desc:'A massive ritual designed to breach the gates of the Hallows Above and unseat the New Gods themselves.',impulses:['Collect power','Overawe','Silence dissent'],dc:20,adversaries:'Arch-Necromancer, Fallen Shock Troops, Mortal Hunter, Oracle of Doom, Perfected Zombie',features:[{type:'passive',name:'Final Preparations',text:'Designate one adversary as the Usurper. Long-Term Countdown (8). When triggered, use Beginning of the End. You can hold up to 15 Fear.'},{type:'passive',name:'Divine Blessing',text:'When a PC critically succeeds, they can spend 2 Hope to refresh an ability normally limited by uses.'},{type:'action',name:'Defilers Abound',text:'Spend 2 Fear to summon 1d4+2 Fallen Shock Troops at Close range. Spotlight them for Group Attack.'},{type:'action',name:'Godslayer',text:'After Divine Siege triggers, spend 3 Fear: the Usurper slays a god, clears 2 HP, and increases a stat or gains a new feature.'},{type:'reaction',name:'Beginning of the End',text:'When Final Preparations triggers, activate Divine Siege Countdown (10). Spotlight Usurper to tick down. Major+ damage ticks up. When triggered, the Usurper shatters reality.'},{type:'reaction',name:'Ritual Nexus',text:'On any failure with Fear against the Usurper, the PC must mark 1d4 Stress from magical backlash.'}]},
  {name:'Imperial Court',tier:4,type:'Social',desc:'The majestic domain of a powerful empire, lavishly appointed with stolen treasures.',impulses:['Justify and perpetuate imperial rule','Seduce rivals with promises of power and comfort'],dc:20,adversaries:'Bladed Guard, Courtesan, Knight of the Realm, Monarch, Spy',features:[{type:'passive',name:'All Roads Lead Here',text:'PCs have disadvantage on Presence Rolls for actions that don\'t support the empire.'},{type:'passive',name:'Rival Vassals',text:'Imperial subjects vie for favor, exchanging favors for loyalty. Some may be open to sedition.'},{type:'action',name:'The Gravity of Empire',text:'Spend a Fear: present a PC with an offer satisfying a major goal in exchange for supporting the empire. Presence Reaction Roll. Failure: mark all Stress or accept. Success: mark 1d4 Stress.'},{type:'action',name:'Imperial Decree',text:'Spend a Fear to tick down a long-term countdown by 1d4.'},{type:'reaction',name:'Eyes Everywhere',text:'On a result with Fear, spend a Fear: someone overhears seditious talk. Instinct Reaction Roll to notice and intercept the witness.'}]},
  {name:'Necromancer\'s Ossuary',tier:4,type:'Exploration',desc:'A dusty crypt with a library, twisting corridors, and abundant sarcophagi, spattered with the blood of ill-fated invaders.',impulses:['Confound intruders','Delve into secrets best left buried','Manifest unlife','Unleash a tide of undead'],dc:19,adversaries:'Arch-Necromancer\'s Host (Perfected Zombie, Zombie Legion)',features:[{type:'passive',name:'No Place for the Living',text:'Features or actions that clear HP require spending a Hope to use. If already costing Hope, spend an additional Hope.'},{type:'passive',name:'Centuries of Knowledge',text:'A PC can investigate the library and make a Knowledge Roll to learn about arcana, history, and the Necromancer\'s plans.'},{type:'action',name:'Skeletal Burst',text:'All targets in Close range must succeed on Agility Reaction Roll or take 4d8+8 physical damage from skeletal shrapnel.'},{type:'action',name:'Aura of Death',text:'Once per scene, roll d4. Each undead in Far range clears HP and Stress equal to the result.'},{type:'action',name:'They Just Keep Coming!',text:'Spend a Fear to summon 1d6 Rotted Zombies, two Perfected Zombies, or a Zombie Legion at Close range.'}]}
];

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
      return '<button class="gen-chip'+(s===_envSeed?' active':'')+'" data-envseed="'+escH(s)+'">'
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
    b.classList.toggle('active',b.dataset.envseed===seed);
  });
}

function _pick(arr){return (arr&&arr.length)?arr[Math.floor(Math.random()*arr.length)]:undefined;}
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
  var dcOverrideEl=document.getElementById('env-dc-override');
  var dcOverride=dcOverrideEl&&dcOverrideEl.value?parseInt(dcOverrideEl.value):null;
  var featCountEl=document.getElementById('env-feat-count');
  var featureCount=featCountEl?Math.min(6,Math.max(1,parseInt(featCountEl.value)||3)):3;
  var advHintEl=document.getElementById('env-adv-override');
  var advHint=advHintEl&&advHintEl.value.trim()?advHintEl.value.trim():null;
  var allWeights=[{type:'passive',w:40},{type:'action',w:30},{type:'reaction',w:20},{type:'fear',w:10}];
  var weights=allWeights.filter(function(w){
    var cb=document.getElementById('env-feat-'+w.type);
    return !cb||cb.checked;
  });
  if(!weights.length)weights=allWeights;
  if(dcOverride)dc=dcOverride;
  if(advHint)adversaries=advHint;
  var features=[];
  var total=weights.reduce(function(s,w){return s+w.w;},0);
  for(var i=0;i<featureCount;i++){
    var roll=Math.random()*total;
    var cumul=0;var ftype=weights[0].type;
    for(var j=0;j<weights.length;j++){cumul+=weights[j].w;if(roll<cumul){ftype=weights[j].type;break;}}
    var fname=_pick(data.feat_names[ftype]);
    var fpool=ftype==='fear'?data.fears:data[ftype+'s'];
    if(!fpool||!fpool.length||!fname){continue;}
    var ftext=(_pick(fpool)||'').replace(/\{dmg\}/g,dmg);
    features.push({type:ftype,name:fname,text:ftext});
  }
  _currentEnvBlock={name:name,tier:tier,type:_envType,desc:desc,impulses:impulses,dc:dc,adversaries:adversaries,features:features,seed:_envSeed};
  _editingEnvId=null;
  renderEnvBlock(_currentEnvBlock,'env-result',false);
}

function renderEnvBlock(env,targetId,readOnly){
  var el=document.getElementById(targetId);if(!el)return;
  var featHtml=env.features.map(function(f){
    return '<div class="esb-feature">'
      +'<span class="esb-feat-badge '+escH(f.type)+'">'+escH(f.type)+'</span>'
      +'<span class="esb-feat-name">'+escH(f.name)+'</span>'
      +'<div class="esb-feat-text">'+escH(f.text)+'</div>'
      +'</div>';
  }).join('');
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
    +'<div class="esb-meta">Tier '+escH(String(env.tier))+' \u00b7 '+escH(env.type)+'</div>'
    +'<div class="esb-desc">'+escH(env.desc)+'</div>'
    +'<div class="esb-section-title">Impulses</div>'
    +'<div class="esb-impulses">'+env.impulses.map(function(imp){return '<div class="esb-impulse">\u2022 '+escH(imp)+'</div>';}).join('')+'</div>'
    +'<div class="esb-stat-line">Difficulty: <strong>'+escH(String(env.dc))+'</strong></div>'
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
    _editingEnvId=null;
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
  var text=env.name+'\nTier '+env.tier+' \u00b7 '+env.type
    +'\n\n'+env.desc
    +'\n\nIMPULSES\n'+env.impulses.map(function(imp){return '\u2022 '+imp;}).join('\n')
    +'\n\nDifficulty: '+env.dc
    +'\nPotential Adversaries: '+env.adversaries
    +'\n\n'+env.features.map(function(f){return f.type.toUpperCase()+' \u2014 '+f.name+'\n'+f.text;}).join('\n\n');
  navigator.clipboard.writeText(text).then(function(){showToast('Copied to clipboard.');});
}

function renderEnvLibrary(){
  var el=document.getElementById('gen-library');
  if(!el||!el.classList.contains('open'))return;
  var officialSelect=OFFICIAL_ENVIRONMENTS.length?('<div class="lib-add-official">'
    +'<select id="official-env-select">'
    +OFFICIAL_ENVIRONMENTS.map(function(e,i){return '<option value="'+i+'">'+escH(e.name)+'</option>';}).join('')
    +'</select>'
    +'<button class="gen-btn" style="flex:0;white-space:nowrap;padding:5px 10px" onclick="addOfficialEnv()">Add to Library</button>'
    +'</div>'):'';
  db_getAll('generator_library').then(function(encs){
    el.innerHTML=officialSelect
      +(encs&&encs.length?encs.map(function(env){
        return '<div class="lib-card">'
          +'<div class="lib-card-header">'
          +'<span class="lib-card-name">'+escH(env.name)+'</span>'
          +'<span class="lib-tier-badge">T'+escH(String(env.tier))+'</span>'
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

// §INIT
// ── Init ──────────────────────────────────────────────────
loadCustomAdv();
(function init(){
  loadSession();
  // Create the first battle if no session existed (not if user intentionally closed all)
  if(battles.length===0&&!_sessionHadBattles){
    battleTabCounter=1;
    const b={id:'battle-1',name:'Battle 1',battleStarted:false,round:1,playerCount:4,cart:[],combatants:[],iid:0};
    battles.push(b);
    activeBattleId='battle-1';
    tabOrder=[{type:'battle',id:'battle-1'}];
    renderAllTabs();
  }
  updateBP();buildFilters();renderList();
  if(battles.length===0){
    _showNoBattlesState();
  }else if(battleStarted){renderCombat();}else{renderStage();}
  statusBar();
  restoreToolkitState();
  if(window.innerWidth<=768){sidebarOpen=false;document.getElementById('sidebar').classList.add('collapsed');document.getElementById('sidebar-toggle').textContent='☰';}
})();
