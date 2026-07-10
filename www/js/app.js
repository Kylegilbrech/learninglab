/* ============================================================================
 * app.js — Gridiron Fantasy game logic + UI.
 * Rules preserved from the original prototype; adds an on-field formation view,
 * team-colored avatars, persistence, haptics, confetti, toasts and onboarding.
 * ==========================================================================*/

const PLAYERS = window.PLAYERS;

/* ---------- RULES ---------- */
const BUDGET = 100.0;
const SQUAD_LIMIT = { QB: 2, RB: 4, WR: 5, TE: 2, K: 1, DST: 1 };   // exact squad = 15
const START_REQ   = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1 };   // + 1 FLEX = 9 starters
const FLEX_ELIG   = ["RB", "WR", "TE"];
const MAX_PER_TEAM = 3;
const POS_ORDER = ["QB", "RB", "WR", "TE", "K", "DST"];
const POS_COLOR = {
  QB: "var(--qb)", RB: "var(--rb)", WR: "var(--wr)", TE: "var(--te)", K: "var(--k)", DST: "var(--dst)",
};
const byId = {};
PLAYERS.forEach((p) => (byId[p.id] = p));

/* ---------- STATE ---------- */
const SAVE_KEY = "gridiron.state.v1";
const SEEN_KEY = "gridiron.seen.v1";
let state = { squad: [], starters: [], captain: null, vice: null };
let tab = "market", filter = "ALL", q = "", sort = "pts";

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    const squad = (s.squad || []).filter((id) => byId[id]);
    const starters = (s.starters || []).filter((id) => squad.includes(id));
    state = {
      squad,
      starters,
      captain: squad.includes(s.captain) ? s.captain : null,
      vice: squad.includes(s.vice) ? s.vice : null,
    };
  } catch (e) {}
}

/* ---------- DERIVED ---------- */
const squadPlayers = () => state.squad.map((id) => byId[id]);
const posCount = (pos) => squadPlayers().filter((p) => p.pos === pos).length;
const teamCount = (tm) => squadPlayers().filter((p) => p.team === tm).length;
const squadValue = () => squadPlayers().reduce((s, p) => s + p.price, 0);
const bank = () => +(BUDGET - squadValue()).toFixed(1);

function canAdd(p) {
  if (state.squad.includes(p.id)) return { ok: false, why: "Already in squad" };
  if (posCount(p.pos) >= SQUAD_LIMIT[p.pos]) return { ok: false, why: `Max ${SQUAD_LIMIT[p.pos]} ${p.pos}` };
  if (teamCount(p.team) >= MAX_PER_TEAM) return { ok: false, why: `Max ${MAX_PER_TEAM} from ${p.team}` };
  if (p.price > bank() + 1e-9) return { ok: false, why: "Not enough budget" };
  return { ok: true };
}
function addPlayer(p) {
  const c = canAdd(p);
  if (!c.ok) { toast(c.why, "bad"); hapticWarn(); return; }
  const wasComplete = squadComplete();
  state.squad.push(p.id);
  save();
  if (!wasComplete && squadComplete()) {
    ensureLineup();
    hapticSuccess();
    toast("Squad complete — set your XI! 🏈", "good");
    burstConfetti(innerWidth / 2, innerHeight * 0.4);
  } else {
    hapticLight();
    toast(`Signed ${p.name}`, "good");
  }
  render();
}
function removePlayer(id) {
  state.squad = state.squad.filter((x) => x !== id);
  state.starters = state.starters.filter((x) => x !== id);
  if (state.captain === id) state.captain = null;
  if (state.vice === id) state.vice = null;
  save();
  hapticLight();
  render();
}

