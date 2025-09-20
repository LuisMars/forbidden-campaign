// =====================
// Data model & helpers
// =====================
const STORE_KEY = 'fp_warband_builder_v1';
const CATALOG_VERSION = 1;
const DEFAULT_ITEMS = [];
const SEED_ITEMS = [
  { name: 'Bandages', cost: 1, traits: 'Cures Bleeding (pg. 22).', slots: 1, type: 'equipment', id: 'bandages' },
  { name: 'Lantern', cost: 3, traits: 'Required for models to see in the dark.', slots: 1, type: 'equipment', id: 'lantern' },
  { name: 'Torch', cost: 1, traits: 'As a lantern but only lasts 3 rounds. Can be used as a One-Handed Makeshift Weapon.', slots: 1, type: 'equipment', id: 'torch' },
  { name: 'Backpack', cost: 1, traits: 'Takes up one slot, but provides +2 additional Equipment slots.', slots: 1, slotBonus: 2, type: 'equipment', id: 'backpack' },
  { name: 'Potion', cost: 6, traits: 'Heals D6. Then the drinker makes a Toughness test or becomes Dazed (pg. 22).', slots: 1, type: 'equipment', id: 'potion' },
  { name: 'Ammo', cost: 1, traits: 'Five shots per stack of Ammo.', slots: 1, type: 'equipment', id: 'ammo' },
  { name: 'Antidote', cost: 7, traits: 'Cures Poisoned (pg. 23).', slots: 1, type: 'equipment', id: 'antidote' },
  { name: 'Tincture', cost: 7, traits: 'Cures Diseased (pg. 22).', slots: 1, type: 'equipment', id: 'tincture' },
  { name: 'Cannonball', cost: 2, traits: 'One shot of Cannon ammo.', slots: 1, type: 'equipment', id: 'cannonball' },
  { name: 'Whisky', cost: 2, traits: 'After drinking, auto-pass Morale tests for the remainder of the Scenario.', slots: 1, type: 'equipment', id: 'whisky' },
  { name: 'Flintlock Pistol', dmg: 'D8', attr: 'Presence', traits: 'Ranged; Explode; Reload', cost: 15, slots: 1, type: 'weapon', id: 'flintlock-pistol' },
  { name: 'Sling', dmg: 'D4', attr: 'Agility', traits: 'Ranged', cost: 1, slots: 1, type: 'weapon', id: 'sling' },
  { name: 'Musket', dmg: 'D10', attr: 'Presence', traits: 'Ranged; Explode; Reload', cost: 20, slots: 2, type: 'weapon', id: 'musket' },
  { name: 'Cannon', dmg: 'D20', attr: 'Strength', traits: 'Ranged; Explode; Reload', cost: 100, slots: 2, type: 'weapon', id: 'cannon' },
  { name: 'Crossbow', dmg: 'D6', attr: 'Presence', traits: 'Ranged; Cruel; Reload', cost: 8, slots: 2, type: 'weapon', id: 'crossbow' },
  { name: 'Bow', dmg: 'D6', attr: 'Presence', traits: 'Ranged', cost: 5, slots: 2, type: 'weapon', id: 'bow' },
  { name: 'One-Handed Makeshift Melee Weapon', dmg: 'D4', attr: 'Strength', traits: '', cost: 0, slots: 1, type: 'weapon', id: 'one-handed-makeshift-melee-weapon' },
  { name: 'Staff', dmg: 'D4', attr: 'Strength', traits: '', cost: 1, slots: 1, type: 'weapon', id: 'staff' },
  { name: 'Shortsword', dmg: 'D6', attr: 'Agility', traits: '', cost: 2, slots: 1, type: 'weapon', id: 'shortsword' },
  { name: 'Dagger', dmg: 'D4', attr: 'Agility', traits: 'Thrown', cost: 1, slots: 1, type: 'weapon', id: 'dagger' },
  { name: 'Hand Axe', dmg: 'D8', attr: 'Strength', traits: 'Thrown', cost: 3, slots: 1, type: 'weapon', id: 'hand-axe' },
  { name: 'Ulfberht Sword', dmg: 'D8', attr: 'Strength', traits: 'Criticals cause Bleeding (pg. 22)', cost: 5, slots: 1, type: 'weapon', id: 'ulfberht-sword' },
  { name: 'Morning Star', dmg: 'D8', attr: 'Strength', traits: 'Criticals cause Dazed (pg. 22); Cruel', cost: 7, slots: 1, type: 'weapon', id: 'morning-star' },
  { name: "Horseman's Pick", dmg: 'D6', attr: 'Strength', traits: 'Cruel', cost: 4, slots: 1, type: 'weapon', id: 'horsemans-pick' },
  { name: 'Flail', dmg: 'D8', attr: 'Strength', traits: 'Criticals cause Bleeding (pg. 22)', cost: 5, slots: 1, type: 'weapon', id: 'flail' },
  { name: 'Brass Knuckles', dmg: '2', attr: 'Agility', traits: 'Takes up no Equipment slot; Criticals cause Dazed (pg. 22)', cost: 2, slots: 0, type: 'weapon', id: 'brass-knuckles' },
  { name: 'Bone Flail', dmg: 'D8', attr: 'Strength', traits: 'Criticals cause Dazed and Bleeding (pg. 22)', cost: 9, slots: 1, type: 'weapon', id: 'bone-flail' },
  { name: 'Net', dmg: '-', attr: 'Agility', traits: 'Thrown; target must pass an Agility test or lose all movement until freed. Models can spend an action to attempt an Agility or Strength test to escape.', cost: 3, slots: 1, type: 'weapon', id: 'net' },
  { name: 'Warhammer', dmg: 'D6', attr: 'Strength', traits: 'Criticals cause Dazed (pg. 22)', cost: 4, slots: 1, type: 'weapon', id: 'warhammer' },
  { name: 'Sword', dmg: 'D6', attr: 'Strength', traits: '', cost: 3, slots: 1, type: 'weapon', id: 'sword' },
  { name: 'Rapier', dmg: 'D6', attr: 'Agility', traits: 'Criticals disarm enemy', cost: 4, slots: 1, type: 'weapon', id: 'rapier' },
  { name: 'Two-Handed Makeshift Melee Weapon', dmg: 'D6', attr: 'Strength', traits: '', cost: 0, slots: 2, type: 'weapon', id: 'two-handed-makeshift-melee-weapon' },
  { name: 'Bastard Sword', dmg: 'D10', attr: 'Strength', traits: 'Criticals destroy enemy Weapons', cost: 10, slots: 2, type: 'weapon', id: 'bastard-sword' },
  { name: 'Great Axe', dmg: 'D10', attr: 'Strength', traits: 'Criticals destroy Shields and deal damage', cost: 10, slots: 2, type: 'weapon', id: 'great-axe' },
  { name: 'Glaive', dmg: 'D8', attr: 'Strength', traits: 'Reach', cost: 8, slots: 2, type: 'weapon', id: 'glaive' },
  { name: 'Spear', dmg: 'D6', attr: 'Agility', traits: 'Reach; Thrown', cost: 8, slots: 2, type: 'weapon', id: 'spear' },
  { name: 'Trident', dmg: 'D6', attr: 'Agility', traits: 'Thrown; Criticals disarm enemy', cost: 7, slots: 2, type: 'weapon', id: 'trident' },
  { name: 'Unholy Hand Grenades of Apameia', dmg: 'D10', attr: 'Agility', traits: 'Thrown; Explode; Called Shot', cost: 6, slots: 1, type: 'weapon', id: 'unholy-hand-grenades-of-apameia' },
  { name: "Bag o' Rats", dmg: '-', attr: 'Agility', traits: 'Thrown; target must pass a Toughness test or become Diseased (pg. 22); on a Fumble the user becomes Diseased instead', cost: 1, slots: 1, type: 'weapon', id: 'bag-o-rats' },
  { name: 'Light Armor', armorVal: 1, cost: 2, slots: 1, traits: '', type: 'armor', id: 'light-armor' },
  { name: 'Medium Armor', armorVal: 2, cost: 5, slots: 1, traits: '', type: 'armor', id: 'medium-armor' },
  { name: 'Heavy Armor', armorVal: 3, cost: 20, slots: 2, traits: 'Takes up two Equipment slots.', type: 'armor', id: 'heavy-armor' },
  { name: 'Helm', armorVal: 0, cost: 5, slots: 1, traits: 'Ignores Dazed (pg. 22).', type: 'armor', id: 'helm' },
  { name: 'Shield', armorVal: 0, cost: 2, slots: 1, traits: 'If an attack would deal damage, the bearer may destroy the Shield to ignore it.', type: 'armor', id: 'shield' },
  { name: 'Tower Shield', armorVal: 0, cost: 10, slots: 2, traits: 'Acts as cover; all ranged attacks suffer -3 to hit the bearer; takes up two Equipment slots.', type: 'armor', id: 'tower-shield' },
  { name: 'Full Plate', armorVal: 4, cost: 50, slots: 2, traits: '+2 Strength required to use or wearer suffers -1 Agility; takes up two Equipment slots.', type: 'armor', id: 'full-plate' },
  { name: 'Pet Armor', armorVal: 1, cost: 10, slots: 1, traits: 'Can be used on any pet.', type: 'armor', id: 'pet-armor' },
  { name: 'Improvised Armor', armorVal: 1, cost: 0, slots: 1, traits: '-1 Agility.', type: 'armor', id: 'improvised-armor' },
  { name: 'Comfy Socks', armorVal: 0, cost: 15, slots: 0, traits: 'Armor Value 1 if the model has at least one Scroll; takes up no Equipment slots.', type: 'armor', id: 'comfy-socks' }
];

