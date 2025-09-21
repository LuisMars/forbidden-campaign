// Print functionality for Forbidden Psalm character sheets
// Extracted from app.js for better organization

const PRINT_CARD_PATH = 'print-card.html';
const PRINT_LAYOUT_PATH = 'print-layout.html';

const printTemplates = { card: null, layout: null, loading: null, error: null };

function ensurePrintTemplates() {
  if (printTemplates.card && printTemplates.layout) return Promise.resolve();
  if (printTemplates.loading) return printTemplates.loading;

  printTemplates.loading = Promise.all([
    fetchTemplate(PRINT_CARD_PATH),
    fetchTemplate(PRINT_LAYOUT_PATH),
  ])
    .then(([card, layout]) => {
      printTemplates.card = card;
      printTemplates.layout = layout;
      return null;
    })
    .catch((err) => {
      printTemplates.error = err;
      console.error('Failed to load print templates', err);
      throw err;
    });

  return printTemplates.loading;
}

function fetchTemplate(path) {
  return fetch(path).then((response) => {
    if (!response.ok) {
      throw new Error(`Template fetch failed: ${response.status} ${response.statusText}`);
    }
    return response.text();
  });
}

function fillTemplate(template, data) {
  return Object.entries(data).reduce((result, [key, value]) => {
    const placeholder = `{{${key}}}`;
    return result.replace(new RegExp(placeholder, 'g'), value || '');
  }, template);
}

function escapeHtml(s) {
  return (s||'').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
}

function getStatTemplateLabel(templateId) {
  const templates = {
    'setA': '+3, +1, 0, -3',
    'setB': '+2, +2, -1, -2'
  };
  return templates[templateId] || templateId || 'Custom';
}

function renderPrintRoster(state, helpers) {
  const container = document.getElementById('printRoster');
  if (!container) return;

  if (!printTemplates.card || !printTemplates.layout) {
    ensurePrintTemplates()
      .then(() => renderPrintRoster(state, helpers))
      .catch(() => {
        container.innerHTML = '<div class="print-loading">Unable to load print template.</div>';
      });
    container.innerHTML = '<div class="print-loading">Preparing print layout…</div>';
    return;
  }

  const chars = Array.isArray(state.chars) ? state.chars : [];
  const pages = Math.ceil(chars.length / 6);
  const chunks = chunkArray(chars, 6);

  const layouts = [];
  chunks.forEach((group, pageIdx) => {
    const data = {
      PAGE_NUMBER: pageIdx + 1,
      TOTAL_PAGES: pages,
      STASH: buildStashMarkup(state, helpers),
      WARBAND_NAME: escapeHtml((state.warband?.name || '').trim() || 'Unnamed Warband'),
    };

    group.forEach((char, idx) => {
      data[`CHAR_SLOT_${idx + 1}`] = compilePrintCard(char, helpers);
    });

    for (let slot = group.length; slot < 6; slot += 1) {
      data[`CHAR_SLOT_${slot + 1}`] = placeholderCardMarkup();
    }

    layouts.push(fillTemplate(printTemplates.layout, data));
  });

  container.innerHTML = layouts.join('');
}

function compilePrintCard(char, helpers) {
  const { ensureTraitArrays, ensureScrollLibrary, ensurePackArray, resolveItem, formatStatValue, slotUsage, charPoints } = helpers;

  ensureTraitArrays(char);
  ensureScrollLibrary(char);
  ensurePackArray(char);

  const safeName = escapeHtml((char.name || '').trim() || '(unnamed)');

  // Individual stat values for injection
  const stats = char?.stats || {};
  const agility = Number(stats.agi) || 0;
  const presence = Number(stats.pre) || 0;
  const strength = Number(stats.str) || 0;
  const toughness = Number(stats.tou) || 0;

  // Meta information
  const experience = Number(char.experience || 0);
  const hp = Number(char.hp || 0);
  const armor = Number(char.armor || 0);
  const slots = slotUsage(char);
  const gold = charPoints(char);
  const isMage = !!char.isMage;
  const tragedies = Number(char.tragedies || 0);

  // Lists for injection
  const feats = (char.feats || []).filter(Boolean);
  const flaws = (char.flaws || []).filter(Boolean);
  const scrolls = buildScrollLines(char, helpers);

  const weapons = aggregateItemLines(resolveEntries(char.weapons, resolveItem), helpers);
  const armorGroups = resolveEquipmentGroups(char, helpers);
  const packItems = aggregateItemLines(resolvePackItems(char, helpers), helpers);

  const notes = (char.notes || '').trim();

  return fillTemplate(printTemplates.card, {
    // Basic info
    NAME: safeName,
    EXPERIENCE: experience,
    HP: hp,
    ARMOR_VALUE: armor,
    GOLD: gold,
    IS_MAGE: isMage ? 'Yes' : 'No',
    TRAGEDIES: tragedies > 0 ? tragedies : '',

    // Stats
    AGILITY: formatStatValue(agility),
    PRESENCE: formatStatValue(presence),
    STRENGTH: formatStatValue(strength),
    TOUGHNESS: formatStatValue(toughness),

    // Equipment slots
    SLOTS_USED: slots.used,
    SLOTS_TOTAL: slots.total,
    SLOTS_BASE: slots.base,
    SLOTS_BONUS: slots.bonus,

    // Character summary tags
    CHARACTER_TYPE: isMage ? 'Spellcaster' : 'Fighter',
    STAT_TEMPLATE: char.statTemplate?.id ? getStatTemplateLabel(char.statTemplate.id) : 'Custom',

    // Equipment counts
    WEAPON_COUNT: weapons.length,
    ARMOR_COUNT: armorGroups.armor.length + armorGroups.shields.length + armorGroups.helms.length,
    GEAR_COUNT: armorGroups.other.length,
    PACK_COUNT: packItems.length,

    // Lists
    FEATS_LIST: renderItemList(feats, 'None'),
    FLAWS_LIST: renderItemList(flaws, 'None'),
    SCROLLS_LIST: renderItemList(scrolls, isMage ? 'No scrolls recorded.' : 'None'),
    WEAPONS_LIST: renderItemList(weapons, 'None'),
    ARMOR_LIST: renderItemList(armorGroups.armor, 'None'),
    SHIELDS_LIST: renderItemList(armorGroups.shields, 'None'),
    HELMETS_LIST: renderItemList(armorGroups.helms, 'None'),
    GEAR_LIST: renderItemList(armorGroups.other, 'None'),
    PACK_LIST: renderItemList(packItems, 'Empty'),

    // Individual counts for display
    FEATS_COUNT: feats.length,
    FLAWS_COUNT: flaws.length,
    SCROLLS_COUNT: scrolls.length,

    // Notes
    NOTES: notes ? escapeHtml(notes).replace(/\n/g, '<br>') : '—',
  });
}