/* ---------- VALIDATION ---------- */
function startersValid() {
  const s = state.starters.map((id) => byId[id]);
  if (s.length !== 9) return { ok: false, why: `Pick exactly 9 starters (have ${s.length})` };
  const c = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
  s.forEach((p) => c[p.pos]++);
  if (c.QB !== 1) return { ok: false, why: "Need exactly 1 QB starting" };
  if (c.K !== 1) return { ok: false, why: "Need exactly 1 K starting" };
  if (c.DST !== 1) return { ok: false, why: "Need exactly 1 D/ST starting" };
  if (c.RB < 2) return { ok: false, why: "Need at least 2 RB starting" };
  if (c.WR < 2) return { ok: false, why: "Need at least 2 WR starting" };
  if (c.TE < 1) return { ok: false, why: "Need at least 1 TE starting" };
  if (c.RB + c.WR + c.TE !== 6) return { ok: false, why: "Flex error: RB+WR+TE must total 6" };
  return { ok: true };
}
function squadComplete() {
  return POS_ORDER.every((pos) => posCount(pos) === SQUAD_LIMIT[pos]) && state.squad.length === 15;
}
function xiScore() {
  if (!startersValid().ok) return 0;
  let total = state.starters.reduce((s, id) => s + byId[id].pts, 0);
  if (state.captain && state.starters.includes(state.captain)) total += byId[state.captain].pts;
  return +total.toFixed(1);
}

/* ---------- AUTO PICK ---------- */
function autoPick() {
  state = { squad: [], starters: [], captain: null, vice: null };
  const pools = {};
  POS_ORDER.forEach((pos) => {
    pools[pos] = PLAYERS.filter((p) => p.pos === pos).slice().sort((a, b) => b.pts - a.pts);
  });
  function minRemaining(needLeft) {
    let m = 0;
    for (const pos in needLeft) {
      const need = needLeft[pos];
      const cheap = pools[pos].slice().sort((a, b) => a.price - b.price).slice(0, need);
      m += cheap.reduce((s, p) => s + p.price, 0);
    }
    return m;
  }
  const need = { ...SQUAD_LIMIT };
  const order = ["RB", "WR", "QB", "TE", "DST", "K"];
  for (const pos of order) {
    while (need[pos] > 0) {
      const need2 = { ...need }; need2[pos]--;
      for (const cand of pools[pos]) {
        if (state.squad.includes(cand.id)) continue;
        if (teamCount(cand.team) >= MAX_PER_TEAM) continue;
        const reserve = minRemaining(need2);
        if (cand.price <= bank() - reserve + 1e-9) { state.squad.push(cand.id); need[pos]--; break; }
      }
      if (need[pos] > 0) {
        const cheapest = pools[pos]
          .filter((p) => !state.squad.includes(p.id) && teamCount(p.team) < MAX_PER_TEAM)
          .sort((a, b) => a.price - b.price)[0];
        if (cheapest) { state.squad.push(cheapest.id); need[pos]--; } else break;
      }
    }
  }
  autoStarters();
  save();
  hapticSuccess();
  toast("Auto-drafted a full squad ⚡", "good");
  burstConfetti(innerWidth / 2, innerHeight * 0.4);
  render();
}
function autoStarters() {
  const sq = squadPlayers();
  const pick = [];
  const take = (pos, n) => {
    sq.filter((p) => p.pos === pos && !pick.includes(p.id))
      .sort((a, b) => b.pts - a.pts).slice(0, n).forEach((p) => pick.push(p.id));
  };
  take("QB", 1); take("K", 1); take("DST", 1); take("RB", 2); take("WR", 2); take("TE", 1);
  const flex = sq.filter((p) => FLEX_ELIG.includes(p.pos) && !pick.includes(p.id))
    .sort((a, b) => b.pts - a.pts)[0];
  if (flex) pick.push(flex.id);
  state.starters = pick;
  const ranked = pick.map((id) => byId[id]).sort((a, b) => b.pts - a.pts);
  state.captain = ranked[0] ? ranked[0].id : null;
  state.vice = ranked[1] ? ranked[1].id : null;
}
function ensureLineup() {
  if (squadComplete() && !startersValid().ok && state.starters.length < 9) autoStarters();
}

/* ---------- HAPTICS ---------- */
function haptic(style) {
  const Cap = window.Capacitor;
  if (Cap && Cap.Plugins && Cap.Plugins.Haptics) {
    try { Cap.Plugins.Haptics.impact({ style }); return; } catch (e) {}
  }
  if (navigator.vibrate) navigator.vibrate(style === "HEAVY" ? 30 : style === "MEDIUM" ? 18 : 10);
}
function hapticLight() { haptic("LIGHT"); }
function hapticWarn() {
  const Cap = window.Capacitor;
  if (Cap && Cap.Plugins && Cap.Plugins.Haptics) { try { Cap.Plugins.Haptics.notification({ type: "WARNING" }); return; } catch (e) {} }
  if (navigator.vibrate) navigator.vibrate([12, 40, 12]);
}
function hapticSuccess() {
  const Cap = window.Capacitor;
  if (Cap && Cap.Plugins && Cap.Plugins.Haptics) { try { Cap.Plugins.Haptics.notification({ type: "SUCCESS" }); return; } catch (e) {} }
  if (navigator.vibrate) navigator.vibrate([10, 30, 10, 30, 20]);
}