const STAT_SETS = [
  { id: 'setA', label: '+3, +1, 0, -3', values: [3, 1, 0, -3] },
  { id: 'setB', label: '+2, +2, -1, -2', values: [2, 2, -1, -2] },
];
const STAT_KEYS = [
  { key: 'agi', label: 'Agility' },
  { key: 'pre', label: 'Presence' },
  { key: 'str', label: 'Strength' },
  { key: 'tou', label: 'Toughness' },
];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const NAMES = [ 'Danbert','Nifehl','Doodlplex','El Bobo','Hald','Pannoyed','Dugnutt','Tauk','Kvali','Gride','Dug','Saint','Andrew','Tim','Vlan Bator','Esheg','Abathur','Jack','Sven','Anja','Toomas','Marek','Storm','Reed','Nohr' ];
const TYPES = ['Mercenary','Zealot','Brute','Acolyte','Scoundrel'];

function uid() { return Math.random().toString(36).slice(2, 10); }

function setStatInputsReadonly(locked) {
  ['edAgi', 'edPre', 'edStr', 'edTou'].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.readOnly = !!locked;
  });
}

function formatStatValue(val) {
  const num = Number(val);
  if (Number.isNaN(num)) return String(val);
  return num > 0 ? `+${num}` : String(num);
}

function formatSlotBonus(val) {
  const num = Number(val);
  if (!num) return null;
  const label = Math.abs(num) === 1 ? 'slot' : 'slots';
  return `${num > 0 ? '+' : ''}${num} ${label}`;
}

