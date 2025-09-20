// =====================
// Data model & helpers
// =====================
const STORE_KEY = 'fp_warband_builder_v1';
const CATALOG_VERSION = 2;
const CATALOG_PATH = 'endtimes-catalog.json';

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
const TRAITS_PATH = 'traits.json';
const SCROLLS_PATH = 'scrolls.json';
const NAMES_PATH = 'names.json';
const SPELLCASTER_COST = 5;

let traitData = { feats: [], flaws: [] };
let traitsLoaded = false;
let scrollData = { clean: [], unclean: [] };
let scrollsLoaded = false;
let nameParts = { first: [], second: [] };
let namesLoaded = false;
const FALLBACK_FIRST = ['Nohr', 'Ash', 'Saint', 'Dire'];
const FALLBACK_SECOND = ['the Wanderer', 'the Dire', 'the Returned', 'the Merciful'];
let seedCatalog = [];
let catalogLoaded = false;
let stashFilter = 'all';

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

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
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

function getSelectedChar() {
  return state.chars.find((c) => c.id === state.selectedId) || null;
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

function loadCatalogData() {
  fetch(CATALOG_PATH)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Failed to load catalog: ${res.status}`))))
    .then((data) => {
      seedCatalog = Array.isArray(data) ? data : [];
      catalogLoaded = true;
      syncCatalogWithSeed();
      normalizeState();
      render();
    })
    .catch((err) => {
      console.error(err);
      catalogLoaded = true;
      syncCatalogWithSeed();
      normalizeState();
      render();
    });
}

function syncCatalogWithSeed() {
  if (!catalogLoaded) return;
  const seeds = Array.isArray(seedCatalog) ? seedCatalog : [];
  const seedIds = new Set(seeds.filter((item) => item && item.id).map((item) => item.id));

  if (!Array.isArray(state.catalog)) {
    state.catalog = seeds.map((item) => JSON.parse(JSON.stringify(item)));
    state.catalogVersion = CATALOG_VERSION;
    return;
  }

  if (state.catalogVersion !== CATALOG_VERSION) {
    const custom = state.catalog.filter((item) => item && !seedIds.has(item.id));
    state.catalog = [
      ...seeds.map((item) => JSON.parse(JSON.stringify(item))),
      ...custom,
    ];
    state.catalogVersion = CATALOG_VERSION;
    return;
  }

  const existingById = new Map(state.catalog.filter((item) => item && item.id).map((item) => [item.id, item]));
  seeds.forEach((seed) => {
    if (!seed || !seed.id) return;
    const current = existingById.get(seed.id);
    if (!current) {
      state.catalog.push(JSON.parse(JSON.stringify(seed)));
    } else {
      Object.assign(current, JSON.parse(JSON.stringify(seed)));
    }
  });
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

function loadTraitData() {
  fetch(TRAITS_PATH)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Failed to load traits: ${res.status}`))))
    .then((data) => {
      traitData = {
        feats: Array.isArray(data?.feats) ? data.feats : [],
        flaws: Array.isArray(data?.flaws) ? data.flaws : [],
      };
      traitsLoaded = true;
      render();
    })
    .catch((err) => {
      console.error(err);
      traitsLoaded = true;
    });
}

function loadScrollData() {
  fetch(SCROLLS_PATH)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Failed to load scrolls: ${res.status}`))))
    .then((data) => {
      scrollData = {
        clean: Array.isArray(data?.clean) ? data.clean : [],
        unclean: Array.isArray(data?.unclean) ? data.unclean : [],
      };
      scrollsLoaded = true;
      render();
    })
    .catch((err) => {
      console.error(err);
      scrollsLoaded = true;
    });
}

function loadNameData() {
  fetch(NAMES_PATH)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Failed to load names: ${res.status}`))))
    .then((data) => {
      if (data && Array.isArray(data.first) && Array.isArray(data.second)) {
        nameParts = {
          first: data.first.filter(Boolean),
          second: data.second.filter(Boolean),
        };
      }
      namesLoaded = true;
    })
    .catch((err) => {
      console.error(err);
      namesLoaded = true;
    });
}

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || null; } catch { return null; }
}