function renderItemList(items, emptyText) {
  if (!Array.isArray(items) || !items.length) {
    return `<div class="print-empty">${escapeHtml(emptyText || '—')}</div>`;
  }
  const listItems = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `<ul class="print-list">${listItems}</ul>`;
}

function buildScrollLines(char, helpers) {
  const lines = [];
  const scrolls = char.scrolls || {};

  if (scrolls.clean > 0) {
    lines.push(`Clean Scrolls: ${scrolls.clean}`);
  }
  if (scrolls.unclean > 0) {
    lines.push(`Unclean Scrolls: ${scrolls.unclean}`);
  }

  const library = char.scrollLibrary || [];
  library.forEach(scroll => {
    if (scroll.name) {
      lines.push(scroll.name);
    }
  });

  return lines;
}

function resolveEntries(entries, resolveItem) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => resolveItem(entry.itemId))
    .filter(Boolean);
}

function resolveEquipmentGroups(char, helpers) {
  const { resolveItem } = helpers;
  const entries = resolveEntries(char.equipment || [], resolveItem);

  const groups = { armor: [], shields: [], helms: [], other: [] };

  entries.forEach((item) => {
    if (!item) return;

    if (item.type === 'armor') {
      if (item.name?.toLowerCase().includes('shield')) {
        groups.shields.push(item);
      } else if (item.name?.toLowerCase().includes('helm')) {
        groups.helms.push(item);
      } else {
        groups.armor.push(item);
      }
    } else {
      groups.other.push(item);
    }
  });

  // Convert to item lines
  Object.keys(groups).forEach(key => {
    groups[key] = aggregateItemLines(groups[key], helpers);
  });

  return groups;
}

function resolvePackItems(char, helpers) {
  const { resolveItem } = helpers;
  const packs = char.pack || [];
  const items = [];

  packs.forEach(pack => {
    if (pack.items) {
      pack.items.forEach(itemEntry => {
        const item = resolveItem(itemEntry.itemId);
        if (item) items.push(item);
      });
    }
  });

  return items;
}

function aggregateItemLines(items, helpers) {
  const counts = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    if (!item) return;
    const descriptor = describeItemForPrint(item, helpers);
    if (!descriptor) return;
    const current = counts.get(descriptor);
    if (current) {
      counts.set(descriptor, current + 1);
    } else {
      counts.set(descriptor, 1);
    }
  });

  const lines = [];
  counts.forEach((count, descriptor) => {
    lines.push(count > 1 ? `${descriptor} (×${count})` : descriptor);
  });
  return lines;
}

function describeItemForPrint(item, helpers) {
  if (!item) return '';
  const { summarizeItem } = helpers;
  const parts = [];
  const summary = summarizeItem(item);
  parts.push(item.name);
  if (summary) parts.push(`(${summary})`);
  return parts.join(' ');
}

function buildStashMarkup(state, helpers) {
  const { resolveItem } = helpers;
  const rows = Array.isArray(state.stash) ? state.stash : [];
  if (!rows.length) {
    return '<div class="print-empty">Stash empty.</div>';
  }

  const lines = rows.map((row) => {
    const item = resolveItem(row.itemId);
    if (!item) return null;
    const summary = helpers.summarizeItem(item);
    const parts = [item.name];
    if (summary) parts.push(`(${summary})`);
    if (row.qty > 1) parts.push(`×${row.qty}`);
    return parts.join(' ');
  }).filter(Boolean);

  if (!lines.length) {
    return '<div class="print-empty">Stash empty.</div>';
  }

  const items = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
  return `<ul class="print-stash-list">${items}</ul>`;
}

function placeholderCardMarkup() {
  return '<article class="print-card print-card--placeholder"></article>';
}

function chunkArray(list, size) {
  const chunks = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

function initializePrint(state, helpers) {
  ensurePrintTemplates();

  const printBtn = document.getElementById('printRosterBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      ensurePrintTemplates()
        .then(() => {
          renderPrintRoster(state, helpers);
          window.print();
        })
        .catch(() => {
          window.print();
        });
    });
  }
}

// Export functions for use in app.js
window.PrintModule = {
  renderPrintRoster,
  initializePrint,
  ensurePrintTemplates
};