function countValues(values) {
  const counts = {};
  values.forEach(v => {
    const num = Number(v);
    if (!Number.isFinite(num)) return;
    const key = String(num);
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function cloneAssignments(src) {
  const out = {};
  STAT_KEYS.forEach(({ key }) => {
    const raw = src?.[key];
    if (raw == null || raw === '') {
      out[key] = null;
    } else {
      const val = Number(raw);
      out[key] = Number.isFinite(val) ? val : null;
    }
  });
  return out;
}

function assignmentsValid(assignments, counts) {
  const used = {};
  for (const { key } of STAT_KEYS) {
    const raw = assignments?.[key];
    if (raw == null || raw === '') continue;
    const val = Number(raw);
    if (!Number.isFinite(val)) continue;
    const valKey = String(val);
    used[valKey] = (used[valKey] || 0) + 1;
    if (used[valKey] > (counts[valKey] || 0)) {
      return false;
    }
  }
  return true;
}

function updateStatsFromAssignments(char) {
  if (!char.statTemplate || !char.statTemplate.assignments) return;
  STAT_KEYS.forEach(({ key }) => {
    const raw = char.statTemplate.assignments[key];
    if (raw == null || raw === '') {
      char.stats[key] = 0;
    } else {
      const val = Number(raw);
      char.stats[key] = Number.isFinite(val) ? val : 0;
    }
  });
}

function assignmentUsage(assignments) {
  const usage = {};
  STAT_KEYS.forEach(({ key }) => {
    const raw = assignments?.[key];
    if (raw == null || raw === '') return;
    const val = Number(raw);
    if (!Number.isFinite(val)) return;
    const keyStr = String(val);
    usage[keyStr] = (usage[keyStr] || 0) + 1;
  });
  return usage;
}

function isAssignmentComplete(assignments, counts) {
  const usage = assignmentUsage(assignments);
  for (const { key } of STAT_KEYS) {
    const raw = assignments?.[key];
    if (raw == null || raw === '') return false;
    if (!Number.isFinite(Number(raw))) return false;
  }
  const keys = new Set([...Object.keys(counts), ...Object.keys(usage)]);
  for (const key of keys) {
    if ((usage[key] || 0) !== (counts[key] || 0)) return false;
  }
  return true;
}

function detectStatSetId(char) {
  if (!char || !char.stats) return null;
  const currentValues = STAT_KEYS.map(({ key }) => Number(char.stats[key] || 0));
  const currentCounts = countValues(currentValues);
  for (const set of STAT_SETS) {
    const counts = countValues(set.values);
    const keys = new Set([...Object.keys(counts), ...Object.keys(currentCounts)]);
    let match = true;
    for (const key of keys) {
      if ((counts[key] || 0) !== (currentCounts[key] || 0)) {
        match = false;
        break;
      }
    }
    if (match) return set.id;
  }
  return null;
}

function computeTemplateAssignments(char, setId, seedAssignments) {
  const set = STAT_SETS.find(s => s.id === setId);
  if (!set) return null;
  const counts = countValues(set.values);
  const assignments = {};
  const detected = detectStatSetId(char);
  const seedUsable = seedAssignments && assignmentsValid(seedAssignments, counts) && STAT_KEYS.some(({ key }) => seedAssignments[key] != null && seedAssignments[key] !== '');

  if (seedUsable) {
    Object.assign(assignments, cloneAssignments(seedAssignments));
  } else if (detected === setId) {
    STAT_KEYS.forEach(({ key }) => {
      const val = Number(char.stats?.[key]);
      assignments[key] = Number.isFinite(val) ? val : null;
    });
  } else {
    STAT_KEYS.forEach(({ key }) => {
      assignments[key] = null;
    });
  }

  const remaining = countValues(set.values);
  STAT_KEYS.forEach(({ key }) => {
    const raw = assignments[key];
    if (raw == null || raw === '') {
      assignments[key] = null;
      return;
    }
    const val = Number(raw);
    if (!Number.isFinite(val)) {
      assignments[key] = null;
      return;
    }
    const k = String(val);
    if (remaining[k] > 0) {
      remaining[k] -= 1;
      assignments[key] = val;
    } else {
      assignments[key] = null;
    }
  });

  STAT_KEYS.forEach(({ key }) => {
    if (assignments[key] != null) return;
    const nextValKey = Object.keys(remaining).find(k => remaining[k] > 0);
    const value = nextValKey != null ? Number(nextValKey) : Number(set.values[0]) || 0;
    assignments[key] = value;
    if (nextValKey != null) remaining[nextValKey] -= 1;
  });

  const locked = isAssignmentComplete(assignments, counts);
  return { assignments: cloneAssignments(assignments), counts, locked };
}

function ensureStatTemplate(char, setId) {
  const result = computeTemplateAssignments(
    char,
    setId,
    char.statTemplate && char.statTemplate.id === setId ? char.statTemplate.assignments : null
  );
  if (!result) {
    delete char.statTemplate;
    return;
  }
  const prevLocked = char.statTemplate && char.statTemplate.id === setId ? !!char.statTemplate.locked : false;
  const locked = prevLocked ? (prevLocked && isAssignmentComplete(result.assignments, result.counts)) : result.locked;
  char.statTemplate = { id: setId, assignments: result.assignments, locked, draft: char.statTemplate?.draft };
  updateStatsFromAssignments(char);
}

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || null; } catch { return null; }
}

function normalizeState() {
  state = state || {};
  state.warband = state.warband || { name: '', limit: 50 };
  if (!Array.isArray(state.catalog) || state.catalogVersion !== CATALOG_VERSION) {
    state.catalog = JSON.parse(JSON.stringify(SEED_ITEMS));
    state.catalogVersion = CATALOG_VERSION;
  }
  state.stash = Array.isArray(state.stash) ? state.stash : [];
  state.chars = Array.isArray(state.chars) ? state.chars : [];
  state.settings = state.settings || { autoArmor: true };
  const deprecatedIds = new Set(['armor-light','armor-medium','armor-heavy','shield-item','clean-scroll','unclean-scroll','bloodied-fists','makeshift-weapon']);
  state.catalog = state.catalog.filter(item => item && !deprecatedIds.has(item.id));
  state.catalog.forEach(item => {
    if (!item.type) item.type = 'equipment';
    if (item.slots == null) item.slots = item.type === 'scroll' ? 0 : 1;
    item.slots = Number(item.slots);
    if (!Number.isFinite(item.slots)) item.slots = item.type === 'scroll' ? 0 : 1;
    if (item.type === 'scroll') item.slots = 0;
    item.slotBonus = Number(item.slotBonus || 0);
    if (!Number.isFinite(item.slotBonus)) item.slotBonus = 0;
    item.cost = Number(item.cost || 0);
    if (!Number.isFinite(item.cost)) item.cost = 0;
  });
  const validIds = new Set(state.catalog.map(item => item.id));
  state.stash = state.stash.filter(entry => entry && validIds.has(entry.itemId));
  state.chars.forEach(ch => {
    if (!ch || typeof ch !== 'object') return;
    ch.weapons = Array.isArray(ch.weapons) ? ch.weapons.filter(w => w && validIds.has(w.itemId)) : [];
    ch.equipment = Array.isArray(ch.equipment) ? ch.equipment.filter(e => e && validIds.has(e.itemId)) : [];
    ch.pack = Array.isArray(ch.pack) ? ch.pack.filter(id => validIds.has(id)) : [];
    if (ch.statTemplate && ch.statTemplate.id) {
      ensureStatTemplate(ch, ch.statTemplate.id);
    }
    if (!ch.statTemplate) {
      const detected = detectStatSetId(ch);
      if (detected) ensureStatTemplate(ch, detected);
    }
  });
  delete state.points;
  delete state.profiles;
}

function saveState() { normalizeState(); localStorage.setItem(STORE_KEY, JSON.stringify(state)); render(); }

let state = loadState() || {
  warband: { name: '', limit: 50 },
  catalog: JSON.parse(JSON.stringify(SEED_ITEMS)),
  stash: [],
  chars: [],
  selectedId: null,
  settings: { autoArmor: true },
  catalogVersion: CATALOG_VERSION,
};

normalizeState();

// =====================
// Catalog helpers
// =====================
function resolveItem(itemId) { return state.catalog.find(i => i.id === itemId); }
function ensureItemInCatalog(name, type, cost) {
  // create id from name
  const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || uid();
  let it = state.catalog.find(i => i.id === id || i.name.toLowerCase() === name.toLowerCase());
  if (!it) {
    it = { id, name, type, cost: Number(cost)||0 };
    if (type !== 'scroll') it.slots = /two-handed/i.test(name) ? 2 : 1;
    it.slotBonus = 0;
    state.catalog.push(it);
  } else {
    it.type = type;
    it.cost = Number(cost)||0;
    it.name = name;
  }
  if (it.slots == null && type !== 'scroll') it.slots = /two-handed/i.test(it.name) ? 2 : 1;
  if (it.slotBonus == null) it.slotBonus = 0;
  return it;
}
function addToStash(itemId, qty) {
  const row = state.stash.find(s => s.itemId === itemId);
  if (row) row.qty += qty; else state.stash.push({ itemId, qty });
}
function removeFromStash(itemId, qty) {
  const row = state.stash.find(s => s.itemId === itemId);
  if (!row) return false;
  if (row.qty < qty) return false;
  row.qty -= qty; if (row.qty === 0) state.stash = state.stash.filter(s => s !== row);
  return true;
}

// =====================
// Character logic
// =====================
function newCharacter(name) {
  const char = {
    id: uid(),
    name: name || randomFrom(NAMES),
    type: randomFrom(TYPES),
    stats: { agi: 0, pre: 0, str: 0, tou: 0 },
    armor: 0,
    hp: 8,
    feats: [],
    flaws: [],
    weapons: [], // [{itemId}]
    equipment: [], // [{itemId}]
    scrolls: { clean: 0, unclean: 0 },
    notes: '',
    pack: [],
  };
  ensureStatTemplate(char, STAT_SETS[0].id);
  return char;
}

function charPoints(c) {
  let gold = 0;
  for (const w of c.weapons || []) { const it = resolveItem(w.itemId); if (it) gold += Number(it.cost || 0); }
  for (const e of c.equipment || []) { const it = resolveItem(e.itemId); if (it) gold += Number(it.cost || 0); }
  for (const pid of c.pack || []) { const it = resolveItem(pid); if (it) gold += Number(it.cost || 0); }
  return gold;
}

function slotUsage(c) {
  const base = Math.max(0, 5 + Number(c?.stats?.str || 0));
  let bonus = 0;
  let used = 0;
  const all = [];
  if (Array.isArray(c.weapons)) all.push(...c.weapons);
  if (Array.isArray(c.equipment)) all.push(...c.equipment);
  for (const entry of all) {
    const item = resolveItem(entry.itemId);
    if (!item) continue;
    const slots = Number.isFinite(Number(item.slots)) ? Number(item.slots) : 1;
    used += Math.max(0, slots);
    const sb = Number(item.slotBonus || 0);
    if (Number.isFinite(sb)) bonus += sb;
  }
  const total = Math.max(0, base + bonus);
  return { used, total, base, bonus };
}

const isShieldItem = (item) => !!item && /shield/i.test(item.name || '');
const isHelmetItem = (item) => !!item && /helm/i.test(item.name || '');

function ensurePackArray(char) {
  if (!Array.isArray(char.pack)) char.pack = [];
  return char.pack;
}

function renderStatTemplate(char) {
  const controls = el('statTemplateControls');
  const valuesContainer = el('statTemplateValues');
  const grid = el('statAssignmentGrid');
  if (!controls || !valuesContainer || !grid) return;

  controls.innerHTML = '';
  valuesContainer.innerHTML = '';
  grid.innerHTML = '';

  char.statTemplate = char.statTemplate || { id: null, assignments: {}, locked: false };
  const template = char.statTemplate;
  let draft = template.draft || null;

  const selectWrap = document.createElement('label');
  selectWrap.className = 'pill';
  selectWrap.textContent = 'Preset ';
  const presetSelect = document.createElement('select');
  presetSelect.innerHTML = '<option value="">Custom</option>' + STAT_SETS.map(set => `<option value="${set.id}">${set.label}</option>`).join('');
  selectWrap.appendChild(presetSelect);
  controls.appendChild(selectWrap);

  const activeId = (draft ? draft.id : template.id) || '';
  presetSelect.value = activeId;

  presetSelect.onchange = (e) => {
    const value = e.target.value;
    if (!value) {
      char.statTemplate = { id: null, assignments: {}, locked: false };
      setStatInputsReadonly(false);
      render();
      return;
    }
    const baseSeed = template.id === value ? template.assignments : null;
    const computed = computeTemplateAssignments(char, value, baseSeed);
    template.draft = {
      id: value,
      assignments: computed ? cloneAssignments(computed.assignments) : cloneAssignments(null),
    };
    template.locked = false;
    setStatInputsReadonly(true);
    render();
  };

  const effectiveId = draft ? draft.id : template.id;
  setStatInputsReadonly(!!effectiveId);
  if (!effectiveId) {
    const msg = document.createElement('div');
    msg.className = 'muted small';
    msg.textContent = 'Custom distribution active. Edit the stat values directly above.';
    valuesContainer.appendChild(msg);
    return;
  }

  const set = STAT_SETS.find(s => s.id === effectiveId);
  if (!set) return;

  if (!template.locked && !draft && template.id === effectiveId) {
    template.draft = {
      id: template.id,
      assignments: cloneAssignments(template.assignments),
    };
    draft = template.draft;
  }

  const assignments = draft ? draft.assignments : (template.assignments || {});
  const counts = countValues(set.values);
  const usage = assignmentUsage(assignments);
  const remainingCounts = { ...counts };
  Object.keys(usage).forEach(key => {
    if (remainingCounts[key] == null) remainingCounts[key] = 0;
    remainingCounts[key] -= usage[key];
  });
  const complete = isAssignmentComplete(assignments, counts);

  if (!draft && template.locked && template.id === effectiveId && complete) {
    const summary = document.createElement('div');
    summary.className = 'list';
    STAT_KEYS.forEach(({ key, label }) => {
      const item = document.createElement('div');
      item.className = 'muted';
      item.textContent = `${label}: ${formatStatValue(assignments[key])}`;
      summary.appendChild(item);
    });
    valuesContainer.appendChild(summary);
    const editBtn = document.createElement('button');
    editBtn.className = 'ghost';
    editBtn.type = 'button';
    editBtn.textContent = 'Edit Distribution';
    editBtn.onclick = () => {
      template.draft = {
        id: template.id,
        assignments: cloneAssignments(template.assignments),
      };
      template.locked = false;
      render();
    };
    valuesContainer.appendChild(editBtn);
    return;
  }

  const remainingLabel = document.createElement('div');
  remainingLabel.className = 'muted small';
  const remainingText = Object.keys(counts)
    .map(key => {
      const left = Math.max(0, remainingCounts[key] ?? 0);
      const display = formatStatValue(Number(key));
      return `${display}: ${left}`;
    })
    .join(' · ');
  remainingLabel.textContent = `Remaining values — ${remainingText}`;
  valuesContainer.appendChild(remainingLabel);

  STAT_KEYS.forEach(({ key, label }) => {
    const container = document.createElement('div');
    container.className = 'stat-template-item';

    const title = document.createElement('div');
    title.className = 'muted small';
    title.textContent = label;
    container.appendChild(title);

    const select = document.createElement('select');
    const unsetOption = document.createElement('option');
    unsetOption.value = '';
    unsetOption.textContent = 'Unset';
    select.appendChild(unsetOption);

    let currentVal;
    if (assignments[key] == null || assignments[key] === '') currentVal = NaN;
    else {
      currentVal = Number(assignments[key]);
      if (!Number.isFinite(currentVal)) currentVal = NaN;
    }

    set.values.forEach(valRaw => {
      const val = Number(valRaw);
      if (!Number.isFinite(val)) return;
      const allowed = counts[String(val)] || 0;
      let usedElsewhere = 0;
      STAT_KEYS.forEach(({ key: other }) => {
        if (other === key) return;
        const otherVal = assignments[other];
        if (otherVal == null || otherVal === '') return;
        if (Number(otherVal) === val) usedElsewhere++;
      });
      const available = allowed - usedElsewhere;
      const remaining = available - (currentVal === val ? 1 : 0);
      const option = document.createElement('option');
      option.value = String(val);
      option.textContent = `${formatStatValue(val)} (${Math.max(0, remaining)} left)`;
            if (!Number.isNaN(currentVal) && currentVal === val) option.selected = true;
            if (available <= 0 && (Number.isNaN(currentVal) || currentVal !== val)) option.disabled = true;
      select.appendChild(option);
    });

    select.onchange = (e) => {
      console.log('[stat-select] change', { char: char.name, stat: key, prev: assignments[key], next: e.target.value });
      if (!char.statTemplate.draft || char.statTemplate.draft.id !== effectiveId) {
        char.statTemplate.draft = {
          id: effectiveId,
          assignments: cloneAssignments(assignments),
        };
      }
      const pending = char.statTemplate.draft.assignments;
      const prevVal = pending[key] == null || pending[key] === '' ? null : Number(pending[key]);
      const value = e.target.value === '' ? null : Number(e.target.value);
      pending[key] = value;
      template.locked = false;
      if (!assignmentsValid(pending, counts)) {
        pending[key] = prevVal;
        e.target.value = prevVal == null ? '' : String(prevVal);
        console.warn('[stat-select] invalid assignment, reverting', { char: char.name, stat: key, prev: prevVal });
        return;
      }
      render();
    };


    container.appendChild(select);
    grid.appendChild(container);
  });

  const lockHint = document.createElement('div');
  lockHint.className = 'muted small';
  lockHint.textContent = 'Select a value for each stat. Once all values are used the template locks automatically.';
  valuesContainer.appendChild(lockHint);

  if (template.draft) {
    const actions = document.createElement('div');
    actions.className = 'row stat-template-actions';
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.textContent = 'Confirm Changes';
    confirmBtn.onclick = () => {
      const pending = char.statTemplate.draft;
      if (!pending) return;
      const pendingSet = STAT_SETS.find(s => s.id === pending.id);
      if (!pendingSet) {
        delete char.statTemplate.draft;
        render();
        return;
      }
      const pendingCounts = countValues(pendingSet.values);
      char.statTemplate.id = pending.id;
      char.statTemplate.assignments = cloneAssignments(pending.assignments);
      delete char.statTemplate.draft;
      char.statTemplate.locked = isAssignmentComplete(char.statTemplate.assignments, pendingCounts);
      updateStatsFromAssignments(char);
      saveState();
    };
    actions.appendChild(confirmBtn);
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'ghost';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
      delete char.statTemplate.draft;
      const baseSet = STAT_SETS.find(s => s.id === char.statTemplate.id);
      const baseCounts = baseSet ? countValues(baseSet.values) : {};
      char.statTemplate.locked = isAssignmentComplete(char.statTemplate.assignments || {}, baseCounts);
      render();
    };
    actions.appendChild(cancelBtn);
    valuesContainer.appendChild(actions);
  }
}

