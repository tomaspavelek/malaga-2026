/* Málaga – logika stránky (vanilla JS, bez buildu). Obsah je v data/, plán a jeho sdílení v plan.js. */
(() => {
  'use strict';

  const TZ = 'Europe/Madrid';
  const STAY = TRIP.stay;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Úložiště (může selhat v anonymním režimu) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('mlg:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('mlg:' + k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  const TRIP_FILTERS = { wx: 'vse', cats: [], dur: [], dist: [], stroller: [], cost: [], must: false, hideDone: false, milo: false, stars: 0 };
  const FOOD_FILTERS = { meals: [], kids: [], tags: [], price: [], dist: [], milo: false, stars: 0 };
  const state = {
    tab: store.get('tab', 'dnes'),
    wxMode: store.get('wxMode', 'dnes'),
    stayDay: store.get('stayDay', TRIP.start),
    info: store.get('info', store.get('cesta', 'tam')),
    f: Object.assign({ ...TRIP_FILTERS, sort: 'must', more: false, view: 'list' }, store.get('filters', {})),
    ff: Object.assign({ ...FOOD_FILTERS, sort: 'dist', more: false, view: 'list' }, store.get('foodFilters', {})),
    pick: null,                       // výběr z Plánu: { kind: 'act' | 'meal', date, meal }
    done: store.get('done', {}),
    prepWho: store.get('prepWho', ''),  // filtr úkolů v Přípravě: '' = všichni, 'tom', 'misa'
    tipsMilo: store.get('tipsMilo', false),  // v Tipech jen to, co radí Miloťáci
    wx: store.get('wx2', null),       // { ts, fc, sea }
    wxLoading: false,
    wxError: null,
  };
  // dřív samostatné záložky Cesta a Tipy jsou teď v Info
  if (state.tab === 'cesta') state.tab = 'info';
  if (state.tab === 'tipy') { state.tab = 'info'; state.info = 'tipy'; }
  if (!['dnes', 'plan', 'vylety', 'jidlo', 'info'].includes(state.tab)) state.tab = 'dnes';

  /* ---------- Datumové pomůcky ---------- */
  const DOW = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  const DOW_S = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
  const todayStr = () => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date());
  const addDays = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const dow = d => new Date(d + 'T12:00:00Z').getUTCDay();
  const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5);
  const fmtD = d => { const [, m, day] = d.split('-'); return `${+day}. ${+m}.`; };
  const fmtLong = d => `${DOW[dow(d)]} ${fmtD(d)}`;
  const fmtS = d => `${DOW_S[dow(d)]} ${fmtD(d)}`;
  const nowHourMadrid = () => +new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(new Date());
  const stayDays = (() => { const out = []; for (let d = TRIP.start; d <= TRIP.end; d = addDays(d, 1)) out.push(d); return out; })();
  const plural = (n, one, few, many) => n === 1 ? one : (n >= 2 && n <= 4 ? few : many);
  const tripToday = () => { const t = todayStr(); return t >= TRIP.start && t <= TRIP.end ? t : null; };

  /* ---------- Formáty ---------- */
  const fmtKm = k => k < 1 ? `${Math.round(k * 1000 / 50) * 50} m` : `${k.toFixed(k < 10 ? 1 : 0).replace('.', ',')} km`;
  const fmtH = h => h >= 6 ? 'Celý den' : h < 1 ? `${Math.round(h * 60 / 5) * 5} min` : `${String(Math.round(h * 2) / 2).replace('.', ',')} h`;
  const fmtHours = h => `${String(Math.round(h * 2) / 2).replace('.', ',')} h`;
  const fmtMin = m => { m = Math.round(m); if (m < 60) return `${m} min`; const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${r} min` : `${h} h`; };
  const fmtMinShort = m => { m = Math.round(m); if (m < 60) return `${m} min`; const r = m % 60; return `${Math.floor(m / 60)}:${String(r).padStart(2, '0')} h`; };
  const fmtEur = x => {
    if (x === 0) return 'Zdarma';
    const v = Math.round(x * 100) / 100;
    return `${v.toLocaleString('cs-CZ', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })} €`;
  };

  /* ---------- Vzdálenost od ubytování a odvozené údaje ---------- */
  const km = (a, b) => {
    const R = 6371, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const DUR_H = { kratke: 1.5, pulden: 3.5, celyden: 7 };
  const ACT = {}, REST = {};
  ACTIVITIES.forEach(a => {
    ACT[a.id] = a;
    a.km = km(STAY, a);
    a.distKind = a.out ? 'vylet' : (a.km <= 1.5 ? 'pesky' : 'mesto');
    a.h = a.hours || DUR_H[a.durKind] || 2;                                   // hodiny na místě (bez cesty)
    a.rideMin = a.ride ? a.ride.min : a.nearby ? 10 : a.out ? 70 : 30;        // cesta jedním směrem
    a.cost = a.fam ? Math.round((a.fam.total + (a.ride && a.ride.cost || 0)) * 100) / 100 : null;   // vstup + doprava za rodinu
    a.costKind = a.cost == null ? null : a.cost === 0 ? 'free' : a.cost <= 20 ? 'do20' : a.cost <= 50 ? 'do50' : 'nad50';
  });
  FOOD.forEach(r => {
    REST[r.id] = r;
    r.km = km(STAY, r);
    r.walkMin = Math.round(r.km * 1.3 / 4.2 * 60);                          // s kočárkem asi 4 km/h, ulice nejsou vzdušná čára
    r.distKind = r.out ? 'vylet' : r.km <= 1 ? 'blizko' : r.km <= 3 ? 'mesto' : 'dal';
    // hodnocení z textu „TripAdvisor 3,8 (375) · Google 4,4 (5 747)“; hlavní je Google, TripAdvisor jako druhé
    const rate = src => { const m = (r.rating || '').match(new RegExp(src + ' (\\d,\\d) \\(([\\d \\u00a0]+)\\)')); return m ? { src, v: +m[1].replace(',', '.'), c: +m[2].replace(/\D/g, '') } : null; };
    r.rateG = rate('Google'); r.rateTA = rate('TripAdvisor');
    r.rate = r.rateG || r.rateTA;   // pro řazení
    // recenze: Google = místo v Mapách (přímý odkaz na recenze potřebuje place ID), TripAdvisor ze zdrojů, jinak hledání
    r.taUrl = ((r.src || []).find(([, u]) => /tripadvisor\./.test(u)) || [])[1] ||
      'https://www.tripadvisor.com/Search?q=' + encodeURIComponent(r.name + ' Málaga');
  });

  /* ---------- Počasí ---------- */
  const WMO = {
    0: ['Jasno', 'sun'], 1: ['Skoro jasno', 'sun'], 2: ['Polojasno', 'partly'], 3: ['Zataženo', 'cloud'],
    45: ['Mlha', 'fog'], 48: ['Mlha s námrazou', 'fog'],
    51: ['Slabé mrholení', 'drizzle'], 53: ['Mrholení', 'drizzle'], 55: ['Silné mrholení', 'drizzle'],
    56: ['Mrznoucí mrholení', 'drizzle'], 57: ['Mrznoucí mrholení', 'drizzle'],
    61: ['Slabý déšť', 'rain'], 63: ['Déšť', 'rain'], 65: ['Silný déšť', 'rain'], 66: ['Mrznoucí déšť', 'rain'], 67: ['Mrznoucí déšť', 'rain'],
    71: ['Sněžení', 'rain'], 73: ['Sněžení', 'rain'], 75: ['Sněžení', 'rain'], 77: ['Sněhová zrna', 'rain'],
    80: ['Přeháňky', 'showers'], 81: ['Silné přeháňky', 'showers'], 82: ['Prudké přeháňky', 'rain'],
    85: ['Sněhové přeháňky', 'showers'], 86: ['Sněhové přeháňky', 'showers'],
    95: ['Bouřka', 'storm'], 96: ['Bouřka s kroupami', 'storm'], 99: ['Bouřka s kroupami', 'storm'],
  };
  const wmo = c => WMO[c] || ['Proměnlivo', 'partly'];
  const icon = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const WX_LABEL = { slunce: 'Slunce', oblacno: 'Zataženo / chladněji', dest: 'Déšť' };
  const WX_ICON = { slunce: 'sun', oblacno: 'cloud', dest: 'rain' };

  const WX_URL = 'https://api.open-meteo.com/v1/forecast?latitude=' + STAY.lat + '&longitude=' + STAY.lon +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset' +
    '&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,cloud_cover' +
    '&timezone=Europe%2FMadrid&timeformat=unixtime&forecast_days=16';
  const SEA_URL = 'https://marine-api.open-meteo.com/v1/marine?latitude=36.69&longitude=-4.44&hourly=sea_surface_temperature&timezone=Europe%2FMadrid&timeformat=unixtime&forecast_days=16';

  /* Open-Meteo používá pro celou odpověď jeden pevný posun (dnes +2 h), i když 25. 10. končí letní čas.
     Proto bereme unixové časy a na místní datum a hodinu je převádíme sami. */
  const F_DATE = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ });
  const F_HOUR = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false });
  const F_HM = new Intl.DateTimeFormat('cs-CZ', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: false });
  let parsedTs = null, parsed = null;
  function wxParsed() {
    if (!state.wx || !state.wx.fc) return null;
    if (parsedTs === state.wx.ts) return parsed;
    const { fc, sea } = state.wx;
    const days = {}, hours = {}, seaByDate = {};
    fc.daily.time.forEach((t, i) => { days[F_DATE.format(new Date((t + 12 * 3600) * 1000))] = i; });
    const H = fc.hourly;
    H.time.forEach((t, j) => {
      const d = new Date(t * 1000), date = F_DATE.format(d);
      (hours[date] = hours[date] || []).push({ h: +F_HOUR.format(d) % 24, t: H.temperature_2m[j], p: H.precipitation_probability[j], mm: H.precipitation[j], c: H.weather_code[j], w: H.wind_speed_10m[j], cc: H.cloud_cover ? H.cloud_cover[j] : null });
    });
    if (sea && sea.hourly) sea.hourly.time.forEach((t, j) => {
      const v = sea.hourly.sea_surface_temperature[j]; if (v == null) return;
      const date = F_DATE.format(new Date(t * 1000)); (seaByDate[date] = seaByDate[date] || []).push(v);
    });
    parsedTs = state.wx.ts;
    parsed = { days, hours, seaByDate, dates: Object.keys(days) };
    return parsed;
  }

  async function loadWeather(force = false) {
    const fresh = state.wx && (Date.now() - state.wx.ts < 45 * 60e3);
    if (fresh && !force) return;
    state.wxLoading = true; state.wxError = null; rerenderWx();
    try {
      const [fc, sea] = await Promise.all([
        fetch(WX_URL).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
        fetch(SEA_URL).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      state.wx = { ts: Date.now(), fc, sea };
      store.set('wx2', state.wx);
    } catch (e) {
      state.wxError = navigator.onLine === false ? 'Jste offline. Ukazuju poslední uloženou předpověď.' : 'Předpověď se nepodařilo načíst. Zkuste to za chvíli znovu.';
    } finally {
      state.wxLoading = false; rerenderWx();
    }
  }
  // počasí ukazuje Dnes i Plán
  const rerenderWx = () => { if (state.tab === 'dnes') renderToday(); else if (state.tab === 'plan' && !editing()) renderPlan(); };

  /* Den v předpovědi -> souhrn + klasifikace pro doporučení */
  function dayWeather(date) {
    const P = wxParsed();
    const i = P && date in P.days ? P.days[date] : -1;
    if (i < 0) return climateDay(date);
    const d = state.wx.fc.daily;
    const hours = P.hours[date] || [];
    // Denní weather_code z Open-Meteo je NEJHORŠÍ hodina dne (i v noci), proto den hodnotíme z hodin 9–19.
    const wet = h => (h.p ?? 0) >= 50 || (h.mm ?? 0) >= 0.4;
    const daytime = hours.filter(h => h.h >= 9 && h.h <= 19);
    const rainAm = daytime.filter(h => h.h < 14 && wet(h)).length;
    const rainPm = daytime.filter(h => h.h >= 14 && wet(h)).length;
    const rainH = rainAm + rainPm;
    const tmax = d.temperature_2m_max[i], tmin = d.temperature_2m_min[i];
    const sum = d.precipitation_sum[i] ?? 0;
    const ccs = daytime.map(h => h.cc).filter(x => x != null);
    const cloud = ccs.length ? ccs.reduce((a, b) => a + b, 0) / ccs.length : (d.weather_code[i] >= 3 ? 90 : 30);
    let desc, ico;
    if (rainH >= 1) {
      const wc = Math.max(...daytime.filter(wet).map(h => h.c));
      [desc, ico] = wc >= 51 ? wmo(wc) : ['Možné přeháňky', 'showers'];
      if (rainH <= 2 && ico === 'rain') { desc = 'Občas přeháňky'; ico = 'showers'; }
    } else if (daytime.filter(h => h.c === 45 || h.c === 48).length >= 4) [desc, ico] = ['Mlha', 'fog'];
    else if (cloud < 25) [desc, ico] = ['Jasno', 'sun'];
    else if (cloud < 55) [desc, ico] = ['Polojasno', 'partly'];
    else if (cloud < 80) [desc, ico] = ['Oblačno', 'partly'];
    else [desc, ico] = ['Zataženo', 'cloud'];
    let cond;
    if (rainH >= 5 || sum >= 6) cond = 'dest';
    else if (rainH >= 1 || tmax < 19 || cloud >= 75) cond = 'oblacno';
    else cond = 'slunce';
    const windy = (d.wind_gusts_10m_max[i] ?? 0) >= 50 || (d.wind_speed_10m_max[i] ?? 0) >= 30;
    return {
      date, src: 'fc', cond, windy, rainAm, rainPm, tmax, tmin, desc, ico,
      pop: d.precipitation_probability_max[i], sum, wind: d.wind_speed_10m_max[i], gust: d.wind_gusts_10m_max[i],
      uv: d.uv_index_max[i], feels: d.apparent_temperature_max[i],
      sunrise: d.sunrise[i] ? F_HM.format(new Date(d.sunrise[i] * 1000)) : '', sunset: d.sunset[i] ? F_HM.format(new Date(d.sunset[i] * 1000)) : '',
      hours, sea: seaTemp(date),
    };
  }
  function seaTemp(date) {
    const v = (wxParsed() || { seaByDate: {} }).seaByDate[date];
    return v && v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }
  function climateDay(date) {
    const c = TRIP.climate;
    const k = Math.min(1, Math.max(0, dayDiff('2026-10-31', date) / 9));
    const tmax = c.tmaxStart + (c.tmaxEnd - c.tmaxStart) * k;
    const tmin = c.tminStart + (c.tminEnd - c.tminStart) * k;
    return { date, src: 'klima', cond: 'slunce', windy: false, tmax, tmin, desc: 'Typický den (průměr)', ico: 'partly', hours: [], sea: c.sea };
  }
  const fcHorizon = () => { const P = wxParsed(); return P ? P.dates[P.dates.length - 1] : null; };

  function verdict(w) {
    if (w.src === 'klima') return { title: 'Zatím jen průměr', text: `Předpověď sahá 16 dní dopředu. Pro ${fmtD(w.date)} ukazuju dlouhodobý průměr: ${TRIP.climate.note}` };
    const T = {
      slunce: ['Den venku', 'Sucho a teplo. Hodí se na zvířata, pláž a vyhlídky.'],
      oblacno: ['Bez slunce, ale dá se ven', 'Parky, památky a procházky. Na pláž spíš na hraní v písku než do vody.'],
      dest: ['Den pod střechou', 'Muzea, akvárium, kryté herny a trh. Na mokré mramorové dlažbě v centru to klouže.'],
    };
    let [title, text] = T[w.cond];
    if (w.cond !== 'dest' && w.rainAm >= 2 && w.rainPm === 0) text = 'Dopoledne prší, odpoledne by mělo být sucho. Ráno něco pod střechou, po spánku ven.';
    if (w.cond !== 'dest' && w.rainPm >= 2 && w.rainAm === 0) text = 'Dopoledne sucho, odpoledne déšť. Ven hned ráno, po obědě pod střechu.';
    if (w.windy) text += ' Fouká: lanovka a lodě spíš ne, na pláži bude chladno.';
    return { title, text };
  }

  /* ---------- Dny pobytu ---------- */
  function dayType(date) {
    if (date === TRIP.start) return 'prilet';
    if (date === TRIP.end) return 'odlet';
    return 'normal';
  }
  const mealOff = (d, m) => dayType(d) === 'prilet' ? m !== 'vecere' : dayType(d) === 'odlet' && m === 'vecere';
  const dayLabel = d => d === TRIP.start ? 'přílet' : d === TRIP.end ? 'odlet' : 'den ' + (dayDiff(TRIP.start, d) + 1);
  function isClosed(a, date) {
    if (a.onlyDates) return !a.onlyDates.includes(date);
    if (a.openDates && a.openDates.includes(date)) return false;
    if (a.closedDates && a.closedDates.includes(date)) return true;
    return (a.closed || []).includes(dow(date));
  }
  /* ---------- Plán: zátěž dne ---------- */
  function dayLoad(date) {
    const acts = PLAN.day(date).acts.map(id => ACT[id]).filter(Boolean);
    let prog = 0, travel = 0;
    acts.forEach((a, i) => {
      prog += a.h;
      if (i === 0) { travel += a.rideMin; return; }
      // mezi dvěma místy: do 1,5 km pěšky, jinak jako cesta z ubytka
      const k = km(acts[i - 1], a);
      travel += k <= 1.5 ? Math.round(k * 1.3 / 4.2 * 60) : a.rideMin;
    });
    if (acts.length) travel += acts[acts.length - 1].rideMin;
    return { acts, prog, travel, total: prog + travel / 60 };
  }
  // pohodový den / plný den / na malé děti moc; den příletu a odletu má jen pár volných hodin
  const loadKind = (h, d) => {
    const [ok, mid] = dayType(d) === 'normal' ? [6, 8] : [2.5, 3.5];
    return h <= ok ? 'ok' : h <= mid ? 'mid' : 'high';
  };
  function actWarn(a, d, w) {
    const out = [];
    if (isClosed(a, d)) out.push(a.onlyDates ? 'tento den se nekoná' : 'zavřeno');
    if (w.src === 'fc' && w.cond === 'dest' && !a.wx.includes('dest')) out.push('má pršet');
    if (w.src === 'fc' && w.windy && a.wind) out.push('fouká');
    if (dayType(d) !== 'normal' && !a.nearby) out.push(`daleko na den ${dayType(d) === 'prilet' ? 'příletu' : 'odletu'}`);
    return out;
  }

  /* ---------- Komponenty ---------- */
  const CATS = TRIP.cats;
  const RIDE = { walk: ['walk', 'pěšky'], bus: ['bus', 'busem'], metro: ['train', 'metrem'], train: ['train', 'vlakem'], taxi: ['taxi', 'taxíkem'], boat: ['boat', 'lodí'] };
  const rideOf = a => RIDE[a.ride && a.ride.mode] || (a.nearby ? RIDE.walk : RIDE.bus);
  const stars = n => `<span class="stars" aria-label="Atraktivita ${n} z 5">${'★'.repeat(n)}<span style="opacity:.25">${'★'.repeat(5 - n)}</span></span>`;
  const gmapsDir = (a, fromStay) => `https://www.google.com/maps/dir/?api=1${fromStay ? `&origin=${STAY.lat},${STAY.lon}` : ''}&destination=${a.lat},${a.lon}&travelmode=transit`;
  const gmapsPlace = a => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.gq || a.name)}`;
  const STROLLER = { ok: 'Kočárek projede', part: 'Kočárek jen částečně', no: 'Spíš nosítko' };
  const STROLLER_F = { ok: 'Vhodné', part: 'Částečně', no: 'Nevhodné' };
  const meter = lvl => `<span class="meter">${[1, 2, 3].map(i => `<i class="${i <= { ok: 3, part: 2, no: 1 }[lvl] ? 'on' : ''}"></i>`).join('')}</span>`;
  const strollerMeter = lvl => `<span class="stroller" data-lvl="${lvl}" role="img" aria-label="${STROLLER[lvl]}" title="${STROLLER[lvl]}">${icon('stroller')}${meter(lvl)}</span>`;
  const costBadge = a => a.cost == null ? '' : `<span class="cost" title="Vstup a doprava tam a zpět pro 2 dospělé a 2 děti">${icon('euro')}<b>${a.cost && a.fam.verified === false ? '≈ ' : ''}${fmtEur(a.cost)}</b>${a.cost ? '<span>za rodinu</span>' : ''}</span>`;
  const KIDS = { ok: 'Výborné s dětmi', part: 'S dětmi ujde', no: 'S dětmi spíš ne' };
  const KIDS_F = { ok: 'Pro děti výborné', part: 'Ujde', no: 'Spíš ne' };
  const KIDS_RANK = { ok: 0, part: 1, no: 2 };
  // barevné bloky na kartě: o co jde (modrý) a jak to tam chodí s dětmi (semafor)
  const aboutBlock = (title, text, web) => `<div class="about"><b>${icon('info')}${title}</b><p>${text}${web ? ` <a href="${web}" target="_blank" rel="noopener">Web ${icon('ext')}</a>` : ''}</p></div>`;
  const kidsBlock = (lvl, text) => `<div class="kids" data-kids="${lvl}"><b><span class="dot" data-kids="${lvl}"></span>${KIDS[lvl]}</b>${text ? `<p>${text}</p>` : ''}</div>`;
  // co k tomu řekli známí (Miloťáci): doslovné citace, shrnutí delší věci, co jsme ověřili
  const miloBlock = m => `<div class="milo"><b>${icon('quote')}Miloťáci</b>${(m.q || []).map(q => `<blockquote>„${q}“</blockquote>`).join('')}${m.sum ? `<p>${m.sum}</p>` : ''}${m.note ? `<p class="milo__note"><b>Ověřili jsme:</b> ${m.note}</p>` : ''}</div>`;
  const miloChip = (attr, on, extra = '') => `<div class="chips" role="group" aria-label="${extra ? 'Miloťáci a naše hvězdičky' : 'Tipy od známých'}"><button class="chip chip--milo" ${attr} aria-pressed="${on}">${icon('quote')}Miloťáci</button>${extra}</div>`;
  // naše hvězdičky: Tom a Míša dávají kartě 0–3, filtr a řazení jedou podle součtu (0–6)
  const starSum = (kind, id) => { const s = PLAN.stars(kind, id); return (s.tom || 0) + (s.misa || 0); };
  const oursRow = (kind, id) => {
    const s = PLAN.stars(kind, id), sum = (s.tom || 0) + (s.misa || 0);
    return Object.entries(WHO).map(([k, n]) => `<span class="ours__p" data-p="${k}"><b>${n}</b>${[1, 2, 3].map(i =>
      `<button class="ours__s" data-star="${kind}|${id}|${k}|${i}" aria-pressed="${i <= (s[k] || 0)}" aria-label="${n}: ${i} z 3">★</button>`).join('')}</span>`).join('') +
      (sum ? `<span class="ours__sum" aria-label="Dohromady ${sum} z 6">${sum}/6</span>` : '');
  };
  const oursSlot = (kind, id) => `<div class="ours" data-stars="${kind}|${id}" role="group" aria-label="Naše hvězdičky">${oursRow(kind, id)}</div>`;
  const oursChips = (attr, cur) => [2, 4, 6].map(n => chip(attr, n, n === 6 ? '6' : n + '+', cur === n, '<span class="chip__star" aria-hidden="true">★</span>')).join('');
  const fmtRate = v => v.toFixed(1).replace('.', ',');
  const fmtCount = n => n.toLocaleString('cs-CZ');
  // hodnocení: dva stejné odkazy (Google, Tripadvisor) se známkou a počtem recenzí
  const RATE_SRC = { Google: 'Google', TripAdvisor: 'Tripadvisor' };
  const ratePill = (x, url) => `<a class="rlink" href="${url}" target="_blank" rel="noopener" aria-label="${RATE_SRC[x.src]}: ${fmtRate(x.v)} z 5, ${fmtCount(x.c)} hodnocení, otevřít recenze">
    <span class="rlink__star" aria-hidden="true">★</span><b>${fmtRate(x.v)}</b><span>${RATE_SRC[x.src]}</span><small>${fmtCount(x.c)}</small></a>`;
  // chybí-li známka z jednoho zdroje, odkaz na jeho recenze tam zůstane bez čísla
  const rateLink = (src, url) => `<a class="rlink" href="${url}" target="_blank" rel="noopener" aria-label="Recenze na ${src}"><span>${src}</span></a>`;
  const ratingLinks = r => r.rateG || r.rateTA
    ? `<div class="rlinks">${r.rateG ? ratePill(r.rateG, gmapsPlace(r)) : rateLink('Google', gmapsPlace(r))}${r.rateTA ? ratePill(r.rateTA, r.taUrl) : rateLink('Tripadvisor', r.taUrl)}</div>`
    : '<p class="rlinks rlinks--none">Bez vlastního hodnocení</p>';
  const sortSel = (attr, cur, opts) => `<label class="sortsel">${icon('sort')}<select ${attr} aria-label="Řadit podle">${Object.entries(opts).map(([k, l]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
  const priceMeter = n => `<span class="price" role="img" aria-label="Cenová hladina ${n} z 5">${'€'.repeat(n)}<span class="off">${'€'.repeat(5 - n)}</span></span>`;
  const inPlanActs = id => { const ds = PLAN.datesWith(id); return ds.length ? `<p class="inplan">${icon('cal')} V plánu: ${ds.map(fmtS).join(', ')}</p>` : ''; };
  const inPlanMeals = id => { const ms = PLAN.mealsWith(id); return ms.length ? `<p class="inplan">${icon('cal')} V plánu: ${ms.map(x => `${fmtS(x.date)} ${MEALS[x.meal].label.toLowerCase()}`).join(', ')}</p>` : ''; };
  const chip = (attr, val, label, on, extra = '') => `<button class="chip" ${attr}="${val}" aria-pressed="${on}">${extra}${label}</button>`;

  function actCard(a, opts = {}) {
    const done = !!state.done[a.id];
    const closedThatDay = opts.date && isClosed(a, opts.date);
    const r = rideOf(a);
    return `
    <article class="act ${done ? 'is-done' : ''}" id="act-${a.id}" data-id="${a.id}">
      <div class="act__body">
        <div class="act__top">
          <div class="act__emoji" aria-hidden="true">${a.emoji || CATS[a.cat].emoji}</div>
          <div class="act__head">
            <h3 class="act__title">${a.name}</h3>
            <p class="act__sub">${CATS[a.cat].label}${a.area ? ' · ' + a.area : ''} · ${stars(a.must)}</p>
          </div>
        </div>
        ${oursSlot('act', a.id)}
        <div class="stats">
          <div class="stat">${icon('clock')}<b>${fmtH(a.h)}</b><span>na místě</span></div>
          <div class="stat">${icon('pin')}<b>${fmtKm(a.km)}</b><span>od ubytka</span></div>
          <div class="stat">${icon(r[0])}<b>${fmtMinShort(a.rideMin)}</b><span>${r[1]}</span></div>
        </div>
        <div class="act__row">
          ${costBadge(a)}
          ${strollerMeter(a.stroller.lvl)}
          <span class="wxfit" title="Kdy se hodí">${['slunce', 'oblacno', 'dest'].map(c => `<span class="${a.wx.includes(c) ? '' : 'off'}" title="${WX_LABEL[c]}">${icon(WX_ICON[c])}</span>`).join('')}</span>
          ${a.wind ? '<span class="flag">Citlivé na vítr</span>' : ''}
        </div>
        ${closedThatDay ? `<div class="tags"><span class="tag tag--warn">${a.onlyDates ? 'Tento den se nekoná' : 'Tento den zavřeno'}</span></div>` : ''}
        <div data-plan-act="${a.id}" style="display:contents">${inPlanActs(a.id)}</div>
        <div class="tags">
          ${a.pros.map(p => `<span class="tag tag--plus">${p}</span>`).join('')}
          ${a.cons.map(p => `<span class="tag tag--minus">${p}</span>`).join('')}
        </div>
        ${a.milo ? miloBlock(a.milo) : ''}
        ${a.about ? aboutBlock('O co jde', a.about, a.web) : ''}
        ${kidsBlock(a.kids, a.tip)}
      </div>
      <details class="fold">
        <summary>Jak se tam dostaneme${icon('chev')}</summary>
        <div class="fold__in">
          <p><b>${a.how.sum}</b>${a.ride && a.ride.cost ? ` · doprava pro rodinu tam a zpět ${fmtEur(a.ride.cost)}` : ''}</p>
          <ol class="steps">${a.how.steps.map(s => `<li>${s}</li>`).join('')}</ol>
          ${a.how.alt ? `<p class="muted">${a.how.alt}</p>` : ''}
          <div class="btn-row">
            <a class="btn btn--sm btn--primary" href="${gmapsDir(a, false)}" target="_blank" rel="noopener">Trasa odsud ${icon('ext')}</a>
            <a class="btn btn--sm" href="${gmapsDir(a, true)}" target="_blank" rel="noopener">Trasa od ubytka</a>
          </div>
        </div>
      </details>
      <details class="fold">
        <summary>Otevírací doba, ceny, zázemí${icon('chev')}</summary>
        <div class="fold__in">
          <dl class="kv">
            <dt>Otevřeno</dt><dd>${a.open}</dd>
            <dt>Na místě</dt><dd>${a.dur}</dd>
            <dt>Vstupné</dt><dd>${a.price}</dd>
            ${a.fam ? `<dt>Za rodinu</dt><dd>${fmtEur(a.fam.total)}. ${a.fam.note}${a.fam.verified === false ? ' (neověřeno)' : ''}</dd>` : ''}
            ${a.book ? `<dt>Rezervace</dt><dd>${a.book}</dd>` : ''}
            <dt>Kočárek</dt><dd>${a.stroller.note}</dd>
            ${a.facilities ? `<dt>Zázemí</dt><dd>${a.facilities}</dd>` : ''}
            ${a.best ? `<dt>Kdy jít</dt><dd>${a.best}</dd>` : ''}
            ${a.food ? `<dt>Jídlo</dt><dd>${a.food}</dd>` : ''}
            ${a.combine ? `<dt>Spojit s</dt><dd>${a.combine}</dd>` : ''}
          </dl>
          ${a.more ? `<div>${a.more}</div>` : ''}
          <p class="src">Zdroje: ${a.src.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${l}</a>`).join(', ')}</p>
          <a class="btn btn--sm" href="${gmapsPlace(a)}" target="_blank" rel="noopener">Otevřít v Mapách ${icon('ext')}</a>
        </div>
      </details>
      <div class="act__foot">
        <button class="btn btn--sm ${done ? 'btn--primary' : ''}" data-done="${a.id}" aria-pressed="${done}">${done ? icon('check') + ' Byli jsme' : 'Označit: byli jsme'}</button>
        <button class="fab" data-add="${a.id}" aria-label="Přidat do plánu: ${esc(a.name)}">${icon('plus')}</button>
      </div>
    </article>`;
  }

  function foodCard(r) {
    const walk = !r.out && r.km <= 2.5;
    const cu = CUISINES[r.cuisine] || { label: r.cuisine, emoji: '🍽️' };
    return `
    <article class="act food" id="food-${r.id}" data-rid="${r.id}">
      <div class="act__body">
        <div class="act__top">
          <div class="act__emoji" aria-hidden="true">${r.emoji || cu.emoji}</div>
          <div class="act__head">
            <h3 class="act__title">${r.name}</h3>
            <p class="act__sub">${r.area}</p>
          </div>
          ${priceMeter(r.price)}
        </div>
        ${oursSlot('food', r.id)}
        ${ratingLinks(r)}
        <div class="ctags" aria-label="Kuchyně, klepnutím vyfiltrujete">${r.tags.map(t => `<button class="ctag" data-fftag="${t}" aria-pressed="${state.ff.tags.includes(t)}"><span aria-hidden="true">${FOOD_TAGS[t].emoji}</span>${FOOD_TAGS[t].label}</button>`).join('')}</div>
        <div class="stats">
          <div class="stat">${icon('pin')}<b>${fmtKm(r.km)}</b><span>od ubytka</span></div>
          <div class="stat">${icon(walk ? 'walk' : r.out ? 'train' : 'bus')}<b>${walk ? fmtMinShort(r.walkMin) : r.out ? r.area : 'MHD'}</b><span>${walk ? 'pěšky' : r.out ? 'mimo Málagu' : 'busem, taxi'}</span></div>
          <div class="stat">${icon('euro')}<b>${r.famEur ? '≈ ' + r.famEur + ' €' : '?'}</b><span>za rodinu</span></div>
        </div>
        <div class="mealtags" aria-label="Kdy tam jíst">${r.meals.length ? Object.entries(MEALS).map(([m, M]) => `<span class="mealtag ${r.meals.includes(m) ? 'on' : ''}">${M.label}</span>`).join('') : '<span class="mealtag on">Na zmrzlinu mezi jídly</span>'}</div>
        <div data-plan-rest="${r.id}" style="display:contents">${inPlanMeals(r.id)}</div>
        ${r.milo ? miloBlock(r.milo) : ''}
        ${aboutBlock('Co vaří', r.what, r.web)}
        ${kidsBlock(r.kids, r.kidsWhy)}
        ${r.tip ? `<p class="act__tip"><b>Tip:</b> ${r.tip}</p>` : ''}
      </div>
      <details class="fold">
        <summary>Otevírací doba, rezervace, hodnocení${icon('chev')}</summary>
        <div class="fold__in">
          <dl class="kv">
            <dt>Otevřeno</dt><dd>${r.hours}</dd>
            ${r.book ? `<dt>Rezervace</dt><dd>${r.book}</dd>` : ''}
            ${r.fam ? `<dt>Útrata</dt><dd>${r.fam}</dd>` : ''}
            ${r.rating ? `<dt>Hodnocení</dt><dd>${r.rating}</dd>` : ''}
            ${r.near && ACT[r.near] ? `<dt>Hodí se k</dt><dd>${ACT[r.near].name}</dd>` : ''}
            ${r.verified ? `<dt>Ověřeno</dt><dd>${r.verified}</dd>` : ''}
          </dl>
          ${r.src && r.src.length ? `<p class="src">Zdroje: ${r.src.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${l}</a>`).join(', ')}</p>` : ''}
        </div>
      </details>
      <div class="act__foot">
        <a class="btn btn--sm" href="${gmapsPlace(r)}" target="_blank" rel="noopener">Mapa ${icon('ext')}</a>
        <a class="btn btn--sm" href="${gmapsDir(r, false)}" target="_blank" rel="noopener">Trasa</a>
        ${r.meals.length ? `<button class="fab" data-addfood="${r.id}" aria-label="Přidat do plánu: ${esc(r.name)}">${icon('plus')}</button>` : ''}
      </div>
    </article>`;
  }

  /* Položka dne v plánu (výlet, nebo pevný bod jako přílet) */
  function planActRow(a, i, d, w, tools) {
    const r = rideOf(a), warns = actWarn(a, d, w);
    return `<li class="pact">
      <span class="pact__n">${i + 1}</span>
      <button class="pact__main" data-showact="${a.id}"><b>${a.emoji || CATS[a.cat].emoji} ${a.name}</b>
        <small><span>${icon('clock')} ${fmtH(a.h)}</span><span>${icon(r[0])} ${fmtMin(a.rideMin)}</span>${warns.map(x => `<span class="warn">${x}</span>`).join('')}</small></button>
      ${tools ? `<span class="pact__tools">
        <button class="ibtn" data-move="${d}|${i}|-1" ${i === 0 ? 'disabled' : ''} aria-label="Posunout výš">${icon('up')}</button>
        <button class="ibtn" data-move="${d}|${i}|1" ${i === tools - 1 ? 'disabled' : ''} aria-label="Posunout níž">${icon('down')}</button>
        <button class="ibtn" data-unplan="${d}|${i}" aria-label="Odebrat z plánu">${icon('x')}</button>
      </span>` : '<span></span>'}
    </li>`;
  }
  const fixedRow = (title, sub) => `<li class="pact pact--fixed"><span class="pact__n">✈</span><span class="pact__main"><b>${title}</b><small>${sub}</small></span><span></span></li>`;
  const arrival = () => fixedRow(`Přílet do Málagy ${ITINERARY.tam.pass.to.time}`, 'Transfer na ubytko, nákup, večer doma');
  const departure = () => fixedRow(`Odlet z Málagy ${ITINERARY.zpet.pass.from.time}`, 'Check-out do 12:00, na letiště nejpozději 15:00');

  /* ---------- Záložka Počasí (v kódu pořád „dnes“, ať zůstane uložená volba záložky) ---------- */
  function renderToday() {
    const el = $('#tab-dnes');
    const today = todayStr();
    const tomorrow = addDays(today, 1);
    let date = state.wxMode === 'zitra' ? tomorrow : today;
    if (state.wxMode === 'pobyt') date = state.stayDay;
    const w = dayWeather(date);
    const v = verdict(w);
    const updated = state.wx ? new Date(state.wx.ts).toLocaleString('cs-CZ', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : null;
    const dayTag = date === TRIP.start ? 'Den příletu' : date === TRIP.end ? 'Den odletu' : '';

    let hours = w.hours || [];
    if (date === today) { const h = nowHourMadrid(); hours = hours.filter(x => x.h >= Math.min(h, 20)); }
    hours = hours.filter(x => x.h >= 8 && x.h <= 20);

    el.innerHTML = `
      <div class="seg" role="group" aria-label="Který den">
        <button data-wxmode="dnes" aria-pressed="${state.wxMode === 'dnes'}">Dnes<small>${DOW_S[dow(today)]} ${fmtD(today)}</small></button>
        <button data-wxmode="zitra" aria-pressed="${state.wxMode === 'zitra'}">Zítra<small>${DOW_S[dow(tomorrow)]} ${fmtD(tomorrow)}</small></button>
        <button data-wxmode="pobyt" aria-pressed="${state.wxMode === 'pobyt'}">Celý pobyt<small>31. 10. – 9. 11.</small></button>
      </div>

      ${state.wxMode === 'pobyt' ? stayList() : ''}

      <div class="hero" data-wx="${w.src === 'klima' ? 'klima' : w.cond}">
        <p class="hero__date">${fmtLong(date)}${dayTag ? ` <span class="hero__daytag">${dayTag}</span>` : ''}</p>
        <div class="hero__main">
          ${icon(w.ico, 'hero__icon')}
          <div>
            <div class="hero__temp">${Math.round(w.tmax)}°<span>/ ${Math.round(w.tmin)}°</span></div>
            <p class="hero__desc">${w.desc}</p>
          </div>
        </div>
        <div class="hero__facts">
          ${w.src === 'fc' ? `
            <span class="fact">Déšť <b>${w.pop ?? 0} %</b></span>
            <span class="fact">Vítr <b>${Math.round(w.wind)}</b> km/h${w.gust >= 40 ? `, nárazy <b>${Math.round(w.gust)}</b>` : ''}</span>
            <span class="fact">UV <b>${Math.round(w.uv ?? 0)}</b></span>
            ${w.sea ? `<span class="fact">Moře <b>${Math.round(w.sea)}°</b></span>` : `<span class="fact">Moře <b>~${TRIP.climate.sea}°</b></span>`}
            <span class="fact">Slunce <b>${w.sunrise}–${w.sunset}</b></span>` : `
            <span class="fact">Moře <b>~${w.sea}°</b></span>
            <span class="fact">Slunce <b>7:45–18:20</b></span>`}
        </div>
        ${hours.length ? `<div class="hours" aria-label="Po hodinách">${hours.map(x => `
          <div class="hour"><span class="hour__t">${x.h}h</span>${icon(wmo(x.c)[1])}<span class="hour__v">${Math.round(x.t)}°</span><span class="hour__p">${x.p >= 20 ? x.p + '%' : ''}</span></div>`).join('')}</div>` : ''}
        <div class="hero__verdict"><strong>${v.title}</strong>${v.text}</div>
        <div class="hero__foot">
          <span>${state.wxError ? state.wxError : updated ? 'Aktualizováno ' + updated : 'Předpověď zatím není načtená'}</span>
          <button class="hero__refresh ${state.wxLoading ? 'is-loading' : ''}" data-refresh>${icon('refresh')} ${state.wxLoading ? 'Načítám' : 'Načíst znovu'}</button>
        </div>
      </div>`;
  }

  /* Co se v Málaze ten den děje (data/calendar.js), nejdůležitější první */
  const KIND_ORDER = Object.keys(DAY_KINDS);
  const dayEvents = d => CALENDAR.filter(e => e.date === d)
    .sort((a, b) => (b.key ? 1 : 0) - (a.key ? 1 : 0) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  const evEmoji = e => e.emoji || DAY_KINDS[e.kind].emoji;
  const daySig = d => { const e = dayEvents(d)[0]; return e ? evEmoji(e) : ''; };
  // krátká poznámka k výletu ve výběru dne: „plno z lodí“, „zdarma od 14:00“, čas akce
  const actDayNote = (a, d) => CALENDAR.filter(e => e.date === d && e.act === a.id).map(e =>
    e.kind === 'lod' ? 'plno z lodí' : e.kind === 'zdarma' ? 'zdarma od ' + (e.time || '').split('–')[0]
      : e.kind === 'tip' ? 'klidný den' : e.time || DAY_KINDS[e.kind].label.toLowerCase()).join(', ');
  const evMeta = e => `<span class="pev__meta">${[DAY_KINDS[e.kind].label, e.time, e.where].filter(Boolean).join(' · ')}${e.verified === false ? ' · neověřeno' : ''}</span>`;
  const evSrc = e => e.src && e.src.length ? `<p class="src">Zdroj: ${e.src.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${l}</a>`).join(', ')}</p>` : '';
  // řádek s rozbalením: deset dní pod sebou musí jít projet očima
  const evRow = e => `<li class="pev pev--row" data-kind="${e.kind}"><details>
      <summary><span class="pev__ico" aria-hidden="true">${evEmoji(e)}</span><span><b>${e.title}</b>${evMeta(e)}</span>${icon('chev')}</summary>
      <div class="pev__body"><p>${e.text}</p>${e.act && ACT[e.act] ? `<button class="linkish" data-showact="${e.act}">Karta: ${ACT[e.act].name}</button>` : ''}${evSrc(e)}</div>
    </details></li>`;
  // víc položek než max: zbytek pod „Další“, ať karta dne nenaroste přes celý displej
  const eventsList = (evs, max = 4, item = evRow) => `<ul class="pevs">${evs.slice(0, max).map(item).join('')}</ul>${evs.length > max ? `
    <details class="pevs__more"><summary>Další ${evs.length - max} ${plural(evs.length - max, 'věc', 'věci', 'věcí')} v Málaze${icon('chev')}</summary>
      <ul class="pevs">${evs.slice(max).map(item).join('')}</ul></details>` : ''}`;

  function stayList() {
    const horizon = fcHorizon();
    return `<div class="days" role="group" aria-label="Dny pobytu">${stayDays.map(d => {
      const w = dayWeather(d);
      const badge = w.src === 'klima' ? ['klima', 'průměr'] : [w.cond, w.cond === 'slunce' ? 'ven' : w.cond === 'dest' ? 'pod střechu' : 'zataženo'];
      const note = w.src === 'klima' ? `předpověď od ${fmtD(addDays(d, -15))}` : `déšť ${w.pop ?? 0} %${w.windy ? ', vítr' : ''}`;
      return `<button class="day" data-stayday="${d}" aria-pressed="${d === state.stayDay}">
        <span class="day__d">${DOW_S[dow(d)]} ${fmtD(d)}<small>${dayLabel(d)}</small></span>
        ${icon(w.ico)}
        <span><span class="day__t">${Math.round(w.tmax)}° <span class="lo">${Math.round(w.tmin)}°</span></span><br><span class="day__note">${note}</span></span>
        <span class="day__badge" data-wx="${badge[0]}">${badge[1]}</span>
      </button>`;
    }).join('')}</div>${horizon && horizon < TRIP.end ? `<p class="reco-note">Dny po ${fmtD(horizon)} zatím ukazují průměr. Předpověď naskočí sama, jakmile se dostanou do 16denního výhledu.</p>` : ''}`;
  }

  /* ---------- Záložka Plán ---------- */
  const SYNC_TXT = { live: 'Sdíleno', connecting: 'Připojuji', offline: 'Offline', error: 'Nesdílí se', local: 'Jen v tomto telefonu' };
  const statusChip = () => {
    const s = PLAN.status(), n = PLAN.pending();
    const title = s === 'offline' && n ? `${n} ${plural(n, 'změna čeká', 'změny čekají', 'změn čeká')} na odeslání` : s === 'live' ? 'Oba telefony vidí stejný plán' : '';
    return `<span class="chip-status" data-s="${s}"${title ? ` title="${title}"` : ''}>${SYNC_TXT[s]}</span>`;
  };
  // rozepsaná poznámka nebo tažený úkol: změny z druhého telefonu počkají
  const editing = () => dragging || !!$('.whomenu') || !!(document.activeElement && document.activeElement.matches('textarea[data-note]'));

  function renderPlan() {
    const el = $('#tab-plan');
    const today = tripToday();
    const rows = stayDays.map(d => ({ d, ...dayLoad(d) }));
    const totalH = rows.reduce((s, r) => s + r.total, 0);
    const nActs = rows.reduce((s, r) => s + r.acts.length, 0);
    const nMeals = stayDays.reduce((s, d) => s + Object.values(PLAN.day(d).meals).filter(id => REST[id]).length, 0);
    el.innerHTML = `
      <div class="sec-head"><h2 class="h-sec">Plán pobytu<small>Výlet nebo restauraci přidáte tlačítkem + na kartě, nebo tady u dne.</small></h2>${PLAN.code() ? statusChip() : ''}</div>
      <section class="plansum" aria-label="Souhrn plánu">
        <div class="plansum__top">
          <div><b class="plansum__h">${fmtHours(totalH)}</b><span>naplánováno včetně cesty</span></div>
          <div class="plansum__counts">${nActs} ${plural(nActs, 'výlet', 'výlety', 'výletů')}<br>${nMeals} ${plural(nMeals, 'jídlo', 'jídla', 'jídel')} venku</div>
        </div>
        <div class="plansum__bars">${rows.map(r => { const ev = dayEvents(r.d)[0]; return `<button class="pbar ${r.d === today ? 'is-today' : ''}" data-jump="${r.d}" aria-label="${fmtLong(r.d)}: ${fmtHours(r.total)}${ev ? ', ' + esc(ev.title) : ''}">
          <span class="pbar__col"><i style="height:${Math.min(100, r.total / 9 * 100)}%" data-load="${loadKind(r.total, r.d)}"></i></span><span>${+r.d.slice(8)}.</span><span class="pbar__sig" aria-hidden="true">${ev ? evEmoji(ev) : ''}</span></button>`; }).join('')}</div>
        <p class="plansum__legend"><span><i></i>pohodový den</span><span><i data-load="mid"></i>plný den</span><span><i data-load="high"></i>na malé děti moc</span>${CALENDAR.length ? '<span>symbol pod dnem: svátek nebo akce v Málaze</span>' : ''}</p>
      </section>
      ${rows.map(dayCard).join('')}`;
  }

  function dayCard({ d, acts, travel, total }) {
    const p = PLAN.day(d), w = dayWeather(d), dt = dayType(d), evs = dayEvents(d);
    const wxNote = w.src === 'klima' ? '<small>průměr</small>' : `<small>déšť ${w.pop ?? 0} %${w.windy ? ', vítr' : ''}</small>`;
    const tag = (evs.some(e => e.kind === 'svatek') ? '<span class="pday__sig">Svátek</span>' : '') + (dt === 'prilet' ? 'Den příletu' : dt === 'odlet' ? 'Den odletu' : '');
    return `<section class="pday ${d === tripToday() ? 'is-today' : ''}" id="pday-${d}" aria-label="${fmtLong(d)}">
      <header class="pday__head">
        <div><h3 class="pday__date">${fmtLong(d)}</h3>${tag ? `<span class="pday__tag">${tag}</span>` : ''}</div>
        <div class="pday__wx">${icon(w.ico)}<span class="mono">${Math.round(w.tmax)}°<small>/${Math.round(w.tmin)}°</small></span>${wxNote}</div>
      </header>
      ${acts.length ? `<div class="pday__load" data-load="${loadKind(total, d)}">${icon('clock')}<b>${fmtHours(total)}</b> naplánováno <span>· z toho cesta ${fmtMin(travel)}</span></div>` : ''}
      ${evs.length ? `<div class="psec"><h4>V Málaze</h4>${eventsList(evs, 4, evRow)}</div>` : ''}
      <div class="psec">
        <h4>Výlety</h4>
        <ol class="pacts">${dt === 'prilet' ? arrival() : ''}${acts.map((a, i) => planActRow(a, i, d, w, acts.length)).join('')}${dt === 'odlet' ? departure() : ''}</ol>
        <button class="addline" data-pickact="${d}">${icon('plus')} Přidat výlet</button>
      </div>
      <div class="psec">
        <h4>Jídlo</h4>
        ${Object.entries(MEALS).map(([m, M]) => {
          const r = REST[p.meals[m]];
          return `<div class="pmeal">
            <span class="pmeal__ico" aria-hidden="true">${M.emoji}</span><span class="pmeal__l">${M.label}</span>
            ${r ? `<button class="pmeal__v" data-showrest="${r.id}">${r.name}<small>${CUISINES[r.cuisine] ? CUISINES[r.cuisine].label : ''} · ${fmtKm(r.km)}</small></button>
                   <button class="ibtn" data-unmeal="${d}|${m}" aria-label="Zrušit ${M.acc} v restauraci">${icon('x')}</button>`
                : mealOff(d, m) ? `<span class="pmeal__v pmeal__v--ph pmeal__v--off">${dt === 'prilet' ? 'Na cestě, přílet ' + ITINERARY.tam.pass.to.time : 'Na cestě, odlet ' + ITINERARY.zpet.pass.from.time}</span><span></span>`
                : `<button class="pmeal__v pmeal__v--ph" data-pickmeal="${d}|${m}">${icon('home')} Na ubytku</button>
                   <button class="ibtn" data-pickmeal="${d}|${m}" aria-label="Vybrat restauraci na ${M.acc}">${icon('plus')}</button>`}
          </div>`;
        }).join('')}
      </div>
      <div class="psec">
        ${[['tom', 'Tom'], ['misa', 'Míša']].map(([k, n]) => {
          const t = p.notes[k] || '';
          return `<label class="pnote"><span>Poznámka ${n}</span><textarea data-note="${d}|${k}" rows="${Math.max(2, Math.min(8, Math.ceil(t.length / 38) + (t.match(/\n/g) || []).length))}" maxlength="2000" placeholder="Nápady, co nezapomenout…">${esc(t)}</textarea></label>`;
        }).join('')}
      </div>
    </section>`;
  }

  /* ---------- Záložka Výlety ---------- */
  function filtered() {
    const f = state.f;
    let list = ACTIVITIES.filter(a =>
      (f.wx === 'vse' || a.wx.includes(f.wx)) &&
      (!f.cats.length || f.cats.includes(a.cat)) &&
      (!f.dur.length || f.dur.includes(a.durKind)) &&
      (!f.dist.length || f.dist.includes(a.distKind)) &&
      (!f.stroller.length || f.stroller.includes(a.stroller.lvl)) &&
      (!f.cost.length || f.cost.includes(a.costKind)) &&
      (!f.must || a.must >= 4) &&
      (!f.hideDone || !state.done[a.id]) &&
      (!f.milo || !!a.milo) &&
      (!f.stars || starSum('act', a.id) >= f.stars));
    list.sort(f.sort === 'ours' ? (x, y) => (starSum('act', y.id) - starSum('act', x.id)) || (y.must - x.must) || (x.km - y.km)
      : f.sort === 'dist' ? (x, y) => x.km - y.km
      : f.sort === 'cost' ? (x, y) => ((x.cost ?? 999) - (y.cost ?? 999)) || (y.must - x.must)
      : f.sort === 'kids' ? (x, y) => (KIDS_RANK[x.kids] - KIDS_RANK[y.kids]) || (y.must - x.must) || (x.km - y.km)
      : (x, y) => (y.must - x.must) || (x.km - y.km));
    // během pobytu (nebo při výběru dne z plánu): co má ten den zavřeno, až na konec (sort je stabilní)
    const day = refDay();
    if (day) list.sort((x, y) => isClosed(x, day) - isClosed(y, day));
    return list;
  }
  const refDay = () => state.pick && state.pick.kind === 'act' ? state.pick.date : tripToday();
  const pickBar = () => {
    const p = state.pick;
    const what = p.kind === 'act' ? 'výlet' : MEALS[p.meal].acc;
    return `<div class="pickbar"><span>Vybíráte ${what} na <b>${fmtS(p.date)}</b> Klepněte na + u karty.</span><button data-pickcancel>Zrušit</button></div>`;
  };

  function renderTrips() {
    const el = $('#tab-vylety');
    const f = state.f;
    const list = filtered();
    const moreCount = f.dur.length + f.dist.length + f.stroller.length + f.cost.length + (f.must ? 1 : 0) + (f.hideDone ? 1 : 0);
    el.innerHTML = `
      <div class="sec-head"><h2 class="h-sec">Výlety a místa<small>Místa vybraná pro rodinu s předškolákem a batoletem.</small></h2></div>
      <div class="filters${f.more ? ' is-open' : ''}">
        ${state.pick && state.pick.kind === 'act' ? pickBar() : ''}
        ${miloChip('data-fmilo', f.milo, oursChips('data-fstars', f.stars))}
        <div class="chips" role="group" aria-label="Počasí">
          ${chip('data-fwx', 'vse', 'Jakékoli počasí', f.wx === 'vse')}
          ${['slunce', 'oblacno', 'dest'].map(c => chip('data-fwx', c, WX_LABEL[c], f.wx === c, icon(WX_ICON[c]))).join('')}
        </div>
        <div class="chips" role="group" aria-label="Kategorie">
          ${Object.entries(CATS).map(([k, c]) => chip('data-fcat', k, c.label, f.cats.includes(k), `<span aria-hidden="true">${c.emoji}</span>`)).join('')}
        </div>
        <div class="result-line">
          <span class="result-line__tools">
            ${sortSel('data-fsort', f.sort, TRIP_SORTS)}
            <button class="linkish" data-fmore>${f.more ? 'Skrýt filtry' : 'Filtry'}${moreCount ? ` (${moreCount})` : ''}</button>
            <button class="linkish" data-fview>${f.view === 'map' ? 'Seznam' : 'Mapa'}</button>
          </span>
        </div>
        ${f.more ? `<div class="more-filters">
          <div><h4>Kočárek</h4><div class="chips">
            ${['ok', 'part', 'no'].map(l => chip('data-fstr', l, STROLLER_F[l], f.stroller.includes(l), `<span class="stroller" data-lvl="${l}">${meter(l)}</span>`)).join('')}
          </div></div>
          <div><h4>Cena za rodinu (vstup a doprava)</h4><div class="chips">
            ${chip('data-fcost', 'free', 'Zdarma', f.cost.includes('free'))}${chip('data-fcost', 'do20', 'Do 20 €', f.cost.includes('do20'))}${chip('data-fcost', 'do50', '20–50 €', f.cost.includes('do50'))}${chip('data-fcost', 'nad50', 'Nad 50 €', f.cost.includes('nad50'))}
          </div></div>
          <div><h4>Délka na místě</h4><div class="chips">
            ${chip('data-fdur', 'kratke', 'Do 2 hodin', f.dur.includes('kratke'))}${chip('data-fdur', 'pulden', 'Půl dne', f.dur.includes('pulden'))}${chip('data-fdur', 'celyden', 'Celý den', f.dur.includes('celyden'))}
          </div></div>
          <div><h4>Vzdálenost</h4><div class="chips">
            ${chip('data-fdist', 'pesky', 'Pěšky (do 1,5 km)', f.dist.includes('pesky'))}${chip('data-fdist', 'mesto', 'Po Málaze', f.dist.includes('mesto'))}${chip('data-fdist', 'vylet', 'Mimo Málagu', f.dist.includes('vylet'))}
          </div></div>
          <div><h4>Další</h4><div class="chips">
            ${chip('data-fflag', 'must', 'Jen to nejlepší (4–5 ★)', f.must)}${chip('data-fflag', 'hideDone', 'Skrýt navštívené', f.hideDone)}
          </div></div>
          <button class="linkish" data-freset>Zrušit všechny filtry</button>
        </div>` : ''}
      </div>
      ${f.view === 'map' ? '<div class="map" id="map-vylety"></div>' : `
      <div class="list">${list.length ? list.map(a => actCard(a, { date: refDay() })).join('') : `
        <div class="empty"><p>Těmto filtrům nic neodpovídá.</p><button class="btn btn--sm" data-freset>Zrušit filtry</button></div>`}</div>`}`;
    if (f.view === 'map') drawMap('#map-vylety', list, a => a.emoji || CATS[a.cat].emoji,
      a => `<b>${a.name}</b><br>${fmtH(a.h)} · ${fmtKm(a.km)}<br>${a.how.sum}<br><a href="#" data-showcard="${a.id}">Zobrazit detail</a>`);
  }
  const TRIP_SORTS = { must: 'Atraktivita', ours: 'Naše hvězdičky', dist: 'Vzdálenost', kids: 'Pro děti', cost: 'Cena' };
  const FOOD_SORTS = { dist: 'Vzdálenost', rating: 'Hodnocení', ours: 'Naše hvězdičky', kids: 'Pro děti', price: 'Cena' };

  /* Mapa (Leaflet se načte až při prvním otevření) */
  let leafletP = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (leafletP) return leafletP;
    leafletP = new Promise((res, rej) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(css);
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
    return leafletP;
  }
  /* Mapa pro výlety i restaurace: pinOf vrací emoji špendlíku, popupOf obsah bubliny */
  async function drawMap(sel, list, pinOf, popupOf) {
    const box = $(sel);
    try { await loadLeaflet(); } catch { box.innerHTML = '<div class="empty">Mapa potřebuje internet.</div>'; return; }
    if (!document.body.contains(box)) return;
    const map = L.map(box, { zoomControl: true, zoomSnap: 0.5 }).setView([STAY.lat, STAY.lon], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    const pin = (e) => L.divIcon({ className: 'map-pin', html: e, iconSize: [26, 26], iconAnchor: [13, 13] });
    L.marker([STAY.lat, STAY.lon], { icon: pin('🏠') }).addTo(map).bindPopup('<b>Ubytování</b>');
    const pts = [[STAY.lat, STAY.lon]];
    list.forEach(x => {
      pts.push([x.lat, x.lon]);
      L.marker([x.lat, x.lon], { icon: pin(pinOf(x)) }).addTo(map).bindPopup(popupOf(x));
    });
    // přiblížit na město, místa mimo Málagu jsou vidět po oddálení
    const inCity = [[STAY.lat, STAY.lon], ...list.filter(x => !x.out).map(x => [x.lat, x.lon])];
    map.fitBounds(inCity.length > 1 ? inCity : pts, { padding: [24, 24] });
  }

  /* ---------- Záložka Jídlo ---------- */
  function filteredFood() {
    const f = state.ff;
    const pick = state.pick && state.pick.kind === 'meal' ? state.pick : null;
    const list = FOOD.filter(r =>
      (!pick || r.meals.includes(pick.meal)) &&
      (!f.meals.length || f.meals.some(m => r.meals.includes(m))) &&
      (!f.kids.length || f.kids.includes(r.kids)) &&
      (!f.tags.length || f.tags.some(t => r.tags.includes(t))) &&
      (!f.price.length || f.price.includes(r.price)) &&
      (!f.dist.length || f.dist.includes(r.distKind)) &&
      (!f.milo || !!r.milo) &&
      (!f.stars || starSum('food', r.id) >= f.stars));
    const byKm = (x, y) => x.km - y.km;
    // podle hodnocení: známka, při shodě víc recenzí; podniky bez hodnocení na konec
    const byRate = (x, y) => ((y.rate ? y.rate.v : 0) - (x.rate ? x.rate.v : 0)) || ((y.rate ? y.rate.c : 0) - (x.rate ? x.rate.c : 0));
    list.sort(f.sort === 'ours' ? (x, y) => (starSum('food', y.id) - starSum('food', x.id)) || byRate(x, y) || byKm(x, y)
      : f.sort === 'kids' ? (x, y) => (KIDS_RANK[x.kids] - KIDS_RANK[y.kids]) || byKm(x, y)
      : f.sort === 'rating' ? (x, y) => byRate(x, y) || byKm(x, y)
      : f.sort === 'price' ? (x, y) => (x.price - y.price) || byKm(x, y) : byKm);
    if (pick) list.sort((x, y) => (x.closed || []).includes(dow(pick.date)) - (y.closed || []).includes(dow(pick.date)));
    return list;
  }

  function renderFood() {
    const el = $('#tab-jidlo');
    const f = state.ff;
    const list = filteredFood();
    const moreCount = f.price.length + f.dist.length;
    el.innerHTML = `
      <div class="sec-head"><h2 class="h-sec">Kde se najíst<small>Podniky vybrané podle recenzí a podle toho, jak to tam chodí s dětmi.</small></h2></div>
      <div class="filters${f.more ? ' is-open' : ''}">
        ${state.pick && state.pick.kind === 'meal' ? pickBar() : ''}
        ${miloChip('data-ffmilo', f.milo, oursChips('data-ffstars', f.stars))}
        <div class="chips" role="group" aria-label="Jídlo dne">
          ${Object.entries(MEALS).map(([m, M]) => chip('data-ffmeal', m, M.label, f.meals.includes(m), `<span aria-hidden="true">${M.emoji}</span>`)).join('')}
        </div>
        <div class="chips" role="group" aria-label="S dětmi">
          ${Object.entries(KIDS_F).map(([k, l]) => chip('data-ffkids', k, l, f.kids.includes(k), `<span class="dot" data-kids="${k}"></span>`)).join('')}
        </div>
        <div class="chips" role="group" aria-label="Kuchyně">
          ${Object.entries(FOOD_TAGS).map(([k, c]) => chip('data-fftag', k, c.label, f.tags.includes(k), `<span aria-hidden="true">${c.emoji}</span>`)).join('')}
        </div>
        <div class="result-line">
          <span class="result-line__tools">
            ${sortSel('data-ffsort', f.sort, FOOD_SORTS)}
            <button class="linkish" data-ffmore>${f.more ? 'Skrýt filtry' : 'Filtry'}${moreCount ? ` (${moreCount})` : ''}</button>
            <button class="linkish" data-ffview>${f.view === 'map' ? 'Seznam' : 'Mapa'}</button>
          </span>
        </div>
        ${f.more ? `<div class="more-filters">
          <div><h4>Cena na osobu</h4><div class="chips">
            ${[1, 2, 3, 4, 5].map(n => chip('data-ffprice', n, '€'.repeat(n), f.price.includes(n))).join('')}
          </div><p class="src" style="margin-top:6px">€ do 10 € · €€ do 20 € · €€€ do 35 € · €€€€ do 60 € · €€€€€ víc</p></div>
          <div><h4>Vzdálenost od ubytka</h4><div class="chips">
            ${chip('data-ffdist', 'blizko', 'Do 1 km', f.dist.includes('blizko'))}${chip('data-ffdist', 'mesto', 'Do 3 km', f.dist.includes('mesto'))}${chip('data-ffdist', 'dal', 'Dál po Málaze', f.dist.includes('dal'))}${chip('data-ffdist', 'vylet', 'U výletů mimo Málagu', f.dist.includes('vylet'))}
          </div></div>
          <button class="linkish" data-ffreset>Zrušit všechny filtry</button>
        </div>` : ''}
      </div>
      ${f.view === 'map' ? '<div class="map" id="map-jidlo"></div>' : `
      <div class="list">${list.length ? list.map(foodCard).join('') : `
        <div class="empty"><p>Těmto filtrům nic neodpovídá.</p><button class="btn btn--sm" data-ffreset>Zrušit filtry</button></div>`}</div>`}`;
    if (f.view === 'map') drawMap('#map-jidlo', list, r => r.emoji || (CUISINES[r.cuisine] || {}).emoji || '🍽️',
      r => `<b>${r.name}</b><br>${r.rate ? `★ ${fmtRate(r.rate.v)} ${RATE_SRC[r.rate.src]} · ` : ''}${fmtKm(r.km)}<br>${r.tags.map(t => FOOD_TAGS[t].label).join(', ')}<br><a href="#" data-showfood="${r.id}">Zobrazit detail</a>`);
  }

  /* ---------- Záložka Info (cesta, příprava, tipy) ---------- */
  function renderInfo() {
    const el = $('#tab-info');
    const seg = state.info;
    const p = prepProgress();
    el.innerHTML = `
      <div class="seg" role="group" aria-label="Info">
        <button data-info="tam" aria-pressed="${seg === 'tam'}">Tam<small>so 31. 10.</small></button>
        <button data-info="zpet" aria-pressed="${seg === 'zpet'}">Zpět<small>po 9. 11.</small></button>
        <button data-info="pred" aria-pressed="${seg === 'pred'}">Příprava<small>${p.done}/${p.total}</small></button>
        <button data-info="tipy" aria-pressed="${seg === 'tipy'}">Tipy<small>a kontakty</small></button>
      </div>
      ${seg === 'tipy' ? tipsBody() : seg === 'pred' ? renderChecklist() : itineraryBody(ITINERARY[seg] || ITINERARY.tam)}`;
  }
  // řidička: fotka (klepnutím zvětšit, ať ji v hale poznáte), volat a WhatsApp; data jsou v data/secret.js zašifrovaná
  function driverCard() {
    const d = PRIVATE.driver;
    if (!d) return '<p class="muted">Kontakt na řidičku se nepodařilo rozšifrovat. Odemkněte stránku znovu kódem.</p>';
    return `<div class="driver">
      <button class="driver__photo" data-driverzoom aria-label="Zvětšit fotku"><img src="${d.photo}" alt="Fotka řidičky ${d.name}" width="96" height="96"></button>
      <div><b>${d.name}</b><small class="mono">${d.tel}</small>
        <div class="btn-row"><a class="btn btn--sm btn--primary" href="tel:${d.tel.replace(/\s/g, '')}">Volat</a><a class="btn btn--sm" href="https://wa.me/${d.tel.replace(/\D/g, '')}" target="_blank" rel="noopener">WhatsApp</a></div></div>
    </div>`;
  }
  function itineraryBody(it) {
    return `
      ${passCard(it.pass)}
      ${it.alert ? `<div class="card card--alert card--flat">${it.alert}</div>` : ''}
      <ol class="tl">${it.items.map(x => `
        <li class="tl__item ${x.key ? 'is-key' : ''}">
          <span class="tl__time">${x.t}</span><span class="tl__dot" aria-hidden="true"></span>
          <div class="tl__card">
            <p class="tl__title">${x.title}</p>
            ${x.text ? `<p class="tl__text">${x.text}</p>` : ''}
            ${x.more ? `<details><summary>Podrobnosti</summary><div class="tl__text">${x.more}</div></details>` : ''}
            ${x.driver ? driverCard() : ''}
            ${x.img && !x.img.wide ? `<details><summary>${x.img.label}</summary><a href="${x.img.src}" target="_blank" rel="noopener"><img src="${x.img.src}" alt="${x.img.alt}" loading="lazy"></a></details>` : ''}
            ${x.links ? `<div class="btn-row">${x.links.map(([l, u], i) => `<a class="btn btn--sm ${i === 0 ? 'btn--primary' : ''}" href="${u}" target="_blank" rel="noopener">${l}</a>`).join('')}</div>` : ''}
          </div>
        </li>${x.img && x.img.wide ? `
        <li class="tl__wide"><details${x.img.open ? ' open' : ''}><summary>${x.img.label}</summary><a href="${x.img.src}" target="_blank" rel="noopener"><img src="${x.img.src}" alt="${x.img.alt}" loading="lazy"></a></details></li>` : ''}`).join('')}</ol>`;
  }
  function passCard(p) {
    return `<article class="pass" aria-label="Let ${p.flight}">
      <div class="pass__top"><span>${p.airline} · ${p.date}</span><span class="mono">${p.flight}</span></div>
      <div class="pass__route">
        <div class="pass__city"><span class="pass__code">${p.from.code}</span><span class="pass__name">${p.from.name}</span><span class="pass__time">${p.from.time}</span></div>
        <div class="pass__plane"><svg><use href="#n-plane"/></svg>${p.duration}</div>
        <div class="pass__city"><span class="pass__code">${p.to.code}</span><span class="pass__name">${p.to.name}</span><span class="pass__time">${p.to.time}</span></div>
      </div>
      <div class="pass__tear"></div>
      <div class="pass__info">${p.info.map(([k, v]) => `<span>${k}<b>${v}</b></span>`).join('')}</div>
    </article>`;
  }
  /* ---------- Příprava: sdílené úkoly ----------
     Výchozí sekce a úkoly jsou v CHECKLIST (data/trip.js), změny a nové věci v PLAN.prep():
     výchozí položka + uložené pole = výsledek; smazaná výchozí má del: true, vlastní se maže celá. */
  const WHO = { tom: 'Tom', misa: 'Míša' };
  const ASSIGN = { ...WHO, oba: 'Oba' };   // úkol pro oba má checkbox pro každého, hotový je až po obou
  const bothDone = t => t.who === 'oba' ? { ...t, by: t.by || {}, done: !!(t.by && t.by.tom && t.by.misa) } : t;
  function prepModel() {
    const st = PLAN.prep();
    const secs = CHECKLIST.map((g, i) => ({ id: g.id, title: g.title, ord: i * 10, def: true, ...(st.secs[g.id] || {}) }));
    Object.entries(st.secs).forEach(([id, o]) => { if (!secs.some(s => s.id === id)) secs.push({ id, title: '', ord: 0, ...o }); });
    const live = secs.filter(s => !s.del && s.title).sort((a, b) => a.ord - b.ord);
    const ids = new Set(live.map(s => s.id));
    const tasks = CHECKLIST.flatMap(g => g.items.map((it, i) => ({ id: it.id, t: it.t, n: it.n || '', sec: g.id, ord: i * 10, who: '', done: false, def: true, ...(st.tasks[it.id] || {}) })));
    Object.entries(st.tasks).forEach(([id, o]) => { if (!tasks.some(t => t.id === id)) tasks.push({ id, t: '', n: '', sec: '', ord: 0, who: '', done: false, ...o }); });
    return { secs: live, tasks: tasks.filter(t => !t.del && t.t && ids.has(t.sec)).map(bothDone).sort((a, b) => a.ord - b.ord) };
  }
  const prepProgress = () => { const { tasks } = prepModel(); return { total: tasks.length, done: tasks.filter(t => t.done).length }; };
  // změna osoby drží stav: hotový úkol Toma je po přepnutí na Oba hotový u Toma, z Oba na jednoho platí jeho checkbox
  const whoPatch = (t, who) => t.who === who ? {} : who === 'oba'
    ? { who, 'by/tom': t.done && t.who !== 'misa', 'by/misa': t.done && t.who !== 'tom' }
    : { who, ...(t.who === 'oba' ? { done: who ? !!t.by[who] : t.done } : {}) };
  const nextOrd = (tasks, sec) => Math.max(-10, ...tasks.filter(t => t.sec === sec).map(t => t.ord)) + 10;
  // odškrtnutí ze staré verze (jen v telefonu) jednou přenést do sdílených úkolů
  function migrateChecks() {
    const old = store.get('checks', {});
    if (store.get('checksMoved', false) || !Object.keys(old).length) return;
    const { tasks } = prepModel();
    tasks.filter(t => old[t.id] && !t.done).forEach(t => PLAN.setTask(t.id, { done: true }));
    store.set('checksMoved', true);
  }

  const taskRow = t => `<li class="task ${t.done ? 'is-done' : ''}" data-task="${t.id}">
      <span class="task__grip" data-grip aria-hidden="true">${icon('grip')}</span>
      ${t.who === 'oba' ? `<span class="task__checks">${Object.entries(WHO).map(([k, n]) => `<label class="task__check task__check--who" data-p="${k}"><input type="checkbox" data-taskby="${t.id}|${k}" ${t.by[k] ? 'checked' : ''} aria-label="${n} hotovo: ${esc(t.t)}"><small aria-hidden="true">${n}</small></label>`).join('')}</span>`
        : `<label class="task__check"><input type="checkbox" data-taskdone="${t.id}" ${t.done ? 'checked' : ''} aria-label="Hotovo: ${esc(t.t)}"></label>`}
      <button class="task__main" data-taskedit="${t.id}"><span>${esc(t.t)}</span>${t.n.trim() ? `<small>${esc(t.n)}</small>` : ''}</button>
      <button class="who${t.who ? '' : ' is-empty'}" data-who="${t.id}" data-whoval="${t.who}" aria-label="${t.who === 'oba' ? 'Úkol mají oba, změnit' : t.who ? 'Úkol má ' + WHO[t.who] + ', změnit' : 'Přiřadit osobu'}">${t.who ? ASSIGN[t.who] : icon('user')}</button>
    </li>`;
  function renderChecklist() {
    const { secs, tasks } = prepModel();
    const f = state.prepWho, done = tasks.filter(t => t.done).length;
    return `
      <div class="card card--flat prep-head">
        <div class="sec-head"><h2 class="h-sec">Před odjezdem<small>${done} z ${tasks.length} hotovo. Úkoly vidí oba telefony.</small></h2></div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${tasks.length}" aria-valuenow="${done}"><i style="width:${tasks.length ? done / tasks.length * 100 : 0}%"></i></div>
        <div class="prep-bar">
          <div class="chips" role="group" aria-label="Čí úkoly">
            ${chip('data-prepwho', 'vse', 'Všichni', !f)}${Object.entries(WHO).map(([k, n]) => chip('data-prepwho', k, n, f === k)).join('')}
          </div>
          <button class="btn btn--sm btn--primary" data-taskadd="">${icon('plus')} Úkol</button>
        </div>
      </div>
      ${secs.map(s => {
        const list = tasks.filter(t => t.sec === s.id), shown = list.filter(t => !f || t.who === f || t.who === 'oba');
        return `<section class="psect" aria-label="${esc(s.title)}">
          <div class="psect__head"><h3>${esc(s.title)}</h3><span class="psect__n">${list.filter(t => t.done).length}/${list.length}</span>
            <button class="ibtn" data-secedit="${s.id}" aria-label="Upravit sekci ${esc(s.title)}">${icon('edit')}</button></div>
          <ul class="tasks" data-sec="${s.id}">${shown.map(taskRow).join('')}</ul>
          ${f && !shown.length ? `<p class="psect__empty">${WHO[f]} tady nic nemá.</p>` : ''}
          <button class="addline" data-taskadd="${s.id}">${icon('plus')} Přidat úkol</button>
        </section>`;
      }).join('')}
      <button class="btn" data-secadd>${icon('plus')} Nová sekce</button>`;
  }

  function taskSheet(id, secId) {
    const { secs, tasks } = prepModel();
    if (!secs.length) return secSheet();
    const t = id ? tasks.find(x => x.id === id) : { t: '', n: '', sec: secId || secs[0].id, who: state.prepWho || '' };
    if (!t) return;
    openSheet(`
      <p class="sheet__eyebrow">${id ? 'Upravit úkol' : 'Nový úkol'}</p>
      <form class="tform" data-taskform="${id || ''}">
        <label class="field"><span>Název</span><input name="t" required maxlength="200" value="${esc(t.t)}" autocomplete="off"></label>
        <label class="field"><span>Sekce</span><select name="sec" required>${secs.map(s => `<option value="${s.id}"${s.id === t.sec ? ' selected' : ''}>${esc(s.title)}</option>`).join('')}</select></label>
        <fieldset class="field"><legend>Kdo to má <small>nepovinné</small></legend>
          <div class="seg">${[['', 'Nikdo'], ...Object.entries(ASSIGN)].map(([k, n]) => `<label><input type="radio" name="who" value="${k}"${t.who === k ? ' checked' : ''}><span>${n}</span></label>`).join('')}</div></fieldset>
        <label class="field"><span>Popis <small>nepovinné</small></span><textarea name="n" rows="3" maxlength="1000">${esc(t.n.trim())}</textarea></label>
        <div class="btn-row"><button class="btn btn--primary">${id ? 'Uložit' : 'Přidat úkol'}</button><button class="btn" type="button" data-sheetclose>Zrušit</button>
          ${id ? `<button class="btn btn--ghost tform__del" type="button" data-taskdel="${id}">Smazat úkol</button>` : ''}</div>
      </form>`);
    if (!id) setTimeout(() => { const i = $('#sheet-body input[name="t"]'); if (i) i.focus(); }, 50);
  }
  function secSheet(id) {
    const { secs, tasks } = prepModel();
    const s = id ? secs.find(x => x.id === id) : { title: '' };
    if (!s) return;
    const n = id ? tasks.filter(t => t.sec === id).length : 0;
    openSheet(`
      <p class="sheet__eyebrow">${id ? 'Upravit sekci' : 'Nová sekce'}</p>
      <form class="tform" data-secform="${id || ''}">
        <label class="field"><span>Název sekce</span><input name="title" required maxlength="80" value="${esc(s.title)}" autocomplete="off"></label>
        <div class="btn-row"><button class="btn btn--primary">${id ? 'Uložit' : 'Přidat sekci'}</button><button class="btn" type="button" data-sheetclose>Zrušit</button>
          ${id && !n ? `<button class="btn btn--ghost tform__del" type="button" data-secdel="${id}">Smazat sekci</button>` : ''}</div>
        ${id && n ? `<p class="muted">Smazat jde jen prázdná sekce. Úkoly přesuňte tažením za úchyt nebo v úpravě úkolu.</p>` : ''}
      </form>`);
    setTimeout(() => { const i = $('#sheet-body input[name="title"]'); if (i && !id) i.focus(); }, 50);
  }
  function saveTaskForm(form) {
    const id = form.dataset.taskform, v = Object.fromEntries(new FormData(form));
    const t = (v.t || '').trim(), sec = v.sec, who = v.who || '';
    if (!t || !sec) return;
    const { tasks } = prepModel();
    const cur = id && tasks.find(x => x.id === id);
    // prázdný popis se u výchozího úkolu uloží jako mezera, jinak by se vrátil text z CHECKLIST
    const n = (v.n || '').trim() || (cur && cur.def ? ' ' : '');
    if (cur) PLAN.setTask(id, { t, n, sec, ...whoPatch(cur, who), ...(cur.sec !== sec ? { ord: nextOrd(tasks, sec) } : {}) });
    else PLAN.setTask(PLAN.newId('u-'), { t, n, who, sec, ord: nextOrd(tasks, sec), done: false });
    closeSheet(); renderInfo();
  }
  function saveSecForm(form) {
    const id = form.dataset.secform, title = (new FormData(form).get('title') || '').trim();
    if (!title) return;
    if (id) PLAN.setSec(id, { title });
    else { const { secs } = prepModel(); PLAN.setSec(PLAN.newId('s-'), { title, ord: Math.max(-10, ...secs.map(s => s.ord)) + 10 }); }
    closeSheet(); renderInfo();
  }
  function deleteTask(id) {
    const { tasks } = prepModel();
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    if (t.def) PLAN.setTask(id, { del: true }); else PLAN.dropTask(id);
    closeSheet(); renderInfo();
    toast(`Smazáno: ${esc(t.t)}`, () => {
      if (t.def) PLAN.setTask(id, { del: null });
      else PLAN.setTask(id, { t: t.t, n: t.n, who: t.who, sec: t.sec, ord: t.ord, done: t.done, by: t.by });
      renderInfo();
    }, false);
  }

  /* Přesun úkolu tažením za úchyt (pointer events, funguje prstem i myší, i mezi sekcemi) */
  let dragging = null;
  function dragPlace(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el || !dragging) return;
    const { li } = dragging, over = el.closest('.task'), sect = el.closest('.psect');
    if (over && over !== li && over.parentNode.matches('.tasks')) {
      const r = over.getBoundingClientRect();
      over.parentNode.insertBefore(li, y < r.top + r.height / 2 ? over : over.nextSibling);
    } else if (!over && sect) {
      const list = $('.tasks', sect);
      if (list && !list.contains(li)) list.appendChild(li);
    }
  }
  function dragScroll() {
    if (!dragging) return;
    const { y } = dragging, top = 70, bottom = innerHeight - 100;
    const v = y < top ? -Math.min(16, (top - y) / 3) : y > bottom ? Math.min(16, (y - bottom) / 3) : 0;
    if (v) { scrollBy(0, v); dragPlace(dragging.x, y); }
    requestAnimationFrame(dragScroll);
  }
  document.addEventListener('pointerdown', e => {
    const grip = e.target.closest('[data-grip]');
    if (!grip || e.button > 0) return;
    e.preventDefault();
    $$('.whomenu').forEach(m => m.remove());
    const li = grip.closest('.task'), r = li.getBoundingClientRect();
    const ghost = li.cloneNode(true);
    ghost.classList.add('task--ghost');
    Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px' });
    document.body.appendChild(ghost);
    document.body.classList.add('is-dragging');
    li.classList.add('is-placeholder');
    dragging = { li, ghost, id: li.dataset.task, dy: e.clientY - r.top, x: e.clientX, y: e.clientY };
    try { grip.setPointerCapture(e.pointerId); } catch { /* starší prohlížeče */ }
    requestAnimationFrame(dragScroll);
  });
  document.addEventListener('pointermove', e => {
    if (!dragging) return;
    dragging.x = e.clientX; dragging.y = e.clientY;
    dragging.ghost.style.top = (e.clientY - dragging.dy) + 'px';
    dragPlace(e.clientX, e.clientY);
  });
  const dragEnd = e => {
    if (!dragging) return;
    const { li, ghost, id } = dragging;
    dragging = null;
    ghost.remove(); li.classList.remove('is-placeholder'); document.body.classList.remove('is-dragging');
    const list = li.parentNode;
    if (e.type !== 'pointercancel' && list && list.dataset.sec) {
      const { tasks } = prepModel();
      const ordOf = el => { const t = el && tasks.find(x => x.id === el.dataset.task); return t ? t.ord : null; };
      const a = ordOf(li.previousElementSibling), b = ordOf(li.nextElementSibling);
      const ord = a == null && b == null ? nextOrd(tasks, list.dataset.sec) : a == null ? b - 10 : b == null ? a + 10 : (a + b) / 2;
      const cur = tasks.find(x => x.id === id);
      if (cur && (cur.sec !== list.dataset.sec || cur.ord !== ord)) PLAN.setTask(id, { sec: list.dataset.sec, ord });
    }
    remotePending = false;
    renderInfo();
  };
  document.addEventListener('pointerup', dragEnd);
  document.addEventListener('pointercancel', dragEnd);
  function tipsBody() {
    const only = state.tipsMilo;
    const secs = only ? TIPS.filter(s => s.items && s.items.some(t => t.milo)).map(s => ({ ...s, items: s.items.filter(t => t.milo) })) : TIPS;
    return `
      ${miloChip('data-tmilo', only)}
      <section class="card card--flat" aria-label="Rychlé akce">
        <div class="quick">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${STAY.lat},${STAY.lon}&travelmode=transit" target="_blank" rel="noopener"><span class="q-ico">🏠</span>Cesta domů</a>
          <button data-show-address><span class="q-ico">🪪</span>Adresa pro řidiče</button>
          <a href="tel:112"><span class="q-ico">🆘</span>Tísňová linka 112</a>
        </div>
      </section>
      ${only ? '' : `<section class="card" aria-label="Kontakty">
        <h3>Důležité kontakty</h3>
        <div>${CONTACTS.map(c => { const tel = c.secret ? (PRIVATE[c.secret] || {}).tel : c.tel; return `
          <div class="contact"><div><b>${c.name}</b><small>${c.note || ''}</small></div>
          ${tel ? `<span class="contact__btns"><a class="btn btn--sm" href="tel:${tel.replace(/\s/g, '')}">${tel}</a>${c.secret ? `<a class="btn btn--sm" href="https://wa.me/${tel.replace(/\D/g, '')}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</span>` : c.url ? `<a class="btn btn--sm" href="${c.url}" target="_blank" rel="noopener">Otevřít</a>` : ''}</div>`; }).join('')}</div>
      </section>`}
      ${secs.map(s => `
        <details class="acc"${only ? ' open' : ''}>
          <summary><span class="acc__ico" aria-hidden="true">${s.icon}</span><span><span class="acc__t">${s.title}</span><span class="acc__s">${s.sub}</span></span>${icon('chev')}</summary>
          <div class="acc__in">${s.html ? s.html() : s.items.map(t => `
            <div class="tip"><h4>${t.h}</h4>${t.p ? `<p>${t.p}</p>` : ''}${t.ul ? `<ul>${t.ul.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}${t.milo ? miloBlock(t.milo) : ''}${t.links ? `<div class="btn-row" style="margin-top:6px">${t.links.map(([l, u]) => `<a class="btn btn--sm" href="${u}" target="_blank" rel="noopener">${l} ${icon('ext')}</a>`).join('')}</div>` : ''}</div>`).join('')}
          </div>
        </details>`).join('')}`;
  }

  /* ---------- Spodní panel (výběr dne) a oznámení ---------- */
  function openSheet(html) {
    $('#sheet-body').innerHTML = html;
    const d = $('#sheet');
    if (!d.open) d.showModal();
  }
  const closeSheet = () => { const d = $('#sheet'); if (d.open) d.close(); };

  function actSheet(a) {
    openSheet(`
      <p class="sheet__eyebrow">Přidat do plánu</p>
      <h3 class="sheet__title">${a.emoji || CATS[a.cat].emoji} ${a.name}</h3>
      <div class="pickdays">${stayDays.map(d => {
        const w = dayWeather(d), L = dayLoad(d), closed = isClosed(a, d), has = L.acts.includes(a);
        const warns = closed ? [] : actWarn(a, d, w);
        const ev = closed ? '' : actDayNote(a, d);
        const note = closed ? (a.onlyDates ? 'nekoná se' : 'zavřeno') : has ? 'už v plánu' : warns.length ? warns.join(', ')
          : (L.acts.length ? `<b>${fmtHours(L.total)}</b> v plánu` : 'volno') + (ev ? ` · ${ev}` : '');
        return `<button class="pickday ${warns.length ? 'is-warn' : ''}" data-addto="${d}" data-act="${a.id}" ${closed ? 'disabled' : ''}>
          <span class="pickday__d">${fmtS(d)}<small>${dayLabel(d)} ${daySig(d)}</small></span>${icon(w.ico)}<span class="mono">${Math.round(w.tmax)}°</span><span class="pickday__load">${note}</span>
        </button>`;
      }).join('')}</div>
      <button class="btn" data-sheetclose>Zrušit</button>`);
  }

  let sheetMeal = null;
  function foodSheet(r) {
    if (!sheetMeal || !r.meals.includes(sheetMeal)) sheetMeal = r.meals.includes('obed') ? 'obed' : r.meals[0];
    openSheet(`
      <p class="sheet__eyebrow">Přidat do plánu</p>
      <h3 class="sheet__title">${r.emoji || ''} ${r.name}</h3>
      <div class="seg" role="group" aria-label="Které jídlo">${Object.entries(MEALS).map(([m, M]) =>
        `<button data-sheetmeal="${m}" data-rest="${r.id}" aria-pressed="${m === sheetMeal}" ${r.meals.includes(m) ? '' : 'disabled'}>${M.label}</button>`).join('')}</div>
      <div class="pickdays">${stayDays.map(d => {
        const cur = REST[PLAN.day(d).meals[sheetMeal]];
        const off = mealOff(d, sheetMeal), closed = off || (r.closed || []).includes(dow(d));
        const note = off ? 'na cestě' : closed ? 'zavřeno' : cur ? (cur.id === r.id ? 'už v plánu' : `místo: <b>${cur.name}</b>`) : 'zatím na ubytku';
        const w = dayWeather(d);
        return `<button class="pickday" data-mealto="${d}" data-rest="${r.id}" ${closed ? 'disabled' : ''}>
          <span class="pickday__d">${fmtS(d)}<small>${dayLabel(d)} ${daySig(d)}</small></span>${icon(w.ico)}<span class="mono">${Math.round(w.tmax)}°</span><span class="pickday__load">${note}</span>
        </button>`;
      }).join('')}</div>
      <button class="btn" data-sheetclose>Zrušit</button>`);
  }

  let toastT = null, undoFn = null;
  function toast(msg, undo, showPlan = state.tab !== 'plan') {
    const el = $('#toast');
    undoFn = undo || null;
    el.innerHTML = `<span>${msg}</span>${undo ? '<button data-undo>Zpět</button>' : ''}${showPlan ? '<button data-go="plan">Plán</button>' : ''}`;
    el.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { el.hidden = true; undoFn = null; }, 5000);
  }
  const hideToast = () => { $('#toast').hidden = true; clearTimeout(toastT); };

  /* ---------- Akce plánu ---------- */
  function refreshSlots() {
    $$('[data-plan-act]').forEach(el => { el.innerHTML = inPlanActs(el.dataset.planAct); });
    $$('[data-plan-rest]').forEach(el => { el.innerHTML = inPlanMeals(el.dataset.planRest); });
    $$('[data-stars]').forEach(el => { const [kind, id] = el.dataset.stars.split('|'); el.innerHTML = oursRow(kind, id); });
  }
  function addActTo(date, id, picked) {
    PLAN.addAct(date, id);
    refreshSlots();
    toast(`${ACT[id].name}: ${fmtS(date)}`, () => {
      const i = PLAN.day(date).acts.lastIndexOf(id);
      if (i >= 0) PLAN.removeAct(date, i);
      refreshSlots(); if (state.tab === 'plan') renderPlan();
    }, !picked && state.tab !== 'plan');
  }
  function setMealTo(date, meal, id, picked) {
    const prev = PLAN.day(date).meals[meal] || null;
    PLAN.setMeal(date, meal, id);
    refreshSlots();
    toast(`${MEALS[meal].label} ${fmtS(date)}: ${REST[id].name}`, () => {
      PLAN.setMeal(date, meal, prev); refreshSlots(); if (state.tab === 'plan') renderPlan();
    }, !picked && state.tab !== 'plan');
  }
  // po výběru z Plánu se vrátit na den, ze kterého se vybíralo
  function backToDay(date) {
    state.pick = null;
    go('plan', { scroll: false });
    const el = $('#pday-' + date);
    if (el) el.scrollIntoView({ block: 'start' });
  }
  function showAct(id) {
    state.pick = null;
    state.f.view = 'list';
    if (!filtered().some(a => a.id === id)) state.f = { ...state.f, ...TRIP_FILTERS, cats: [], dur: [], dist: [], stroller: [], cost: [] };
    saveF(); go('vylety', { scroll: false });
    const el = $('#act-' + id); if (el) el.scrollIntoView({ block: 'start' });
  }
  function showRest(id) {
    state.pick = null;
    state.ff.view = 'list';
    if (!filteredFood().some(r => r.id === id)) state.ff = { ...state.ff, ...FOOD_FILTERS, meals: [], kids: [], tags: [], price: [], dist: [] };
    saveFF(); go('jidlo', { scroll: false });
    const el = $('#food-' + id); if (el) el.scrollIntoView({ block: 'start' });
  }

  /* ---------- Navigace a události ---------- */
  const renderers = { dnes: renderToday, plan: renderPlan, vylety: renderTrips, jidlo: renderFood, info: renderInfo };
  function go(tab, { scroll = true } = {}) {
    if (!renderers[tab]) tab = 'dnes';
    if (state.pick && !((state.pick.kind === 'act' && tab === 'vylety') || (state.pick.kind === 'meal' && tab === 'jidlo'))) state.pick = null;
    state.tab = tab; store.set('tab', tab);
    $$('.panel').forEach(p => { p.hidden = p.dataset.tab !== tab; });
    $$('.tabbar__btn').forEach(b => b.setAttribute('aria-current', b.dataset.go === tab ? 'page' : 'false'));
    renderers[tab]();
    if (!scroll) return;
    const t = tripToday();
    if (tab === 'plan' && t && $('#pday-' + t)) $('#pday-' + t).scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0 });
  }
  function saveF() { store.set('filters', state.f); }
  function saveFF() { store.set('foodFilters', state.ff); }
  const toggleIn = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  document.addEventListener('click', e => {
    // nabídka osoby u úkolu se zavře klepnutím kamkoli jinam
    if (!e.target.closest('.whomenu, [data-who]')) closeWho();
    const t = e.target.closest('button, a[data-showcard], a[data-showfood]');
    if (!t) return;
    const d = t.dataset;
    if (d.go) { hideToast(); return go(d.go); }
    if (d.wxmode) { state.wxMode = d.wxmode; store.set('wxMode', d.wxmode); if (d.wxmode !== 'pobyt') loadWeather(); return renderToday(); }
    if (d.stayday) { state.stayDay = d.stayday; store.set('stayDay', d.stayday); renderToday(); return $('.hero').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if ('refresh' in d) return loadWeather(true);
    if (d.star) {
      const [kind, id, who, i] = d.star.split('|'), cur = PLAN.stars(kind, id)[who] || 0;
      PLAN.setStars(kind, id, who, cur === +i ? 0 : +i);
      return refreshSlots();
    }
    if ('driverzoom' in d) { t.closest('.driver').classList.toggle('is-big'); return; }
    if (d.done) { state.done[d.done] = !state.done[d.done]; if (!state.done[d.done]) delete state.done[d.done]; store.set('done', state.done); return renderers[state.tab](); }
    // filtry výletů
    if (d.fwx) { state.f.wx = d.fwx; saveF(); return renderTrips(); }
    if (d.fcat) { state.f.cats = toggleIn(state.f.cats, d.fcat); saveF(); return renderTrips(); }
    if (d.fdur) { state.f.dur = toggleIn(state.f.dur, d.fdur); saveF(); return renderTrips(); }
    if (d.fdist) { state.f.dist = toggleIn(state.f.dist, d.fdist); saveF(); return renderTrips(); }
    if (d.fstr) { state.f.stroller = toggleIn(state.f.stroller, d.fstr); saveF(); return renderTrips(); }
    if (d.fcost) { state.f.cost = toggleIn(state.f.cost, d.fcost); saveF(); return renderTrips(); }
    if (d.fflag) { state.f[d.fflag] = !state.f[d.fflag]; saveF(); return renderTrips(); }
    if ('fmore' in d) { state.f.more = !state.f.more; saveF(); return renderTrips(); }
    if ('fmilo' in d) { state.f.milo = !state.f.milo; saveF(); return renderTrips(); }
    if (d.fstars) { state.f.stars = state.f.stars === +d.fstars ? 0 : +d.fstars; saveF(); return renderTrips(); }
    if ('fview' in d) { state.f.view = state.f.view === 'map' ? 'list' : 'map'; saveF(); return renderTrips(); }
    if ('freset' in d) { state.f = { ...state.f, ...TRIP_FILTERS, cats: [], dur: [], dist: [], stroller: [], cost: [] }; saveF(); return renderTrips(); }
    // filtry jídla
    if (d.ffmeal) { state.ff.meals = toggleIn(state.ff.meals, d.ffmeal); saveFF(); return renderFood(); }
    if (d.ffkids) { state.ff.kids = toggleIn(state.ff.kids, d.ffkids); saveFF(); return renderFood(); }
    if (d.fftag) {
      state.ff.tags = toggleIn(state.ff.tags, d.fftag); saveFF(); renderFood();
      // chip na kartě: po přefiltrování zpátky nahoru na výsledky
      if (t.classList.contains('ctag')) window.scrollTo({ top: 0 });
      return;
    }
    if (d.ffprice) { state.ff.price = toggleIn(state.ff.price, +d.ffprice); saveFF(); return renderFood(); }
    if (d.ffdist) { state.ff.dist = toggleIn(state.ff.dist, d.ffdist); saveFF(); return renderFood(); }
    if ('ffmore' in d) { state.ff.more = !state.ff.more; saveFF(); return renderFood(); }
    if ('ffmilo' in d) { state.ff.milo = !state.ff.milo; saveFF(); return renderFood(); }
    if (d.ffstars) { state.ff.stars = state.ff.stars === +d.ffstars ? 0 : +d.ffstars; saveFF(); return renderFood(); }
    if ('tmilo' in d) { state.tipsMilo = !state.tipsMilo; store.set('tipsMilo', state.tipsMilo); return renderInfo(); }
    if ('ffview' in d) { state.ff.view = state.ff.view === 'map' ? 'list' : 'map'; saveFF(); return renderFood(); }
    if ('ffreset' in d) { state.ff = { ...state.ff, ...FOOD_FILTERS, meals: [], kids: [], tags: [], price: [], dist: [] }; saveFF(); return renderFood(); }
    // přidávání do plánu
    if (d.add) {
      if (state.pick && state.pick.kind === 'act') { const date = state.pick.date; addActTo(date, d.add, true); return backToDay(date); }
      return actSheet(ACT[d.add]);
    }
    if (d.addto) { closeSheet(); return addActTo(d.addto, d.act); }
    if (d.addfood) {
      if (state.pick && state.pick.kind === 'meal') { const { date, meal } = state.pick; setMealTo(date, meal, d.addfood, true); return backToDay(date); }
      return foodSheet(REST[d.addfood]);
    }
    if (d.sheetmeal) { sheetMeal = d.sheetmeal; return foodSheet(REST[d.rest]); }
    if (d.mealto) { closeSheet(); return setMealTo(d.mealto, sheetMeal, d.rest); }
    if ('sheetclose' in d) return closeSheet();
    if ('undo' in d) { const f = undoFn; hideToast(); undoFn = null; if (f) f(); return; }
    // úpravy v plánu
    if (d.move) { const [date, i, dir] = d.move.split('|'); PLAN.moveAct(date, +i, +dir); return renderPlan(); }
    if (d.unplan) {
      const [date, i] = d.unplan.split('|'); const id = PLAN.day(date).acts[+i];
      PLAN.removeAct(date, +i); renderPlan();
      return toast(`Odebráno: ${ACT[id] ? ACT[id].name : ''}`, () => { PLAN.insertAct(date, +i, id); renderPlan(); }, false);
    }
    if (d.unmeal) {
      const [date, m] = d.unmeal.split('|'); const prev = PLAN.day(date).meals[m];
      PLAN.setMeal(date, m, null); renderPlan();
      return toast(`${MEALS[m].label} ${fmtS(date)}: na ubytku`, () => { PLAN.setMeal(date, m, prev); renderPlan(); }, false);
    }
    if (d.pickact) { state.pick = { kind: 'act', date: d.pickact }; state.f.view = 'list'; return go('vylety'); }
    if (d.pickmeal) { const [date, meal] = d.pickmeal.split('|'); state.pick = { kind: 'meal', date, meal }; state.ff.view = 'list'; return go('jidlo'); }
    if ('pickcancel' in d) return backToDay(state.pick.date);
    if (d.showact) return showAct(d.showact);
    if (d.showrest) return showRest(d.showrest);
    if (d.jump) { const el = $('#pday-' + d.jump); return el && el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (d.jumpplan) { go('plan', { scroll: false }); const el = $('#pday-' + d.jumpplan); return el && el.scrollIntoView({ block: 'start' }); }
    // Příprava
    if (d.prepwho) { state.prepWho = d.prepwho === 'vse' ? '' : d.prepwho; store.set('prepWho', state.prepWho); return renderInfo(); }
    if ('taskadd' in d) return taskSheet(null, d.taskadd);
    if (d.taskedit) return taskSheet(d.taskedit);
    if (d.taskdel) return deleteTask(d.taskdel);
    if ('secadd' in d) return secSheet();
    if (d.secedit) return secSheet(d.secedit);
    if (d.secdel) {
      const { secs } = prepModel(), s = secs.find(x => x.id === d.secdel);
      if (s) { if (s.def) PLAN.setSec(s.id, { del: true }); else PLAN.dropSec(s.id); }
      closeSheet(); return renderInfo();
    }
    if (d.who) {
      const open = $('.whomenu');
      $$('.whomenu').forEach(m => m.remove());
      if (open && open.dataset.for === d.who) return flushRemote();
      t.closest('.task').insertAdjacentHTML('beforeend', `<div class="whomenu" data-for="${d.who}" role="menu">${Object.entries(ASSIGN).map(([k, n]) =>
        `<button role="menuitem" data-setwho="${d.who}|${k}" aria-pressed="${d.whoval === k}">${n}</button>`).join('')}${d.whoval ? `<button role="menuitem" data-setwho="${d.who}|">Nikdo</button>` : ''}</div>`);
      return;
    }
    if (d.setwho) {
      const [id, who] = d.setwho.split('|'), cur = prepModel().tasks.find(x => x.id === id);
      if (cur) PLAN.setTask(id, whoPatch(cur, who));
      return renderInfo();
    }
    // Info a ostatní
    if (d.info) { state.info = d.info; store.set('info', d.info); return renderInfo(); }
    if ('showAddress' in d) { $('#show-driver-text').innerHTML = STAY.addressBig; return $('#show-driver').showModal(); }
    if ('close' in d) return t.closest('dialog').close();
    if (d.showcard) {
      e.preventDefault();
      state.f.view = 'list'; saveF(); renderTrips();
      const card = $('#act-' + d.showcard);
      if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
    if (d.showfood) {
      e.preventDefault();
      state.ff.view = 'list'; saveFF(); renderFood();
      const card = $('#food-' + d.showfood);
      if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
  });
  // klepnutí mimo spodní panel ho zavře
  $$('dialog').forEach(dl => dl.addEventListener('click', e => { if (e.target === dl) dl.close(); }));

  document.addEventListener('submit', async e => {
    const f = e.target;
    if (f.matches('[data-taskform]')) { e.preventDefault(); return saveTaskForm(f); }
    if (f.matches('[data-secform]')) { e.preventDefault(); return saveSecForm(f); }
    if (f.id !== 'lock-form') return;
    e.preventDefault();
    const ok = await unlock(f.elements.code.value);
    $('#lock-err').hidden = ok;
    if (ok) start(); else f.elements.code.select();
  });

  const noteTimers = {};
  const saveNote = el => { const [date, who] = el.dataset.note.split('|'); clearTimeout(noteTimers[el.dataset.note]); PLAN.setNote(date, who, el.value); };
  document.addEventListener('input', e => {
    const el = e.target;
    if (!el.dataset.note) return;
    if (el.scrollHeight > el.clientHeight) el.rows = Math.min(10, el.rows + 1);
    clearTimeout(noteTimers[el.dataset.note]);
    noteTimers[el.dataset.note] = setTimeout(() => saveNote(el), 600);
  });
  document.addEventListener('change', e => {
    if (e.target.dataset.note) return saveNote(e.target);
    if ('fsort' in e.target.dataset) { state.f.sort = e.target.value; saveF(); return renderTrips(); }
    if ('ffsort' in e.target.dataset) { state.ff.sort = e.target.value; saveFF(); return renderFood(); }
    if (e.target.dataset.taskdone) { PLAN.setTask(e.target.dataset.taskdone, { done: e.target.checked }); return renderInfo(); }
    if (e.target.dataset.taskby) { const [id, who] = e.target.dataset.taskby.split('|'); PLAN.setTask(id, { [`by/${who}`]: e.target.checked }); return renderInfo(); }
  });

  /* Změny plánu z druhého telefonu: překreslit, ale nikdy pod rukama při psaní poznámky, tažení úkolu nebo výběru osoby */
  let remotePending = false;
  const rerenderPlanViews = () => { refreshSlots(); if (state.tab === 'plan') renderPlan(); else if (state.tab === 'info' && state.info === 'pred') renderInfo(); };
  const flushRemote = () => { if (remotePending && !editing()) { remotePending = false; rerenderPlanViews(); } };
  function closeWho() { if (!$('.whomenu')) return; $$('.whomenu').forEach(m => m.remove()); flushRemote(); }
  PLAN.onChange(kind => {
    if (kind === 'local') return;
    if (editing()) { remotePending = true; return; }
    if (kind === 'status' && state.tab !== 'plan') return;
    rerenderPlanViews();
  });
  document.addEventListener('focusout', e => {
    if (!remotePending || !e.target.matches('textarea[data-note]')) return;
    remotePending = false;
    setTimeout(() => { if (!editing()) rerenderPlanViews(); else remotePending = true; }, 400);
  });

  /* ---------- Zámek: celá stránka za kódem, zařízení si ho zapamatuje ----------
     V repu je jen otisk kódu (TRIP.lock). Ze stejného kódu se odvodí klíč plánu ve Firebase,
     takže každý telefon, který kód zná, vidí stejný plán a stejné úkoly. */
  const sha256 = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))];
  const toHex = b => b.map(x => x.toString(16).padStart(2, '0')).join('');
  const KEY_ALPHA = 'abcdefghijkmnpqrstuvwxyz23456789';
  async function unlock(input) {
    const k = String(input || '').trim();
    if (!k || !window.crypto || !crypto.subtle) return false;
    if (toHex(await sha256('malaga-2026:zamek:' + k)) !== TRIP.lock) return false;
    const b = await sha256('malaga-2026:plan:' + k);
    PLAN.join(b.slice(0, 20).map(x => KEY_ALPHA[x % 32]).join('').replace(/(.{5})(?=.)/g, '$1-'));
    store.set('unlock', TRIP.lock);
    return true;
  }

  /* Osobní kontakty (řidička) jsou v data/secret.js zašifrované klíčem plánu, protože repo je veřejné */
  let PRIVATE = {};
  async function openSecret() {
    try {
      const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
      const key = await crypto.subtle.importKey('raw', new Uint8Array(await sha256('malaga-2026:tajne:' + PLAN.code())), 'AES-GCM', false, ['decrypt']);
      PRIVATE = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(SECRET.iv) }, key, b64(SECRET.ct))));
    } catch { PRIVATE = {}; }
  }

  /* ---------- Start ---------- */
  let started = false;
  async function start() {
    if (started) return;
    started = true;
    await openSecret();
    document.body.classList.remove('is-locked');
    migrateChecks();
    go(state.tab, { scroll: false });
    loadWeather();
  }
  if (store.get('unlock') === TRIP.lock && PLAN.code()) start();
  else setTimeout(() => $('#lock-in').focus(), 0);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && started) loadWeather(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
