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
  const showClose=battles.length>1;
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

// ── Add lore tab (creates panel + registers in tabOrder) ──
function addTab(title,html,icon='📜',rawMd=''){
  const id='tab-'+(++tabCounter);
  tabRawMd[id]=rawMd;
  const panel=document.createElement('div');
  panel.className='tab-panel';
  panel.id='panel-'+id;
  panel.innerHTML='<div class="md-panel"><div class="md-content">'+html+'</div></div>';
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

// §BATTLE_TABS ═══════════════════════════════════════════════════════════
// BATTLE TAB MANAGEMENT
// ═══════════════════════════════════════════════════════════
function currentBattle(){return battles.find(b=>b.id===activeBattleId);}

function saveBattleState(){
  const b=currentBattle();if(!b)return;
  Object.assign(b,{battleStarted,round,playerCount,cart,combatants,iid});
}

function loadBattleState(b){
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
  if(battles.length<=1)return;
  const b=battles.find(x=>x.id===id);
  if(b&&b.battleStarted&&!confirm(`Close "${b.name}"? This battle is in progress.`))return;
  battles=battles.filter(x=>x.id!==id);
  tabOrder=tabOrder.filter(x=>!(x.type==='battle'&&x.id===id));
  if(activeBattleId===id){
    activeBattleId=battles[battles.length-1].id;
    loadBattleState(currentBattle());
    activeTab='combat';
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-combat'));
    applyBattleToDOM();
  }
  renderAllTabs();saveSession();
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
  // Convert wiki links [[X]] to styled spans
  content=content.replace(/\[\[([^\]]+)\]\]/g,'<span class="wiki-link">$1</span>');
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

const STATUSES=['Vulnerable','Hidden','Restrained','Frightened','Bolstered','Cursed','Poisoned'];

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
  if(!battleStarted&&cart.length===0){grid.style.display='none';empty.style.display='flex';return;}
  empty.style.display='none';grid.style.display='grid';
  grid.innerHTML=cart.map(c=>`<div class="combat-card" style="border-style:dashed;opacity:.75"><button class="card-dismiss" onclick="removeFromCart(${c._iid})">✕</button><div class="card-header"><div class="card-name">${c.name}</div><span class="card-type-badge tc-${c.type}">${ICONS[c.type]} ${cap(c.type)}</span></div><div class="card-meta"><span class="card-stat">DC <span>${c.dc}</span></span><span class="card-stat">HP <span>${c.hp}</span></span><span class="card-stat">ST <span>${c.st}</span></span><span class="card-stat">ATK <span>${c.atk}</span></span></div><div style="font-size:12px;color:var(--text-muted);font-style:italic;text-align:center">Queued — hit ▶ Begin Battle</div></div>`).join('');
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
          panel.innerHTML='<div class="md-panel"><div class="md-content">'+html+'</div></div>';
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
        panel.innerHTML='<div class="md-panel"><div class="md-content">'+html+'</div></div>';
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

// §INIT
// ── Init ──────────────────────────────────────────────────
loadCustomAdv();
(function init(){
  loadSession();
  // Create the first battle if no session existed
  if(battles.length===0){
    battleTabCounter=1;
    const b={id:'battle-1',name:'Battle 1',battleStarted:false,round:1,playerCount:4,cart:[],combatants:[],iid:0};
    battles.push(b);
    activeBattleId='battle-1';
    tabOrder=[{type:'battle',id:'battle-1'}];
    renderAllTabs();
  }
  updateBP();buildFilters();renderList();
  if(battleStarted){renderCombat();}else{renderStage();}
  statusBar();
  restoreToolkitState();
  if(window.innerWidth<=768){sidebarOpen=false;document.getElementById('sidebar').classList.add('collapsed');document.getElementById('sidebar-toggle').textContent='☰';}
})();