function removeFromPack(char, itemId, idxHint) {
  if (!Array.isArray(char.pack)) return;
  if (Number.isInteger(idxHint) && idxHint >= 0 && idxHint < char.pack.length && char.pack[idxHint] === itemId) {
    char.pack.splice(idxHint, 1);
    return;
  }
  const idx = char.pack.indexOf(itemId);
  if (idx >= 0) char.pack.splice(idx, 1);
}

function equipFromPack(char, itemId, packIdx) {
  const item = resolveItem(itemId);
  if (!item) return;
  ensurePackArray(char);
  removeFromPack(char, itemId, packIdx);
  if (item.type === 'weapon') {
    char.weapons = Array.isArray(char.weapons) ? char.weapons : [];
    char.weapons.push({ itemId });
  } else if (item.type === 'armor' || item.type === 'equipment') {
    char.equipment = Array.isArray(char.equipment) ? char.equipment : [];
    char.equipment.push({ itemId });
  } else if (item.type === 'scroll') {
    char.scrolls = char.scrolls || { clean: 0, unclean: 0 };
    if (/unclean/i.test(item.name) || item.id.includes('unclean')) char.scrolls.unclean++;
    else char.scrolls.clean++;
  }
  saveState();
}

function warbandPoints() { return state.chars.reduce((a,c)=>a+charPoints(c),0); }