function normalizeState() {
  state = state || {};
  state.warband = state.warband || { name: '', limit: 50 };
  state.catalogVersion = Number.isFinite(state.catalogVersion) ? state.catalogVersion : 0;
  state.catalog = Array.isArray(state.catalog) ? state.catalog : [];
  syncCatalogWithSeed();
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
  let mageOwner = null;
  state.chars.forEach(ch => {
    if (!ch || typeof ch !== 'object') return;
    ch.weapons = Array.isArray(ch.weapons) ? ch.weapons.filter(w => w && validIds.has(w.itemId)) : [];
    ch.equipment = Array.isArray(ch.equipment) ? ch.equipment.filter(e => e && validIds.has(e.itemId)) : [];
    ch.pack = Array.isArray(ch.pack) ? ch.pack.filter(id => validIds.has(id)) : [];
    if (!Array.isArray(ch.feats)) {
      ch.feats = Array.isArray(ch.feats) ? ch.feats : splitLines(String(ch.feats || ''));
    }
    if (!Array.isArray(ch.flaws)) {
      ch.flaws = Array.isArray(ch.flaws) ? ch.flaws : splitLines(String(ch.flaws || ''));
    }
    ch.isMage = !!ch.isMage;
    ch.tragedies = Number(ch.tragedies || 0);
    if (ch.tragedies < 0) ch.tragedies = 0;
    ensureTraitArrays(ch);
    ensureScrollLibrary(ch);
    ch.experience = Number(ch.experience || 0);
    if (ch.experience < 0) ch.experience = 0;
    if ('type' in ch) delete ch.type;
    if (ch.isMage) {
      if (mageOwner && mageOwner !== ch.id) {
        ch.isMage = false;
      } else {
        mageOwner = ch.id;
      }
    }
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
  catalog: [],
  stash: [],
  chars: [],
  selectedId: null,
  settings: { autoArmor: true },
  catalogVersion: 0,
};

normalizeState();

// =====================
// Catalog helpers
// =====================
function resolveItem(itemId) { return state.catalog.find(i => i.id === itemId); }
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
    name: name || randomName(),
    stats: { agi: 0, pre: 0, str: 0, tou: 0 },
    armor: 0,
    hp: 8,
    experience: 0,
    feats: [],
    flaws: [],
    weapons: [], // [{itemId}]
    equipment: [], // [{itemId}]
    scrolls: { clean: 0, unclean: 0 },
    notes: '',
    pack: [],
    isMage: false,
    tragedies: 0,
    mageScrolls: { clean: [], unclean: [] },
  };
  ensureStatTemplate(char, STAT_SETS[0].id);
  return char;
}