/* ---------- TOASTS ---------- */
let toastTimer;
function toast(msg, kind) {
  const wrap = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast " + (kind || "");
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => { el.style.transition = "opacity .3s, transform .3s"; el.style.opacity = "0"; el.style.transform = "translateY(8px)"; }, 1500);
  setTimeout(() => el.remove(), 1850);
}

/* ---------- FORMAT ---------- */
function fmt(n) { return (Math.round(n * 10) / 10).toFixed(1); }

/* ---------- RENDER ---------- */
function setTab(t) {
  tab = t;
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
  render();
  document.getElementById("main").scrollTop = 0;
}

function render() {
  const bk = bank();
  const bankEl = document.getElementById("bankVal");
  bankEl.innerHTML = `$${fmt(bk)}<small>m</small>`;
  document.getElementById("stBank").classList.toggle("bankbad", bk < 0);
  document.getElementById("bankFill").style.width = Math.max(0, Math.min(100, (bk / BUDGET) * 100)) + "%";
  document.getElementById("cntVal").innerHTML = `${state.squad.length}<small>/15</small>`;
  document.getElementById("squadFill").style.width = (state.squad.length / 15) * 100 + "%";
  animateNumber(document.getElementById("scoreVal"), xiScore());
  document.getElementById("main").innerHTML = tab === "market" ? marketView() : squadView();
  document.getElementById("fbar").innerHTML = footer();
}

let numAnimRaf;
function animateNumber(el, target) {
  const cur = parseFloat(el.dataset.val || "0");
  if (cur === target) { el.textContent = fmt(target); return; }
  cancelAnimationFrame(numAnimRaf);
  const start = performance.now(), dur = 500;
  function step(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = cur + (target - cur) * eased;
    el.textContent = fmt(val);
    if (t < 1) numAnimRaf = requestAnimationFrame(step);
    else el.dataset.val = target;
  }
  el.dataset.val = target;
  numAnimRaf = requestAnimationFrame(step);
}

function footer() {
  if (tab === "market")
    return `<button class="fbtn ghost" onclick="autoPick()">⚡ Auto Draft</button>
            <button class="fbtn primary" onclick="setTab('squad')">My Squad →</button>`;
  return `<button class="fbtn ghost" onclick="confirmReset()">Reset</button>
          <button class="fbtn primary" onclick="setTab('market')">← Market</button>`;
}
function confirmReset() {
  const sc = document.getElementById("sheetcard");
  sc.innerHTML = `
    <h3>Reset squad?</h3>
    <div class="ssub2">This clears all 15 players and your lineup. Can't be undone.</div>
    <button class="sheetbtn danger" onclick="resetAll();closeSheet()">Yes, reset everything</button>
    <button class="sheetbtn ghost" onclick="closeSheet()">Cancel</button>`;
  document.getElementById("sheet").classList.add("on");
}
function resetAll() {
  state = { squad: [], starters: [], captain: null, vice: null };
  save(); hapticWarn(); toast("Squad cleared", "bad"); render();
}