// =====================
// Render
// =====================
const el = id => document.getElementById(id);
function render() {
  // Warband header
  el('wbName').value = state.warband.name || '';
  el('wbLimit').value = state.warband.limit || 0;
  const total = warbandPoints();
  el('wbPoints').textContent = `${total} g` + (state.warband.limit?` / ${state.warband.limit} g`:'');
  el('wbPoints').className = 'tag' + (state.warband.limit && total>state.warband.limit ? ' warn' : '');

  // Character list
  const list = el('charList');
  list.innerHTML = '';
  state.chars.forEach((c) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.justifyContent = 'space-between';
    const left = document.createElement('div');
    left.className = 'row';
    const btn = document.createElement('button');
    btn.className = c.id === state.selectedId ? '' : 'ghost';
    btn.textContent = c.name || '(unnamed)';
    btn.onclick = () => { state.selectedId = c.id; saveState(); };
    left.appendChild(btn);
    left.appendChild(tag(`${c.type || ''}`));
    const right = document.createElement('div');
    right.className = 'row';
    const slots = slotUsage(c);
    const slotTag = tag(`Slots ${slots.used}/${slots.total}`);
    if (slots.used > slots.total) slotTag.classList.add('warn');
    slotTag.title = `Base ${slots.base}, Bonus ${slots.bonus}`;
    right.appendChild(slotTag);
    right.appendChild(tag(`${charPoints(c)} g`));
    const del = document.createElement('button');
    del.className = 'danger';
    del.textContent = 'Delete';
    del.onclick = () => { if (confirm('Delete character?')) { state.chars = state.chars.filter(x=>x.id!==c.id); if (state.selectedId===c.id) state.selectedId=null; saveState(); } };
    right.appendChild(del);
    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  });

  // Editor
  const selected = state.chars.find(c => c.id === state.selectedId);
  el('editor').style.display = selected ? '' : 'none';
  el('noSelection').style.display = selected ? 'none' : '';
  if (selected) fillEditor(selected);

  // Stash
  const tbody = el('stash');
  tbody.innerHTML = '';
  for (const row of state.stash) {
    const it = resolveItem(row.itemId);
    if (!it) continue;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(it.name)}</td><td>${it.type}</td><td>${escapeHtml(summarizeItem(it))}</td><td class="right">${row.qty}</td><td class="right">${it.cost} g</td>`;
    const td = document.createElement('td');
    td.className = 'right';
    const useBtn = document.createElement('button');
    useBtn.textContent = 'Assign';
    useBtn.onclick = () => {
      if (!state.selectedId) return alert('Select a character first.');
      if (!removeFromStash(it.id, 1)) return;
      const ch = state.chars.find(c=>c.id===state.selectedId);
      if (!ch) return;
      if (it.type === 'weapon') { ch.weapons.push({ itemId: it.id }); }
      else if (it.type === 'equipment' || it.type === 'armor') { ch.equipment.push({ itemId: it.id }); }
      else if (it.type === 'scroll') {
        ch.scrolls = ch.scrolls || { clean: 0, unclean: 0 };
        if (/unclean/i.test(it.name) || it.id.includes('unclean')) ch.scrolls.unclean++;
        else ch.scrolls.clean++;
      }
      saveState();
    };
    const stowBtn = document.createElement('button');
    stowBtn.className = 'ghost';
    stowBtn.textContent = 'Stow';
    stowBtn.title = 'Move to personal stash';
    stowBtn.onclick = () => {
      if (!state.selectedId) return alert('Select a character first.');
      if (!removeFromStash(it.id, 1)) return;
      const ch = state.chars.find(c=>c.id===state.selectedId);
      if (!ch) return;
      ensurePackArray(ch).push(it.id);
      saveState();
    };
    const addBtn = document.createElement('button');
    addBtn.className = 'ghost';
    addBtn.textContent = '+';
    addBtn.title = 'Increase qty';
    addBtn.onclick = () => { addToStash(it.id, 1); saveState(); };
    const subBtn = document.createElement('button');
    subBtn.className = 'ghost';
    subBtn.textContent = '−';
    subBtn.title = 'Decrease qty';
    subBtn.onclick = () => { removeFromStash(it.id, 1); saveState(); };
    td.appendChild(useBtn); td.appendChild(stowBtn); td.appendChild(addBtn); td.appendChild(subBtn);
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  // Catalog editor
  const cbody = document.getElementById('catalog');
  if (cbody) {
    cbody.innerHTML = '';
    const sorted = [...state.catalog].sort((a,b)=> (a.type||'').localeCompare(b.type||'') || a.name.localeCompare(b.name));
    for (const it of sorted) {
      const tr = document.createElement('tr');
      const typeSel = document.createElement('select');
      ['weapon','equipment','armor','scroll'].forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; if (it.type===t) o.selected=true; typeSel.appendChild(o); });
      typeSel.onchange = ()=>{ it.type = typeSel.value; saveState(); };
      const dmgIn = document.createElement('input'); dmgIn.type='text'; dmgIn.value=it.dmg||''; dmgIn.placeholder='d6'; dmgIn.style.width='60px'; dmgIn.oninput=()=>{ it.dmg = dmgIn.value.trim(); saveState(); };
      const attrIn = document.createElement('input'); attrIn.type='text'; attrIn.value=it.attr||''; attrIn.placeholder='Agi/Str/Pre'; attrIn.style.width='90px'; attrIn.oninput=()=>{ it.attr = attrIn.value.trim(); saveState(); };
      const traitsIn = document.createElement('input'); traitsIn.type='text'; traitsIn.value=it.traits||''; traitsIn.placeholder='traits'; traitsIn.style.width='160px'; traitsIn.oninput=()=>{ it.traits = traitsIn.value; saveState(); };
      const slotsIn = document.createElement('input'); slotsIn.type='number'; slotsIn.step='1'; slotsIn.min='0'; slotsIn.value = it.slots != null ? Number(it.slots) : 1; slotsIn.style.width='70px'; slotsIn.oninput=()=>{ const val = Number(slotsIn.value); it.slots = Number.isFinite(val) ? val : 0; saveState(); };
      const slotBonusIn = document.createElement('input'); slotBonusIn.type='number'; slotBonusIn.step='1'; slotBonusIn.value=Number(it.slotBonus||0); slotBonusIn.style.width='90px'; slotBonusIn.oninput=()=>{ const val = Number(slotBonusIn.value); it.slotBonus = Number.isFinite(val) ? val : 0; saveState(); };
      const avIn = document.createElement('input'); avIn.type='number'; avIn.step='1'; avIn.min='0'; avIn.value=Number(it.armorVal||0); avIn.style.width='70px'; avIn.oninput=()=>{ it.armorVal=Number(avIn.value)||0; saveState(); };
      const notesIn = document.createElement('input'); notesIn.type='text'; notesIn.value=it.notes||''; notesIn.placeholder='notes'; notesIn.style.width='160px'; notesIn.oninput=()=>{ it.notes=notesIn.value; saveState(); };
      const costIn = document.createElement('input'); costIn.type='number'; costIn.step='1'; costIn.value=Number(it.cost||0); costIn.style.width='90px'; costIn.oninput = ()=>{ it.cost = Number(costIn.value)||0; saveState(); };
      const del = document.createElement('button'); del.className='ghost'; del.textContent='Remove'; del.onclick=()=>{ if(confirm('Remove from catalog?')) { state.catalog = state.catalog.filter(x=>x!==it); saveState(); } };
      tr.innerHTML = `<td>${escapeHtml(it.name)}</td>`;
      let td = document.createElement('td'); td.appendChild(typeSel); tr.appendChild(td);
      td = document.createElement('td'); td.appendChild(dmgIn); tr.appendChild(td);
      td = document.createElement('td'); td.appendChild(attrIn); tr.appendChild(td);
      td = document.createElement('td'); td.appendChild(traitsIn); tr.appendChild(td);
      td = document.createElement('td'); td.appendChild(slotsIn); tr.appendChild(td);
      td = document.createElement('td'); td.appendChild(slotBonusIn); tr.appendChild(td);
      td = document.createElement('td'); td.appendChild(avIn); tr.appendChild(td);
      td = document.createElement('td'); td.appendChild(notesIn); tr.appendChild(td);
      td = document.createElement('td'); td.className='right'; td.appendChild(costIn); tr.appendChild(td);
      td = document.createElement('td'); td.className='right'; td.appendChild(del); tr.appendChild(td);
      cbody.appendChild(tr);
    }
    // Catalog import/export/reset
    const expCat = document.getElementById('exportCatalog');
    const impCat = document.getElementById('importCatalogFile');
    const resetCat = document.getElementById('resetCatalog');
    if (expCat) expCat.onclick = ()=>{ download('catalog.json', JSON.stringify(state.catalog, null, 2)); };
    if (impCat) impCat.onchange = (e)=>{
      const f = e.target.files?.[0]; if (!f) return;
      const rd = new FileReader(); rd.onload = () => { try { state.catalog = JSON.parse(rd.result); saveState(); } catch(e){ alert('Invalid JSON'); } }; rd.readAsText(f);
    };
    if (resetCat) resetCat.onclick = ()=>{ if (confirm('Reset catalog to seed list?')) { state.catalog = [...DEFAULT_ITEMS, ...SEED_ITEMS]; saveState(); } };
    // Bulk CSV hook
    const bulk = document.getElementById('bulkCsv');
    const applyBulk = document.getElementById('applyBulk');
    if (applyBulk) applyBulk.onclick = () => {
      const txt = (bulk?.value||'').trim(); if (!txt) return;
      const rows = txt.split(/\n+/).map(r=>r.split(/\s*,\s*/));
      for (const r of rows) {
        const [name,type,cost,dmg,attr,traits,slots,slotBonus,av,notes] = r;
        if (!name) continue;
        const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
        let it = state.catalog.find(i=>i.name.toLowerCase()===name.toLowerCase()||i.id===id);
        if (!it) { it = { id, name, type: (type||'equipment').toLowerCase(), cost: 0 }; state.catalog.push(it); }
        if (type) it.type = type.toLowerCase();
        if (cost!==undefined && cost!=='') it.cost = Number(cost)||0;
        if (dmg!==undefined) it.dmg = dmg||'';
        if (attr!==undefined) it.attr = attr||'';
        if (traits!==undefined) it.traits = traits||'';
        if (slots!==undefined && slots!=='') it.slots = Number(slots)||0;
        if (slotBonus!==undefined && slotBonus!=='') it.slotBonus = Number(slotBonus)||0;
        if (av!==undefined && av!=='') it.armorVal = Number(av)||0;
        if (notes!==undefined) it.notes = notes||'';
      }
      saveState();
    };
  }

  // Catalog selects
  const weapons = state.catalog.filter(i => i.type==='weapon');
  const equips = state.catalog.filter(i => i.type==='equipment' || i.type==='armor');
  setOptions(el('addWeaponSel'), weapons);
  setOptions(el('addEquipSel'), equips);
}

function tag(text) { const span = document.createElement('span'); span.className='tag'; span.textContent=text; return span; }
function escapeHtml(s) { return (s||'').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])); }
function setOptions(sel, list) {
  sel.innerHTML = '';
  list.forEach(i => {
    const o = document.createElement('option');
    o.value = i.id;
    const info = [];
    info.push(`${Number(i.cost||0)}g`);
    if (i.type === 'weapon') {
      if (i.dmg) info.push(i.dmg);
      if (i.attr) info.push(i.attr);
    }
    if (i.type === 'armor' && i.armorVal != null) info.push(`AV:${i.armorVal}`);
    if (i.slots != null) info.push(`Slots:${i.slots}`);
    const bonusText = formatSlotBonus(i.slotBonus || 0);
    if (bonusText) info.push(bonusText);
    o.textContent = `${i.name} (${info.join(', ')})`;
    sel.appendChild(o);
  });
}

  function fillEditor(c) {
  // Auto-derive armor if enabled
  if (state.settings && state.settings.autoArmor) {
    const av = (function(){
      let maxAv = 0; for (const e of c.equipment||[]) { const it = resolveItem(e.itemId); if (it && it.type==='armor' && (it.armorVal||0) > maxAv) maxAv = it.armorVal||0; } return maxAv;
    })();
    c.armor = av;
  }
  el('edName').value = c.name||'';
  el('edType').value = c.type||'';
  el('edArmor').value = c.armor||0;
  el('edHP').value = c.hp||0;
    const showStat = (key) => {
      // If using a preset and this stat is Unset, display blank in the input
      if (c.statTemplate && c.statTemplate.id && (c.statTemplate.assignments?.[key] == null || !Number.isFinite(Number(c.statTemplate.assignments[key])))) {
        return '';
      }
      const v = Number(c.stats?.[key]);
      return Number.isFinite(v) ? v : '';
    };
    el('edAgi').value = showStat('agi');
    el('edPre').value = showStat('pre');
    el('edStr').value = showStat('str');
    el('edTou').value = showStat('tou');
  el('edFeats').value = (c.feats||[]).join('\n');
  el('edFlaws').value = (c.flaws||[]).join('\n');
  el('edClean').value = c.scrolls?.clean || 0;
  el('edUnclean').value = c.scrolls?.unclean || 0;
  el('edNotes').value = c.notes || '';
  el('edPoints').textContent = charPoints(c);
  const autoCb = document.getElementById('autoArmor'); if (autoCb) autoCb.checked = !!(state.settings && state.settings.autoArmor);
  const slotsInfo = slotUsage(c);
  const slotsEl = document.getElementById('edSlots');
  if (slotsEl) slotsEl.textContent = `${slotsInfo.used}/${slotsInfo.total}`;
  const slotsBadge = document.getElementById('edSlotsBadge');
  if (slotsBadge) {
    slotsBadge.classList.toggle('warn', slotsInfo.used > slotsInfo.total);
    slotsBadge.title = `Base ${slotsInfo.base}, Bonus ${slotsInfo.bonus}`;
  }

  renderStatTemplate(c);

  // weapons
  const listW = el('edWeapons'); listW.innerHTML = '';
  if (!listW) return;
  if (!Array.isArray(c.weapons) || c.weapons.length === 0) {
    const empty = document.createElement('div'); empty.className='muted small'; empty.textContent = 'None'; listW.appendChild(empty);
  } else {
    c.weapons.forEach((w, idx) => {
      const it = resolveItem(w.itemId); if (!it) return;
      const row = document.createElement('div'); row.className='row';
      row.innerHTML = `<span>${escapeHtml(it.name)}</span><span class="space"></span><span class="small">${escapeHtml(summarizeItem(it))} · ${it.cost} g</span>`;
      const rm = document.createElement('button'); rm.className='ghost'; rm.textContent='Remove'; rm.onclick=()=>{ c.weapons.splice(idx,1); addToStash(it.id,1); saveState(); };
      row.appendChild(rm); listW.appendChild(row);
    });
  }

  // equipment categories
  const equipGroups = { armor: [], shield: [], helm: [], other: [] };
  (Array.isArray(c.equipment) ? c.equipment : []).forEach((entry, idx) => {
    const item = resolveItem(entry.itemId);
    if (!item) return;
    if (item.type === 'armor') {
      if (isShieldItem(item)) equipGroups.shield.push({ item, idx });
      else if (isHelmetItem(item)) equipGroups.helm.push({ item, idx });
      else equipGroups.armor.push({ item, idx });
    } else {
      equipGroups.other.push({ item, idx });
    }
  });

  const renderEquipCategory = (containerId, entries) => {
    const elTarget = el(containerId);
    if (!elTarget) return;
    elTarget.innerHTML = '';
    if (!entries.length) {
      const empty = document.createElement('div'); empty.className='muted small'; empty.textContent = 'None'; elTarget.appendChild(empty);
      return;
    }
    entries.forEach(({ item, idx }) => {
      const row = document.createElement('div'); row.className='row';
      row.innerHTML = `<span>${escapeHtml(item.name)}</span><span class="space"></span><span class="small">${escapeHtml(summarizeItem(item))} · ${item.cost} g</span>`;
      const rm = document.createElement('button'); rm.className='ghost'; rm.textContent='Remove'; rm.onclick = () => {
        c.equipment.splice(idx,1);
        addToStash(item.id,1);
        saveState();
      };
      row.appendChild(rm); elTarget.appendChild(row);
    });
  };

  renderEquipCategory('edArmorList', equipGroups.armor);
  renderEquipCategory('edShieldList', equipGroups.shield);
  renderEquipCategory('edHelmList', equipGroups.helm);
  renderEquipCategory('edEquip', equipGroups.other);

  // personal stash
  const packList = el('edPack');
  if (packList) {
    packList.innerHTML = '';
    const pack = Array.isArray(c.pack) ? c.pack : [];
    if (!pack.length) {
      const empty = document.createElement('div'); empty.className='muted small'; empty.textContent = 'Empty'; packList.appendChild(empty);
    } else {
      pack.forEach((itemId, packIdx) => {
        const item = resolveItem(itemId);
        if (!item) return;
        const row = document.createElement('div'); row.className='row';
        row.innerHTML = `<span>${escapeHtml(item.name)}</span><span class="space"></span><span class="small">${escapeHtml(summarizeItem(item))} · ${item.cost} g</span>`;
        const equipBtn = document.createElement('button'); equipBtn.className='ghost'; equipBtn.textContent='Equip'; equipBtn.onclick = () => { equipFromPack(c, itemId, packIdx); };
        const returnBtn = document.createElement('button'); returnBtn.className='ghost'; returnBtn.textContent='Return'; returnBtn.onclick = () => { removeFromPack(c, itemId); addToStash(item.id,1); saveState(); };
        row.appendChild(equipBtn); row.appendChild(returnBtn); packList.appendChild(row);
      });
    }
  }
}

// =====================
// Event wiring
// =====================
el('wbName').addEventListener('input', (e)=>{ state.warband.name = e.target.value; saveState(); });
el('wbLimit').addEventListener('input', (e)=>{ state.warband.limit = Number(e.target.value)||0; render(); saveState(); });

el('addChar').onclick = () => {
  const name = el('charName').value.trim();
  const c = newCharacter(name || undefined);
  state.chars.push(c); state.selectedId = c.id; el('charName').value=''; saveState();
};
el('randChar').onclick = () => {
  const c = newCharacter();
  // Simple random stats around 0
  c.stats.agi = [-1,0,0,1][Math.floor(Math.random()*4)];
  c.stats.pre = [-1,0,0,1][Math.floor(Math.random()*4)];
  c.stats.str = [-1,0,0,1,1][Math.floor(Math.random()*5)];
  c.stats.tou = [0,0,1,1][Math.floor(Math.random()*4)];
  state.chars.push(c); state.selectedId = c.id; saveState();
};

// Editor bindings
function bindEditorInput(id, apply) { el(id).addEventListener('input', (e)=>{ const c=state.chars.find(x=>x.id===state.selectedId); if(!c) return; apply(c, e); saveState(); }); }
bindEditorInput('edName', (c,e)=> c.name = e.target.value);
bindEditorInput('edType', (c,e)=> c.type = e.target.value);
bindEditorInput('edArmor', (c,e)=> c.armor = Number(e.target.value)||0);
bindEditorInput('edHP', (c,e)=> c.hp = Number(e.target.value)||0);
bindEditorInput('edFeats', (c,e)=> c.feats = splitLines(e.target.value));
bindEditorInput('edFlaws', (c,e)=> c.flaws = splitLines(e.target.value));
bindEditorInput('edClean', (c,e)=> c.scrolls.clean = Number(e.target.value)||0);
bindEditorInput('edUnclean', (c,e)=> c.scrolls.unclean = Number(e.target.value)||0);
bindEditorInput('edNotes', (c,e)=> c.notes = e.target.value);

function bindCustomStatChange(id, key) {
  const input = el(id);
  if (!input) return;
  input.addEventListener('change', (e) => {
    const c = state.chars.find(x => x.id === state.selectedId);
    if (!c) return;
    const tmpl = c.statTemplate;
    const templateActive = !!(tmpl && ((tmpl.draft && tmpl.draft.id) || tmpl.id));
    if (templateActive) {
      const current = Number(c.stats?.[key]);
      e.target.value = Number.isFinite(current) ? current : '';
      return;
    }
    const val = Number(e.target.value);
    c.stats[key] = Number.isFinite(val) ? val : 0;
    saveState();
  });
}

bindCustomStatChange('edAgi', 'agi');
bindCustomStatChange('edPre', 'pre');
bindCustomStatChange('edStr', 'str');
bindCustomStatChange('edTou', 'tou');
// Auto armor toggle
document.getElementById('autoArmor').addEventListener('change', (e)=>{ state.settings = state.settings||{}; state.settings.autoArmor = !!e.target.checked; saveState(); });

// Add weapons/equipment from selects
el('addWeaponBtn').onclick = () => { const id = el('addWeaponSel').value; if(!id) return; const c=state.chars.find(x=>x.id===state.selectedId); if(!c) return; if(removeFromStash(id,1)) c.weapons.push({ itemId:id }); else c.weapons.push({ itemId:id }); saveState(); };
el('addEquipBtn').onclick = () => { const id = el('addEquipSel').value; if(!id) return; const c=state.chars.find(x=>x.id===state.selectedId); if(!c) return; if(removeFromStash(id,1)) c.equipment.push({ itemId:id }); else c.equipment.push({ itemId:id }); saveState(); };

// Stash operations
el('addItem').onclick = () => {
  const name = el('newItemName').value.trim();
  const type = el('newItemType').value;
  const cost = Number(el('newItemCost').value)||0;
  if (!name) return alert('Enter item name');
  const it = ensureItemInCatalog(name, type, cost);
  addToStash(it.id, 1);
  el('newItemName').value = ''; el('newItemCost').value = '';
  saveState();
};

// Export/Import warband
el('exportBtn').onclick = () => {
  const data = JSON.stringify(state, null, 2);
  download('warband.json', data);
};
el('importFile').addEventListener('change', (e)=>{
  const f = e.target.files?.[0]; if (!f) return;
  const rd = new FileReader(); rd.onload = () => { try { state = JSON.parse(rd.result); saveState(); } catch(e){ alert('Invalid JSON'); } }; rd.readAsText(f);
});
el('clearAll').onclick = () => {
  if (!confirm('Clear all data?')) return;
  localStorage.removeItem(STORE_KEY);
  state = { warband:{name:'',limit:50}, catalog: JSON.parse(JSON.stringify(SEED_ITEMS)), stash: [], chars: [], selectedId: null, settings:{autoArmor:true}, catalogVersion: CATALOG_VERSION };
  normalizeState();
  render();
};

// Helpers
function splitLines(t) { return (t||'').split(/\n+/).map(s=>s.trim()).filter(Boolean); }
function summarizeItem(it){
  if (!it) return '';
  let parts = [];
  if (it.type === 'weapon') {
    if (it.dmg) parts.push(it.dmg);
    if (it.attr) parts.push(`(${it.attr})`);
    if (it.traits) parts.push(it.traits);
  } else if (it.type === 'armor') {
    if (it.armorVal!=null) parts.push(`AV:${it.armorVal}`);
    if (it.traits) parts.push(it.traits);
  } else {
    if (it.traits) parts.push(it.traits);
  }
  if (it.slots != null) parts.push(`${it.slots} slot${Math.abs(it.slots) === 1 ? '' : 's'}`);
  const bonusText = formatSlotBonus(it.slotBonus || 0);
  if (bonusText) parts.push(bonusText);
  if (it.notes) parts.push(it.notes);
  return parts.join(' · ');
}
function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type: 'application/json'}));
  a.download = name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

// Initialize defaults into catalog once
if (!state._seeded) {
  // merge DEFAULT_ITEMS by id if missing
  for (const it of DEFAULT_ITEMS) { if (!state.catalog.find(i=>i.id===it.id)) state.catalog.push(it); }
  for (const it of SEED_ITEMS) { if (!state.catalog.find(i=>i.id===it.id)) state.catalog.push(JSON.parse(JSON.stringify(it))); }
  state._seeded = true;
}

render();
