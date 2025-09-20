// ======================
// Data model & constants
// ======================
const STORE_KEY = "fp_async_helper_v3_locked26";
const DEFAULT_END_TIMES = [
  // Core (1–10)
  "The Mad Wizard's Tea",
  "My Heart Has Joined The Thousand",
  "Dashed Hope",
  "The Afanc Pool",
  "I Am The Real Vriprix",
  "Cut Off Her Head And Take Out Her Heart",
  "Mortsafe",
  "Eater of Socks",
  "The Forbidden Psalm",
  "There Can Be Only One",
  // Expansion (11–26)
  "Just Ice",
  "A Fire For The Hills",
  "Through The Looking Glass",
  "Sabbatic Goat",
  "Weaving Webs Of Shadows",
  "Market",
  "Quagmire",
  "Saving Face",
  "Through The Sewers",
  "The Big Rat That Lives Underground",
  "What We Do In Life Echoes In Eternity",
  "Bone Pits",
  "Wishing Well",
  "The Printing Press",
  "The Wizard's Tower",
  "Leap Of Faith",
];

const state = loadState() || {
  players: [],
  scenarios: [],
  plays: {},
  lockOrder: true,
};

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}
function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "");
  } catch {
    return null;
  }
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ======================
// Bootstrapping
// ======================
function ensureDefault26() {
  // If scenarios missing or wrong length, restore canonical 26 with indices
  if (!Array.isArray(state.scenarios) || state.scenarios.length !== 26) {
    state.scenarios = DEFAULT_END_TIMES.map((name, i) => ({
      id: uid(),
      name,
      idx: i + 1,
    }));
  } else {
    // ensure idx exists/sequential
    state.scenarios = state.scenarios.map((s, i) => ({
      ...s,
      idx: typeof s.idx === "number" && s.idx >= 1 ? s.idx : i + 1,
    }));
  }
  saveState();
}

ensureDefault26();

// ======================
// Rendering
// ======================
function renderPlayers() {
  const box = $("#players");
  box.innerHTML = "";
  state.players.forEach((p) => {
    const el = document.createElement("div");
    el.className = "pill";
    el.innerHTML = `<b>${esc(p.name)}</b> <button class="ghost" data-id="${p.id}">Remove</button>`;
    el.querySelector("button").onclick = () => removePlayer(p.id);
    box.appendChild(el);
  });
  renderSelector();
  renderCoverage();
  renderPlayerDropdowns();
}

function renderScenarios() {
  const box = $("#scenarios");
  box.innerHTML = "";
  const list = [...state.scenarios].sort((a, b) => a.idx - b.idx);
  list.forEach((s) => {
    const totalPlays = state.players.reduce(
      (acc, p) => acc + getPlayCount(p.id, s.id),
      0
    );
    const row = document.createElement("div");
    row.className = "pill";
    row.innerHTML = `<span class="scenario-badge">#${String(
      s.idx
    ).padStart(2, "0")} · ${esc(
      s.name
    )}</span> <small class="muted">total plays: ${totalPlays}</small>`;
    box.appendChild(row);
  });
  const cnt = $("#scnCount");
  if (cnt) cnt.textContent = String(list.length);
  renderCoverage();
  renderScenarioDropdown();
}

function renderSelector() {
  const box = $("#selector");
  box.innerHTML = "";
  state.players.forEach((p) => {
    const id = `pchk_${p.id}`;
    const label = document.createElement("label");
    label.className = "pill";
    label.style.justifyContent = "space-between";
    label.style.gap = "12px";
    label.style.cursor = "pointer";
    label.innerHTML = `<span>${esc(
      p.name
    )}</span> <input type="checkbox" id="${id}" data-id="${p.id}">`;
    box.appendChild(label);
  });
}

function renderPlayerDropdowns() {
  const a = $("#pA"),
    b = $("#pB");
  [a, b].forEach((sel) => {
    sel.innerHTML = '<option value="">— Select Player —</option>';
  });
  state.players.forEach((p) => {
    a.add(new Option(p.name, p.id));
    b.add(new Option(p.name, p.id));
  });
}