function charPoints(c) {
  let gold = 0;
  for (const w of c.weapons || []) { const it = resolveItem(w.itemId); if (it) gold += Number(it.cost || 0); }
  for (const e of c.equipment || []) { const it = resolveItem(e.itemId); if (it) gold += Number(it.cost || 0); }
  for (const pid of c.pack || []) { const it = resolveItem(pid); if (it) gold += Number(it.cost || 0); }
  if (c.isMage) gold += SPELLCASTER_COST;
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

function randomName() {
  const first = nameParts.first.length ? nameParts.first : FALLBACK_FIRST;
  const second = nameParts.second.length ? nameParts.second : FALLBACK_SECOND;
  return `${randomFrom(first)} ${randomFrom(second)}`.replace(/\s+/g, ' ').trim();
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
      saveState();
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

function ensureTraitArrays(char) {
  if (!Array.isArray(char.feats)) char.feats = [];
  if (!Array.isArray(char.flaws)) char.flaws = [];
}

function updateTraitDetails(targetId, trait) {
  const target = el(targetId);
  if (!target) return;
  if (!trait) {
    target.textContent = '';
    return;
  }
  const rangeText = `${trait.range.min}-${trait.range.max}`;
  const desc = trait.description ? trait.description : 'No description provided.';
  target.textContent = `Roll ${rangeText}: ${desc}`;
}

function applyTrait(type, trait) {
  const char = getSelectedChar();
  if (!char || !trait) return;
  const key = type === 'feats' ? 'feats' : 'flaws';
  ensureTraitArrays(char);
  if (!char[key].some((name) => name.toLowerCase() === trait.name.toLowerCase())) {
    char[key].push(trait.name);
  }
  renderTraitLists(char);
  saveState();
}

function renderTraitLists(char) {
  const configs = [
    { type: 'feats', key: 'feats', containerId: 'featList', empty: 'No feats selected.' },
    { type: 'flaws', key: 'flaws', containerId: 'flawList', empty: 'No flaws selected.' },
  ];

  configs.forEach(({ type, key, containerId, empty }) => {
    const container = el(containerId);
    if (!container) return;

    if (!char) {
      container.innerHTML = '<div class="muted small">Select a character to manage traits.</div>';
      return;
    }

    ensureTraitArrays(char);
    const names = Array.isArray(char[key]) ? char[key] : [];

    if (!names.length) {
      container.innerHTML = `<div class="muted small">${empty}</div>`;
      return;
    }

    container.innerHTML = '';

    names.forEach((name, idx) => {
      const item = document.createElement('div');
      item.className = 'trait-item';

      const header = document.createElement('header');
      const title = document.createElement('span');
      title.textContent = name;
      header.appendChild(title);

      const trait = (traitData?.[type] || []).find((t) => t.name.toLowerCase() === name.toLowerCase()) || null;
      if (trait && trait.range) {
        const rangeTag = document.createElement('span');
        rangeTag.className = 'tag';
        rangeTag.textContent = `${trait.range.min}-${trait.range.max}`;
        header.appendChild(rangeTag);
      }

      const removeBtn = document.createElement('button');
      removeBtn.className = 'ghost';
      removeBtn.type = 'button';
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = () => {
        char[key].splice(idx, 1);
        saveState();
      };
      header.appendChild(removeBtn);

      item.appendChild(header);

      const desc = document.createElement('div');
      desc.className = 'trait-desc';
      desc.textContent = trait?.description || 'No description available.';
      item.appendChild(desc);

      container.appendChild(item);
    });
  });
}

function renderTraitControls() {
  const config = [
    { type: 'feats', pickerId: 'featPicker', addId: 'addFeatBtn', randId: 'randFeatBtn', detailsId: 'featDetails' },
    { type: 'flaws', pickerId: 'flawPicker', addId: 'addFlawBtn', randId: 'randFlawBtn', detailsId: 'flawDetails' },
  ];
  const selectedChar = getSelectedChar();

  config.forEach(({ type, pickerId, addId, randId, detailsId }) => {
    const picker = el(pickerId);
    const addBtn = el(addId);
    const randBtn = el(randId);
    const details = el(detailsId);
    const list = traitData?.[type] || [];

    if (!picker || !addBtn || !randBtn || !details) return;

    const disable = !selectedChar;

    if (!list.length) {
      picker.innerHTML = `<option value="">${traitsLoaded ? 'Unavailable' : 'Loading...'}</option>`;
      picker.disabled = true;
      addBtn.disabled = true;
      randBtn.disabled = true;
      details.textContent = traitsLoaded ? 'Traits unavailable.' : 'Loading...';
      return;
    }

    if (picker.dataset.version !== String(list.length)) {
      const prevValue = picker.value;
      const options = ['<option value="">Select...</option>', ...list.map((trait) => `<option value="${trait.id}">${trait.name}</option>`)].join('');
      picker.innerHTML = options;
      picker.dataset.version = String(list.length);
      if (prevValue && list.find((trait) => trait.id === prevValue)) {
        picker.value = prevValue;
      } else {
        picker.value = '';
      }
    }

    picker.disabled = disable;
    addBtn.disabled = disable;
    randBtn.disabled = disable;

    if (!picker.dataset.bound) {
      picker.addEventListener('change', () => {
        const pool = traitData?.[type] || [];
        const trait = pool.find((t) => t.id === picker.value) || null;
        updateTraitDetails(detailsId, trait);
      });
      addBtn.addEventListener('click', () => {
        const pool = traitData?.[type] || [];
        const trait = pool.find((t) => t.id === picker.value) || null;
        if (trait) applyTrait(type, trait);
      });
      randBtn.addEventListener('click', () => {
        const char = getSelectedChar();
        if (!char) return;
        const pool = traitData?.[type] || [];
        if (!pool.length) return;
        const existing = new Set((Array.isArray(char[type]) ? char[type] : []).map((name) => name.toLowerCase()));
        const available = pool.filter((trait) => !existing.has(trait.name.toLowerCase()));
        const trait = available.length ? randomFrom(available) : randomFrom(pool);
        picker.value = trait.id;
        updateTraitDetails(detailsId, trait);
        applyTrait(type, trait);
      });
      picker.dataset.bound = 'true';
    }

    if (disable) {
      picker.value = '';
      details.textContent = 'Select a character to manage traits.';
      return;
    }

    updateTraitDetails(detailsId, list.find((t) => t.id === picker.value) || null);
  });
}

function ensureScrollLibrary(char) {
  if (!char || typeof char !== 'object') return;
  if (!char.mageScrolls || typeof char.mageScrolls !== 'object') {
    char.mageScrolls = { clean: [], unclean: [] };
  }
  ['clean', 'unclean'].forEach((key) => {
    if (!Array.isArray(char.mageScrolls[key])) {
      const raw = char.mageScrolls[key];
      if (typeof raw === 'string') {
        char.mageScrolls[key] = splitLines(raw);
      } else {
        char.mageScrolls[key] = Array.isArray(raw) ? raw.filter(Boolean) : [];
      }
    }
  });
}

function updateScrollDetails(targetId, scroll) {
  const target = el(targetId);
  if (!target) return;
  if (!scroll) {
    target.textContent = '';
    return;
  }
  const rangeText = `${scroll.range.min}-${scroll.range.max}`;
  target.textContent = `Roll ${rangeText}: ${scroll.description || 'No description provided.'}`;
}

function applyScroll(type, scroll) {
  const char = getSelectedChar();
  if (!char || !scroll || !char.isMage) return;
  ensureScrollLibrary(char);
  const bucket = char.mageScrolls[type];
  if (!bucket.some((name) => name.toLowerCase() === scroll.name.toLowerCase())) {
    bucket.push(scroll.name);
  }
  renderScrollLists(char);
  saveState();
}

function renderScrollLists(char) {
  const configs = [
    { type: 'clean', containerId: 'cleanScrollList', empty: 'No clean scrolls prepared.' },
    { type: 'unclean', containerId: 'uncleanScrollList', empty: 'No unclean scrolls prepared.' },
  ];

  configs.forEach(({ type, containerId, empty }) => {
    const container = el(containerId);
    if (!container) return;

    if (!char) {
      container.innerHTML = '<div class="muted small">Select a character to manage scrolls.</div>';
      return;
    }

    if (!char.isMage) {
      container.innerHTML = '<div class="muted small">Only mages can prepare scrolls.</div>';
      return;
    }

    ensureScrollLibrary(char);
    const list = char.mageScrolls[type] || [];

    if (!list.length) {
      container.innerHTML = `<div class="muted small">${empty}</div>`;
      return;
    }

    container.innerHTML = '';
    list.forEach((name, idx) => {
      const item = document.createElement('div');
      item.className = 'trait-item';

      const header = document.createElement('header');
      const title = document.createElement('span');
      title.textContent = name;
      header.appendChild(title);

      const scroll = (scrollData?.[type] || []).find((s) => s.name.toLowerCase() === name.toLowerCase()) || null;
      if (scroll) {
        const rangeTag = document.createElement('span');
        rangeTag.className = 'tag';
        rangeTag.textContent = `${scroll.range.min}-${scroll.range.max}`;
        header.appendChild(rangeTag);
      }

      const removeBtn = document.createElement('button');
      removeBtn.className = 'ghost';
      removeBtn.type = 'button';
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = () => {
        char.mageScrolls[type].splice(idx, 1);
        saveState();
      };
      header.appendChild(removeBtn);

      item.appendChild(header);

      const desc = document.createElement('div');
      desc.className = 'trait-desc';
      desc.textContent = scroll?.description || 'No description available.';
      item.appendChild(desc);

      container.appendChild(item);
    });
  });
}

function renderScrollControls() {
  const config = [
    { type: 'clean', pickerId: 'cleanScrollPicker', addId: 'addCleanScrollBtn', randId: 'randCleanScrollBtn', detailsId: 'cleanScrollDetails' },
    { type: 'unclean', pickerId: 'uncleanScrollPicker', addId: 'addUncleanScrollBtn', randId: 'randUncleanScrollBtn', detailsId: 'uncleanScrollDetails' },
  ];
  const selectedChar = getSelectedChar();

  config.forEach(({ type, pickerId, addId, randId, detailsId }) => {
    const picker = el(pickerId);
    const addBtn = el(addId);
    const randBtn = el(randId);
    const details = el(detailsId);
    const list = scrollData?.[type] || [];

    if (!picker || !addBtn || !randBtn || !details) return;

    const disable = !selectedChar || !selectedChar.isMage;

    if (!list.length) {
      picker.innerHTML = `<option value="">${scrollsLoaded ? 'Unavailable' : 'Loading...'}</option>`;
      picker.disabled = true;
      addBtn.disabled = true;
      randBtn.disabled = true;
      details.textContent = scrollsLoaded ? 'Scrolls unavailable.' : 'Loading...';
      return;
    }

    if (picker.dataset.version !== String(list.length)) {
      const prevValue = picker.value;
      const options = ['<option value="">Select...</option>', ...list.map((scroll) => `<option value="${scroll.id}">${scroll.name}</option>`)].join('');
      picker.innerHTML = options;
      picker.dataset.version = String(list.length);
      if (prevValue && list.find((scroll) => scroll.id === prevValue)) {
        picker.value = prevValue;
      } else {
        picker.value = '';
      }
    }

    picker.disabled = disable;
    addBtn.disabled = disable;
    randBtn.disabled = disable;

    if (!picker.dataset.bound) {
      picker.addEventListener('change', () => {
        const pool = scrollData?.[type] || [];
        const scroll = pool.find((s) => s.id === picker.value) || null;
        updateScrollDetails(detailsId, scroll);
      });
      addBtn.addEventListener('click', () => {
        const char = getSelectedChar();
        if (!char || !char.isMage) return;
        const pool = scrollData?.[type] || [];
        const scroll = pool.find((s) => s.id === picker.value) || null;
        if (scroll) applyScroll(type, scroll);
      });
      randBtn.addEventListener('click', () => {
        const char = getSelectedChar();
        if (!char || !char.isMage) return;
        const pool = scrollData?.[type] || [];
        if (!pool.length) return;
        ensureScrollLibrary(char);
        const existing = new Set((char.mageScrolls[type] || []).map((name) => name.toLowerCase()));
        const available = pool.filter((scroll) => !existing.has(scroll.name.toLowerCase()));
        const scroll = available.length ? randomFrom(available) : randomFrom(pool);
        picker.value = scroll.id;
        updateScrollDetails(detailsId, scroll);
        applyScroll(type, scroll);
      });
      picker.dataset.bound = 'true';
    }

    if (disable) {
      picker.value = '';
      details.textContent = selectedChar ? 'Only mages can prepare scrolls.' : 'Select a character to manage scrolls.';
      return;
    }

    const current = (scrollData?.[type] || []).find((s) => s.id === picker.value) || null;
    updateScrollDetails(detailsId, current);
  });
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
    const right = document.createElement('div');
    right.className = 'row';
    const slots = slotUsage(c);
    const slotTag = tag(`Slots ${slots.used}/${slots.total}`);
    if (slots.used > slots.total) slotTag.classList.add('warn');
    slotTag.title = `Base ${slots.base}, Bonus ${slots.bonus}`;
    const xpTag = tag(`XP ${Number(c.experience || 0)}`);
    right.appendChild(slotTag);
    right.appendChild(xpTag);
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
  if (selected) {
    fillEditor(selected);
  } else {
    renderTraitLists(null);
    renderScrollLists(null);
    const mageToggle = el('isMageToggle');
    if (mageToggle) {
      mageToggle.checked = false;
      mageToggle.disabled = true;
    }
    const tragediesInput = el('edTragedies');
    if (tragediesInput) {
      tragediesInput.value = 0;
      tragediesInput.disabled = true;
    }
    const tragediesLabel = el('tragediesLabel');
    if (tragediesLabel) tragediesLabel.style.display = 'none';
    const xpInput = el('edXP');
    if (xpInput) {
      xpInput.value = 0;
      xpInput.disabled = true;
    }
  }
  renderTraitControls();
  renderScrollControls();

  // Stash
  const filterSel = el('stashTypeFilter');
  if (filterSel) {
    if (filterSel.value !== stashFilter) filterSel.value = stashFilter;
    filterSel.onchange = (e) => {
      stashFilter = e.target.value || 'all';
      renderStashPicker();
    };
  }
  renderStashPicker();

  const stashList = el('stashList');
  if (stashList) {
    stashList.innerHTML = '';
    for (const row of state.stash) {
      const it = resolveItem(row.itemId);
      if (!it) continue;

      const card = document.createElement('div');
      card.className = 'stash-row';

      const header = document.createElement('div');
      header.className = 'stash-row-header';

      const infoBlock = document.createElement('div');
      infoBlock.className = 'stash-info';

      const nameEl = document.createElement('span');
      nameEl.className = 'stash-name';
      nameEl.textContent = it.name;
      infoBlock.appendChild(nameEl);

      const meta = document.createElement('div');
      meta.className = 'stash-meta';
      const typeSpan = document.createElement('span');
      typeSpan.textContent = capitalize(it.type || 'equipment');
      const qtySpan = document.createElement('span');
      qtySpan.textContent = `Qty ${row.qty}`;
      const costSpan = document.createElement('span');
      costSpan.textContent = `${it.cost} g`;
      meta.append(typeSpan, qtySpan, costSpan);
      infoBlock.appendChild(meta);

      header.appendChild(infoBlock);

      const controls = document.createElement('div');
      controls.className = 'stash-controls';

      const infoBtn = document.createElement('button');
      infoBtn.type = 'button';
      infoBtn.className = 'ghost info-btn';
      infoBtn.textContent = 'Info';
      controls.appendChild(infoBtn);

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
      controls.appendChild(useBtn);

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
      controls.appendChild(stowBtn);

      const addBtn = document.createElement('button');
      addBtn.className = 'ghost';
      addBtn.textContent = '+';
      addBtn.title = 'Increase qty';
      addBtn.onclick = () => { addToStash(it.id, 1); saveState(); };
      controls.appendChild(addBtn);

      const subBtn = document.createElement('button');
      subBtn.className = 'ghost';
      subBtn.textContent = '−';
      subBtn.title = 'Decrease qty';
      subBtn.onclick = () => { removeFromStash(it.id, 1); saveState(); };
      controls.appendChild(subBtn);

      header.appendChild(controls);
      card.appendChild(header);

      const details = document.createElement('div');
      details.className = 'stash-details';
      const infoText = summarizeItem(it);
      details.textContent = infoText || 'No additional info available.';
      card.appendChild(details);

      infoBtn.onclick = () => {
        const open = card.classList.toggle('open');
        infoBtn.classList.toggle('active', open);
      };

      stashList.appendChild(card);
    }
  }
  // Catalog selects
  const weapons = state.catalog.filter(i => i.type==='weapon');
  const equips = state.catalog.filter(i => i.type==='equipment' || i.type==='armor');
  setOptions(el('addWeaponSel'), weapons);
  setOptions(el('addEquipSel'), equips);
}

function renderStashPicker() {
  const select = el('stashItemSelect');
  const addBtn = el('stashAddBtn');
  if (!select || !addBtn) return;

  const prevValue = select.value;
  select.innerHTML = '';

  const filterSel = el('stashTypeFilter');
  if (filterSel && filterSel.value !== stashFilter) {
    filterSel.value = stashFilter;
  }

  if (!catalogLoaded) {
    select.disabled = true;
    addBtn.disabled = true;
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Loading catalog…';
    select.appendChild(option);
    return;
  }

  let items = Array.isArray(state.catalog) ? [...state.catalog] : [];
  if (stashFilter !== 'all') {
    items = items.filter((item) => (item.type || 'equipment') === stashFilter);
  }
  items.sort((a, b) => (a.type || '').localeCompare(b.type || '') || (a.name || '').localeCompare(b.name || ''));

  if (!items.length) {
    select.disabled = true;
    addBtn.disabled = true;
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No items available';
    select.appendChild(option);
    return;
  }

  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    const typeLabel = (item.type || 'equipment');
    const parts = [typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)];
    const summary = summarizeItem(item);
    if (summary) parts.push(summary);
    parts.push(`${Number(item.cost || 0)} g`);
    option.title = parts.join(' · ');
    select.appendChild(option);
  });

  const hasPrev = items.some((item) => item.id === prevValue);
  select.value = hasPrev ? prevValue : items[0].id;
  select.disabled = false;
  addBtn.disabled = false;
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
  const mageToggle = el('isMageToggle');
  if (mageToggle) {
    mageToggle.checked = !!c.isMage;
    mageToggle.disabled = false;
  }
  const tragediesInput = el('edTragedies');
  if (tragediesInput) {
    tragediesInput.value = Number(c.tragedies || 0);
    tragediesInput.disabled = !c.isMage;
  }
  const xpInput = el('edXP');
  if (xpInput) {
    xpInput.value = Number(c.experience || 0);
    xpInput.disabled = false;
  }
  const tragediesLabel = el('tragediesLabel');
  if (tragediesLabel) {
    tragediesLabel.style.display = c.isMage ? '' : 'none';
  }
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
  ensureTraitArrays(c);
  renderTraitLists(c);
  ensureScrollLibrary(c);
  renderScrollLists(c);

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
function bindEditorInput(id, apply) {
  const input = el(id);
  if (!input) return;
  input.addEventListener('input', (e)=>{ const c=state.chars.find(x=>x.id===state.selectedId); if(!c) return; apply(c, e); saveState(); });
}
bindEditorInput('edName', (c,e)=> c.name = e.target.value);
bindEditorInput('edArmor', (c,e)=> c.armor = Number(e.target.value)||0);
bindEditorInput('edHP', (c,e)=> c.hp = Number(e.target.value)||0);
bindEditorInput('edNotes', (c,e)=> c.notes = e.target.value);
bindEditorInput('edXP', (c,e)=> {
  const val = Math.max(0, Number(e.target.value) || 0);
  c.experience = val;
  e.target.value = val;
});