/* ----- MARKET ----- */
function marketView() {
  const chips = ["ALL", ...POS_ORDER].map((f) =>
    `<button class="chip ${filter === f ? "on" : ""}" onclick="filter='${f}';render()">${f}</button>`).join("");
  let list = PLAYERS.filter((p) => filter === "ALL" || p.pos === filter);
  if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
  list = list.slice().sort((a, b) =>
    sort === "price" ? b.price - a.price : sort === "value" ? b.pts / b.price - a.pts / a.price : b.pts - a.pts);
  const rows = list.length ? list.map(playerRow).join("") : `<div class="empty-pool">No players match.</div>`;
  const sortLbl = sort === "price" ? "PRICE" : sort === "value" ? "VALUE" : "POINTS";
  return `
   <div class="filters">${chips}</div>
   <div class="toolbar">
     <input class="search" placeholder="Search player or team…" value="${q}"
        oninput="q=this.value.toLowerCase();render();this.focus();this.setSelectionRange(this.value.length,this.value.length)">
     <button class="sortbtn" onclick="sort = sort==='pts'?'price':sort==='price'?'value':'pts';render()">⇅ ${sortLbl}</button>
   </div>
   ${rows}
   <div class="info">
     <b>Real 2025 season data.</b> Points use PPR season totals (nflverse / Fantasy.NFL.com);
     prices are scaled from production so the <b>$100.0m</b> cap forces trade-offs. D/ST is
     approximated from defensive stats. Player art is stylized — not official NFL imagery.
   </div>`;
}
function playerRow(p) {
  const owned = state.squad.includes(p.id);
  const c = canAdd(p);
  const t = window.teamOf(p.team);
  const btn = owned
    ? `<button class="btn rem" onclick="removePlayer('${p.id}')" aria-label="Remove">−</button>`
    : `<button class="btn add" ${c.ok ? "" : "disabled"} onclick="addPlayer(byId['${p.id}'])" aria-label="Add">+</button>`;
  const value = (p.pts / p.price).toFixed(0);
  return `<div class="prow ${owned ? "owned" : ""}">
    ${window.avatar(p, { size: 46, ring: POS_COLOR[p.pos] })}
    <div class="pinfo">
      <div class="nm">${p.name}</div>
      <div class="sub">
        <span class="teamdot" style="background:${t.primary}"></span>${p.team}
        · <span class="pts">${fmt(p.pts)} pts</span>${owned ? " · OWNED" : c.ok ? "" : " · " + c.why}
      </div>
    </div>
    <div class="pright">
      <div class="price">$${fmt(p.price)}<small>m</small></div>
      <div class="vpill">${value} pts/$m</div>
    </div>
    ${btn}
  </div>`;
}

/* ----- SQUAD ----- */
function squadView() {
  if (!squadComplete()) return buildView();
  ensureLineup();
  return fieldView();
}

function buildView() {
  const missing = POS_ORDER.filter((pos) => posCount(pos) < SQUAD_LIMIT[pos])
    .map((pos) => `${SQUAD_LIMIT[pos] - posCount(pos)} ${pos}`).join(" · ");
  const banner = `<div class="banner warn">⚠ Squad in progress — still need: ${missing || "—"}<br>
     Bank: <b>$${fmt(bank())}m</b>${bank() < 0 ? " · over budget!" : ""} · ${state.squad.length}/15 signed.</div>`;
  let cols = "";
  for (const pos of POS_ORDER) {
    const owned = squadPlayers().filter((p) => p.pos === pos);
    const cards = [];
    for (let i = 0; i < SQUAD_LIMIT[pos]; i++) {
      cards.push(owned[i] ? rosterCard(owned[i]) : addCard(pos));
    }
    cols += `<div class="poscol">
       <div class="poslbl"><span>${window.POS_META[pos].label}</span><b>${owned.length}/${SQUAD_LIMIT[pos]}</b></div>
       <div class="rosterrow">${cards.join("")}</div></div>`;
  }
  return `${banner}
    <div class="section">BUILD YOUR SQUAD <span>tap + in Market</span></div>
    ${cols}
    <div class="info"><b>Fill all 15:</b> 2 QB · 4 RB · 5 WR · 2 TE · 1 K · 1 D/ST, under
      <b>$100m</b>, max 3 per NFL team. Then line up your starting XI on the field.</div>`;
}
function rosterCard(p) {
  return `<div class="benchcard" onclick="openSheet('${p.id}')">
     ${window.avatar(p, { size: 48, ring: POS_COLOR[p.pos], tag: "r" })}
     <div class="bc-nm">${p.name}</div>
     <div class="bc-sub">${p.team} · $${fmt(p.price)}m</div>
     <div class="bc-pts">${fmt(p.pts)} pts</div>
   </div>`;
}
function addCard(pos) {
  return `<div class="benchcard" style="border-style:dashed;opacity:.7"
       onclick="filter='${pos}';setTab('market')">
     <div class="bc-tok tok" style="width:48px;height:48px;display:grid;place-items:center;background:transparent;box-shadow:none">
        <span style="font-size:22px;color:${POS_COLOR[pos]}">+</span></div>
     <div class="bc-nm" style="color:var(--mut)">Add ${pos}</div>
     <div class="bc-sub">tap →</div>
   </div>`;
}