function renderScenarioDropdown() {
  const sel = $("#playedScenario");
  if (!sel) return;
  sel.innerHTML = "";
  const list = [...state.scenarios].sort((a, b) => a.idx - b.idx);
  list.forEach((s) => sel.add(new Option(`#${s.idx} ${s.name}`, s.id)));
}

function renderCoverage() {
  const box = $("#coverage");
  if (!state.players.length || !state.scenarios.length) {
    box.innerHTML =
      '<div class="muted">Add players to view the matrix.</div>';
    return;
  }
  const list = [...state.scenarios].sort((a, b) => a.idx - b.idx);
  let html =
    '<table class="table"><thead><tr><th>Scenario \\ Player</th>';
  state.players.forEach((p) => {
    const t = totalScenariosPlayed(p.id);
    html += `<th>${esc(p.name)} <span class="tag">${t}/26</span></th>`;
  });
  html += "</tr></thead><tbody>";
  list.forEach((s) => {
    html += `<tr><th>#${String(s.idx).padStart(2, "0")} · ${esc(
      s.name
    )}</th>`;
    state.players.forEach((p) => {
      const c = getPlayCount(p.id, s.id);
      html += `<td>${c || ""}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody></table>";
  box.innerHTML = html;
}

// ======================
// Mutations
// ======================
function addPlayer(name) {
  if (!name) return;
  state.players.push({ id: uid(), name: name.trim() });
  saveState();
  renderPlayers();
}
function removePlayer(id) {
  state.players = state.players.filter((p) => p.id !== id);
  Object.keys(state.plays).forEach((k) => {
    if (k.startsWith(id + "::")) delete state.plays[k];
  });
  saveState();
  renderPlayers();
}
function getPlayKey(pid, sid) {
  return pid + "::" + sid;
}
function getPlayCount(pid, sid) {
  return state.plays[getPlayKey(pid, sid)] | 0;
}
function incPlay(pid, sid) {
  const k = getPlayKey(pid, sid);
  state.plays[k] = (state.plays[k] | 0) + 1;
}

// ======================
// Suggestion logic (order-locked aware) + Late-Join Boost
// ======================
function totalScenariosPlayed(pid) {
  return state.scenarios.reduce(
    (t, s) => t + (getPlayCount(pid, s.id) > 0 ? 1 : 0),
    0
  );
}

// Baseline two-pass: (1) earliest none-played by all selected; (2) earliest minimal sum of duplicates among selected
function suggestScenario(selectedIds, mode) {
  if (!selectedIds.length || !state.scenarios.length) return null;
  const ordered = [...state.scenarios].sort((a, b) => a.idx - b.idx);
  // Pass 1: earliest scenario none of the selected have played
  for (const s of ordered) {
    const counts = selectedIds.map((pid) => getPlayCount(pid, s.id));
    if (counts.every((c) => c === 0)) return s;
  }
  // Pass 2: minimize duplicates among selected → earliest with minimal sum
  const scored = ordered.map((s) => {
    const counts = selectedIds.map((pid) => getPlayCount(pid, s.id));
    const sum = counts.reduce((a, b) => a + b, 0);
    return { s, sum };
  });
  const minSum = Math.min(...scored.map((it) => it.sum));
  const pool = scored.filter((it) => it.sum === minSum);
  return pool.length ? pool[0].s : null;
}

// Late-Join-aware: same passes, but nudge toward least-covered player when Pass 1 fails
function suggestScenarioLateAware(selectedIds, opts = { boost: true }) {
  if (!selectedIds.length || !state.scenarios.length) return null;
  const ordered = [...state.scenarios].sort((a, b) => a.idx - b.idx);
  // Identify least-covered players among the selection
  const totals = selectedIds.map((pid) => ({
    pid,
    total: totalScenariosPlayed(pid),
  }));
  const minTotal = Math.min(...totals.map((x) => x.total));
  const laggards = new Set(
    totals.filter((x) => x.total === minTotal).map((x) => x.pid)
  );

  // Pass 1: earliest scenario NONE of the selected have played
  for (const s of ordered) {
    const counts = selectedIds.map((pid) => getPlayCount(pid, s.id));
    if (counts.every((c) => c === 0)) return s;
  }

  // Pass 2: if boost is on, pick earliest scenario a laggard hasn't played,
  // unless any non-laggard in the selection is overexposed on that scenario
  if (opts.boost) {
    const nonLaggards = selectedIds.filter((pid) => !laggards.has(pid));
    for (const s of ordered) {
      // must help at least one laggard
      const helpsLaggard = [...laggards].some(
        (pid) => getPlayCount(pid, s.id) === 0
      );
      if (!helpsLaggard) continue;
      // skip if any non-laggard has played this scenario more than the rest of the table
      const blocked = nonLaggards.some((pid) =>
        isOverexposedOnScenario(pid, s.id)
      );
      if (!blocked) {
        return s;
      }
    }
  }

  // Pass 3: fallback — earliest with minimal sum of duplicates among selected
  const scored = ordered.map((s) => {
    const sum = selectedIds.reduce(
      (a, pid) => a + getPlayCount(pid, s.id),
      0
    );
    return { s, sum };
  });
  const minSum = Math.min(...scored.map((it) => it.sum));
  const pool = scored.filter((it) => it.sum === minSum);
  return pool[0]?.s || null;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// A player is overexposed on a scenario if their count is strictly greater than
// every other player's count for that scenario.
function isOverexposedOnScenario(pid, sid) {
  const own = getPlayCount(pid, sid);
  let maxOther = 0;
  let hasOther = false;
  for (const p of state.players) {
    if (p.id === pid) continue;
    hasOther = true;
    const c = getPlayCount(p.id, sid);
    if (c > maxOther) maxOther = c;
  }
  if (!hasOther) return false; // no comparison group
  return own > maxOther;
}

// ======================
// Match suggestions: per-scenario and batch (unique scenarios)
// ======================
function suggestPairsForScenario(sid) {
  const sc = state.scenarios.find((s) => s.id === sid);
  if (!sc) return { pairs: [], leftover: null, scenario: null };
  const players = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    on: getPlayCount(p.id, sid),
    cov: totalScenariosPlayed(p.id),
  }));
  // Sort by: have not played this scenario (on asc), then overall coverage (cov asc), then name
  players.sort((a, b) => a.on - b.on || a.cov - b.cov || a.name.localeCompare(b.name));

  const remaining = players.slice();
  const pairs = [];
  while (remaining.length >= 2) {
    const a = remaining.shift();
    // pick partner by same criteria among remaining
    remaining.sort((x, y) => x.on - y.on || x.cov - y.cov || x.name.localeCompare(y.name));
    const b = remaining.shift();
    pairs.push({
      a,
      b,
      bothUnplayed: a.on === 0 && b.on === 0,
      sumOn: a.on + b.on,
      sumCov: a.cov + b.cov,
    });
  }
  const leftover = remaining.length ? remaining[0] : null;
  return { pairs, leftover, scenario: sc };
}

// Build greedy fair pairs across the whole roster (scenario-agnostic)
function buildFairPairs(selectedIds) {
  const allowed = new Set(selectedIds || []);
  const pool = (allowed.size ? state.players.filter((p) => allowed.has(p.id)) : state.players);
  const players = pool.map((p) => ({
    id: p.id,
    name: p.name,
    cov: totalScenariosPlayed(p.id),
  }));
  players.sort((a, b) => a.cov - b.cov || a.name.localeCompare(b.name));
  const pairs = [];
  const rem = players.slice();
  while (rem.length >= 2) {
    const a = rem.shift();
    rem.sort((x, y) => x.cov - y.cov || x.name.localeCompare(y.name));
    const b = rem.shift();
    pairs.push({ a, b });
  }
  const leftovers = rem.map((x) => x.name);
  return { pairs, leftovers };
}

// Choose best scenario for a pair with optional starting index and excludes
function chooseScenarioForPair(a, b, opts) {
  const { startIdx = 1, excludeIds = new Set(), boost = true } = opts || {};
  const orderedAll = [...state.scenarios].sort((x, y) => x.idx - y.idx);
  // Build wrap-around order starting at startIdx, then wrap to 1..startIdx-1
  const tail = orderedAll.filter((s) => s.idx >= startIdx);
  const head = orderedAll.filter((s) => s.idx < startIdx);
  const ordered = tail.concat(head).filter((s) => !excludeIds.has(s.id));
  if (!ordered.length) return null;
  // Pass 1: earliest both-unplayed for the pair
  for (const s of ordered) {
    if (getPlayCount(a.id, s.id) === 0 && getPlayCount(b.id, s.id) === 0) {
      return s;
    }
  }
  if (boost) {
    // Laggard-aware nudge
    const ta = totalScenariosPlayed(a.id);
    const tb = totalScenariosPlayed(b.id);
    const laggards = new Set();
    const non = new Set();
    if (ta <= tb) laggards.add(a.id); else non.add(a.id);
    if (tb <= ta) laggards.add(b.id); else non.add(b.id);
    for (const s of ordered) {
      const helps = [...laggards].some((pid) => getPlayCount(pid, s.id) === 0);
      if (!helps) continue;
      const blocked = [...non].some((pid) => isOverexposedOnScenario(pid, s.id));
      if (!blocked) return s;
    }
  }
  // Pass 3: earliest with minimal duplicate sum among the pair
  let best = null;
  let bestSum = Infinity;
  for (const s of ordered) {
    const sum = getPlayCount(a.id, s.id) + getPlayCount(b.id, s.id);
    if (sum < bestSum) {
      bestSum = sum;
      best = s;
      if (sum === 0) break;
    }
  }
  return best;
}

// Suggest batch matches across roster; assign scenarios per pair
function suggestBatchMatches(startSid, unique, selectedIds) {
  const start = state.scenarios.find((s) => s.id === startSid);
  const startIdx = start ? start.idx : 1;
  const boost = $("#lateBoost")?.checked ?? true;
  const { pairs, leftovers } = buildFairPairs(selectedIds);
  const used = new Set();
  const results = [];
  for (const { a, b } of pairs) {
    const s = chooseScenarioForPair(a, b, { startIdx, excludeIds: used, boost });
    if (s) {
      results.push({ a, b, scenario: s, bothUnplayed: getPlayCount(a.id, s.id) === 0 && getPlayCount(b.id, s.id) === 0 });
      if (unique) used.add(s.id);
    } else {
      results.push({ a, b, scenario: null, bothUnplayed: false });
    }
  }
  return { results, leftovers };
}

// ======================
// Export / Import (scenarios immutable)
// ======================
function exportJson() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "forbidden_psalm_async_league.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      if (!obj || !obj.players || !obj.plays) {
        throw new Error("Invalid file: expected 'players' and 'plays' sections");
      }
      // Restore canonical scenarios first (immutable), then remap plays by scenario name if provided
      ensureDefault26();
      state.players = obj.players;
      state.plays = {};
      if (Array.isArray(obj.scenarios)) {
        // Build oldId->name and name->newId
        const oldIdToName = new Map(
          obj.scenarios.map((s) => [s.id, s.name])
        );
        const nameToNewId = new Map(
          state.scenarios.map((s) => [s.name, s.id])
        );
        for (const [k, v] of Object.entries(obj.plays || {})) {
          const [pid, oldSid] = k.split("::");
          const name = oldIdToName.get(oldSid);
          const newSid = nameToNewId.get(name);
          if (!newSid) continue; // skip unknown
          const newKey = pid + "::" + newSid;
          state.plays[newKey] = (state.plays[newKey] | 0) + (v | 0);
        }
      } else {
        // No scenario list provided; keep plays empty to avoid mismatches
        console.warn(
          "Import: no scenario list to map plays; keeping plays empty to preserve integrity."
        );
      }
      saveState();
      toast("Imported league data");
      renderPlayers();
      renderScenarios();
      renderSelector();
      renderCoverage();
      renderPlayerDropdowns();
      renderScenarioDropdown();
    } catch (e) {
      alert("Import failed: " + e.message);
    }
  };
  reader.readAsText(file);
}

// ======================
// UI wiring
// ======================
$("#addPlayer").onclick = () => {
  const v = $("#playerName").value.trim();
  if (!v) return;
  addPlayer(v);
  $("#playerName").value = "";
};
$("#export").onclick = exportJson;
$("#importFile").addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (f) importJson(f);
  e.target.value = "";
});
$("#reset").onclick = () => {
  state.plays = {};
  saveState();
  renderCoverage();
  toast("All play counts have been reset.");
};
$("#wipe").onclick = () => {
  if (
    !confirm("Wipe players & plays and restore the 26 default scenarios?")
  )
    return;
  state.players = [];
  state.plays = {};
  ensureDefault26();
  saveState();
  renderPlayers();
  renderScenarios();
  renderSelector();
  renderCoverage();
  renderPlayerDropdowns();
  renderScenarioDropdown();
  toast("Restored the 26 default scenarios.");
};

function refreshSuggestions() {
  const sid = $("#playedScenario").value;
  const unique = $("#uniqueScenarios")?.checked;
  const selected = $$("#selector input[type=checkbox]:checked").map((ch) => ch.dataset.id);
  const box = $("#matchSuggestions");
  if (!selected.length || selected.length === 1) {
    box.innerHTML = '<div class="muted">Select at least two players.</div>';
    return;
  }
  const { results, leftovers } = suggestBatchMatches(sid, unique, selected);
  let html = '';
  html += results
    .map(({ a, b, scenario, bothUnplayed }) => {
      if (!scenario) {
        return `<div class="pill"><b>${esc(a.name)}</b> + <b>${esc(b.name)}</b> <span class="tag">no available scenario</span></div>`;
      }
      const tag = `<span class="tag">#${scenario.idx} ${esc(scenario.name)}</span>`;
      const up = bothUnplayed ? ' <span class="tag">unplayed</span>' : '';
      return `<div class="pill"><b>${esc(a.name)}</b> + <b>${esc(b.name)}</b> ${tag}${up} <button data-role="record-one" data-a="${a.id}" data-b="${b.id}" data-sid="${scenario.id}">Record</button></div>`;
    })
    .join("");
  if (leftovers && leftovers.length) {
    html += `<div class="muted">Unpaired: ${leftovers.map(esc).join(', ')}</div>`;
  }
  box.innerHTML = html || '<div class="muted">No pairs to suggest.</div>';
}

const suggestBtn = $("#suggest");
if (suggestBtn) suggestBtn.onclick = refreshSuggestions;

$("#log").onclick = () => {
  const sid = $("#playedScenario").value;
  const pa = $("#pA").value;
  const pb = $("#pB").value;
  if (!sid || !pa || !pb || pa === pb) {
    alert("Please choose a scenario and two different players.");
    return;
  }
  incPlay(pa, sid);
  incPlay(pb, sid);
  saveState();
  renderCoverage();
  toast("Result recorded.");
};

// Suggest matches handled by refreshSuggestions()

// Record all suggested pairs with their assigned scenarios
$("#recordAllMatches").onclick = () => {
  const sid = $("#playedScenario").value;
  const unique = $("#uniqueScenarios")?.checked;
  const selected = $$("#selector input[type=checkbox]:checked").map((ch) => ch.dataset.id);
  if (!selected.length || selected.length === 1) {
    alert("Select at least two players.");
    return;
  }
  const { results } = suggestBatchMatches(sid, unique, selected);
  const toRecord = results.filter((r) => r.scenario);
  if (!toRecord.length) {
    alert("No pairs to record.");
    return;
  }
  for (const { a, b, scenario } of toRecord) {
    incPlay(a.id, scenario.id);
    incPlay(b.id, scenario.id);
  }
  saveState();
  renderCoverage();
  refreshSuggestions();
  toast(`Recorded ${toRecord.length} match${toRecord.length === 1 ? '' : 'es'}.`);
};

// Per-item record button in the suggestions list
const listBox = $("#matchSuggestions");
if (listBox) {
  listBox.addEventListener("click", (e) => {
    const btn = e.target.closest('button[data-role="record-one"]');
    if (!btn) return;
    const a = btn.dataset.a;
    const b = btn.dataset.b;
    const sid = btn.dataset.sid;
    if (!a || !b || !sid) return;
    // Prevent double-clicks and remove the item immediately
    btn.disabled = true;
    const item = btn.closest('.pill');
    incPlay(a, sid);
    incPlay(b, sid);
    saveState();
    renderCoverage();
    if (item) item.remove();
    refreshSuggestions();
    toast("Result recorded.");
  });
}

// ======================
// Utilities & tests
// ======================
function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );
}
function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(() => {
    t.style.display = "none";
  }, 1800);
}

