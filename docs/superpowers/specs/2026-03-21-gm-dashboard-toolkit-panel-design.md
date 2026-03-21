# GM Dashboard Toolkit Panel — Design Spec
**Date:** 2026-03-21
**Status:** Approved for implementation planning

---

## Overview

Add a collapsible **right-side Toolkit Panel** to "The Mother Tree" GM Dashboard with three tabs:

| Tab | Icon | Purpose |
|-----|------|---------|
| Rules Reference | 🔍 | Searchable pre-built rules cheat sheet + user-editable entries |
| Session Notes | 📝 | Freeform scratchpad + typed pinned cards (NPC, Threat, Loot) |
| Generators | 🎲 | NPC name generator, loot roller, and environment stat block generator |

Additionally:
- Replace the current `localStorage` data store with **IndexedDB** and add **Export/Import JSON** backup to prevent data loss when browser history is cleared.
- Add **Saved Encounters** — pre-built battle configurations that can be saved, managed in the Combat tab, and loaded via `[[encounter:Name]]` links embedded in lore tab markdown.

The app is shared with the broader Daggerheart community — it is not campaign-specific and is intended to work as a PWA installable on both laptop and mobile.

---

## Architecture

### Existing App Structure

The app is currently a single-page app with:
- A top `#tabbar` with a permanent Combat Tracker tab and dynamic lore tabs (uploaded .md files)
- A `#panel-combat` containing two main areas:
  - `#sidebar` — collapsible Arsenal sidebar (adversary picker, BP budget, type filters)
  - `#combat-main` — the active encounter grid with combatant cards
- A `#dynamic-panels` area for lore tab content
- A custom adversary modal

The Toolkit Panel is a **new column added to the right side** of the layout. It does not replace any existing panels.

### Shell Layout

```
┌────────────────────────────────────┬──────────┐
│  #tabbar (Combat + Lore tabs)      │          │
├──────────────┬─────────────────────┤ Toolkit  │
│  #sidebar    │  #combat-main       │  Panel   │
│  (Arsenal)   │  (Encounter Grid)   │  300px   │
│              │                     │          │
└──────────────┴─────────────────────┴──────────┘
```

- The Toolkit Panel is a fixed-width (300px desktop / full-width mobile) column on the right edge of the page.
- A toggle button (chevron `‹›`) is anchored to the **left edge of the panel**, visible at all times, so the user can always open/close the panel without hunting for a button. On collapse, the main content area expands to fill the space.
- On mobile (< 768px), the panel slides over the content as a right-side drawer overlay (same pattern as the existing `#sidebar` overlay on mobile — using a `sidebar-overlay` backdrop div that closes on click). The toggle button stays visible in the top-right corner of the screen as a floating action button.
- The panel state (open/closed, active tab) persists in IndexedDB `settings` store.

### Technology

- **No new framework.** The app is currently vanilla HTML/CSS/JS. All new code follows the same pattern used in `app.js` and `styles.css`.
- **IndexedDB** (via a thin wrapper — no external library required) replaces `localStorage` for all persistent data.
- **Export/Import** UI: a settings gear icon opens a small modal with "Export JSON" and "Import JSON" buttons.
- **PWA**: The app already has a service worker and manifest. IndexedDB persistence is locked in when installed to home screen.
- **Build system**: The app uses `build.js` to produce `dist/index.html` — a self-contained bundle for mobile use. All new JS and CSS must be authored in `app.js` / `styles.css` (following existing anchor comment patterns) so `build.js` picks them up automatically. **IndexedDB does not work on `file://` protocol in Firefox** but works fine when served or installed as a PWA. The dist bundle should be served via a local server or opened in Chrome/Safari where `file://` IndexedDB is permitted. If `file://` IndexedDB fails on load, the app falls back to a warning toast and continues using in-memory state (no crash).

---

## Storage: IndexedDB Migration

### Why

`localStorage` is cleared when users clear browser history. IndexedDB survives history clearing (unless "Clear site data" / "Clear cookies and other site data" is explicitly chosen, or the app is uninstalled as a PWA). For campaign data, this is a critical improvement.

### Schema

One database: `MotherTreeDB` (version 1). **All stores use `keyPath` for their primary key.**