/* on-field formation */
function fieldView() {
  const sv = startersValid();
  const cap = state.captain ? byId[state.captain] : null;
  const banner = sv.ok
    ? `<div class="banner ok">✓ XI locked — projected <b>${fmt(xiScore())} pts</b>${cap ? ` · © ${cap.name} ×2` : ""}. Tap any player to swap or set Captain.</div>`
    : `<div class="banner warn">Set your starting XI: ${sv.why}. Tap bench players to promote them.</div>`;

  // slot the 9 starters into roles
  const st = state.starters.map((id) => byId[id]);
  const byPos = (pos) => st.filter((p) => p.pos === pos).sort((a, b) => b.pts - a.pts);
  const used = new Set();
  const grab = (pos, n) => byPos(pos).filter((p) => !used.has(p.id)).slice(0, n).map((p) => (used.add(p.id), p));
  const qb = grab("QB", 1), rbs = grab("RB", 2), wrs = grab("WR", 2), te = grab("TE", 1);
  const k = grab("K", 1), dst = grab("DST", 1);
  const flex = st.filter((p) => !used.has(p.id) && FLEX_ELIG.includes(p.pos));

  const row = (label, players) =>
    `<div class="gf-label">${label}</div>
     <div class="gf-row">${players.map(fieldPlayer).join("") || fieldEmpty()}</div>`;

  const pitch = `
    <div class="gridfield">
      <div class="gf-endzone top">ENDZONE</div>
      <div class="gf-rows">
        ${row("Wideouts", wrs)}
        ${row("Tight End · Flex", te.concat(flex))}
        ${row("Backfield", [rbs[0], qb[0], rbs[1]].filter(Boolean))}
        ${row("Special Teams", k.concat(dst))}
      </div>
      <div class="gf-endzone bottom">GRIDIRON</div>
    </div>`;

  const bench = squadPlayers().filter((p) => !state.starters.includes(p.id))
    .sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || b.pts - a.pts);
  const benchHtml = bench.length
    ? `<div class="section">BENCH <span>${bench.length} players</span></div>
       <div class="benchgrid">${bench.map(benchCard).join("")}</div>`
    : "";

  return `${banner}
    <div class="section">STARTING XI <span><b>${state.starters.length}</b>/9 · tap to edit</span></div>
    ${pitch}
    ${benchHtml}
    <div class="info"><b>Captain (©) scores ×2.</b> Your XI needs 1 QB · 2 RB · 2 WR · 1 TE ·
      1 FLEX (RB/WR/TE) · 1 K · 1 D/ST. Tap a player on the field or bench to manage them.</div>`;
}
function fieldPlayer(p) {
  if (!p) return fieldEmpty();
  const isCap = state.captain === p.id, isVice = state.vice === p.id;
  const badge = isCap ? `<div class="cvbadge cap">C</div>` : isVice ? `<div class="cvbadge vice">V</div>` : "";
  return `<div class="field-player" onclick="openSheet('${p.id}')">
     <div class="fp-tok ${isCap ? "captain" : ""}">
        ${window.avatar(p, { size: 52, tag: "f" })}${badge}
     </div>
     <div class="fp-name">${p.name.split(" ").slice(-1)[0]}</div>
     <div class="fp-pts">${fmt(p.pts)}</div>
   </div>`;
}
function fieldEmpty() {
  return `<div class="field-player empty"><div class="fp-add">+</div><div class="fp-name">Open</div></div>`;
}
function benchCard(p) {
  const startable = canStart(p.id).ok;
  return `<div class="benchcard ${startable ? "startable" : ""}" onclick="openSheet('${p.id}')">
     ${window.avatar(p, { size: 46, ring: POS_COLOR[p.pos], tag: "b" })}
     <div class="bc-nm">${p.name}</div>
     <div class="bc-sub">${p.team} · ${p.pos}</div>
     <div class="bc-pts">${fmt(p.pts)} pts</div>
   </div>`;
}