function bindCustomStatChange(id, key) {
  const input = el(id);
  if (!input) return;
  input.addEventListener('change', (e) => {
    const c = getSelectedChar();
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

const mageToggleCtrl = el('isMageToggle');
if (mageToggleCtrl) {
  mageToggleCtrl.addEventListener('change', (e) => {
    const char = getSelectedChar();
    if (!char) {
      e.target.checked = false;
      return;
    }
    if (e.target.checked) {
      const otherMage = state.chars.find((ch) => ch.id !== char.id && ch.isMage);
      if (otherMage) {
        alert('Only one spellcaster may serve the warband at a time.');
        e.target.checked = false;
        return;
      }
      char.isMage = true;
      char.tragedies = Number(char.tragedies || 0);
      ensureScrollLibrary(char);
    } else {
      char.isMage = false;
    }
    saveState();
  });
}

const tragediesCtrl = el('edTragedies');
if (tragediesCtrl) {
  tragediesCtrl.addEventListener('change', (e) => {
    const char = getSelectedChar();
    const value = Math.max(0, Number(e.target.value) || 0);
    if (!char || !char.isMage) {
      e.target.value = char ? Number(char.tragedies || 0) : 0;
      return;
    }
    char.tragedies = value;
    e.target.value = value;
    saveState();
  });
}

// Auto armor toggle
document.getElementById('autoArmor').addEventListener('change', (e)=>{ state.settings = state.settings||{}; state.settings.autoArmor = !!e.target.checked; saveState(); });

// Add weapons/equipment from selects
el('addWeaponBtn').onclick = () => { const id = el('addWeaponSel').value; if(!id) return; const c=state.chars.find(x=>x.id===state.selectedId); if(!c) return; if(removeFromStash(id,1)) c.weapons.push({ itemId:id }); else c.weapons.push({ itemId:id }); saveState(); };
el('addEquipBtn').onclick = () => { const id = el('addEquipSel').value; if(!id) return; const c=state.chars.find(x=>x.id===state.selectedId); if(!c) return; if(removeFromStash(id,1)) c.equipment.push({ itemId:id }); else c.equipment.push({ itemId:id }); saveState(); };

const stashAddBtn = el('stashAddBtn');
if (stashAddBtn) {
  stashAddBtn.onclick = () => {
    const select = el('stashItemSelect');
    if (!select) return;
    const id = select.value;
    if (!id) return;
    addToStash(id, 1);
    saveState();
  };
}

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
  state = { warband:{name:'',limit:50}, catalog: [], stash: [], chars: [], selectedId: null, settings:{autoArmor:true}, catalogVersion: 0 };
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

loadCatalogData();
loadTraitData();
loadScrollData();
loadNameData();
render();
