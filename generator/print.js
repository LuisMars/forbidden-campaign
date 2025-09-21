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
    return result.replace(new RegExp(placeholder, 'g'), value != null ? value : '');
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

  const chars = Array.isArray(state.chars) ? state.chars.filter(c => !c.isDead) : [];
  const pages = Math.ceil(chars.length / 6);
  const chunks = chunkArray(chars, 6);

  const layouts = [];
  chunks.forEach((group, pageIdx) => {
    const warbandName = escapeHtml((state.warband?.name || '').trim() || 'Unnamed Warband');
    const warbandXP = state.warband?.experience || 0;
    const data = {
      STASH: buildStashMarkup(state, helpers),
      TITLE: warbandName,
      WARBAND_INFO: `Warband XP: ${warbandXP}`,
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

  // Use effective stats that include trait modifiers
  const effectiveStats = helpers.getEffectiveStats ? helpers.getEffectiveStats(char) : char?.stats || {};
  const agility = Number(effectiveStats.agi) || 0;
  const presence = Number(effectiveStats.pre) || 0;
  const strength = Number(effectiveStats.str) || 0;
  const toughness = Number(effectiveStats.tou) || 0;

  // Use effective movement calculation
  const movement = helpers.getEffectiveMovement ? helpers.getEffectiveMovement(char) : (5 + agility);

  // Meta information using effective values where available
  const hp = helpers.getEffectiveHP ? helpers.getEffectiveHP(char) : Number(char.hp || 0);
  const armor = helpers.getEffectiveArmor ? helpers.getEffectiveArmor(char) : Number(char.armor || 0);
  const slots = slotUsage(char);
  const gold = charPoints(char);
  const isMage = !!char.isMage;
  const tragedies = Number(char.tragedies || 0);

  // Lists for injection
  const feats = buildTraitLines(char.feats || [], 'feats', helpers);
  const flaws = buildTraitLines(char.flaws || [], 'flaws', helpers);
  const injuries = buildInjuryLines(char.injuries || [], helpers);
  const scrollData = buildScrollLines(char, helpers);

  const weapons = aggregateItemLines(resolveEntries(char.weapons, resolveItem), helpers);
  const armorGroups = resolveEquipmentGroups(char, helpers);
  const packItems = aggregateItemLines(resolvePackItems(char, helpers), helpers);

  const notes = (char.notes || '').trim();

  return fillTemplate(printTemplates.card, {
    // Basic info
    NAME: safeName,
    HP: hp,
    MOVEMENT: movement,
    ARMOR_VALUE: armor,
    GOLD: gold,
    IS_MAGE: isMage ? 'is-mage' : 'is-not-mage',
    TRAGEDIES: tragedies,

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
    IS_MAGE: isMage ? 'is-mage' : 'is-not-mage',

    // Equipment counts
    WEAPON_COUNT: weapons.length,
    ARMOR_COUNT: armorGroups.armor.length + armorGroups.shields.length + armorGroups.helms.length,
    GEAR_COUNT: armorGroups.other.length,
    PACK_COUNT: packItems.length,

    // Lists
    FEATS_LIST: renderItemList(feats, 'None'),
    FLAWS_LIST: renderItemList(flaws, 'None'),
    INJURIES_LIST: renderItemList(injuries, 'None'),
    CLEAN_SCROLLS_LIST: renderItemList(scrollData.clean, 'None'),
    UNCLEAN_SCROLLS_LIST: renderItemList(scrollData.unclean, 'None'),
    WEAPONS_LIST: renderItemList(weapons, 'None'),
    ARMOR_LIST: renderItemList(armorGroups.armor, 'None'),
    SHIELDS_LIST: renderItemList(armorGroups.shields, 'None'),
    HELMETS_LIST: renderItemList(armorGroups.helms, 'None'),
    GEAR_LIST: renderItemList(armorGroups.other, 'None'),
    PACK_LIST: renderItemList(packItems, 'Empty'),

    // Individual counts for display
    FEATS_COUNT: feats.length,
    FLAWS_COUNT: flaws.length,
    INJURIES_COUNT: injuries.length,
    CLEAN_SCROLLS_COUNT: scrollData.clean.length,
    UNCLEAN_SCROLLS_COUNT: scrollData.unclean.length,
    SHIELDS_COUNT: armorGroups.shields.length,
    HELMETS_COUNT: armorGroups.helms.length,

    // Notes
    NOTES: notes ? escapeHtml(notes).replace(/\n/g, '<br>') : '—',
    NOTES_LENGTH: notes.length,
  });
}

function renderItemList(items, emptyText) {
  if (!Array.isArray(items) || !items.length) {
    return `<div class="print-empty">${escapeHtml(emptyText || '—')}</div>`;
  }
  const listItems = items.map((item) => {
    if (typeof item === 'object' && item.name && item.description) {
      return `<li><strong>${escapeHtml(item.name)}:</strong> <span class="print-description">${escapeHtml(item.description)}</span></li>`;
    }
    return `<li>${escapeHtml(item)}</li>`;
  }).join('');
  return `<ul class="print-list">${listItems}</ul>`;
}

function buildTraitLines(traitNames, type, helpers) {
  if (!Array.isArray(traitNames)) return [];

  const items = [];
  traitNames.filter(Boolean).forEach(name => {
    // Try to find trait description
    if (helpers.getTraitData) {
      const traitData = helpers.getTraitData();
      if (traitData && traitData[type]) {
        const trait = traitData[type].find(
          t => t.name.toLowerCase() === name.toLowerCase()
        );
        if (trait && trait.description) {
          items.push({ name: trait.name, description: trait.description });
          return;
        }
      }
    }
    // Fallback to just the name if no description found
    items.push(name);
  });

  return items;
}

function buildInjuryLines(injuryNames, helpers) {
  if (!Array.isArray(injuryNames)) return [];

  const items = [];
  injuryNames.filter(Boolean).forEach(name => {
    // Try to find injury description
    if (helpers.getInjuryData) {
      const injuryData = helpers.getInjuryData();
      if (injuryData && injuryData.injuries) {
        const injury = injuryData.injuries.find(
          i => i.name.toLowerCase() === name.toLowerCase()
        );
        if (injury && injury.description) {
          items.push({ name: injury.name, description: injury.description });
          return;
        }
      }
    }
    // Fallback to just the name if no description found
    items.push(name);
  });

  return items;
}

function buildScrollLines(char, helpers) {
  const scrollCounts = char.scrolls || {};
  const mageScrolls = char.mageScrolls || {};

  const cleanItems = [];
  const uncleanItems = [];

  // Add clean scroll count if it exists
  if (scrollCounts.clean > 0) {
    cleanItems.push(`Clean Scrolls: ${scrollCounts.clean}`);
  }

  // Add individual clean spells
  const cleanSpells = mageScrolls.clean || [];
  cleanSpells.forEach((scrollName) => {
    if (scrollName && typeof scrollName === 'string') {
      let scrollInfo = null;
      if (helpers.getScrollData) {
        const scrollData = helpers.getScrollData();
        scrollInfo = scrollData.clean?.find(s => s.name === scrollName);
      }

      if (scrollInfo && scrollInfo.description) {
        cleanItems.push({ name: scrollInfo.name, description: scrollInfo.description });
      } else {
        cleanItems.push(scrollName);
      }
    }
  });

  // Add unclean scroll count if it exists
  if (scrollCounts.unclean > 0) {
    uncleanItems.push(`Unclean Scrolls: ${scrollCounts.unclean}`);
  }

  // Add individual unclean spells
  const uncleanSpells = mageScrolls.unclean || [];
  uncleanSpells.forEach((scrollName) => {
    if (scrollName && typeof scrollName === 'string') {
      let scrollInfo = null;
      if (helpers.getScrollData) {
        const scrollData = helpers.getScrollData();
        scrollInfo = scrollData.unclean?.find(s => s.name === scrollName);
      }

      if (scrollInfo && scrollInfo.description) {
        uncleanItems.push({ name: scrollInfo.name, description: scrollInfo.description });
      } else {
        uncleanItems.push(scrollName);
      }
    }
  });

  return { clean: cleanItems, unclean: uncleanItems };
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
  const itemMap = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    if (!item) return;
    const key = item.name || 'Unknown';
    const existing = itemMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      let description = buildItemDescription(item);

      itemMap.set(key, {
        name: item.name,
        description: description,
        count: 1
      });
    }
  });

  const lines = [];
  itemMap.forEach((itemData) => {
    const name = itemData.count > 1 ? `${itemData.name} (×${itemData.count})` : itemData.name;
    if (itemData.description && itemData.description.trim()) {
      lines.push({ name, description: itemData.description.trim() });
    } else {
      lines.push(name);
    }
  });
  return lines;
}

function buildItemDescription(item) {
  const parts = [];

  // For weapons: show damage and attribute
  if (item.type === 'weapon') {
    if (item.dmg && item.attr) {
      parts.push(`${item.dmg} ${item.attr}`);
    } else if (item.dmg) {
      parts.push(item.dmg);
    }
  }

  // For armor: show armor value
  if (item.type === 'armor' && item.armorVal > 0) {
    parts.push(`Armor ${item.armorVal}`);
  }

  // Add traits if they exist
  if (item.traits && item.traits.trim()) {
    parts.push(item.traits.trim());
  }

  return parts.join('. ');
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
          const printWindow = window.open('', '_blank');
          const container = document.getElementById('printRoster');

          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Print Preview - ${escapeHtml((state.warband?.name || '').trim() || 'Unnamed Warband')}</title>
              <link rel="stylesheet" href="print-card.css">
            </head>
            <body class="print-preview">
              ${container.innerHTML}
            </body>
            </html>
          `);
          printWindow.document.close();
        })
        .catch(() => {
          alert('Failed to load print templates');
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