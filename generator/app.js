// =====================
// Data model & helpers
// =====================
const STORE_KEY = "fp_warband_builder_v1";
const CATALOG_VERSION = 2;
const CATALOG_PATH = "endtimes-catalog.json";

const STAT_SETS = [
  { id: "setA", label: "+3, +1, 0, -3", values: [3, 1, 0, -3] },
  { id: "setB", label: "+2, +2, -1, -2", values: [2, 2, -1, -2] },
];
const STAT_KEYS = [
  { key: "agi", label: "Agility" },
  { key: "pre", label: "Presence" },
  { key: "str", label: "Strength" },
  { key: "tou", label: "Toughness" },
];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const TRAITS_PATH = "traits.json";
const SCROLLS_PATH = "scrolls.json";
const NAMES_PATH = "names.json";
const PERCHANCE_PATH = "perchance.txt";
const SPELLCASTER_COST = 5;

const WARBAND_IMPORT_FALLBACKS = {
  color: ["Crimson", "Umber", "Ivory", "Sable", "Verdant", "Ochre"],
  animal: ["Raven", "Goat", "Serpent", "Wolf", "Rat", "Moth"],
};

let traitData = { feats: [], flaws: [] };
let traitsLoaded = false;
let scrollData = { clean: [], unclean: [] };
let scrollsLoaded = false;
let nameParts = { first: [], second: [] };
let namesLoaded = false;
let warbandNameData = null;
let warbandNamePromise = null;
const FALLBACK_FIRST = ["Nohr", "Ash", "Saint", "Dire"];
const FALLBACK_SECOND = [
  "the Wanderer",
  "the Dire",
  "the Returned",
  "the Merciful",
];
let seedCatalog = [];
let catalogLoaded = false;
let stashFilter = "all";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function setStatInputsReadonly(locked) {
  ["edAgi", "edPre", "edStr", "edTou"].forEach((id) => {
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
  const label = Math.abs(num) === 1 ? "slot" : "slots";
  return `${num > 0 ? "+" : ""}${num} ${label}`;
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function countValues(values) {
  const counts = {};
  values.forEach((v) => {
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
    if (raw == null || raw === "") {
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
    if (raw == null || raw === "") continue;
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
    if (raw == null || raw === "") {
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
    if (raw == null || raw === "") return;
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
    if (raw == null || raw === "") return false;
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
  const currentValues = STAT_KEYS.map(({ key }) =>
    Number(char.stats[key] || 0)
  );
  const currentCounts = countValues(currentValues);
  for (const set of STAT_SETS) {
    const counts = countValues(set.values);
    const keys = new Set([
      ...Object.keys(counts),
      ...Object.keys(currentCounts),
    ]);
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
  const set = STAT_SETS.find((s) => s.id === setId);
  if (!set) return null;
  const counts = countValues(set.values);
  const assignments = {};
  const detected = detectStatSetId(char);
  const seedUsable =
    seedAssignments &&
    assignmentsValid(seedAssignments, counts) &&
    STAT_KEYS.some(
      ({ key }) => seedAssignments[key] != null && seedAssignments[key] !== ""
    );

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
    if (raw == null || raw === "") {
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
    const nextValKey = Object.keys(remaining).find((k) => remaining[k] > 0);
    const value =
      nextValKey != null ? Number(nextValKey) : Number(set.values[0]) || 0;
    assignments[key] = value;
    if (nextValKey != null) remaining[nextValKey] -= 1;
  });

  const locked = isAssignmentComplete(assignments, counts);
  return { assignments: cloneAssignments(assignments), counts, locked };
}

function loadCatalogData() {
  fetch(CATALOG_PATH)
    .then((res) =>
      res.ok
        ? res.json()
        : Promise.reject(new Error(`Failed to load catalog: ${res.status}`))
    )
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
  const seedIds = new Set(
    seeds.filter((item) => item && item.id).map((item) => item.id)
  );

  if (!Array.isArray(state.catalog)) {
    state.catalog = seeds.map((item) => JSON.parse(JSON.stringify(item)));
    state.catalogVersion = CATALOG_VERSION;
    return;
  }

  if (state.catalogVersion !== CATALOG_VERSION) {
    const custom = state.catalog.filter(
      (item) => item && !seedIds.has(item.id)
    );
    state.catalog = [
      ...seeds.map((item) => JSON.parse(JSON.stringify(item))),
      ...custom,
    ];
    state.catalogVersion = CATALOG_VERSION;
    return;
  }

  const existingById = new Map(
    state.catalog
      .filter((item) => item && item.id)
      .map((item) => [item.id, item])
  );
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
    char.statTemplate && char.statTemplate.id === setId
      ? char.statTemplate.assignments
      : null
  );
  if (!result) {
    delete char.statTemplate;
    return;
  }
  const prevLocked =
    char.statTemplate && char.statTemplate.id === setId
      ? !!char.statTemplate.locked
      : false;
  const locked = prevLocked
    ? prevLocked && isAssignmentComplete(result.assignments, result.counts)
    : result.locked;
  char.statTemplate = {
    id: setId,
    assignments: result.assignments,
    locked,
    draft: char.statTemplate?.draft,
  };
  updateStatsFromAssignments(char);
}

function loadTraitData() {
  fetch(TRAITS_PATH)
    .then((res) =>
      res.ok
        ? res.json()
        : Promise.reject(new Error(`Failed to load traits: ${res.status}`))
    )
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
    .then((res) =>
      res.ok
        ? res.json()
        : Promise.reject(new Error(`Failed to load scrolls: ${res.status}`))
    )
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
    .then((res) =>
      res.ok
        ? res.json()
        : Promise.reject(new Error(`Failed to load names: ${res.status}`))
    )
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

function ensureNameData() {
  return new Promise((resolve) => {
    if (namesLoaded) {
      resolve();
    } else {
      const checkLoaded = () => {
        if (namesLoaded) {
          resolve();
        } else {
          setTimeout(checkLoaded, 10);
        }
      };
      if (!namesLoaded) {
        loadNameData();
      }
      checkLoaded();
    }
  });
}

// =====================
// Level Up System
// =====================
function getRandomFlaw() {
  const flaws = traitData?.flaws || [];
  if (flaws.length === 0) return null;
  return randomFrom(flaws).name;
}

function getLevelUpCost() {
  const slowLearners = state.chars.filter(c => !c.isDead && c.flaws?.includes("Slow Learner")).length;
  return 5 + slowLearners;
}

function levelUpImproveStat(character, statName) {
  if (!character.stats[statName] && character.stats[statName] !== 0) return false;
  const cost = getLevelUpCost(); // Calculate cost BEFORE changes
  character.stats[statName]++;
  state.warband.experience -= cost;
  updateLevelUpButton();
  return true;
}

function levelUpRemoveInjury(character, injuryName) {
  const index = character.flaws.indexOf(injuryName);
  if (index === -1) return false;
  const cost = getLevelUpCost(); // Calculate cost BEFORE removing flaw
  character.flaws.splice(index, 1);
  state.warband.experience -= cost;
  updateLevelUpButton();
  return true;
}

function levelUpRerollFlaw(character, oldFlawName) {
  const index = character.flaws.indexOf(oldFlawName);
  if (index === -1) return false;
  const newFlaw = getRandomFlaw();
  if (!newFlaw) return false;
  const cost = getLevelUpCost(); // Calculate cost BEFORE making changes
  character.flaws[index] = newFlaw;
  state.warband.experience -= cost;
  updateLevelUpButton();
  return true;
}

function levelUpGainFeat(character, featName) {
  if (character.feats.includes(featName)) return false;
  const cost = getLevelUpCost(); // Calculate cost BEFORE making changes
  character.feats.push(featName);
  state.warband.experience -= cost;
  updateLevelUpButton();
  return true;
}

function levelUpResurrect(deadCharacterId) {
  const deadCharacter = state.chars.find(c => c.id === deadCharacterId && c.isDead);
  if (!deadCharacter) return false;

  const cost = getLevelUpCost(); // Calculate cost BEFORE resurrecting
  deadCharacter.isDead = false;
  const newFlaw = getRandomFlaw();
  if (newFlaw && !deadCharacter.flaws.includes(newFlaw)) {
    deadCharacter.flaws.push(newFlaw);
  }

  state.warband.experience -= cost;
  updateLevelUpButton();
  return true;
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || null;
  } catch {
    return null;
  }
}

function normalizeState() {
  state = state || {};
  state.warband = state.warband || { name: "", limit: 50, experience: 0 };
  // Ensure warband has experience field
  if (typeof state.warband.experience !== 'number') {
    state.warband.experience = 0;
  }
  state.catalogVersion = Number.isFinite(state.catalogVersion)
    ? state.catalogVersion
    : 0;
  state.catalog = Array.isArray(state.catalog) ? state.catalog : [];
  syncCatalogWithSeed();
  state.stash = Array.isArray(state.stash) ? state.stash : [];
  state.chars = Array.isArray(state.chars) ? state.chars : [];
  state.settings = state.settings || {};

  // Migration: Convert individual character XP to warband XP
  if (state.chars.length > 0 && state.warband.experience === 0) {
    let totalXP = 0;
    state.chars.forEach(char => {
      if (typeof char.experience === 'number' && char.experience > 0) {
        totalXP += char.experience;
        char.experience = 0; // Clear individual character XP
      }
    });
    if (totalXP > 0) {
      state.warband.experience = totalXP;
    }
  }
  const deprecatedIds = new Set([
    "armor-light",
    "armor-medium",
    "armor-heavy",
    "shield-item",
    "clean-scroll",
    "unclean-scroll",
    "bloodied-fists",
    "makeshift-weapon",
  ]);
  state.catalog = state.catalog.filter(
    (item) => item && !deprecatedIds.has(item.id)
  );
  state.catalog.forEach((item) => {
    if (!item.type) item.type = "equipment";
    if (item.slots == null) item.slots = item.type === "scroll" ? 0 : 1;
    item.slots = Number(item.slots);
    if (!Number.isFinite(item.slots))
      item.slots = item.type === "scroll" ? 0 : 1;
    if (item.type === "scroll") item.slots = 0;
    item.slotBonus = Number(item.slotBonus || 0);
    if (!Number.isFinite(item.slotBonus)) item.slotBonus = 0;
    item.cost = Number(item.cost || 0);
    if (!Number.isFinite(item.cost)) item.cost = 0;
  });
  const validIds = new Set(state.catalog.map((item) => item.id));
  state.stash = state.stash.filter(
    (entry) => entry && validIds.has(entry.itemId)
  );
  let mageOwner = null;
  state.chars.forEach((ch) => {
    if (!ch || typeof ch !== "object") return;
    ch.weapons = Array.isArray(ch.weapons)
      ? ch.weapons.filter((w) => w && validIds.has(w.itemId))
      : [];
    ch.equipment = Array.isArray(ch.equipment)
      ? ch.equipment.filter((e) => e && validIds.has(e.itemId))
      : [];
    ch.pack = Array.isArray(ch.pack)
      ? ch.pack.filter((id) => validIds.has(id))
      : [];
    if (!Array.isArray(ch.feats)) {
      ch.feats = Array.isArray(ch.feats)
        ? ch.feats
        : splitLines(String(ch.feats || ""));
    }
    if (!Array.isArray(ch.flaws)) {
      ch.flaws = Array.isArray(ch.flaws)
        ? ch.flaws
        : splitLines(String(ch.flaws || ""));
    }
    ch.isMage = !!ch.isMage;
    ch.tragedies = Number(ch.tragedies || 0);
    if (ch.tragedies < 0) ch.tragedies = 0;
    ensureTraitArrays(ch);
    ensureScrollLibrary(ch);
    ch.experience = Number(ch.experience || 0);
    if (ch.experience < 0) ch.experience = 0;
    ch.isDead = !!ch.isDead;
    if ("type" in ch) delete ch.type;
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

function saveState() {
  normalizeState();
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  render();
}

let state = loadState() || {
  warband: { name: "", limit: 50, experience: 0 },
  catalog: [],
  stash: [],
  chars: [],
  selectedId: null,
  settings: {},
  catalogVersion: 0,
};

normalizeState();

// =====================
// Catalog helpers
// =====================
function resolveItem(itemId) {
  return state.catalog.find((i) => i.id === itemId);
}
function addToStash(itemId, qty) {
  const row = state.stash.find((s) => s.itemId === itemId);
  if (row) row.qty += qty;
  else state.stash.push({ itemId, qty });
}
function removeFromStash(itemId, qty) {
  const row = state.stash.find((s) => s.itemId === itemId);
  if (!row) return false;
  if (row.qty < qty) return false;
  row.qty -= qty;
  if (row.qty === 0) state.stash = state.stash.filter((s) => s !== row);
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
    notes: "",
    pack: [],
    isMage: false,
    tragedies: 0,
    isDead: false,
    mageScrolls: { clean: [], unclean: [] },
    statTemplate: {
      id: "setA",
      assignments: {},
      locked: false
    }
  };
  return char;
}

function randomizeBaselineStats(char) {
  if (!char || !char.stats) return;
  char.stats.agi = randomFrom([-1, 0, 0, 1]);
  char.stats.pre = randomFrom([-1, 0, 0, 1]);
  char.stats.str = randomFrom([-1, 0, 0, 1, 1]);
  char.stats.tou = randomFrom([0, 0, 1, 1]);
}

function createRandomCharacter() {
  const char = newCharacter();
  randomizeBaselineStats(char);
  return char;
}

function charPoints(c) {
  let gold = 0;
  for (const w of c.weapons || []) {
    const it = resolveItem(w.itemId);
    if (it) gold += Number(it.cost || 0);
  }
  for (const e of c.equipment || []) {
    const it = resolveItem(e.itemId);
    if (it) gold += Number(it.cost || 0);
  }
  for (const pid of c.pack || []) {
    const it = resolveItem(pid);
    if (it) gold += Number(it.cost || 0);
  }
  if (c.isMage) gold += SPELLCASTER_COST;
  return gold;
}

function slotUsage(c) {
  // Use effective strength for base slots calculation
  const effectiveStats = getEffectiveStats(c);
  const base = Math.max(0, 5 + effectiveStats.str);

  let bonus = 0;
  let used = 0;
  const all = [];
  if (Array.isArray(c.weapons)) all.push(...c.weapons);
  if (Array.isArray(c.equipment)) all.push(...c.equipment);

  // Calculate equipment slot usage and bonuses
  for (const entry of all) {
    const item = resolveItem(entry.itemId);
    if (!item) continue;
    const slots = Number.isFinite(Number(item.slots)) ? Number(item.slots) : 1;
    used += Math.max(0, slots);
    const sb = Number(item.slotBonus || 0);
    if (Number.isFinite(sb)) bonus += sb;
  }

  // Add trait-based slot modifiers
  const traitModifiers = calculateTraitModifiers(c);
  bonus += traitModifiers.slots;

  const total = Math.max(0, base + bonus);
  return { used, total, base, bonus };
}

function randomName() {
  const first = nameParts.first.length ? nameParts.first : FALLBACK_FIRST;
  const second = nameParts.second.length ? nameParts.second : FALLBACK_SECOND;
  return `${randomFrom(first)} ${randomFrom(second)}`
    .replace(/\s+/g, " ")
    .trim();
}

function defaultWarbandNameData() {
  return {
    templates: ["the [adjective] [group]"],
    lookups: {
      adjective: ["Nameless", "Forgotten", "Lost"],
      group: ["Band", "Company", "Horde"],
    },
  };
}

function parsePerchanceWarband(text) {
  const lines = String(text || "").split(/\r?\n/);
  const sections = new Map();
  let current = null;
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith("//")) return;
    if (/^taken from:/i.test(trimmed)) return;
    if (!line.startsWith(" ")) {
      current = trimmed.toLowerCase();
      if (!sections.has(current)) sections.set(current, new Set());
      return;
    }
    if (!current || !line.startsWith("  ")) return;
    let entry = trimmed;
    const commentIdx = entry.indexOf("//");
    if (commentIdx >= 0) entry = entry.slice(0, commentIdx);
    entry = entry.replace(/\s*\^[0-9.]+$/, "");
    entry = entry.trim();
    if (!entry) return;
    const store = sections.get(current) || new Set();
    store.add(entry);
    sections.set(current, store);
  });

  const lookups = {};
  sections.forEach((set, key) => {
    if (!set.size) return;
    lookups[key] = Array.from(set).filter(Boolean);
  });

  const templates = Array.isArray(lookups.warband_name)
    ? lookups.warband_name.slice()
    : [];
  delete lookups.warband_name;

  return {
    templates,
    lookups,
  };
}

function ensureWarbandNameData() {
  if (
    warbandNameData &&
    Array.isArray(warbandNameData.templates) &&
    warbandNameData.templates.length
  ) {
    return Promise.resolve(warbandNameData);
  }
  if (warbandNamePromise) return warbandNamePromise;

  warbandNamePromise = fetch(PERCHANCE_PATH)
    .then((res) =>
      res.ok
        ? res.text()
        : Promise.reject(
            new Error(`Failed to load warband names: ${res.status}`)
          )
    )
    .then((text) => {
      const parsed = parsePerchanceWarband(text);
      if (parsed.templates.length) {
        warbandNameData = parsed;
      } else {
        warbandNameData = defaultWarbandNameData();
      }
      return warbandNameData;
    })
    .catch((err) => {
      console.error(err);
      warbandNameData = warbandNameData || defaultWarbandNameData();
      return warbandNameData;
    })
    .finally(() => {
      warbandNamePromise = null;
    });

  return warbandNamePromise;
}

function warbandTokenOptions(key, lookups) {
  if (!key) return null;
  const normalized = key
    .replace(/^import:/i, "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  const source = lookups?.[normalized];
  if (Array.isArray(source) && source.length) return source;
  const fallback = WARBAND_IMPORT_FALLBACKS[normalized];
  if (Array.isArray(fallback) && fallback.length) return fallback;
  return null;
}

function randomWarbandName() {
  const data =
    warbandNameData && warbandNameData.templates?.length
      ? warbandNameData
      : defaultWarbandNameData();
  const templates =
    Array.isArray(data.templates) && data.templates.length
      ? data.templates
      : defaultWarbandNameData().templates;
  const lookups = data.lookups || {};
  let template = randomFrom(templates);
  if (!template) template = "the [adjective] [group]";

  const tokenPattern = /(\{import:[^}]+\}|\[[^\]]+\])/g;
  let result = template;
  for (let i = 0; i < 8; i += 1) {
    let changed = false;
    result = result.replace(tokenPattern, (match) => {
      const token = match.slice(1, -1);
      const options = warbandTokenOptions(token, lookups);
      if (!options || !options.length) return match;
      changed = true;
      return randomFrom(options);
    });
    if (!changed) break;
  }

  result = result.replace(/\s+'/g, "'");
  result = result.replace(/\s+/g, " ").trim();
  if (/[\[{]/.test(result)) return "Nameless Warband";
  if (result) result = result.charAt(0).toUpperCase() + result.slice(1);
  return result || "Nameless Warband";
}

const isShieldItem = (item) => !!item && /shield/i.test(item.name || "");
const isHelmetItem = (item) => !!item && /helm/i.test(item.name || "");

function ensurePackArray(char) {
  if (!Array.isArray(char.pack)) char.pack = [];
  return char.pack;
}

function renderStatTemplate(char) {
  const controls = el("statTemplateControls");
  const valuesContainer = el("statTemplateValues");
  const grid = el("statAssignmentGrid");
  if (!controls || !valuesContainer || !grid) return;

  // Only auto-collapse if user hasn't manually opened it
  const statTemplateBox = document.getElementById("statTemplateBox");
  if (statTemplateBox) {
    // Check if user has manually opened it (track via data attribute)
    if (!statTemplateBox.hasAttribute('data-user-opened')) {
      statTemplateBox.open = false;
    }
    // Add event listener to track when user manually opens/closes
    if (!statTemplateBox.hasAttribute('data-listener-added')) {
      statTemplateBox.addEventListener('toggle', () => {
        if (statTemplateBox.open) {
          statTemplateBox.setAttribute('data-user-opened', 'true');
        } else {
          statTemplateBox.removeAttribute('data-user-opened');
        }
      });
      statTemplateBox.setAttribute('data-listener-added', 'true');
    }
  }

  controls.innerHTML = "";
  valuesContainer.innerHTML = "";
  grid.innerHTML = "";

  char.statTemplate = char.statTemplate || {
    id: null,
    assignments: {},
    locked: false,
  };
  const template = char.statTemplate;
  let draft = template.draft || null;

  const selectWrap = document.createElement("label");
  selectWrap.className = "pill";
  selectWrap.textContent = "Preset ";
  const presetSelect = document.createElement("select");
  presetSelect.innerHTML =
    '<option value="">Custom</option>' +
    STAT_SETS.map(
      (set) => `<option value="${set.id}">${set.label}</option>`
    ).join("");
  selectWrap.appendChild(presetSelect);
  controls.appendChild(selectWrap);

  const activeId = (draft ? draft.id : template.id) || "setA";
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
      assignments: computed
        ? cloneAssignments(computed.assignments)
        : cloneAssignments(null),
    };
    template.locked = false;
    setStatInputsReadonly(true);
    render();
  };

  const effectiveId = draft ? draft.id : template.id;
  setStatInputsReadonly(!!effectiveId);

  // Only show custom inputs when explicitly in Custom mode (no preset selected)
  const isCustomMode = !effectiveId && template.id === null;
  if (isCustomMode) {
    // Custom mode - show editable inputs for direct stat editing
    const customInputs = document.createElement("div");
    customInputs.className = "custom-stat-inputs";

    const title = document.createElement("h4");
    title.textContent = "Custom Attributes";
    title.className = "custom-title";
    customInputs.appendChild(title);

    const inputGrid = document.createElement("div");
    inputGrid.className = "custom-input-grid";

    STAT_KEYS.forEach(({ key, label }) => {
      const wrapper = document.createElement("div");
      wrapper.className = "custom-input-wrapper";

      const labelEl = document.createElement("label");
      labelEl.textContent = label;
      labelEl.className = "custom-input-label";

      const input = document.createElement("input");
      input.type = "number";
      input.min = -5;
      input.max = 5;
      input.step = 1;
      input.className = "custom-stat-input";
      input.value = char.stats?.[key] || 0;

      input.addEventListener("change", () => {
        const val = Number(input.value);
        if (Number.isFinite(val)) {
          char.stats = char.stats || {};
          char.stats[key] = val;
          saveState();
          // Update the display in the main stats section
          const effectiveStats = getEffectiveStats(char);
          el(`ed${key.charAt(0).toUpperCase() + key.slice(1)}`).textContent = formatStatValue(effectiveStats[key]);
          // Update movement if agility changed
          if (key === 'agi') {
            const movementEl = document.getElementById("edMovement");
            if (movementEl) movementEl.textContent = getEffectiveMovement(char);
          }
          // Update other dependent values
          render();
        }
      });

      wrapper.appendChild(labelEl);
      wrapper.appendChild(input);
      inputGrid.appendChild(wrapper);
    });

    customInputs.appendChild(inputGrid);

    const helpText = document.createElement("div");
    helpText.className = "muted small";
    helpText.textContent = "Direct attribute editing. Values range from -5 to +5.";
    customInputs.appendChild(helpText);

    valuesContainer.appendChild(customInputs);
    return;
  }

  const set = STAT_SETS.find((s) => s.id === effectiveId);
  if (!set) return;

  if (!template.locked && !draft && template.id === effectiveId) {
    template.draft = {
      id: template.id,
      assignments: cloneAssignments(template.assignments),
    };
    draft = template.draft;
  }

  const assignments = draft ? draft.assignments : template.assignments || {};
  const counts = countValues(set.values);
  const usage = assignmentUsage(assignments);
  const remainingCounts = { ...counts };
  Object.keys(usage).forEach((key) => {
    if (remainingCounts[key] == null) remainingCounts[key] = 0;
    remainingCounts[key] -= usage[key];
  });
  const complete = isAssignmentComplete(assignments, counts);

  if (!draft && template.locked && template.id === effectiveId && complete) {
    const summary = document.createElement("div");
    summary.className = "list";
    STAT_KEYS.forEach(({ key, label }) => {
      const item = document.createElement("div");
      item.className = "muted";
      item.textContent = `${label}: ${formatStatValue(assignments[key])}`;
      summary.appendChild(item);
    });
    valuesContainer.appendChild(summary);
    const editBtn = document.createElement("button");
    editBtn.className = "ghost";
    editBtn.type = "button";
    editBtn.textContent = "Edit Distribution";
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

  const remainingLabel = document.createElement("div");
  remainingLabel.className = "muted small";
  const remainingText = Object.keys(counts)
    .map((key) => {
      const left = Math.max(0, remainingCounts[key] ?? 0);
      const display = formatStatValue(Number(key));
      return `${display}: ${left}`;
    })
    .join(" · ");
  remainingLabel.textContent = `Remaining values — ${remainingText}`;
  valuesContainer.appendChild(remainingLabel);

  STAT_KEYS.forEach(({ key, label }) => {
    const container = document.createElement("div");
    container.className = "stat-template-item";

    const title = document.createElement("div");
    title.className = "muted small";
    title.textContent = label;
    container.appendChild(title);

    const select = document.createElement("select");
    const unsetOption = document.createElement("option");
    unsetOption.value = "";
    unsetOption.textContent = "Unset";
    select.appendChild(unsetOption);

    let currentVal;
    if (assignments[key] == null || assignments[key] === "") currentVal = NaN;
    else {
      currentVal = Number(assignments[key]);
      if (!Number.isFinite(currentVal)) currentVal = NaN;
    }

    set.values.forEach((valRaw) => {
      const val = Number(valRaw);
      if (!Number.isFinite(val)) return;
      const allowed = counts[String(val)] || 0;
      let usedElsewhere = 0;
      STAT_KEYS.forEach(({ key: other }) => {
        if (other === key) return;
        const otherVal = assignments[other];
        if (otherVal == null || otherVal === "") return;
        if (Number(otherVal) === val) usedElsewhere++;
      });
      const available = allowed - usedElsewhere;
      const remaining = available - (currentVal === val ? 1 : 0);
      const option = document.createElement("option");
      option.value = String(val);
      option.textContent = `${formatStatValue(val)} (${Math.max(
        0,
        remaining
      )} left)`;
      if (!Number.isNaN(currentVal) && currentVal === val)
        option.selected = true;
      if (available <= 0 && (Number.isNaN(currentVal) || currentVal !== val))
        option.disabled = true;
      select.appendChild(option);
    });

    select.onchange = (e) => {
      console.log("[stat-select] change", {
        char: char.name,
        stat: key,
        prev: assignments[key],
        next: e.target.value,
      });
      if (
        !char.statTemplate.draft ||
        char.statTemplate.draft.id !== effectiveId
      ) {
        char.statTemplate.draft = {
          id: effectiveId,
          assignments: cloneAssignments(assignments),
        };
      }
      const pending = char.statTemplate.draft.assignments;
      const prevVal =
        pending[key] == null || pending[key] === ""
          ? null
          : Number(pending[key]);
      const value = e.target.value === "" ? null : Number(e.target.value);
      pending[key] = value;
      template.locked = false;
      if (!assignmentsValid(pending, counts)) {
        pending[key] = prevVal;
        e.target.value = prevVal == null ? "" : String(prevVal);
        console.warn("[stat-select] invalid assignment, reverting", {
          char: char.name,
          stat: key,
          prev: prevVal,
        });
        return;
      }
      render();
    };

    container.appendChild(select);
    grid.appendChild(container);
  });

  const lockHint = document.createElement("div");
  lockHint.className = "muted small";
  lockHint.textContent =
    "Select a value for each stat. Once all values are used the template locks automatically.";
  valuesContainer.appendChild(lockHint);

  if (template.draft) {
    const actions = document.createElement("div");
    actions.className = "row stat-template-actions";
    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.textContent = "Confirm Changes";
    confirmBtn.onclick = () => {
      const pending = char.statTemplate.draft;
      if (!pending) return;
      const pendingSet = STAT_SETS.find((s) => s.id === pending.id);
      if (!pendingSet) {
        delete char.statTemplate.draft;
        render();
        return;
      }
      const pendingCounts = countValues(pendingSet.values);
      char.statTemplate.id = pending.id;
      char.statTemplate.assignments = cloneAssignments(pending.assignments);
      delete char.statTemplate.draft;
      char.statTemplate.locked = isAssignmentComplete(
        char.statTemplate.assignments,
        pendingCounts
      );
      updateStatsFromAssignments(char);
      saveState();
    };
    actions.appendChild(confirmBtn);
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "ghost";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => {
      delete char.statTemplate.draft;
      const baseSet = STAT_SETS.find((s) => s.id === char.statTemplate.id);
      const baseCounts = baseSet ? countValues(baseSet.values) : {};
      char.statTemplate.locked = isAssignmentComplete(
        char.statTemplate.assignments || {},
        baseCounts
      );
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

// =====================
// Trait Effect System
// =====================

function getTraitByName(traitName, type) {
  const traits = traitData?.[type] || [];
  return traits.find(t => t.name.toLowerCase() === traitName.toLowerCase()) || null;
}

function getAllCharacterTraits(char) {
  ensureTraitArrays(char);
  const allTraits = [];

  // Add feats
  if (char.feats) {
    char.feats.forEach(featName => {
      const trait = getTraitByName(featName, 'feats');
      if (trait) allTraits.push(trait);
    });
  }

  // Add flaws
  if (char.flaws) {
    char.flaws.forEach(flawName => {
      const trait = getTraitByName(flawName, 'flaws');
      if (trait) allTraits.push(trait);
    });
  }

  return allTraits;
}

function calculateTraitModifiers(char, context = {}) {
  const traits = getAllCharacterTraits(char);
  const modifiers = {
    stats: { agi: 0, pre: 0, str: 0, tou: 0 },
    movement: 0,
    armor: 0,
    hp: 0,
    slots: 0,
    weaponModifiers: {},
    testModifiers: {}
  };

  traits.forEach(trait => {
    if (!trait.effects) return;

    // Apply stat modifiers
    if (trait.effects.statModifiers) {
      Object.entries(trait.effects.statModifiers).forEach(([stat, value]) => {
        if (modifiers.stats.hasOwnProperty(stat)) {
          modifiers.stats[stat] += value;
        }
      });
    }

    // Apply other modifiers
    if (trait.effects.movementModifier) {
      modifiers.movement += trait.effects.movementModifier;
    }
    if (trait.effects.armorModifier) {
      modifiers.armor += trait.effects.armorModifier;
    }
    if (trait.effects.hpModifier) {
      modifiers.hp += trait.effects.hpModifier;
    }
    if (trait.effects.slotModifier) {
      modifiers.slots += trait.effects.slotModifier;
    }

    // Apply weapon modifiers
    if (trait.effects.weaponModifiers) {
      Object.entries(trait.effects.weaponModifiers).forEach(([weaponType, value]) => {
        modifiers.weaponModifiers[weaponType] = (modifiers.weaponModifiers[weaponType] || 0) + value;
      });
    }

    // Apply test modifiers
    if (trait.effects.testModifiers) {
      Object.entries(trait.effects.testModifiers).forEach(([testType, value]) => {
        modifiers.testModifiers[testType] = (modifiers.testModifiers[testType] || 0) + value;
      });
    }
  });

  return modifiers;
}

function getEffectiveStats(char, context = {}) {
  if (!char || !char.stats) return { agi: 0, pre: 0, str: 0, tou: 0 };

  const base = char.stats;
  const modifiers = calculateTraitModifiers(char, context);

  return {
    agi: (base.agi || 0) + modifiers.stats.agi,
    pre: (base.pre || 0) + modifiers.stats.pre,
    str: (base.str || 0) + modifiers.stats.str,
    tou: (base.tou || 0) + modifiers.stats.tou
  };
}

function getEffectiveMovement(char) {
  if (!char || !char.stats) return 5;

  const baseMovement = 5 + (char.stats.agi || 0);
  const modifiers = calculateTraitModifiers(char);

  return Math.max(0, baseMovement + modifiers.movement);
}

function getEffectiveArmor(char) {
  if (!char) return 0;

  const baseArmor = char.armor || 0;
  const modifiers = calculateTraitModifiers(char);

  return Math.max(0, baseArmor + modifiers.armor);
}

function getEffectiveHP(char) {
  if (!char) return 0;

  const baseHP = char.hp || 0;
  const modifiers = calculateTraitModifiers(char);

  return Math.max(1, baseHP + modifiers.hp);
}

function getWeaponModifier(char, weapon, context = {}) {
  if (!weapon) return 0;

  const modifiers = calculateTraitModifiers(char, context);
  let totalModifier = 0;

  // Check weapon type modifiers
  if (weapon.weaponType && modifiers.weaponModifiers[weapon.weaponType]) {
    totalModifier += modifiers.weaponModifiers[weapon.weaponType];
  }

  // Check test type modifiers if weapon has test types
  if (weapon.testTypes && Array.isArray(weapon.testTypes)) {
    weapon.testTypes.forEach(testType => {
      if (modifiers.testModifiers[testType]) {
        totalModifier += modifiers.testModifiers[testType];
      }
    });
  }

  return totalModifier;
}

function getTestModifier(char, testType, context = {}) {
  const modifiers = calculateTraitModifiers(char, context);
  return modifiers.testModifiers[testType] || 0;
}

function updateTraitDetails(targetId, trait) {
  const target = el(targetId);
  if (!target) return;
  if (!trait) {
    target.textContent = "";
    return;
  }
  const desc = trait.description
    ? trait.description
    : "No description provided.";
  target.textContent = desc;
}

function updateWeaponDetails(targetId, weapon) {
  const target = el(targetId);
  if (!target) return;
  if (!weapon) {
    target.textContent = "";
    return;
  }

  const parts = [];
  if (weapon.dmg && weapon.attr) {
    parts.push(`${weapon.dmg} ${weapon.attr}`);
  }
  if (weapon.cost) {
    parts.push(`${weapon.cost}g`);
  }
  if (weapon.slots) {
    parts.push(`${weapon.slots} slot${weapon.slots > 1 ? 's' : ''}`);
  }
  if (weapon.traits && weapon.traits.trim()) {
    parts.push(weapon.traits);
  }

  target.textContent = parts.join(' • ');
}

function updateEquipmentDetails(targetId, equipment) {
  const target = el(targetId);
  if (!target) return;
  if (!equipment) {
    target.textContent = "";
    return;
  }

  const parts = [];
  if (equipment.armorVal > 0) {
    parts.push(`Armor ${equipment.armorVal}`);
  }
  if (equipment.cost) {
    parts.push(`${equipment.cost}g`);
  }
  if (equipment.slots) {
    parts.push(`${equipment.slots} slot${equipment.slots > 1 ? 's' : ''}`);
  }
  if (equipment.slotBonus > 0) {
    parts.push(`+${equipment.slotBonus} bonus slots`);
  }
  if (equipment.traits && equipment.traits.trim()) {
    parts.push(equipment.traits);
  }

  target.textContent = parts.join(' • ');
}

function applyTrait(type, trait) {
  const char = getSelectedChar();
  if (!char || !trait) return;
  const key = type === "feats" ? "feats" : "flaws";
  ensureTraitArrays(char);
  if (
    !char[key].some((name) => name.toLowerCase() === trait.name.toLowerCase())
  ) {
    char[key].push(trait.name);
  }
  renderTraitLists(char);
  saveState();
}

function renderTraitLists(char) {
  const configs = [
    {
      type: "feats",
      key: "feats",
      containerId: "featList",
      empty: "No feats selected.",
    },
    {
      type: "flaws",
      key: "flaws",
      containerId: "flawList",
      empty: "No flaws selected.",
    },
  ];

  configs.forEach(({ type, key, containerId, empty }) => {
    const container = el(containerId);
    if (!container) return;

    if (!char) {
      container.innerHTML =
        '<div class="muted small">Select a character to manage traits.</div>';
      return;
    }

    ensureTraitArrays(char);
    const names = Array.isArray(char[key]) ? char[key] : [];

    if (!names.length) {
      container.innerHTML = `<div class="muted small">${empty}</div>`;
      return;
    }

    container.innerHTML = "";

    names.forEach((name, idx) => {
      const item = document.createElement("div");
      item.className = "trait-item";

      const header = document.createElement("header");
      const title = document.createElement("span");
      title.textContent = name;
      header.appendChild(title);

      const trait =
        (traitData?.[type] || []).find(
          (t) => t.name.toLowerCase() === name.toLowerCase()
        ) || null;

      const removeBtn = document.createElement("button");
      removeBtn.className = "ghost";
      removeBtn.type = "button";
      removeBtn.textContent = "Remove";
      removeBtn.onclick = () => {
        char[key].splice(idx, 1);
        saveState();
      };
      header.appendChild(removeBtn);

      item.appendChild(header);

      const desc = document.createElement("div");
      desc.className = "trait-desc";
      desc.textContent = trait?.description || "No description available.";
      item.appendChild(desc);

      container.appendChild(item);
    });
  });
}

function renderTraitControls() {
  const config = [
    {
      type: "feats",
      pickerId: "featPicker",
      addId: "addFeatBtn",
      randId: "randFeatBtn",
      detailsId: "featDetails",
    },
    {
      type: "flaws",
      pickerId: "flawPicker",
      addId: "addFlawBtn",
      randId: "randFlawBtn",
      detailsId: "flawDetails",
    },
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
      picker.innerHTML = `<option value="">${
        traitsLoaded ? "Unavailable" : "Loading..."
      }</option>`;
      picker.disabled = true;
      addBtn.disabled = true;
      randBtn.disabled = true;
      details.textContent = traitsLoaded ? "Traits unavailable." : "Loading...";
      return;
    }

    if (picker.dataset.version !== String(list.length)) {
      const prevValue = picker.value;
      const options = [
        '<option value="">Select...</option>',
        ...list.map(
          (trait) => `<option value="${trait.id}">${trait.name}</option>`
        ),
      ].join("");
      picker.innerHTML = options;
      picker.dataset.version = String(list.length);
      if (prevValue && list.find((trait) => trait.id === prevValue)) {
        picker.value = prevValue;
      } else {
        picker.value = "";
      }
    }

    picker.disabled = disable;
    addBtn.disabled = disable;
    randBtn.disabled = disable;

    if (!picker.dataset.bound) {
      picker.addEventListener("change", () => {
        const pool = traitData?.[type] || [];
        const trait = pool.find((t) => t.id === picker.value) || null;
        updateTraitDetails(detailsId, trait);
      });
      addBtn.addEventListener("click", () => {
        const pool = traitData?.[type] || [];
        const trait = pool.find((t) => t.id === picker.value) || null;
        if (trait) applyTrait(type, trait);
      });
      randBtn.addEventListener("click", () => {
        const char = getSelectedChar();
        if (!char) return;
        const pool = traitData?.[type] || [];
        if (!pool.length) return;
        const existing = new Set(
          (Array.isArray(char[type]) ? char[type] : []).map((name) =>
            name.toLowerCase()
          )
        );
        const available = pool.filter(
          (trait) => !existing.has(trait.name.toLowerCase())
        );
        const trait = available.length
          ? randomFrom(available)
          : randomFrom(pool);
        picker.value = trait.id;
        updateTraitDetails(detailsId, trait);
        applyTrait(type, trait);
      });
      picker.dataset.bound = "true";
    }

    if (disable) {
      picker.value = "";
      details.textContent = "Select a character to manage traits.";
      return;
    }

    updateTraitDetails(
      detailsId,
      list.find((t) => t.id === picker.value) || null
    );
  });
}

function ensureScrollLibrary(char) {
  if (!char || typeof char !== "object") return;
  if (!char.mageScrolls || typeof char.mageScrolls !== "object") {
    char.mageScrolls = { clean: [], unclean: [] };
  }
  ["clean", "unclean"].forEach((key) => {
    if (!Array.isArray(char.mageScrolls[key])) {
      const raw = char.mageScrolls[key];
      if (typeof raw === "string") {
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
    target.textContent = "";
    return;
  }
  target.textContent = scroll.description || "No description provided.";
}

function applyScroll(type, scroll) {
  const char = getSelectedChar();
  if (!char || !scroll || !char.isMage) return;
  ensureScrollLibrary(char);
  const bucket = char.mageScrolls[type];
  if (
    !bucket.some((name) => name.toLowerCase() === scroll.name.toLowerCase())
  ) {
    bucket.push(scroll.name);
  }
  renderScrollLists(char);
  saveState();
}

function renderScrollLists(char) {
  const configs = [
    {
      type: "clean",
      containerId: "cleanScrollList",
      empty: "No clean scrolls prepared.",
    },
    {
      type: "unclean",
      containerId: "uncleanScrollList",
      empty: "No unclean scrolls prepared.",
    },
  ];

  configs.forEach(({ type, containerId, empty }) => {
    const container = el(containerId);
    if (!container) return;

    if (!char) {
      container.innerHTML =
        '<div class="muted small">Select a character to manage scrolls.</div>';
      return;
    }

    if (!char.isMage) {
      container.innerHTML =
        '<div class="muted small">Only mages can prepare scrolls.</div>';
      return;
    }

    ensureScrollLibrary(char);
    const list = char.mageScrolls[type] || [];

    if (!list.length) {
      container.innerHTML = `<div class="muted small">${empty}</div>`;
      return;
    }

    container.innerHTML = "";
    list.forEach((name, idx) => {
      const item = document.createElement("div");
      item.className = "trait-item";

      const header = document.createElement("header");
      const title = document.createElement("span");
      title.textContent = name;
      header.appendChild(title);

      const scroll =
        (scrollData?.[type] || []).find(
          (s) => s.name.toLowerCase() === name.toLowerCase()
        ) || null;

      const removeBtn = document.createElement("button");
      removeBtn.className = "ghost";
      removeBtn.type = "button";
      removeBtn.textContent = "Remove";
      removeBtn.onclick = () => {
        char.mageScrolls[type].splice(idx, 1);
        saveState();
      };
      header.appendChild(removeBtn);

      item.appendChild(header);

      const desc = document.createElement("div");
      desc.className = "trait-desc";
      desc.textContent = scroll?.description || "No description available.";
      item.appendChild(desc);

      container.appendChild(item);
    });
  });
}

function renderScrollControls() {
  const config = [
    {
      type: "clean",
      pickerId: "cleanScrollPicker",
      addId: "addCleanScrollBtn",
      randId: "randCleanScrollBtn",
      detailsId: "cleanScrollDetails",
    },
    {
      type: "unclean",
      pickerId: "uncleanScrollPicker",
      addId: "addUncleanScrollBtn",
      randId: "randUncleanScrollBtn",
      detailsId: "uncleanScrollDetails",
    },
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
      picker.innerHTML = `<option value="">${
        scrollsLoaded ? "Unavailable" : "Loading..."
      }</option>`;
      picker.disabled = true;
      addBtn.disabled = true;
      randBtn.disabled = true;
      details.textContent = scrollsLoaded
        ? "Scrolls unavailable."
        : "Loading...";
      return;
    }

    if (picker.dataset.version !== String(list.length)) {
      const prevValue = picker.value;
      const options = [
        '<option value="">Select...</option>',
        ...list.map(
          (scroll) => `<option value="${scroll.id}">${scroll.name}</option>`
        ),
      ].join("");
      picker.innerHTML = options;
      picker.dataset.version = String(list.length);
      if (prevValue && list.find((scroll) => scroll.id === prevValue)) {
        picker.value = prevValue;
      } else {
        picker.value = "";
      }
    }

    picker.disabled = disable;
    addBtn.disabled = disable;
    randBtn.disabled = disable;

    if (!picker.dataset.bound) {
      picker.addEventListener("change", () => {
        const pool = scrollData?.[type] || [];
        const scroll = pool.find((s) => s.id === picker.value) || null;
        updateScrollDetails(detailsId, scroll);
      });
      addBtn.addEventListener("click", () => {
        const char = getSelectedChar();
        if (!char || !char.isMage) return;
        const pool = scrollData?.[type] || [];
        const scroll = pool.find((s) => s.id === picker.value) || null;
        if (scroll) applyScroll(type, scroll);
      });
      randBtn.addEventListener("click", () => {
        const char = getSelectedChar();
        if (!char || !char.isMage) return;
        const pool = scrollData?.[type] || [];
        if (!pool.length) return;
        ensureScrollLibrary(char);
        const existing = new Set(
          (char.mageScrolls[type] || []).map((name) => name.toLowerCase())
        );
        const available = pool.filter(
          (scroll) => !existing.has(scroll.name.toLowerCase())
        );
        const scroll = available.length
          ? randomFrom(available)
          : randomFrom(pool);
        picker.value = scroll.id;
        updateScrollDetails(detailsId, scroll);
        applyScroll(type, scroll);
      });
      picker.dataset.bound = "true";
    }

    if (disable) {
      picker.value = "";
      details.textContent = selectedChar
        ? "Only mages can prepare scrolls."
        : "Select a character to manage scrolls.";
      return;
    }

    const current =
      (scrollData?.[type] || []).find((s) => s.id === picker.value) || null;
    updateScrollDetails(detailsId, current);
  });
}

function chunkArray(list, size) {
  const result = [];
  if (!Array.isArray(list) || size <= 0) return result;
  for (let i = 0; i < list.length; i += size) {
    result.push(list.slice(i, i + size));
  }
  return result;
}

function removeFromPack(char, itemId, idxHint) {
  if (!Array.isArray(char.pack)) return;
  if (
    Number.isInteger(idxHint) &&
    idxHint >= 0 &&
    idxHint < char.pack.length &&
    char.pack[idxHint] === itemId
  ) {
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
  if (item.type === "weapon") {
    char.weapons = Array.isArray(char.weapons) ? char.weapons : [];
    char.weapons.push({ itemId });
  } else if (item.type === "armor" || item.type === "equipment") {
    char.equipment = Array.isArray(char.equipment) ? char.equipment : [];
    char.equipment.push({ itemId });
  } else if (item.type === "scroll") {
    char.scrolls = char.scrolls || { clean: 0, unclean: 0 };
    if (/unclean/i.test(item.name) || item.id.includes("unclean"))
      char.scrolls.unclean++;
    else char.scrolls.clean++;
  }
  saveState();
}

function warbandPoints() {
  return state.chars.reduce((a, c) => a + charPoints(c), 0);
}

// =====================
// Render
// =====================
const el = (id) => document.getElementById(id);
function render() {
  // Warband header
  const currentName = (state.warband.name || "").trim();
  const titleEl = el("warbandTitle");
  if (titleEl) {
    if (currentName) {
      titleEl.textContent = currentName;
      titleEl.style.display = "";
    } else {
      titleEl.textContent = "";
      titleEl.style.display = "none";
    }
  }
  const wbNameInput = el("wbName");
  if (wbNameInput) wbNameInput.value = state.warband.name || "";
  el("wbLimit").value = state.warband.limit || 0;
  el("wbXP").value = state.warband.experience || 0;
  const total = warbandPoints();
  el("wbPoints").textContent =
    `${total} g` + (state.warband.limit ? ` / ${state.warband.limit} g` : "");
  el("wbPoints").className =
    "tag" + (state.warband.limit && total > state.warband.limit ? " warn" : "");

  // Character list
  const list = el("charList");
  list.innerHTML = "";
  state.chars.forEach((c) => {
    const card = document.createElement("div");
    card.className = "char-card";
    if (c.id === state.selectedId) card.classList.add("active");
    if (c.isDead) card.classList.add("dead");

    card.addEventListener("click", (ev) => {
      if (ev.target.closest(".char-card-actions")) return;
      if (ev.target.closest("button")) return;
      if (state.selectedId === c.id) return;
      state.selectedId = c.id;
      saveState();
    });

    const header = document.createElement("div");
    header.className = "char-card-header";

    const info = document.createElement("div");
    info.className = "char-card-info";

    const nameBtn = document.createElement("button");
    nameBtn.type = "button";
    nameBtn.className = "char-card-name";
    nameBtn.textContent = c.name || "(unnamed)";
    nameBtn.onclick = (ev) => {
      ev.stopPropagation();
      if (state.selectedId === c.id) return;
      state.selectedId = c.id;
      saveState();
    };
    info.appendChild(nameBtn);

    const noteBits = [];
    if (c.isMage) noteBits.push("Spellcaster");
    const tragedies = Number(c.tragedies || 0);
    if (tragedies > 0)
      noteBits.push(tragedies === 1 ? "1 tragedy" : `${tragedies} tragedies`);
    const armor = Number(c.armor || 0);
    if (armor > 0) noteBits.push(`Armor ${armor}`);
    if (noteBits.length) {
      const notes = document.createElement("div");
      notes.className = "char-card-notes";
      notes.textContent = noteBits.join(" · ");
      info.appendChild(notes);
    }

    header.appendChild(info);

    const actions = document.createElement("div");
    actions.className = "char-card-actions";

    // Add Mark as Dead / Resurrect button
    const deathBtn = document.createElement("button");
    if (c.isDead) {
      deathBtn.className = "ghost";
      deathBtn.textContent = "Resurrect";
      deathBtn.onclick = (ev) => {
        ev.stopPropagation();
        if (!confirm("Resurrect character?")) return;
        c.isDead = false;
        updateLevelUpButton();
        render();
        saveState();
      };
    } else {
      deathBtn.className = "danger";
      deathBtn.textContent = "Mark Dead";
      deathBtn.onclick = (ev) => {
        ev.stopPropagation();
        if (!confirm("Mark character as dead?")) return;
        c.isDead = true;
        if (state.selectedId === c.id) state.selectedId = null; // Deselect if dead
        updateLevelUpButton();
        render();
        saveState();
      };
    }
    actions.appendChild(deathBtn);

    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Delete";
    del.onclick = (ev) => {
      ev.stopPropagation();
      if (!confirm("Delete character?")) return;
      state.chars = state.chars.filter((x) => x.id !== c.id);
      if (state.selectedId === c.id) state.selectedId = null;
      updateLevelUpButton();
      saveState();
    };
    actions.appendChild(del);

    header.appendChild(actions);
    card.appendChild(header);

    const meta = document.createElement("div");
    meta.className = "char-card-meta";
    const slots = slotUsage(c);
    const slotTag = tag(`Slots ${slots.used}/${slots.total}`);
    if (slots.used > slots.total) slotTag.classList.add("warn");
    slotTag.title = `Base ${slots.base}, Bonus ${slots.bonus}`;
    meta.appendChild(slotTag);
    meta.appendChild(tag(`${charPoints(c)} g`));
    card.appendChild(meta);

    list.appendChild(card);
  });

  // Editor
  const selected = state.chars.find((c) => c.id === state.selectedId);
  el("editor").style.display = selected ? "" : "none";
  el("noSelection").style.display = selected ? "none" : "";
  if (selected) {
    fillEditor(selected);
  } else {
    renderTraitLists(null);
    renderScrollLists(null);
    const mageToggle = el("isMageToggle");
    if (mageToggle) {
      mageToggle.checked = false;
      mageToggle.disabled = true;
    }
    const tragediesInput = el("edTragedies");
    if (tragediesInput) {
      tragediesInput.value = 0;
      tragediesInput.disabled = true;
    }
    const tragediesLabel = el("tragediesLabel");
    if (tragediesLabel) tragediesLabel.style.display = "none";
  }
  renderTraitControls();
  renderScrollControls();

  // Stash
  const filterSel = el("stashTypeFilter");
  if (filterSel) {
    if (filterSel.value !== stashFilter) filterSel.value = stashFilter;
    filterSel.onchange = (e) => {
      stashFilter = e.target.value || "all";
      renderStashPicker();
    };
  }
  renderStashPicker();

  const stashList = el("stashList");
  if (stashList) {
    stashList.innerHTML = "";
    for (const row of state.stash) {
      const it = resolveItem(row.itemId);
      if (!it) continue;

      const card = document.createElement("div");
      card.className = "stash-row";

      const header = document.createElement("div");
      header.className = "stash-row-header";

      const infoBlock = document.createElement("div");
      infoBlock.className = "stash-info";

      const nameEl = document.createElement("span");
      nameEl.className = "stash-name";
      nameEl.textContent = it.name;
      infoBlock.appendChild(nameEl);

      const meta = document.createElement("div");
      meta.className = "stash-meta";
      const typeSpan = document.createElement("span");
      typeSpan.textContent = capitalize(it.type || "equipment");
      const qtySpan = document.createElement("span");
      qtySpan.textContent = `Qty ${row.qty}`;
      const costSpan = document.createElement("span");
      costSpan.textContent = `${it.cost} g`;
      meta.append(typeSpan, qtySpan, costSpan);
      infoBlock.appendChild(meta);

      header.appendChild(infoBlock);

      const controls = document.createElement("div");
      controls.className = "stash-controls";

      const infoBtn = document.createElement("button");
      infoBtn.type = "button";
      infoBtn.className = "ghost info-btn";
      infoBtn.textContent = "Info";
      controls.appendChild(infoBtn);

      const useBtn = document.createElement("button");
      useBtn.textContent = "Assign";
      useBtn.onclick = () => {
        if (!state.selectedId) return alert("Select a character first.");
        if (!removeFromStash(it.id, 1)) return;
        const ch = state.chars.find((c) => c.id === state.selectedId);
        if (!ch) return;
        if (it.type === "weapon") {
          ch.weapons.push({ itemId: it.id });
        } else if (it.type === "equipment" || it.type === "armor") {
          ch.equipment.push({ itemId: it.id });
        } else if (it.type === "scroll") {
          ch.scrolls = ch.scrolls || { clean: 0, unclean: 0 };
          if (/unclean/i.test(it.name) || it.id.includes("unclean"))
            ch.scrolls.unclean++;
          else ch.scrolls.clean++;
        }
        saveState();
      };
      controls.appendChild(useBtn);

      const stowBtn = document.createElement("button");
      stowBtn.className = "ghost";
      stowBtn.textContent = "Stow";
      stowBtn.title = "Move to personal stash";
      stowBtn.onclick = () => {
        if (!state.selectedId) return alert("Select a character first.");
        if (!removeFromStash(it.id, 1)) return;
        const ch = state.chars.find((c) => c.id === state.selectedId);
        if (!ch) return;
        ensurePackArray(ch).push(it.id);
        saveState();
      };
      controls.appendChild(stowBtn);

      const addBtn = document.createElement("button");
      addBtn.className = "ghost";
      addBtn.textContent = "+";
      addBtn.title = "Increase qty";
      addBtn.onclick = () => {
        addToStash(it.id, 1);
        saveState();
      };
      controls.appendChild(addBtn);

      const subBtn = document.createElement("button");
      subBtn.className = "ghost";
      subBtn.textContent = "−";
      subBtn.title = "Decrease qty";
      subBtn.onclick = () => {
        removeFromStash(it.id, 1);
        saveState();
      };
      controls.appendChild(subBtn);

      header.appendChild(controls);
      card.appendChild(header);

      const details = document.createElement("div");
      details.className = "stash-details";
      const infoText = summarizeItem(it);
      details.textContent = infoText || "No additional info available.";
      card.appendChild(details);

      infoBtn.onclick = () => {
        const open = card.classList.toggle("open");
        infoBtn.classList.toggle("active", open);
      };

      stashList.appendChild(card);
    }
  }
  // Catalog selects
  const weapons = state.catalog.filter((i) => i.type === "weapon");
  const equips = state.catalog.filter(
    (i) => i.type === "equipment" || i.type === "armor"
  );
  setWeaponOptions(el("addWeaponSel"), weapons);
  setEquipmentOptions(el("addEquipSel"), equips);

  // Update print roster if print module is available
  if (window.PrintModule) {
    const printHelpers = {
      ensureTraitArrays,
      ensureScrollLibrary,
      ensurePackArray,
      resolveItem,
      formatStatValue,
      slotUsage,
      charPoints,
      summarizeItem,
      getEffectiveStats,
      getEffectiveMovement,
      getEffectiveArmor,
      getEffectiveHP,
      calculateTraitModifiers,
    };
    window.PrintModule.renderPrintRoster(state, printHelpers);
  }
}

function renderStashPicker() {
  const select = el("stashItemSelect");
  const addBtn = el("stashAddBtn");
  if (!select || !addBtn) return;

  const prevValue = select.value;
  select.innerHTML = "";

  const filterSel = el("stashTypeFilter");
  if (filterSel && filterSel.value !== stashFilter) {
    filterSel.value = stashFilter;
  }

  if (!catalogLoaded) {
    select.disabled = true;
    addBtn.disabled = true;
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Loading catalog…";
    select.appendChild(option);
    return;
  }

  let items = Array.isArray(state.catalog) ? [...state.catalog] : [];
  if (stashFilter !== "all") {
    items = items.filter((item) => (item.type || "equipment") === stashFilter);
  }
  items.sort(
    (a, b) =>
      (a.type || "").localeCompare(b.type || "") ||
      (a.name || "").localeCompare(b.name || "")
  );

  if (!items.length) {
    select.disabled = true;
    addBtn.disabled = true;
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No items available";
    select.appendChild(option);
    return;
  }

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    const typeLabel = item.type || "equipment";
    const parts = [typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)];
    const summary = summarizeItem(item);
    if (summary) parts.push(summary);
    parts.push(`${Number(item.cost || 0)} g`);
    option.title = parts.join(" · ");
    select.appendChild(option);
  });

  const hasPrev = items.some((item) => item.id === prevValue);
  select.value = hasPrev ? prevValue : items[0].id;
  select.disabled = false;
  addBtn.disabled = false;
}

function tag(text) {
  const span = document.createElement("span");
  span.className = "tag";
  span.textContent = text;
  return span;
}
function escapeHtml(s) {
  return (s || "").replace(
    /[&<>\"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}
function setOptions(sel, list) {
  sel.innerHTML = "";
  list.forEach((i) => {
    const o = document.createElement("option");
    o.value = i.id;
    const info = [];
    info.push(`${Number(i.cost || 0)}g`);
    if (i.type === "weapon") {
      if (i.dmg) info.push(i.dmg);
      if (i.attr) info.push(i.attr);
    }
    if (i.type === "armor" && i.armorVal != null) info.push(`AV:${i.armorVal}`);
    if (i.slots != null) info.push(`Slots:${i.slots}`);
    const bonusText = formatSlotBonus(i.slotBonus || 0);
    if (bonusText) info.push(bonusText);
    o.textContent = `${i.name} (${info.join(", ")})`;
    sel.appendChild(o);
  });
}

function setWeaponOptions(sel, weapons) {
  sel.innerHTML = "";

  // Categorize weapons
  const ranged = weapons.filter((w) => w.traits && w.traits.includes("Ranged"));
  const oneHanded = weapons.filter(
    (w) => (!w.traits || !w.traits.includes("Ranged")) && w.slots === 1
  );
  const twoHanded = weapons.filter(
    (w) => (!w.traits || !w.traits.includes("Ranged")) && w.slots === 2
  );

  // Add default option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select a weapon...";
  sel.appendChild(defaultOption);

  // Helper function to add section header
  function addSectionHeader(text) {
    const header = document.createElement("option");
    header.value = "";
    header.textContent = `── ${text} ──`;
    header.disabled = true;
    sel.appendChild(header);
  }

  // Helper function to add weapons
  function addWeapons(weaponList) {
    weaponList.forEach((w) => {
      const o = document.createElement("option");
      o.value = w.id;
      o.textContent = w.name;
      sel.appendChild(o);
    });
  }

  // Add ranged weapons
  if (ranged.length > 0) {
    addSectionHeader("Ranged Weapons");
    addWeapons(ranged);
  }

  // Add one-handed melee weapons
  if (oneHanded.length > 0) {
    addSectionHeader("One-Handed Melee");
    addWeapons(oneHanded);
  }

  // Add two-handed melee weapons
  if (twoHanded.length > 0) {
    addSectionHeader("Two-Handed Melee");
    addWeapons(twoHanded);
  }

  // Add change event listener for weapon preview
  if (!sel.dataset.weaponPreviewBound) {
    sel.addEventListener("change", () => {
      const weaponId = sel.value;
      const weapon = weaponId ? resolveItem(weaponId) : null;
      updateWeaponDetails("weaponDetails", weapon);
    });
    sel.dataset.weaponPreviewBound = "true";
  }
}

function setEquipmentOptions(sel, equipment) {
  sel.innerHTML = "";

  // Categorize equipment
  const armor = equipment.filter(
    (e) => e.type === "armor" || e.armorVal != null
  );
  const consumables = equipment.filter(
    (e) =>
      e.type === "equipment" &&
      (e.traits.includes("Heals") ||
        e.traits.includes("Cures") ||
        e.name.includes("Potion") ||
        e.name.includes("Bandage") ||
        e.name.includes("Antidote") ||
        e.name.includes("Tincture") ||
        e.name.includes("Whisky"))
  );
  const ammo = equipment.filter(
    (e) =>
      e.type === "equipment" &&
      (e.name.includes("Ammo") || e.name.includes("Cannonball"))
  );
  const utility = equipment.filter(
    (e) =>
      e.type === "equipment" && !consumables.includes(e) && !ammo.includes(e)
  );

  // Add default option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select equipment...";
  sel.appendChild(defaultOption);

  // Helper function to add section header
  function addSectionHeader(text) {
    const header = document.createElement("option");
    header.value = "";
    header.textContent = `── ${text} ──`;
    header.disabled = true;
    sel.appendChild(header);
  }

  // Helper function to add items
  function addItems(itemList) {
    itemList.forEach((item) => {
      const o = document.createElement("option");
      o.value = item.id;
      o.textContent = item.name;
      sel.appendChild(o);
    });
  }

  // Add armor
  if (armor.length > 0) {
    addSectionHeader("Armor");
    addItems(armor);
  }

  // Add consumables
  if (consumables.length > 0) {
    addSectionHeader("Consumables");
    addItems(consumables);
  }

  // Add ammunition
  if (ammo.length > 0) {
    addSectionHeader("Ammunition");
    addItems(ammo);
  }

  // Add utility items
  if (utility.length > 0) {
    addSectionHeader("Utility");
    addItems(utility);
  }

  // Add change event listener for equipment preview
  if (!sel.dataset.equipmentPreviewBound) {
    sel.addEventListener("change", () => {
      const equipmentId = sel.value;
      const equipment = equipmentId ? resolveItem(equipmentId) : null;
      updateEquipmentDetails("equipmentDetails", equipment);
    });
    sel.dataset.equipmentPreviewBound = "true";
  }
}

function fillEditor(c) {
  // Auto-derive armor from equipment (always enabled now)
  const av = (function () {
    let maxAv = 0;
    for (const e of c.equipment || []) {
      const it = resolveItem(e.itemId);
      if (it && it.type === "armor" && (it.armorVal || 0) > maxAv)
        maxAv = it.armorVal || 0;
    }
    return maxAv;
  })();
  c.armor = av;
  el("edName").value = c.name || "";
  const mageToggle = el("isMageToggle");
  if (mageToggle) {
    mageToggle.checked = !!c.isMage;
    mageToggle.disabled = false;
  }
  const tragediesInput = el("edTragedies");
  if (tragediesInput) {
    tragediesInput.value = Number(c.tragedies || 0);
    tragediesInput.disabled = !c.isMage;
  }
  const tragediesGroup = el("tragediesGroup");
  if (tragediesGroup) {
    tragediesGroup.style.display = c.isMage ? "" : "none";
  }
  el("edArmor").textContent = getEffectiveArmor(c);
  el("edHP").textContent = getEffectiveHP(c);
  // Always show effective stats in the display elements
  const effectiveStats = getEffectiveStats(c);
  el("edAgi").textContent = formatStatValue(effectiveStats.agi);
  el("edPre").textContent = formatStatValue(effectiveStats.pre);
  el("edStr").textContent = formatStatValue(effectiveStats.str);
  el("edTou").textContent = formatStatValue(effectiveStats.tou);
  el("edNotes").value = c.notes || "";
  el("edPoints").textContent = charPoints(c);
  const slotsInfo = slotUsage(c);
  const slotsEl = document.getElementById("edSlots");
  if (slotsEl) slotsEl.textContent = `${slotsInfo.used}/${slotsInfo.total}`;
  const slotsBadge = document.getElementById("edSlotsBadge");
  if (slotsBadge) {
    slotsBadge.classList.toggle("warn", slotsInfo.used > slotsInfo.total);
    slotsBadge.title = `Base ${slotsInfo.base}, Bonus ${slotsInfo.bonus}`;
  }


  // Update movement using effective stats
  const effectiveMovement = getEffectiveMovement(c);
  const movementEl = document.getElementById("edMovement");
  if (movementEl) movementEl.textContent = effectiveMovement;

  renderStatTemplate(c);
  ensureTraitArrays(c);
  renderTraitLists(c);
  ensureScrollLibrary(c);
  renderScrollLists(c);

  // weapons
  const listW = el("edWeapons");
  listW.innerHTML = "";
  if (!listW) return;
  if (!Array.isArray(c.weapons) || c.weapons.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted small";
    empty.textContent = "None";
    listW.appendChild(empty);
  } else {
    c.weapons.forEach((w, idx) => {
      const it = resolveItem(w.itemId);
      if (!it) return;
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<span>${escapeHtml(
        it.name
      )}</span><span class="space"></span><span class="small">${escapeHtml(
        summarizeItem(it)
      )} · ${it.cost} g</span>`;
      const rm = document.createElement("button");
      rm.className = "ghost";
      rm.textContent = "Unequip";
      rm.onclick = () => {
        c.weapons.splice(idx, 1);
        ensurePackArray(c);
        c.pack.push(it.id);
        saveState();
      };
      row.appendChild(rm);
      listW.appendChild(row);
    });
  }

  // equipment categories
  const equipGroups = { armor: [], shield: [], helm: [], other: [] };
  (Array.isArray(c.equipment) ? c.equipment : []).forEach((entry, idx) => {
    const item = resolveItem(entry.itemId);
    if (!item) return;
    if (item.type === "armor") {
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
    elTarget.innerHTML = "";
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "muted small";
      empty.textContent = "None";
      elTarget.appendChild(empty);
      return;
    }
    entries.forEach(({ item, idx }) => {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<span>${escapeHtml(
        item.name
      )}</span><span class="space"></span><span class="small">${escapeHtml(
        summarizeItem(item)
      )} · ${item.cost} g</span>`;
      const rm = document.createElement("button");
      rm.className = "ghost";
      rm.textContent = "Remove";
      rm.onclick = () => {
        c.equipment.splice(idx, 1);
        addToStash(item.id, 1);
        saveState();
      };
      row.appendChild(rm);
      elTarget.appendChild(row);
    });
  };

  renderEquipCategory("edArmorList", equipGroups.armor);
  renderEquipCategory("edShieldList", equipGroups.shield);
  renderEquipCategory("edHelmList", equipGroups.helm);
  renderEquipCategory("edEquip", equipGroups.other);

  // personal stash
  const packList = el("edPack");
  if (packList) {
    packList.innerHTML = "";
    const pack = Array.isArray(c.pack) ? c.pack : [];
    if (!pack.length) {
      const empty = document.createElement("div");
      empty.className = "muted small";
      empty.textContent = "Empty";
      packList.appendChild(empty);
    } else {
      pack.forEach((itemId, packIdx) => {
        const item = resolveItem(itemId);
        if (!item) return;
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `<span>${escapeHtml(
          item.name
        )}</span><span class="space"></span><span class="small">${escapeHtml(
          summarizeItem(item)
        )} · ${item.cost} g</span>`;
        const equipBtn = document.createElement("button");
        equipBtn.className = "ghost";
        equipBtn.textContent = "Equip";
        equipBtn.onclick = () => {
          equipFromPack(c, itemId, packIdx);
        };
        const returnBtn = document.createElement("button");
        returnBtn.className = "ghost";
        returnBtn.textContent = "Return";
        returnBtn.onclick = () => {
          removeFromPack(c, itemId);
          addToStash(item.id, 1);
          saveState();
        };
        row.appendChild(equipBtn);
        row.appendChild(returnBtn);
        packList.appendChild(row);
      });
    }
  }

  // Update level up button state
  updateLevelUpButton();
}

// =====================
// Event wiring
// =====================
el("wbName").addEventListener("input", (e) => {
  state.warband.name = e.target.value;
  saveState();
});
el("wbLimit").addEventListener("input", (e) => {
  state.warband.limit = Number(e.target.value) || 0;
  render();
  saveState();
});
el("wbXP").addEventListener("input", (e) => {
  state.warband.experience = Math.max(0, Number(e.target.value) || 0);
  updateLevelUpButton();
  saveState();
});

const randWbNameBtn = el("randWbName");
if (randWbNameBtn) {
  randWbNameBtn.onclick = () => {
    ensureWarbandNameData().then(() => {
      const name = randomWarbandName();
      const input = el("wbName");
      if (input) input.value = name;
      state.warband.name = name;
      saveState();
    });
  };
}

const randCharNameBtn = el("randCharName");
if (randCharNameBtn) {
  randCharNameBtn.onclick = () => {
    const char = getSelectedChar();
    if (!char) return;
    ensureNameData().then(() => {
      const name = randomName();
      const input = el("edName");
      if (input) input.value = name;
      char.name = name;
      render();
      saveState();
    });
  };
}

const addCharBtn = el("addChar");
if (addCharBtn) {
  addCharBtn.onclick = () => {
    const c = createRandomCharacter();
    state.chars.push(c);
    state.selectedId = c.id;
    updateLevelUpButton();
    saveState();
  };
}

// Level Up Modal handlers
const levelUpBtn = el("levelUpBtn");
const levelUpModal = el("levelUpModal");
const levelUpClose = el("levelUpClose");
const levelUpCancel = el("levelUpCancel");
const levelUpApply = el("levelUpApply");
const levelUpChoices = document.querySelectorAll('input[name="levelUpChoice"]');

function updateLevelUpButton() {
  if (levelUpBtn) {
    const hasLivingChars = state.chars.some(c => !c.isDead);
    const hasDeadChars = state.chars.some(c => c.isDead);
    const hasAnyChars = hasLivingChars || hasDeadChars;
    const xpRequired = getLevelUpCost();
    levelUpBtn.disabled = !hasAnyChars || (state.warband.experience || 0) < xpRequired;

    // Update button text to show actual XP cost
    levelUpBtn.textContent = `Level Up (${xpRequired} XP)`;
    levelUpBtn.title = `Spend ${xpRequired} XP to level up selected character or resurrect the dead`;
  }
}

function populateLevelUpModal() {
  const char = getSelectedChar();

  // Update modal header with current XP cost
  const modalHeader = document.querySelector("#levelUpModal h2");
  if (modalHeader) {
    const xpCost = getLevelUpCost();
    modalHeader.textContent = `Level Up - Spend ${xpCost} XP`;
  }

  // Populate character selector
  const charSelect = el("levelUpCharacterSelect");
  if (charSelect) {
    charSelect.innerHTML = '<option value="">Select a character...</option>';
    state.chars.forEach(character => {
      if (!character.isDead) { // Only show living characters
        const option = document.createElement('option');
        option.value = character.id;
        option.textContent = character.name || '(unnamed)';
        charSelect.appendChild(option);
      }
    });

    // Default to currently selected character if available
    if (char && !char.isDead) {
      charSelect.value = char.id;
    }
  }

  // If no character is selected, we'll populate selects based on first available character
  const referenceChar = char || state.chars.find(c => !c.isDead);
  if (!referenceChar) return;

  // Populate injury/flaw selects
  const injurySelect = el("injurySelect");
  const flawSelect = el("flawSelect");
  if (injurySelect && flawSelect) {
    injurySelect.innerHTML = '<option value="">Select an injury to remove...</option>';
    flawSelect.innerHTML = '<option value="">Select a flaw to reroll...</option>';

    referenceChar.flaws.forEach(flaw => {
      const option1 = document.createElement('option');
      option1.value = flaw;
      option1.textContent = flaw;
      injurySelect.appendChild(option1);

      const option2 = document.createElement('option');
      option2.value = flaw;
      option2.textContent = flaw;
      flawSelect.appendChild(option2);
    });
  }

  // Populate feat select
  const featSelect = el("featSelect");
  if (featSelect && traitData.feats) {
    featSelect.innerHTML = '<option value="">Select a feat to gain...</option>';
    traitData.feats.forEach(feat => {
      if (!referenceChar.feats.includes(feat.name)) {
        const option = document.createElement('option');
        option.value = feat.name;
        option.textContent = feat.name;
        featSelect.appendChild(option);
      }
    });
  }

  // Populate resurrect select
  const resurrectSelect = el("resurrectSelect");
  if (resurrectSelect) {
    resurrectSelect.innerHTML = '<option value="">Select a dead character...</option>';
    state.chars.forEach(c => {
      if (c.isDead) {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        resurrectSelect.appendChild(option);
      }
    });
  }

  // Add event handler to repopulate selects when character changes
  if (charSelect) {
    charSelect.onchange = () => {
      const selectedCharId = charSelect.value;
      const selectedChar = state.chars.find(c => c.id === selectedCharId);
      if (selectedChar) {
        // Repopulate injury/flaw selects for the new character
        if (injurySelect && flawSelect) {
          injurySelect.innerHTML = '<option value="">Select an injury to remove...</option>';
          flawSelect.innerHTML = '<option value="">Select a flaw to reroll...</option>';

          selectedChar.flaws.forEach(flaw => {
            const option1 = document.createElement('option');
            option1.value = flaw;
            option1.textContent = flaw;
            injurySelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = flaw;
            option2.textContent = flaw;
            flawSelect.appendChild(option2);
          });
        }

        // Repopulate feat select for the new character
        if (featSelect && traitData.feats) {
          featSelect.innerHTML = '<option value="">Select a feat to gain...</option>';
          traitData.feats.forEach(feat => {
            if (!selectedChar.feats.includes(feat.name)) {
              const option = document.createElement('option');
              option.value = feat.name;
              option.textContent = feat.name;
              featSelect.appendChild(option);
            }
          });
        }
      }

      // Update modal header with current XP cost (in case Slow Learner status changed)
      const modalHeader = document.querySelector("#levelUpModal h2");
      if (modalHeader) {
        const xpCost = getLevelUpCost();
        modalHeader.textContent = `Level Up - Spend ${xpCost} XP`;
      }

      updateLevelUpControls();
    };
  }
}

function updateLevelUpControls() {
  const controls = {
    statControls: false,
    injuryControls: false,
    flawControls: false,
    featControls: false,
    resurrectControls: false
  };

  levelUpChoices.forEach(choice => {
    const label = choice.closest('.level-up-option');
    if (choice.checked) {
      if (label) label.classList.add('selected');
      switch (choice.value) {
        case 'improveStat':
          controls.statControls = true;
          break;
        case 'removeInjury':
          controls.injuryControls = true;
          break;
        case 'rerollFlaw':
          controls.flawControls = true;
          break;
        case 'gainFeat':
          controls.featControls = true;
          break;
        case 'resurrect':
          controls.resurrectControls = true;
          break;
      }
    } else {
      if (label) label.classList.remove('selected');
    }
  });

  Object.keys(controls).forEach(controlName => {
    const element = el(controlName);
    if (element) {
      element.style.display = controls[controlName] ? 'block' : 'none';
    }
  });

  // Update apply button state
  if (levelUpApply) {
    const charSelect = el("levelUpCharacterSelect");
    const hasSelectedChar = charSelect?.value;
    let canApply = false;

    if (hasSelectedChar) {
      levelUpChoices.forEach(choice => {
        if (choice.checked) {
          switch (choice.value) {
            case 'improveStat':
              canApply = true; // Stats can always be improved
              break;
            case 'removeInjury':
              canApply = el("injurySelect")?.value;
              break;
            case 'rerollFlaw':
              canApply = el("flawSelect")?.value;
              break;
            case 'gainFeat':
              canApply = el("featSelect")?.value;
              break;
            case 'resurrect':
              canApply = el("resurrectSelect")?.value;
              break;
          }
        }
      });
    }

    levelUpApply.disabled = !canApply;
  }
}

if (levelUpBtn) {
  levelUpBtn.onclick = () => {
    const hasLivingChars = state.chars.some(c => !c.isDead);
    const hasDeadChars = state.chars.some(c => c.isDead);
    const hasAnyChars = hasLivingChars || hasDeadChars;
    const xpRequired = getLevelUpCost();

    if (!hasAnyChars || (state.warband.experience || 0) < xpRequired) return;

    populateLevelUpModal();
    if (levelUpModal) {
      levelUpModal.style.display = 'flex';
    }
  };
}

if (levelUpClose || levelUpCancel) {
  const closeModal = () => {
    if (levelUpModal) {
      levelUpModal.style.display = 'none';
      // Reset form
      levelUpChoices.forEach(choice => choice.checked = false);
      updateLevelUpControls();
    }
  };

  if (levelUpClose) levelUpClose.onclick = closeModal;
  if (levelUpCancel) levelUpCancel.onclick = closeModal;
}

if (levelUpApply) {
  levelUpApply.onclick = () => {
    // Get character from modal selector instead of getSelectedChar()
    const charSelect = el("levelUpCharacterSelect");
    const selectedCharId = charSelect?.value;
    const char = selectedCharId ? state.chars.find(c => c.id === selectedCharId) : null;

    const xpRequired = getLevelUpCost();

    if (!char || (state.warband.experience || 0) < xpRequired) return;

    let success = false;
    levelUpChoices.forEach(choice => {
      if (choice.checked) {
        switch (choice.value) {
          case 'improveStat':
            const statSelect = el("statSelect");
            if (statSelect?.value) {
              success = levelUpImproveStat(char, statSelect.value);
            }
            break;
          case 'removeInjury':
            const injurySelect = el("injurySelect");
            if (injurySelect?.value) {
              success = levelUpRemoveInjury(char, injurySelect.value);
            }
            break;
          case 'rerollFlaw':
            const flawSelect = el("flawSelect");
            if (flawSelect?.value) {
              success = levelUpRerollFlaw(char, flawSelect.value);
            }
            break;
          case 'gainFeat':
            const featSelect = el("featSelect");
            if (featSelect?.value) {
              success = levelUpGainFeat(char, featSelect.value);
            }
            break;
          case 'resurrect':
            const resurrectSelect = el("resurrectSelect");
            if (resurrectSelect?.value) {
              success = levelUpResurrect(resurrectSelect.value);
            }
            break;
        }
      }
    });

    if (success) {
      saveState();
      render(); // Use render() instead of separate calls

      // Close modal
      if (levelUpModal) {
        levelUpModal.style.display = 'none';
        levelUpChoices.forEach(choice => choice.checked = false);
        updateLevelUpControls();
      }
    }
  };
}

// Add event listeners for radio buttons and selects
levelUpChoices.forEach(choice => {
  choice.addEventListener('change', updateLevelUpControls);
});

['injurySelect', 'flawSelect', 'featSelect', 'resurrectSelect'].forEach(selectId => {
  const select = el(selectId);
  if (select) {
    select.addEventListener('change', updateLevelUpControls);
  }
});

// Close modal when clicking outside
if (levelUpModal) {
  levelUpModal.addEventListener('click', (e) => {
    if (e.target === levelUpModal) {
      levelUpModal.style.display = 'none';
      levelUpChoices.forEach(choice => choice.checked = false);
      updateLevelUpControls();
    }
  });
}

// Editor bindings
function bindEditorInput(id, apply) {
  const input = el(id);
  if (!input) return;
  input.addEventListener("input", (e) => {
    const c = state.chars.find((x) => x.id === state.selectedId);
    if (!c) return;
    apply(c, e);
    saveState();
  });
}
bindEditorInput("edName", (c, e) => (c.name = e.target.value));
bindEditorInput("edArmor", (c, e) => (c.armor = Number(e.target.value) || 0));
bindEditorInput("edHP", (c, e) => (c.hp = Number(e.target.value) || 0));
bindEditorInput("edNotes", (c, e) => (c.notes = e.target.value));

function bindCustomStatChange(id, key) {
  const input = el(id);
  if (!input) return;
  input.addEventListener("change", (e) => {
    const c = getSelectedChar();
    if (!c) return;
    const tmpl = c.statTemplate;
    const templateActive = !!(
      tmpl &&
      ((tmpl.draft && tmpl.draft.id) || tmpl.id)
    );
    if (templateActive) {
      const current = Number(c.stats?.[key]);
      e.target.value = Number.isFinite(current) ? current : "";
      return;
    }
    const val = Number(e.target.value);
    c.stats[key] = Number.isFinite(val) ? val : 0;
    saveState();
  });
}

bindCustomStatChange("edAgi", "agi");
bindCustomStatChange("edPre", "pre");
bindCustomStatChange("edStr", "str");
bindCustomStatChange("edTou", "tou");

const mageToggleCtrl = el("isMageToggle");
if (mageToggleCtrl) {
  mageToggleCtrl.addEventListener("change", (e) => {
    const char = getSelectedChar();
    if (!char) {
      e.target.checked = false;
      return;
    }
    if (e.target.checked) {
      const otherMage = state.chars.find(
        (ch) => ch.id !== char.id && ch.isMage
      );
      if (otherMage) {
        alert("Only one spellcaster may serve the warband at a time.");
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

const tragediesCtrl = el("edTragedies");
if (tragediesCtrl) {
  tragediesCtrl.addEventListener("change", (e) => {
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


// Add weapons/equipment from selects
el("addWeaponBtn").onclick = () => {
  const id = el("addWeaponSel").value;
  if (!id) return;
  const c = state.chars.find((x) => x.id === state.selectedId);
  if (!c) return;
  if (removeFromStash(id, 1)) c.weapons.push({ itemId: id });
  else c.weapons.push({ itemId: id });
  saveState();
};
el("addEquipBtn").onclick = () => {
  const id = el("addEquipSel").value;
  if (!id) return;
  const c = state.chars.find((x) => x.id === state.selectedId);
  if (!c) return;
  if (removeFromStash(id, 1)) c.equipment.push({ itemId: id });
  else c.equipment.push({ itemId: id });
  saveState();
};

const stashAddBtn = el("stashAddBtn");
if (stashAddBtn) {
  stashAddBtn.onclick = () => {
    const select = el("stashItemSelect");
    if (!select) return;
    const id = select.value;
    if (!id) return;
    addToStash(id, 1);
    saveState();
  };
}

// Export/Import warband
el("exportBtn").onclick = () => {
  const data = JSON.stringify(state, null, 2);
  download("warband.json", data);
};
el("importFile").addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      state = JSON.parse(rd.result);
      saveState();
    } catch (e) {
      alert("Invalid JSON");
    }
  };
  rd.readAsText(f);
});
el("clearAll").onclick = () => {
  if (!confirm("Clear all data?")) return;
  localStorage.removeItem(STORE_KEY);
  state = {
    warband: { name: "", limit: 50, experience: 0 },
    catalog: [],
    stash: [],
    chars: [],
    selectedId: null,
    settings: {},
    catalogVersion: 0,
  };
  normalizeState();
  render();
};

// Helpers
function splitLines(t) {
  return (t || "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
function summarizeItem(it) {
  if (!it) return "";
  let parts = [];
  if (it.type === "weapon") {
    if (it.dmg) parts.push(it.dmg);
    if (it.attr) parts.push(`(${it.attr})`);
    if (it.traits) parts.push(it.traits);
  } else if (it.type === "armor") {
    if (it.armorVal != null) parts.push(`AV:${it.armorVal}`);
    if (it.traits) parts.push(it.traits);
  } else {
    if (it.traits) parts.push(it.traits);
  }
  if (it.slots != null)
    parts.push(`${it.slots} slot${Math.abs(it.slots) === 1 ? "" : "s"}`);
  const bonusText = formatSlotBonus(it.slotBonus || 0);
  if (bonusText) parts.push(bonusText);
  if (it.notes) parts.push(it.notes);
  return parts.join(" · ");
}
function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

loadCatalogData();
loadTraitData();
loadScrollData();
loadNameData();
ensureWarbandNameData();

// Initialize print module
if (window.PrintModule) {
  const printHelpers = {
    ensureTraitArrays,
    ensureScrollLibrary,
    ensurePackArray,
    resolveItem,
    formatStatValue,
    slotUsage,
    charPoints,
    summarizeItem,
    getTraitData: () => traitData,
    getScrollData: () => scrollData,
    getEffectiveStats,
    getEffectiveMovement,
    getEffectiveArmor,
    getEffectiveHP,
    calculateTraitModifiers,
  };
  window.PrintModule.initializePrint(state, printHelpers);
}

// Alias functions for compatibility
const fillCharList = render;

render();