| Object Store | keyPath / Index | Contents |
|---|---|---|
| `combat_session` | `key: 'state'` | Single record containing full combat session snapshot (replaces `motherTree_session` in localStorage). Same data shape as current `saveSession()` output. |
| `custom_adversaries` | `keyPath: 'id'` (string, **not** autoincrement) | Custom adversary objects (replaces `motherTree_customAdv` in localStorage). Existing adversaries already have string `id` values (e.g., `'cave-ogre'`). New adversaries created after migration use the same generation path as today but ensure `id` is always set as a non-empty string before writing. If a newly created custom adversary has no `id`, assign one as `'custom_' + Date.now()`. |
| `toolkit_notes` | `keyPath: 'id'` (string, not autoincrement) | Two subtypes of record in the same store: (1) Scratchpad: `{ id: 'scratchpad', text: '...' }` — always the same key, upserted on save. (2) Pinned cards: `{ id: '<timestamp_ms>_<random>', type: 'npc'\|'threat'\|'loot', name, notes, createdAt }` — unique string IDs generated at creation. Using string keys allows the scratchpad to coexist with pinned cards without the integer autoincrement conflict. |
| `generator_library` | `key: 'id'` (autoincrement) | User-saved environment stat blocks. Each: `{ id, name, tier, type, description, difficulty, impulses[], adversaries[], features[], savedAt }`. |
| `saved_encounters` | `keyPath: 'id'` (string) | Named encounter snapshots. Each: `{ id, name, adversaries[], savedAt }`. |
| `settings` | `key: 'k'` (string key) | Key-value store. One record per setting: `{ k: 'setting_name', v: value }`. Known keys: `toolkit_open` (bool), `toolkit_tab` ('rules'\|'notes'\|'generators'), `data_migrated` (bool). |

### Migration from localStorage

On first load, if `settings['data_migrated']` is falsy, run the migration:

1. Read `motherTree_session` from localStorage → write to IndexedDB `combat_session` store as-is (same JSON structure, no transformation needed).
2. Read `motherTree_customAdv` from localStorage → write each custom adversary into the `custom_adversaries` store, preserving all fields.
3. Set `settings['data_migrated'] = true` in IndexedDB.
4. Show a one-time toast: "Your session data has been migrated to IndexedDB for safer storage."
5. Do NOT delete localStorage keys until migration is confirmed written (use a `then` callback).

If localStorage is empty (new user), skip migration silently.

### Export / Import

**Export:**
- Read all IndexedDB stores.
- Serialize to a single JSON object: `{ version: 1, exported_at: ISO_DATE, combat_session: {...}, custom_adversaries: [...], toolkit_notes: [...], generator_library: [...], saved_encounters: [...] }`.
- Trigger download as `mother-tree-backup-YYYY-MM-DD.json`.

**Import:**
- User selects a `.json` file.
- App validates: parse JSON; check for `version` field (must be `1`); check that at least one of `combat_session`, `custom_adversaries`, `toolkit_notes`, `generator_library` is present.
- **On validation failure:** show an error toast ("Invalid backup file — could not import") and abort. Do not show the confirmation dialog. Do not touch any store.
- **On validation success:** show a confirmation dialog: "This will **overwrite** your current data. Your existing data will be replaced. Continue?"
- On confirm: clear all relevant stores, then write all records from the backup file. No merge — overwrite only.
- On success, reload the page to restore state from IndexedDB.

**UI:** A `⚙` settings button in the header (next to the GM badge) opens a small modal with Export and Import buttons.

---

## Tab 1: Rules Reference

### Purpose

A fast, searchable cheat sheet for Daggerheart rules — primarily for GMs who are new to the system and need quick mid-session lookups.

### Structure

- **Search bar** at top: filters all entries by keyword (rule name, text content).
- **Category pills**: filter by category. Active pill highlights. Pills wrap on mobile.
- **Rule cards**: expandable accordion cards. Collapsed shows name + one-line summary. Expanded shows full rule text.
- **"+ Add Custom Rule"** button: opens an inline form (Name, Category, Content) to add user entries. User entries are stored in IndexedDB and distinguished by a subtle border treatment.
- User entries can be edited or deleted via icon buttons on their cards.

### Pre-loaded Rule Categories and Content

All rules are derived from the Daggerheart Core Rulebook. The following sections are included:

#### Core Rolls
- **Action Roll** — Roll 2d12 (Hope Die + Fear Die), add trait modifier. Meet or exceed Difficulty to succeed. If Hope > Fear: Success with Hope. If Fear > Hope: Success with Fear. If equal: Success with Hope (ties favor Hope).
- **Critical Success** — Both dice show the same number. Exceptional narrative outcome.
- **Advantage** — Roll an extra die, keep the highest result.
- **Disadvantage** — Roll an extra die, keep the lowest result.
- **Fate Roll** (Optional) — GM asks a player to roll only their Hope or Fear Die to let chance decide a narrative outcome; the die type adds flavor but doesn't grant Hope or Fear.
- **Difficulty** — Standard Difficulty values: 8 (Very Easy), 11 (Easy), 14 (Moderate/T2 standard), 17 (Hard/T3 standard), 20 (Very Hard/T4 standard), 23 (Extreme), 26 (Impossible). Difficulty = 11 + (2 × Tier) as a baseline.