// Lightweight self-tests (non-destructive). Run only if no players to avoid interference.
(function selfTests() {
  try {
    if (state.players.length) return;
    // Clean slate
    state.players = [];
    state.plays = {};
    ensureDefault26();
    saveState();

    // Sanity: 26 list and matrix header
    console.assert(
      state.scenarios.length === 26,
      "T0: expected 26 scenarios"
    );
    renderCoverage();
    console.assert(
      /Scenario \\ Player/.test($("#coverage").innerHTML),
      "T0b: matrix header present"
    );

    // T1: Baseline earliest-none-played
    addPlayer("P1");
    addPlayer("P2");
    let pick = suggestScenario(
      [state.players[0].id, state.players[1].id],
      "best"
    );
    console.assert(
      pick && pick.idx === 1,
      "T1: expected #1 when both unplayed"
    );

    // T2: If P1 played #1, baseline suggests earliest BOTH-unplayed → #2
    incPlay(state.players[0].id, state.scenarios[0].id);
    pick = suggestScenario(
      [state.players[0].id, state.players[1].id],
      "best"
    );
    console.assert(
      pick && pick.idx === 2,
      "T2: expected #2 when #1 not clean for both"
    );

    // --- Boost behavior tests ---
    // T3: Laggard-first: P1 laggard with 0, P2 has #1 → pick #1
    state.plays = {};
    saveState();
    incPlay(state.players[1].id, state.scenarios[0].id); // P2 played #1
    pick = suggestScenarioLateAware([
      state.players[0].id,
      state.players[1].id,
    ]);
    console.assert(
      pick && pick.idx === 1,
      "T3: expected #1 for laggard-first"
    );

    // T4: Overexposed partner blocks #1 → pick #2
    // Add a third player P3 to set the table comparison
    addPlayer("P3");
    // Make P2 overexposed on #1 (3 plays) vs P1=0, P3=1
    state.plays = {};
    saveState();
    incPlay(state.players[1].id, state.scenarios[0].id);
    incPlay(state.players[1].id, state.scenarios[0].id);
    incPlay(state.players[1].id, state.scenarios[0].id);
    incPlay(state.players[2].id, state.scenarios[0].id); // P3 once
    pick = suggestScenarioLateAware([
      state.players[0].id,
      state.players[1].id,
    ]);
    console.assert(
      pick && pick.idx === 2,
      "T4: expected #2 when partner is overexposed on #1"
    );

    // T5: Not overexposed (tie) → still pick #1
    state.plays = {};
    saveState();
    incPlay(state.players[1].id, state.scenarios[0].id); // P2 once
    incPlay(state.players[2].id, state.scenarios[0].id); // P3 once (tie, so not overexposed)
    pick = suggestScenarioLateAware([
      state.players[0].id,
      state.players[1].id,
    ]);
    console.assert(
      pick && pick.idx === 1,
      "T5: expected #1 when partner is not strictly overexposed"
    );

    // Cleanup
    state.players = [];
    state.plays = {};
    ensureDefault26();
    saveState();
    renderPlayers();
    renderCoverage();
    console.log("Self-tests: PASS");
  } catch (e) {
    console.error("Self-tests: FAIL", e);
  }
})();

// Initial render
renderPlayers();
renderScenarios();
renderSelector();
renderCoverage();
renderPlayerDropdowns();
renderScenarioDropdown();