/* ----- can a player legally start right now? ----- */
function canStart(id) {
  const p = byId[id];
  if (state.starters.includes(id)) return { ok: false, why: "Already starting" };
  if (state.starters.length >= 9) return { ok: false, why: "XI full — bench someone first" };
  const c = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
  state.starters.forEach((x) => c[byId[x].pos]++);
  c[p.pos]++;
  const cap = START_REQ[p.pos] + (FLEX_ELIG.includes(p.pos) ? 1 : 0);
  if (c[p.pos] > cap) return { ok: false, why: `Too many ${p.pos} starting` };
  return { ok: true };
}

/* ----- action sheet ----- */
function openSheet(id) {
  const p = byId[id];
  const starting = state.starters.includes(id);
  const cs = canStart(id);
  const sc = document.getElementById("sheetcard");
  sc.innerHTML = `
    <div class="sheet-head">
      ${window.avatar(p, { size: 54, ring: POS_COLOR[p.pos], tag: "s" })}
      <div>
        <h3>${p.name}</h3>
        <div class="ssub2">${window.POS_META[p.pos].label} · ${window.teamOf(p.team).city} ${window.teamOf(p.team).name} · $${fmt(p.price)}m · ${fmt(p.pts)} pts</div>
      </div>
    </div>
    ${
      starting
        ? `<button class="sheetbtn" onclick="benchPlayer('${id}')">⬇ Move to Bench</button>`
        : `<button class="sheetbtn primary" ${cs.ok ? "" : "disabled"} onclick="startPlayer('${id}')">
             ${cs.ok ? "⬆ Move to Starting XI" : "Can't start — " + cs.why}</button>`
    }
    <button class="sheetbtn amber" ${starting ? "" : "disabled"} onclick="setCaptain('${id}')">
       ${state.captain === id ? "★ Captain (×2)" : "Make Captain (×2)"}</button>
    <button class="sheetbtn cyan" ${starting ? "" : "disabled"} onclick="setVice('${id}')">
       ${state.vice === id ? "Vice-Captain ✓" : "Make Vice-Captain"}</button>
    <button class="sheetbtn danger" onclick="removePlayer('${id}');closeSheet()">Sell / Remove from Squad</button>
    <button class="sheetbtn ghost" onclick="closeSheet()">Cancel</button>`;
  document.getElementById("sheet").classList.add("on");
}
function closeSheet() { document.getElementById("sheet").classList.remove("on"); }
function startPlayer(id) {
  if (!canStart(id).ok) return;
  state.starters.push(id); save(); hapticLight(); closeSheet(); render();
}
function benchPlayer(id) {
  state.starters = state.starters.filter((x) => x !== id);
  if (state.captain === id) state.captain = null;
  if (state.vice === id) state.vice = null;
  save(); hapticLight(); closeSheet(); render();
}
function setCaptain(id) {
  if (state.vice === id) state.vice = null;
  state.captain = id; save(); hapticSuccess(); closeSheet(); toast(`${byId[id].name} is Captain ★`, "good"); render();
}
function setVice(id) {
  if (state.captain === id) state.captain = null;
  state.vice = id; save(); hapticLight(); closeSheet(); render();
}

/* ----- onboarding ----- */
function openIntro() { document.getElementById("intro").classList.add("on"); }
function closeIntro() {
  document.getElementById("intro").classList.remove("on");
  try { localStorage.setItem(SEEN_KEY, "1"); } catch (e) {}
}

/* ---------- CAPACITOR / NATIVE ---------- */
function initNative() {
  const Cap = window.Capacitor;
  if (!Cap || !Cap.Plugins) return;
  const { StatusBar, SplashScreen, App } = Cap.Plugins;
  try { StatusBar && StatusBar.setBackgroundColor({ color: "#070b16" }); } catch (e) {}
  try { SplashScreen && SplashScreen.hide(); } catch (e) {}
  if (App) {
    App.addListener("backButton", () => {
      const sheet = document.getElementById("sheet");
      const intro = document.getElementById("intro");
      if (sheet.classList.contains("on")) { closeSheet(); return; }
      if (intro.classList.contains("on")) { closeIntro(); return; }
      if (tab === "squad") { setTab("market"); return; }
      App.exitApp();
    });
  }
}

/* ---------- BOOT ---------- */
document.getElementById("helpBtn").addEventListener("click", openIntro);
load();
render();
initNative();
if (!localStorage.getItem(SEEN_KEY)) openIntro();

// Register service worker only in a real browser/PWA context (not the Capacitor webview).
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