#### Hope & Fear
- **Gaining Hope** — Players gain 1 Hope on a success with Hope. Max Hope = 6.
- **Spending Hope** — Spend to activate abilities, power attacks, help allies (give +1d6 to another's roll), or use features that cost Hope.
- **Gaining Fear** — GM gains 1 Fear when a PC rolls with Fear. Stored in the Fear pool.
- **Spending Fear** — GM spends Fear to make GM moves (including Fear Feature adversary moves), activate adversary abilities, or introduce complications.
- **Fear Pool** — GM keeps Fear in reserve; recommended to keep some in reserve, especially in combat, to interrupt scenes.

#### Attack & Defense
- **Attack Roll** — Make an Action Roll using the weapon's trait vs. the adversary's Difficulty. On success, deal damage.
- **Adversary Difficulty** — Adversaries do not have Evasion; players roll against their listed Difficulty number.
- **Evasion** — PC passive defense score. Adversaries roll a d20 + modifier vs. a PC's Evasion to hit. Critical hit if roll equals or exceeds Evasion by 10+.
- **Unarmed Attack** — Roll Finesse or Strength (player's choice). Damage = 1d6+1 phy. No features.
- **Damage** — On a successful attack, roll the weapon's damage dice (number of dice = Proficiency) and add the flat bonus.
- **Proficiency** — Starts at 1; number of damage dice rolled on an attack. Increases at certain advancement options.
- **Damage Types** — Physical (phy) and Magic (mag). Some adversaries have resistance or immunity to one type.

#### Damage Thresholds & HP
- **Hit Points** — Characters have a limited number of HP slots. Mark them when taking damage.
- **Damage Thresholds** — Minor threshold: marks 1 HP. Major threshold: marks 2 HP. Severe threshold: marks 3 HP. Damage below the Minor threshold = no HP marked.
- **Marking Armor** — Before marking an HP, mark 1 Armor Slot instead to reduce damage severity by one tier (Severe → Major → Minor → Nothing). Each attack allows only 1 Armor Slot marked.
- **Armor Score** — Max armor slots available. Cannot exceed 12. After all slots marked, armor unusable until repaired during downtime.
- **Damage Thresholds by Tier** — Adversaries scale: T1: Minor 5, Major 11; T2: Minor 7, Major 16; T3: Minor 11, Major 22; T4: Minor 15, Major 30 (approximate — varies by adversary).

#### Conditions
- **Hidden** — A hidden target can't be directly attacked; attackers must succeed on an action to locate them first. Being observed by any creature removes Hidden. Actions that reveal position (attacking, casting loudly) end Hidden.
- **Restrained** — A restrained creature can't move from their position. They have disadvantage on Agility and Finesse rolls. Attackers have advantage against them.
- **Vulnerable** — A vulnerable creature marks an additional Hit Point when they would mark one or more HP. A creature that is Vulnerable while their Stress is full is defeated immediately when they would take any damage.

#### Stress
- **Marking Stress** — Players mark Stress in response to failed rolls, certain adversary abilities, and narrative consequences. Stress slots are limited.
- **Full Stress** — When a PC's Stress track is full, they become Vulnerable.
- **Clearing Stress** — Some abilities clear Stress. Short Rest clears all Stress (and repairs armor). Long Rest also clears Stress, plus clears all Hit Points and removes Vulnerable condition.

#### Countdowns
- **Standard Countdown** — A die (d4, d6, d8, d10) that ticks down by 1 each time its trigger occurs. When it hits 0, the consequence triggers.
- **Progress Countdown** — Ticks down toward a goal. Ticks on successes or certain conditions. Used for long-term tasks, environmental changes, or campaign events.
- **Looping Countdown** — When it hits 0, it triggers and resets to its starting value.
- **Dynamic Countdown Advancement** — Critical success: 3 ticks. Success with Hope: 2 ticks. Success with Fear: 1 tick. Failure: 0 ticks (or 1 tick on GMs discretion for project work).

#### Ranges
- **Melee** — Within arm's reach (same square/zone).
- **Very Close** — Just a few steps away.
- **Close** — Across a small room.
- **Far** — Across a large room or open space.
- **Very Far** — At the limit of sight/effective range.
- **Movement** — On their turn, a character can move freely to Close range from their current position without spending an action.

#### Downtime
- **Short Rest** — Clear all Stress, repair armor (clear all marked Armor Slots). Takes time in the fiction (1+ hours).
- **Long Rest** — Clear all Stress, all Hit Points, all marked Armor Slots. Remove Vulnerable condition. Takes a significant in-fiction rest (overnight or equivalent). GM gains 1d4 Fear (on short rest) or Fear = (number of PCs + 1d4) and advances a long-term countdown (on long rest).
- **Downtime Moves** — Get a Good Night's Rest (clear stress/HP), Repair Your Equipment (restore armor slots and item features), Prepare (gain advantage on next related roll), Work on a Project (tick a progress countdown), or others as described in class features.
- **GM Downtime** — Short rest: GM gains 1d4 Fear. Long rest: GM gains Fear = (# of PCs + 1d4) and advances a long-term countdown.

#### Death
- **Death Move** — When a PC marks their last Hit Point, they must immediately choose:
  - **Blaze of Glory** — Go out heroically. Take one critical-success action (GM discretion). Character dies.
  - **Avoid Death** — Stay unconscious until healed (ally clears 1+ HP) or until long rest. Roll Hope Die at party's next long rest; if ≤ character level, gain a Scar. The situation worsens regardless.
  - **Risk It All** — Roll Duality Dice. Hope Die higher: stay on their feet, clear HP and Stress equal to Hope Die value (split as desired). Fear Die higher: cross through the veil of death. Equal dice (critical): stay and clear all HP and Stress.
- **Scars** — Cross out a Hope slot permanently. Can be narratively healed as a downtime project reward. If last Hope slot crossed out, retire the character.
- **Resurrection** — Possible but long, difficult, and costly. Work with the GM.

#### GM Moves
- **When to Make a Move** — After a roll with Fear, after a failed roll, or when the fiction demands it.
- **Soft Move** — Foreshadows a consequence; players can react before it fully hits.
- **Hard Move** — A consequence lands immediately and fully.
- **Common GM Moves** — Put a PC in danger, have an adversary use a feature, activate an environment feature, introduce a new adversary, tick a countdown, use Fear to activate an adversary's Fear Feature, make a GM NPC act.

#### Adversaries (GM)
- **Adversary Attack** — Roll d20 + modifier vs. PC's Evasion. Hit if result meets or exceeds Evasion.
- **Adversary HP** — Adversaries track HP slots. When all HP slots are marked and they take additional damage: Severely Damaged adversaries are Defeated.
- **Adversary Stress** — Used for social conflict. Full Stress = Vulnerable. A Vulnerable adversary is defeated when they take any damage or a social success applies.
- **Defeated Adversaries** — GM chooses: flee, surrender, or die. They don't automatically die.
- **Mooks** — Basic adversaries, typically 1-3 HP. Often go in groups.
- **Standard** — Mid-level adversaries. 3-5+ HP. Substantial abilities.
- **Bruisers** — High HP, harder hitting. Fewer abilities.
- **Solos** — Designed for 1-vs-party encounters. High HP and multiple activations per round.
- **Skulks** — Low HP, Hidden mechanic, hit hard then vanish.
- **Leaders** — Boost allied adversaries. Usually lower HP.
- **Social** — NPCs in social conflicts. Uses Stress as HP analog.

#### Social Conflict
- **Influencing NPCs** — One successful action roll may be enough for minor requests. Major requests or hostile NPCs may require filling their Stress track.
- **Adversary Stress Track (Social)** — Use adversary Stress slots as the influence meter. Each successful social action causes them to mark Stress. Vulnerable when full; defeated (convinced) if hit while Vulnerable.
- **Countdowns in Social Conflict** — Set a countdown for adversary patience or time limit. PCs' actions tick it; when it triggers, they lose the opportunity.

#### Optional Rules
- **Falling Damage** — Very Close range: 1d10+3 phy. Close range: 1d20+5 phy. Far/Very Far: 1d100+15 phy or death (GM's discretion). Collision: 1d20+5 direct physical.
- **Underwater Combat** — Attack rolls have disadvantage unless the creature is suited for underwater combat. For breath: countdown (d4 or higher), ticks down when PCs take actions or fail rolls. When it ends, mark a Stress each time they take an action.
- **Conflict Between PCs** — On attack roll, attacker rolls vs. defender's Evasion. On other conflicts, instigator rolls an action roll vs. Difficulty = total value of the target's reaction roll.

#### Equipment Rules
- **Primary Weapons** — One equipped at a time. Listed by Trait, Range, Damage Die, Burden, Feature. Roll number of damage dice = Proficiency.
- **Secondary Weapons** — Augment primary. Shields, daggers, etc. One equipped at a time.
- **Weapon Burden** — One-handed or Two-handed. Characters have two "hands" mechanically. Two-handed primary = cannot equip secondary.
- **Switching Weapons in Danger** — Mark a Stress to equip an Inventory Weapon. Free in calm situations.
- **Armor Score** — Cannot exceed 12. Add character level to base thresholds.
- **Unarmored** — Armor Score 0, Major threshold = character level, Severe threshold = 2 × character level.
- **Throwing a Weapon** — Throwable weapons (dagger, axe) can be thrown to Very Close range using Finesse. Deal normal damage on success. You lose the weapon until retrieved.

#### Leveling Up
- **Tiers of Play** — Tier 1 (level 1), Tier 2 (levels 2-4), Tier 3 (levels 5-7), Tier 4 (levels 8-10).
- **Advancements** — Choose 2 per level up: +1 to two unmarked traits (mark them), +1 HP slot, +1 Stress slot, +1 to two Experiences, domain card (your level or lower), +1 Evasion, +1 Proficiency (mark both slots first), Multiclass (level 5+).
- **Level Achievements** — At levels 2, 5, and 8: +1 Experience at +2, +1 Proficiency, clear trait marks (at 5 and 8).
- **Damage Thresholds** — Increase +1 at every level (always add current level to armor base thresholds).

---

## Tab 2: Session Notes

### Purpose

A persistent scratchpad for in-session notes, plus typed pinned cards for quickly capturing NPCs, Threats, and Loot the GM wants to track this session.

### Structure

**Scratchpad** (top section)
- Simple `<textarea>` with auto-save (debounced 500ms) to IndexedDB.
- No rich text — plain text is fast and mobile-friendly.
- Persists across sessions indefinitely.

**Pinned Cards** (bottom section)
- Displayed as a scrollable card grid.
- **Add Card** button opens a small inline form with:
  - Type selector: NPC | Threat | Loot
  - Name field
  - Notes field (short description, stats summary, etc.)
- Cards are color-coded by type:
  - NPC: hope/gold accent
  - Threat: fear/red accent
  - Loot: green accent
- Cards can be **deleted** (×) or **edited** (pencil icon).
- **Pin from Generator**: when the Environment Generator or NPC generator creates something, it offers "Pin to Notes" which creates a card with the relevant details.

### Persistence

All notes and cards stored in IndexedDB `toolkit_notes` store. Persists indefinitely until manually deleted. Scratchpad is stored as a single record `{ id: 'scratchpad', text: '...' }`, upserted on every change. Pinned cards are stored as `{ id: '<timestamp_ms>_<random>', type, name, notes, createdAt }` records.

---

## Tab 3: Generators

### Structure

Three generator sections within the tab, each collapsible:

1. **NPC Name Generator**
2. **Loot Roller**
3. **Environment Stat Block Generator** (primary feature)

The Generator Library (saved environments) lives below the generators inside this tab.

---

### Generator 3a: NPC Name Generator

- Input: optional ancestry/origin (fantasy region flavors: e.g., "Northern", "Sylvan", "Dwarven", etc.) and gender presentation (optional).
- Output: 3–5 generated names with a "Copy" button each.
- Names drawn from a curated fantasy-appropriate word-part list, not an API. Fully offline.
- "Pin as NPC" button adds a card to Session Notes.

---

### Generator 3b: Loot Roller

- Input: Tier (1-4), quantity (1d4, 1d6, etc. or a fixed number).
- Output: a list of loot items appropriate to the tier (gold amounts, consumables, gear, oddities).
- Results can be copied to clipboard or pinned to Session Notes as a Loot card.

---

### Generator 3c: Environment Stat Block Generator

This is the main generator feature. It creates Daggerheart-format environment stat blocks matching the official rulebook layout.

#### Official Daggerheart Environment Stat Block Format

```
[ENVIRONMENT NAME]                          [TIER] | [TYPE]
──────────────────────────────────────────────────────────
[Italic description text]

IMPULSES
• [Narrative drive 1]
• [Narrative drive 2]

Difficulty: [Number]
Potential Adversaries: [List]

─────────────── FEATURES ───────────────

[PASSIVE | ACTION | REACTION | FEAR FEATURE] — [Name]             [Cost if any]
[Feature mechanical text]
[Italic flavor question or description]
```

**Environment Types (per rulebook):**
- **Traversal** — Environments the party must physically navigate.
- **Exploration** — Environments the party investigates and discovers.
- **Social** — Environments centered on interaction and relationship.
- **Event** — Environments defined by a happening or situation.

**Difficulty by Tier:**
| Tier | Difficulty | Damage Range |
|------|-----------|--------------|
| 1 | 11 | 1d6+1 to 1d8+3 |
| 2 | 14 | 2d6+3 to 2d10+2 |
| 3 | 17 | 3d8+3 to 3d10+1 |
| 4 | 20 | 4d8+3 to 4d10+10 |

**Feature Types:**
- **Passive** — Always active, no cost.
- **Action** — GM spends an action to activate.
- **Reaction** — Triggers automatically on a specific condition.
- **Fear Feature** — Costs "Spend a Fear" to activate. Most powerful.

#### Quick Mode (Default View)

1. **Setting Seed Chips** — Clickable flavor chips (Forest, Mountain, Cave, City, Ruins, Coast, Underground, Swamp, Desert, Arcane, Cursed, etc.). Selecting one pre-populates default values but all fields remain editable.
2. **Tier Select** — Dropdown: 1, 2, 3, 4. Automatically sets default Difficulty.
3. **Type Select** — Dropdown: Traversal, Exploration, Social, Event.
4. **Generate** button — Produces a complete stat block with:
   - Generated name (evocative, setting-appropriate)
   - Italic flavor description
   - 2 Impulses
   - Difficulty (from tier)
   - Potential Adversaries (2-3 setting-appropriate suggestions)
   - 2-4 Features (mix of types, scaled to tier)

#### Advanced Options (Expander, Collapsed by Default)

- **Difficulty Override** — Number input to manually set Difficulty.
- **Feature Count** — Slider or number input (1-6 features).
- **Feature Mix** — Checkboxes to include/exclude types (Passive, Action, Reaction, Fear Feature).
- **Custom Adversaries** — Text field to specify adversary types.

#### Generated Stat Block Display

- Displays in a styled card matching the Mother Tree aesthetic.
- All fields are **inline-editable** (click to edit name, description, impulse text, feature text, damage numbers, etc.).
- Feature type badge is a **static badge** — generated/assigned and not changeable after generation. The type is determined at generation time.
- Feature cost (e.g., "Spend a Fear") is displayed as-is.

#### Inline Editing Save Behavior

Edits to the generated stat block (name, description, impulses, feature text, damage values) are **local DOM state only** until the user explicitly saves. The stat block is NOT auto-saved to IndexedDB.

- Edited state lives only in the DOM until "Save to Library" is clicked.
- If "Regenerate" is clicked while the stat block has been edited (detected by comparing DOM field values to original generated values), show a confirmation: "Regenerate will discard your edits. Continue?" If confirmed, regenerate and reset all fields.
- "Save to Library" captures the current DOM state (including edits) and writes to IndexedDB `generator_library`.

#### Actions on a Generated Stat Block

- **Save to Library** — Captures current DOM field values (respecting any user edits), writes a new record to `generator_library` IndexedDB store.
- **Pin to Notes** — Creates a record in `toolkit_notes` store with type `'threat'`, name = environment name, notes = "T{tier} {type} | DC {difficulty}". Shows a brief toast "Pinned to Notes."
- **Copy Text** — Copies a plain-text formatted version to clipboard (name, tier, type, description, impulses, difficulty, adversaries, features as a readable block).
- **Regenerate** — Prompts if unsaved edits exist, then re-runs generation using current seed/tier/type/advanced settings.

#### Environment Library

Lives below the generator within the Generators tab. Shows all user-saved environments as compact cards.

- Each card shows: Name, Tier badge, Type badge.
- Click to expand full stat block (inline accordion expand).
- **Edit** — Loads the saved stat block back into the generator form above (populating all fields including seed chip, tier, type, and all editable text fields). The user can make changes and click "Save to Library" to update the record (overwrite existing record by id) or "Save as New" to add a second copy. The generator area scrolls into view when Edit is triggered.
- **Delete** — Confirmation prompt ("Delete [Name]?"), then removes record from `generator_library` store.
- **Pin to Notes** — Same behavior as Pin from fresh generator (type=`threat`, name=env name, notes=`T{tier} {type} | DC {difficulty}`).
- **"Add Official Environments"** — A `<select>` dropdown listing all `OFFICIAL_ENVIRONMENTS[]` by name. A "Add to Library" button next to it. On click, copies the selected environment into the user's `generator_library` with a new `id` and `savedAt`. This control is always visible at the top of the library section. If a GM has already added an official environment, a second click adds a duplicate (allowed — they can rename/delete as needed).

**Official Environments available to add (from rulebook, Ch. 4, pages 243-247):** The full list of official environment stat blocks must be extracted from the Daggerheart Core Rulebook and stored as a static JS array `OFFICIAL_ENVIRONMENTS[]` in `app.js`. The dropdown to add them is populated from this array. These are NOT loaded into any user's `generator_library` by default.

The implementer must read pages 243-247 of the rulebook and extract all stat blocks. Completeness check: the rulebook contains stat blocks for all four types (Traversal, Exploration, Social, Event) across all four tiers. Known environments include: Burning Heart of the Wood, Abandoned Grove, Ruins of Nix. The implementer must verify the full list by reading those pages — "extract all environment stat blocks found on pp. 243-247" is the deliverable, not a fixed count. Each entry in `OFFICIAL_ENVIRONMENTS[]` follows the same shape as `generator_library` records (minus `id` and `savedAt`).

---

## Implementation Notes

### NPC Name Generator (Offline)

Build a syllable/component combiner using a static word-part array in `app.js`. The data structure:

```js
const NAME_PARTS = {
  northern:  { pre: ['Bjorn','Ulf','Sig','Hald'], mid: ['mar','rik','var'], suf: ['en','heim','son'] },
  sylvan:    { pre: ['Ael','Thal','Syl','Mir'],   mid: ['ora','ith','an'],  suf: ['el','ia','wen'] },
  dwarven:   { pre: ['Dor','Brom','Thur','Grim'], mid: ['gar','dur','bal'], suf: ['in','ak','dim'] },
  eastern:   { pre: ['Kas','Rha','Yev','Tal'],    mid: ['ara','ini','ous'], suf: ['ar','an','os'] },
  arcane:    { pre: ['Zar','Vel','Nyx','Aur'],    mid: ['ith','ael','on'],  suf: ['ix','ex','ax'] },
  common:    { pre: ['Mar','Ren','Dal','Cor'],     mid: ['win','ton','ley'], suf: ['y','er','on'] },
};
```

Generation: pick style → randomly combine 2-3 parts (pre + mid or pre + suf or pre + mid + suf) → capitalize result. Generate 5 candidates per click.

**NOTE:** The example above shows only 4 entries per slot for illustration. The actual implementation MUST expand each slot to a minimum of 8 entries to ensure sufficient variety. The example structure is a template, not the final data.

### Environment Generator (Offline)

All generation is deterministic JS drawing from static data arrays. **Authoring these arrays is a required deliverable of the implementation task.** The implementer must write all generator content. The following defines the data structure and minimum counts — it does not provide the full authored content.

```js
// Keyed by seed chip (forest, mountain, cave, city, ruins, coast, underground, swamp, desert, arcane, cursed)
const ENV_DATA = {
  forest: {
    names:      ['...'],  // min 8 evocative location names
    descs:      ['...'],  // min 6 italic flavor description templates (may use {tier_adj} token)
    impulses:   ['...'],  // min 8 narrative drive statements
    adversaries:['...'],  // min 6 creature/NPC suggestions appropriate to setting
    // Feature pools per type:
    passives:   ['...'],  // min 6 passive feature text strings
    actions:    ['...'],  // min 6 action feature text strings (include damage placeholder {dmg})
    reactions:  ['...'],  // min 6 reaction feature text strings
    fears:      ['...'],  // min 4 fear feature text strings
    feat_names: { passive: ['...'], action: ['...'], reaction: ['...'], fear: ['...'] }, // min 4 names each
  },
  mountain: { /* same structure */ },
  cave:     { /* same structure */ },
  city:     { /* same structure */ },
  ruins:    { /* same structure */ },
  coast:    { /* same structure */ },
  underground: { /* same structure */ },
  swamp:    { /* same structure */ },
  desert:   { /* same structure */ },
  arcane:   { /* same structure */ },
  cursed:   { /* same structure */ },
};

// Tier adjective tokens for description templates
const TIER_ADJ = { 1: 'unsettling', 2: 'treacherous', 3: 'deadly', 4: 'legendary' };

// Damage lookup by tier (for {dmg} token substitution in feature text)
const ENV_DMG = { 1: '1d8+2', 2: '2d8+2', 3: '3d8+3', 4: '4d8+4' };
```

**Generation algorithm:**
1. Select `seed_data = ENV_DATA[selectedSeed]`.
2. Pick random name from `seed_data.names`.
3. Pick random description from `seed_data.descs`, substitute `{tier_adj}` with `TIER_ADJ[tier]`.
4. Pick 2 random unique impulses from `seed_data.impulses`.
5. Set `difficulty = ENV_DIFFICULTY[tier]` (11/14/17/20) unless overridden.
6. Pick 2-3 random unique adversary suggestions from `seed_data.adversaries`.
7. Generate features: pick feature types using weighted probability (Passive: 40%, Action: 30%, Reaction: 20%, Fear: 10%). Generate `featureCount` features (default 3, capped by Advanced options). For each: pick random name from `feat_names[type]`, pick random text from `seed_data[type + 's']`, substitute `{dmg}` with `ENV_DMG[tier]`.
8. Assemble stat block object and render to DOM.

No AI/API calls. All content is static arrays in `app.js`.

### Loot Generator (Offline)

Tiered loot tables as static JS arrays. Each loot entry is a string describing one item. The output format is a flat list of strings, one per item.

```js
const LOOT_TABLES = {
  1: ['handful of gold (1d6 × 5 gp)', 'healing potion (clear 1 HP)', 'torch bundle', 'simple rope (50ft)', ...],
  2: ['pouch of gold (2d6 × 10 gp)', 'improved healing tonic (clear 2 HP)', 'enchanted arrow quiver (1d8 arrows)', ...],
  3: ['gold ingot (3d6 × 25 gp)', 'rare healing elixir (clear all HP)', 'enchanted component (weapon upgrade)', ...],
  4: ['legendary artifact (GM-defined)', 'chest of gold (4d6 × 100 gp)', 'divine relic', ...],
};
```

Each tier needs minimum 12 entries to prevent repetition in single-session use. The generator draws N random items (N = resolved dice roll from the quantity selector) without repeating within one roll.

**"Pin to Notes" from Loot Roller:** Creates a `toolkit_notes` record: `{ type: 'loot', name: 'Loot — T{tier}', notes: items.join('\n') }`. This maps naturally to the Notes card Name and Notes fields.

---

## Visual Design

All new UI follows the existing Mother Tree aesthetic:

**Typography:**
- Display: `Cinzel` (headings, stat block names, tab labels)
- Body: `Crimson Pro` (description text, rule text)
- Mono: `JetBrains Mono` (numbers, dice notation, tags)

**CSS Variables (already defined in styles.css):**
```css
--hope: #d4a843; --hope-dim: #7a5f20;
--fear: #c0392b; --green: #2d6a4f; --green-hi: #52b788;
--arcane: #6e56a8; --arcane-hi: #a585e0;
```

**Feature Type Badge Colors:**
- Passive: muted green
- Action: hope/gold
- Reaction: arcane/purple
- Fear Feature: fear/red

**Card/Panel Styling:**
- Dark background panels with subtle parchment texture effect
- Thin gold (`--hope`) border accents on active elements
- Accordion cards use CSS transitions for open/close

**Responsiveness:**
- Tablet (768-1024px): Panel is narrower (260px), chips wrap
- Mobile (<768px): Panel overlays as a slide-in drawer from the right; toggle button stays visible

---

## Saved Encounters & Lore Tab Links

### Purpose

GMs prep their battles in advance, save them by name, and embed links in their lore tabs. During a session they stay on the narrative page and click a link to load the right fight the moment combat begins.

### Saving an Encounter

A **"Save Encounter"** button appears in the encounter queue area (the staging area before battle begins, when adversaries have been added to the queue but `Begin Battle` hasn't been pressed yet).

- Clicking it opens a small inline prompt: a text field pre-filled with "Encounter {n}" and a **Save** button.
- On save: write a record to the `saved_encounters` IndexedDB store.
- After saving, show a copyable link snippet: `[[encounter:Encounter Name]]` with a **Copy Link** button.
- The GM pastes this into any lore tab's markdown.

**Saved encounter record shape:**
```js
{
  id: 'encounter_' + Date.now(),
  name: 'Goblin Ambush',           // user-defined name
  adversaries: [...],              // snapshot of cart[] at save time (full adversary objects)
  savedAt: ISO_DATE_STRING
}
```

The adversary snapshot is a deep copy of the current `cart[]`. Saves the adversary type, stats, and abilities — everything needed to reconstruct the queue. **Does not save mid-battle state** (hp_m, st_m, defeated flags) — only the pre-battle composition.

### IndexedDB Store

Add a `saved_encounters` store to `MotherTreeDB`:

| Object Store | keyPath | Contents |
|---|---|---|
| `saved_encounters` | `'id'` (string, not autoincrement) | Named encounter snapshots |

Also add `saved_encounters` to the Export/Import JSON envelope so saved battles are included in backups.

### Lore Tab Link Syntax

The existing `renderMd()` function already transforms `[[wiki links]]` into anchor tags. Extend this to recognize `[[encounter:Name]]` as a special encounter link:

- Render as: `<a class="encounter-link" data-encounter-name="Goblin Ambush" href="#">⚔ Goblin Ambush</a>`
- Styled distinctly from regular wiki links (e.g., gold/hope color with a sword icon prefix)
- Click is intercepted via event delegation (same pattern as existing `[data-addid]` handlers)

### Loading an Encounter (Click Behavior)

When a `[data-encounter-name]` link is clicked:

1. Look up the saved encounter by name in `saved_encounters` store.
2. **If not found:** show a toast: `"No saved encounter named 'Goblin Ambush' found."` Do nothing else.
3. **If found, and the current encounter queue AND combat area are both empty:** load silently — populate `cart[]` with the saved adversaries, switch to the Combat tab, call `renderStage()`.
4. **If found, and there are adversaries already in the queue OR an active battle is in progress:** show a modal prompt:

   > **Load "Goblin Ambush"**
   > There are already adversaries in this encounter.
   >
   > [ **Replace** ]  [ **Add to Battle** ]  [ **Cancel** ]

   - **Replace** — Clear `cart[]` and `combatants[]`, reset battle state (same as Reset Battle but without confirmation), then populate `cart[]` with saved adversaries. Switch to Combat tab, call `renderStage()`.
   - **Add to Battle** — If battle hasn't started: append saved adversaries to `cart[]`, call `renderStage()`. If battle is in progress: call `addCombatant()` for each saved adversary (same path as adding mid-battle from Arsenal). Switch to Combat tab.
   - **Cancel** — Dismiss, do nothing.

### Managing Saved Encounters

A **Saved Encounters** section lives below the combat queue area in the Combat tab (collapsible, collapsed by default). It lists all saved encounters as compact rows: Name | adversary count | savedAt date | **Load** button | **Delete** button.

- **Load** — Same behavior as clicking an encounter link (steps 3/4 above).
- **Delete** — Confirmation prompt, then removes from IndexedDB.
- This gives the GM a way to manage saved encounters without needing a lore tab.

---

## Out of Scope (Deferred)

- SFX / ambient soundboard (removed from scope)
- Campaign-specific player character tracking
- Online sync / cloud save (Export/Import covers backup needs)
- AI-generated content (all generation is deterministic/template-based)

---

## Success Criteria

1. A GM can open the Toolkit Panel during a session and immediately search for a rule by keyword without leaving the page.
2. Session notes and pinned cards survive a browser restart and history clear (IndexedDB storage).
3. A GM can generate a Daggerheart-format environment stat block in under 10 seconds using only seed chips + Tier + Type + Generate.
4. Saved environments persist in the library and can be loaded mid-session.
5. The app works on both laptop and mobile (installed as PWA or opened in browser).
6. Export/Import allows full backup and restore of all session data.
