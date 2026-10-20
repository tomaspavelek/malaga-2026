/* Plán pobytu: výlety, jídla a poznámky po dnech.
   Ukládá se v telefonu (localStorage). S kódem plánu se sdílí přes Firebase Realtime Database
   (REST + EventSource, bez SDK a bez přihlášení). Změny bez signálu čekají ve frontě a odešlou se po připojení.
   Zapisují se jen listy stromu (days/<datum>/acts, …/meals/<jídlo>, …/notes/<kdo>), takže dva telefony si
   nepřepisují celé dny. */
const PLAN = (() => {
  'use strict';

  const BASE = (TRIP.sync || '').replace(/\/+$/, '');
  const ls = {
    get(k, d) { try { const v = localStorage.getItem('mlg:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('mlg:' + k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  let data = ls.get('plan', { days: {} });
  if (!data || typeof data !== 'object' || !data.days) data = { days: {} };
  let queue = ls.get('planQueue', {});       // { 'days/2026-11-03/acts': hodnota } = ještě neodeslané zápisy
  let code = ls.get('planCode', null);
  let joining = ls.get('planJoining', false); // první spojení: dny, které má jen tento telefon, se nahrají
  let es = null, status = 'local', flushing = false;
  const subs = new Set();
  const emit = kind => subs.forEach(fn => { try { fn(kind); } catch (e) { console.error(e); } });
  const setStatus = s => { if (s !== status) { status = s; emit('status'); } };

  /* ---------- Strom dat ---------- */
  const isEmpty = v => v == null || v === '' || (Array.isArray(v) && !v.length) ||
    (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
  function setPath(root, path, val) {
    const keys = path.split('/').filter(Boolean);
    let o = root;
    for (let i = 0; i < keys.length - 1; i++) {
      if (typeof o[keys[i]] !== 'object' || o[keys[i]] === null) o[keys[i]] = {};
      o = o[keys[i]];
    }
    const last = keys[keys.length - 1];
    if (isEmpty(val)) delete o[last]; else o[last] = val;
  }
  const listOf = v => Array.isArray(v) ? v.filter(Boolean)
    : v && typeof v === 'object' ? Object.keys(v).sort((a, b) => a - b).map(k => v[k]).filter(Boolean) : [];
  const day = date => {
    const d = data.days[date] || {};
    return { acts: listOf(d.acts), meals: { ...(d.meals || {}) }, notes: { ...(d.notes || {}) } };
  };
  const leaves = (date, d) => {
    const out = {}, src = { acts: listOf(d.acts), meals: d.meals || {}, notes: d.notes || {} };
    if (src.acts.length) out[`days/${date}/acts`] = src.acts;
    Object.entries(src.meals).forEach(([m, id]) => { if (id) out[`days/${date}/meals/${m}`] = id; });
    Object.entries(src.notes).forEach(([w, t]) => { if (t) out[`days/${date}/notes/${w}`] = t; });
    return out;
  };

  /* ---------- Zápis ---------- */
  function write(path, val) {
    if (isEmpty(val)) val = null;
    setPath(data, path, val);
    ls.set('plan', data);
    if (code && BASE) { queue[path] = val; ls.set('planQueue', queue); flush(); }
    emit('local');
  }

  async function flush() {
    if (flushing || !code || !BASE || !Object.keys(queue).length) return;
    flushing = true;
    let again = false;
    try {
      for (const path of Object.keys(queue)) {
        const val = queue[path];
        const r = await fetch(`${BASE}/plans/${code}/${path}.json`, { method: 'PUT', body: JSON.stringify(val) });
        // 400/401/403 = pravidla zápis odmítla; opakovat to nemá smysl, jinak by fronta stála
        if (!r.ok && ![400, 401, 403].includes(r.status)) throw new Error('HTTP ' + r.status);
        if (!r.ok) console.warn('Plán: zápis odmítnut', path, r.status);
        if (JSON.stringify(queue[path]) === JSON.stringify(val)) delete queue[path];
      }
      again = Object.keys(queue).length > 0;   // mezitím přibyly další změny
    } catch {
      setStatus('offline');
    } finally {
      ls.set('planQueue', queue);
      flushing = false;
      if (again) setTimeout(flush, 0);
    }
  }

  /* ---------- Živé spojení ---------- */
  function connect() {
    if (es) { es.close(); es = null; }
    if (!code || !BASE) { setStatus('local'); return; }
    if (typeof EventSource === 'undefined') { setStatus('offline'); return; }
    setStatus('connecting');
    es = new EventSource(`${BASE}/plans/${code}.json`);
    es.addEventListener('put', e => apply(JSON.parse(e.data), false));
    es.addEventListener('patch', e => apply(JSON.parse(e.data), true));
    es.addEventListener('cancel', () => setStatus('error'));       // pravidla odmítla čtení
    es.onopen = () => flush();
    es.onerror = () => setStatus('offline');                       // EventSource se připojuje znovu sám
  }

  function apply(msg, isPatch) {
    if (!msg) return;
    const path = msg.path || '/';
    if (isPatch) {
      Object.entries(msg.data || {}).forEach(([k, v]) => setPath(data, path.replace(/\/$/, '') + '/' + k, v));
    } else if (path === '/') {
      const local = data;
      data = msg.data && typeof msg.data === 'object' ? msg.data : {};
      if (!data.days || typeof data.days !== 'object') data.days = {};
      if (joining) {
        Object.entries(local.days || {}).forEach(([d, v]) => {
          if (!data.days[d]) Object.assign(queue, leaves(d, v));
        });
        joining = false; ls.set('planJoining', false);
      }
    } else {
      setPath(data, path, msg.data);
    }
    // neodeslané změny z tohoto telefonu mají přednost
    Object.entries(queue).forEach(([p, v]) => setPath(data, p, v));
    ls.set('plan', data); ls.set('planQueue', queue);
    setStatus('live');
    emit('remote');
    flush();
  }

  /* ---------- Kód plánu ---------- */
  const ALPHA = 'abcdefghijkmnpqrstuvwxyz23456789';
  const gen = () => [...crypto.getRandomValues(new Uint8Array(20))].map(x => ALPHA[x % 32]).join('').replace(/(.{5})(?=.)/g, '$1-');
  const parseCode = s => {
    const m = String(s || '').trim().toLowerCase().match(/(?:#plan=)?([a-z0-9-]{20,40})\s*$/);
    return m ? m[1] : null;
  };
  function adopt(c) {
    code = c; ls.set('planCode', c);
    joining = true; ls.set('planJoining', true);
    queue = {}; ls.set('planQueue', queue);
  }
  function setCode(c) { adopt(c); connect(); emit('status'); }

  // odkaz od druhého telefonu: …/malaga-2026/#plan=<kód>
  let joinedFromLink = false;
  const fromHash = parseCode((location.hash.match(/^#plan=(.+)$/) || [])[1]);
  if (fromHash) {
    if (fromHash !== code) { adopt(fromHash); joinedFromLink = true; }
    history.replaceState(null, '', location.pathname + location.search);
  }

  connect();
  window.addEventListener('online', () => { if (code && (!es || es.readyState === 2)) connect(); else flush(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !code) return;
    if (!es || es.readyState === 2) connect(); else flush();
  });

  const sameList = (arr, f) => { const a = [...arr]; f(a); return a; };
  return {
    day,
    datesWith: id => Object.keys(data.days).filter(d => listOf(data.days[d].acts).includes(id)).sort(),
    mealsWith: id => Object.keys(data.days).sort().flatMap(d => Object.entries((data.days[d] || {}).meals || {}).filter(([, v]) => v === id).map(([m]) => ({ date: d, meal: m }))),
    addAct: (date, id) => write(`days/${date}/acts`, sameList(day(date).acts, a => a.push(id))),
    removeAct: (date, i) => write(`days/${date}/acts`, sameList(day(date).acts, a => a.splice(i, 1))),
    insertAct: (date, i, id) => write(`days/${date}/acts`, sameList(day(date).acts, a => a.splice(i, 0, id))),
    moveAct(date, i, dir) {
      const a = day(date).acts, j = i + dir;
      if (j < 0 || j >= a.length) return;
      [a[i], a[j]] = [a[j], a[i]];
      write(`days/${date}/acts`, a);
    },
    setMeal: (date, meal, id) => write(`days/${date}/meals/${meal}`, id || null),
    setNote: (date, who, text) => write(`days/${date}/notes/${who}`, String(text).slice(0, 2000)),
    enabled: () => !!BASE,
    code: () => code,
    status: () => status,
    pending: () => Object.keys(queue).length,
    joinedFromLink: () => joinedFromLink,
    create: () => setCode(gen()),
    join(input) { const c = parseCode(input); if (!c) return false; if (c !== code) setCode(c); return true; },
    leave() { if (es) es.close(); es = null; code = null; ls.set('planCode', null); queue = {}; ls.set('planQueue', queue); setStatus('local'); emit('status'); },
    shareUrl: () => code ? `${location.origin}${location.pathname}#plan=${code}` : null,
    onChange: fn => subs.add(fn),
  };
})();
