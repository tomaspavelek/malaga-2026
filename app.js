/* Málaga s dětmi – logika stránky (vanilla JS, bez buildu). Data jsou v data.js. */
(() => {
  'use strict';

  const TZ = 'Europe/Madrid';
  const STAY = TRIP.stay;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Úložiště (může selhat v anonymním režimu) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('mlg:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('mlg:' + k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  const state = {
    tab: store.get('tab', 'dnes'),
    wxMode: store.get('wxMode', 'dnes'),
    stayDay: store.get('stayDay', TRIP.start),
    cesta: store.get('cesta', 'tam'),
    f: Object.assign({ wx: 'vse', cats: [], dur: [], dist: [], must: false, hideDone: false, sort: 'must', more: false, view: 'list' }, store.get('filters', {})),
    done: store.get('done', {}),
    checks: store.get('checks', {}),
    wx: store.get('wx2', null),       // { ts, fc, sea }
    wxLoading: false,
    wxError: null,
  };

  /* ---------- Datumové pomůcky ---------- */
  const DOW = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  const DOW_S = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
  const todayStr = () => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date());
  const addDays = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const dow = d => new Date(d + 'T12:00:00Z').getUTCDay();
  const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5);
  const fmtD = d => { const [, m, day] = d.split('-'); return `${+day}. ${+m}.`; };
  const fmtLong = d => `${DOW[dow(d)]} ${fmtD(d)}`;
  const nowHourMadrid = () => +new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(new Date());
  const stayDays = (() => { const out = []; for (let d = TRIP.start; d <= TRIP.end; d = addDays(d, 1)) out.push(d); return out; })();
  const plural = (n, one, few, many) => n === 1 ? one : (n >= 2 && n <= 4 ? few : many);

  /* ---------- Vzdálenost od ubytování ---------- */
  const km = (a, b) => {
    const R = 6371, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  ACTIVITIES.forEach(a => {
    a.km = km(STAY, a);
    a.distKind = a.out ? 'vylet' : (a.km <= 1.5 ? 'pesky' : 'mesto');
  });
  const fmtKm = k => k < 1 ? `${Math.round(k * 1000 / 50) * 50} m` : `${k.toFixed(k < 10 ? 1 : 0).replace('.', ',')} km`;

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
  /* Andaluská dlaždice (azulejo) – barvy bere z CSS proměnných karty počasí, proto je vzor přímo v ní */
  const AZULEJO = `<svg><defs><pattern id="az" width="44" height="44" patternUnits="userSpaceOnUse">
    <g style="fill:var(--tile-a)"><rect x="13" y="13" width="18" height="18"/><rect x="13" y="13" width="18" height="18" transform="rotate(45 22 22)"/></g>
    <g style="fill:var(--tile-b)"><circle cx="22" cy="22" r="4.2"/><circle cx="0" cy="0" r="7"/><circle cx="44" cy="0" r="7"/><circle cx="0" cy="44" r="7"/><circle cx="44" cy="44" r="7"/>
    <rect x="20.5" y="0" width="3" height="5"/><rect x="20.5" y="39" width="3" height="5"/><rect x="0" y="20.5" width="5" height="3"/><rect x="39" y="20.5" width="5" height="3"/></g>
    </pattern></defs><rect width="100%" height="100%" fill="url(#az)"/></svg>`;
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
    state.wxLoading = true; state.wxError = null; renderToday();
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
      state.wxLoading = false; renderToday();
    }
  }

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

  /* ---------- Doporučení ---------- */
  function dayType(date) {
    if (date === TRIP.start) return 'prilet';
    if (date === TRIP.end) return 'odlet';
    return 'normal';
  }
  function isClosed(a, date) {
    if (a.onlyDates) return !a.onlyDates.includes(date);
    if (a.openDates && a.openDates.includes(date)) return false;
    if (a.closedDates && a.closedDates.includes(date)) return true;
    return (a.closed || []).includes(dow(date));
  }
  function recommend(w, n = 3) {
    const type = dayType(w.date);
    const scored = ACTIVITIES.map(a => {
      if (isClosed(a, w.date)) return null;
      if (type !== 'normal' && !a.nearby) return null;
      if (w.cond === 'dest' && !a.wx.includes('dest')) return null;
      let s = a.must * 10;
      if (a.wx.includes(w.cond)) s += 12;
      if (a.onlyDates) s += 15;                                     // akce jen v tento den, jindy už nebude
      if (w.cond === 'slunce' && a.wx[0] === 'slunce') s += 4;       // venkovní věci si slunce zaslouží víc
      if (w.windy && a.wind) s -= 25;
      if (state.done[a.id]) s -= 30;
      if (a.out) s -= 4;                                             // výlet stojí víc energie
      return { a, s };
    }).filter(Boolean).sort((x, y) => y.s - x.s);
    // pestrost: nejvýš dvě aktivity ze stejné kategorie
    const out = [], perCat = {};
    for (const { a } of scored) {
      if ((perCat[a.cat] || 0) >= 2) continue;
      out.push(a); perCat[a.cat] = (perCat[a.cat] || 0) + 1;
      if (out.length >= n) break;
    }
    return out;
  }

  /* ---------- Komponenty ---------- */
  const CATS = TRIP.cats;
  const stars = n => `<span class="stars" aria-label="Atraktivita ${n} z 5">${'★'.repeat(n)}<span style="opacity:.25">${'★'.repeat(5 - n)}</span></span>`;
  const gmapsDir = (a, fromStay) => `https://www.google.com/maps/dir/?api=1${fromStay ? `&origin=${STAY.lat},${STAY.lon}` : ''}&destination=${a.lat},${a.lon}&travelmode=transit`;
  const gmapsPlace = a => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.gq || a.name)}`;
  const STROLLER = { ok: 'Kočárek OK', part: 'Kočárek jen částečně', no: 'Spíš nosítko' };

  function actCard(a, opts = {}) {
    const done = !!state.done[a.id];
    const closedToday = opts.date && isClosed(a, opts.date);
    const lead = opts.rank
      ? `<div class="rank" aria-hidden="true">${opts.rank}</div>`
      : `<div class="act__emoji" aria-hidden="true">${a.emoji || CATS[a.cat].emoji}</div>`;
    return `
    <article class="act ${done ? 'is-done' : ''}" id="act-${a.id}" data-id="${a.id}">
      <div class="act__body">
        <div class="act__top">
          ${lead}
          <div>
            <h3 class="act__title">${a.name}</h3>
            <p class="act__sub">${CATS[a.cat].label}${a.area ? ' · ' + a.area : ''} · ${stars(a.must)}</p>
            ${a.must >= 5 ? '<span class="must">Must-see</span>' : ''}
          </div>
        </div>
        <div class="meta">
          <span><span class="lbl">Na místě</span> ${a.dur}</span>
          <span><span class="lbl">Od ubytka</span> ${fmtKm(a.km)}</span>
          <span><span class="lbl">Cesta</span> ${a.how.sum}</span>
        </div>
        <div class="meta">
          <span class="wxfit" title="Kdy se hodí">${['slunce', 'oblacno', 'dest'].map(c => `<span class="${a.wx.includes(c) ? '' : 'off'}" title="${WX_LABEL[c]}">${icon(WX_ICON[c])}</span>`).join('')}</span>
          <span>${STROLLER[a.stroller.lvl]}</span>
          ${a.wind ? '<span>Citlivé na vítr</span>' : ''}
        </div>
        ${closedToday ? `<div class="tags"><span class="tag tag--warn">${a.onlyDates ? 'Tento den se nekoná' : 'Tento den zavřeno'}</span></div>` : ''}
        <div class="tags">
          ${a.pros.map(p => `<span class="tag tag--plus">${p}</span>`).join('')}
          ${a.cons.map(p => `<span class="tag tag--minus">${p}</span>`).join('')}
        </div>
        ${a.tip ? `<p class="act__tip"><b>Pro děti:</b> ${a.tip}</p>` : ''}
      </div>
      <details class="fold">
        <summary>Jak se tam dostaneme${icon('chev')}</summary>
        <div class="fold__in">
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
            <dt>Vstupné</dt><dd>${a.price}</dd>
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
      </div>
    </article>`;
  }

  /* ---------- Záložka Dnes ---------- */
  function renderToday() {
    const el = $('#tab-dnes');
    const today = todayStr();
    const tomorrow = addDays(today, 1);
    let date = state.wxMode === 'zitra' ? tomorrow : today;
    if (state.wxMode === 'pobyt') date = state.stayDay;
    const w = dayWeather(date);
    const v = verdict(w);
    const updated = state.wx ? new Date(state.wx.ts).toLocaleString('cs-CZ', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : null;
    const inTrip = date >= TRIP.start && date <= TRIP.end;
    const dt = dayType(date);
    const dayTag = !inTrip ? 'Náhled: tak je teď v Málaze' : dt === 'prilet' ? 'Den příletu' : dt === 'odlet' ? 'Den odletu' : `Den ${dayDiff(TRIP.start, date) + 1} z ${stayDays.length}`;

    let hours = w.hours || [];
    if (date === today) { const h = nowHourMadrid(); hours = hours.filter(x => x.h >= Math.min(h, 20)); }
    hours = hours.filter(x => x.h >= 8 && x.h <= 20);

    const reco = recommend(w, 3);
    const typeNote = dt === 'prilet' ? 'Den příletu: jen věci do 1,5 km od ubytka, ať se stihne nákup a spaní.' :
      dt === 'odlet' ? 'Den odletu: jen kousek od ubytka, check-out je ve 12:00.' : '';

    el.innerHTML = `
      <div class="seg" role="group" aria-label="Který den">
        <button data-wxmode="dnes" aria-pressed="${state.wxMode === 'dnes'}">Dnes<small>${DOW_S[dow(today)]} ${fmtD(today)}</small></button>
        <button data-wxmode="zitra" aria-pressed="${state.wxMode === 'zitra'}">Zítra<small>${DOW_S[dow(tomorrow)]} ${fmtD(tomorrow)}</small></button>
        <button data-wxmode="pobyt" aria-pressed="${state.wxMode === 'pobyt'}">Celý pobyt<small>31. 10. – 9. 11.</small></button>
      </div>

      ${state.wxMode === 'pobyt' ? stayList() : ''}

      <div class="hero" data-wx="${w.src === 'klima' ? 'klima' : w.cond}">
        <div class="hero__tiles" aria-hidden="true">${AZULEJO}</div>
        <p class="hero__date">${fmtLong(date)} <span class="hero__daytag">${dayTag}</span></p>
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
      </div>

      <section class="reco" aria-labelledby="reco-h">
        <div class="sec-head">
          <h2 class="h-sec" id="reco-h">Co ${date === today ? 'dnes' : date === tomorrow ? 'zítra' : 'ten den'} dělat
            <small>${w.src === 'klima' ? 'Orientačně podle průměrného počasí.' : `Seřazeno podle atraktivity pro vás, s ohledem na ${w.cond === 'dest' ? 'déšť' : w.cond === 'slunce' ? 'slunce' : 'počasí'}${w.windy ? ' a vítr' : ''} a zavírací dny.`}</small>
          </h2>
        </div>
        ${typeNote ? `<p class="reco-note">${typeNote}</p>` : ''}
        ${reco.length ? reco.map((a, i) => actCard(a, { rank: i + 1, date })).join('') : '<div class="empty">Na tenhle den nic nesedí. Zkuste záložku Výlety.</div>'}
        <button class="btn" data-goto-filter="${w.src === 'klima' ? 'vse' : w.cond}">Všechny výlety ${w.src === 'klima' ? '' : 'na ' + (w.cond === 'dest' ? 'déšť' : w.cond === 'slunce' ? 'slunce' : 'zataženo')} ${icon('chev')}</button>
      </section>

      <section class="card card--flat" aria-label="Rychlé akce">
        <div class="quick">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${STAY.lat},${STAY.lon}&travelmode=transit" target="_blank" rel="noopener"><span class="q-ico">🏠</span>Cesta domů</a>
          <button data-show-address><span class="q-ico">🪪</span>Adresa pro řidiče</button>
          <a href="tel:112"><span class="q-ico">🆘</span>Tísňová linka 112</a>
        </div>
      </section>`;
  }

  function stayList() {
    const horizon = fcHorizon();
    return `<div class="days" role="group" aria-label="Dny pobytu">${stayDays.map(d => {
      const w = dayWeather(d);
      const badge = w.src === 'klima' ? ['klima', 'průměr'] : [w.cond, w.cond === 'slunce' ? 'ven' : w.cond === 'dest' ? 'pod střechu' : 'zataženo'];
      const note = w.src === 'klima' ? `předpověď od ${fmtD(addDays(d, -15))}` : `déšť ${w.pop ?? 0} %${w.windy ? ', vítr' : ''}`;
      return `<button class="day" data-stayday="${d}" aria-pressed="${d === state.stayDay}">
        <span class="day__d">${DOW_S[dow(d)]} ${fmtD(d)}<small>${d === TRIP.start ? 'přílet' : d === TRIP.end ? 'odlet' : 'den ' + (dayDiff(TRIP.start, d) + 1)}</small></span>
        ${icon(w.ico)}
        <span><span class="day__t">${Math.round(w.tmax)}° <span class="lo">${Math.round(w.tmin)}°</span></span><br><span class="day__note">${note}</span></span>
        <span class="day__badge" data-wx="${badge[0]}">${badge[1]}</span>
      </button>`;
    }).join('')}</div>${horizon && horizon < TRIP.end ? `<p class="reco-note">Dny po ${fmtD(horizon)} zatím ukazují průměr. Předpověď naskočí sama, jakmile se dostanou do 16denního výhledu.</p>` : ''}`;
  }

  /* ---------- Záložka Výlety ---------- */
  function filtered() {
    const f = state.f;
    let list = ACTIVITIES.filter(a =>
      (f.wx === 'vse' || a.wx.includes(f.wx)) &&
      (!f.cats.length || f.cats.includes(a.cat)) &&
      (!f.dur.length || f.dur.includes(a.durKind)) &&
      (!f.dist.length || f.dist.includes(a.distKind)) &&
      (!f.must || a.must >= 4) &&
      (!f.hideDone || !state.done[a.id]));
    list.sort(f.sort === 'dist' ? (x, y) => x.km - y.km : (x, y) => (y.must - x.must) || (x.km - y.km));
    // během pobytu: co má dnes zavřeno, až na konec (sort je stabilní)
    const day = tripToday();
    if (day) list.sort((x, y) => isClosed(x, day) - isClosed(y, day));
    return list;
  }
  const tripToday = () => { const t = todayStr(); return t >= TRIP.start && t <= TRIP.end ? t : null; };
  const chip = (attr, val, label, on, extra = '') => `<button class="chip" ${attr}="${val}" aria-pressed="${on}">${extra}${label}</button>`;

  function renderTrips() {
    const el = $('#tab-vylety');
    const f = state.f;
    const list = filtered();
    const moreCount = f.dur.length + f.dist.length + (f.must ? 1 : 0) + (f.hideDone ? 1 : 0);
    el.innerHTML = `
      <div class="sec-head"><h2 class="h-sec">Výlety a místa<small>${ACTIVITIES.length} míst vybraných pro rodinu s předškolákem a batoletem.</small></h2></div>
      <div class="filters">
        <div class="chips" role="group" aria-label="Počasí">
          ${chip('data-fwx', 'vse', 'Jakékoli počasí', f.wx === 'vse')}
          ${['slunce', 'oblacno', 'dest'].map(c => chip('data-fwx', c, WX_LABEL[c], f.wx === c, icon(WX_ICON[c]))).join('')}
        </div>
        <div class="chips" role="group" aria-label="Kategorie">
          ${Object.entries(CATS).map(([k, c]) => chip('data-fcat', k, c.label, f.cats.includes(k), `<span aria-hidden="true">${c.emoji}</span>`)).join('')}
        </div>
        <div class="result-line">
          <span>${list.length} ${plural(list.length, 'místo', 'místa', 'míst')}</span>
          <span>
            <button class="linkish" data-fmore>${f.more ? 'Skrýt filtry' : 'Další filtry'}${moreCount ? ` (${moreCount})` : ''}</button>
            · <button class="linkish" data-fview>${f.view === 'map' ? 'Seznam' : 'Mapa'}</button>
          </span>
        </div>
        ${f.more ? `<div class="more-filters">
          <div><h4>Délka na místě</h4><div class="chips">
            ${chip('data-fdur', 'kratke', 'Do 2 hodin', f.dur.includes('kratke'))}${chip('data-fdur', 'pulden', 'Půl dne', f.dur.includes('pulden'))}${chip('data-fdur', 'celyden', 'Celý den', f.dur.includes('celyden'))}
          </div></div>
          <div><h4>Vzdálenost</h4><div class="chips">
            ${chip('data-fdist', 'pesky', 'Pěšky (do 1,5 km)', f.dist.includes('pesky'))}${chip('data-fdist', 'mesto', 'Po Málaze', f.dist.includes('mesto'))}${chip('data-fdist', 'vylet', 'Mimo Málagu', f.dist.includes('vylet'))}
          </div></div>
          <div><h4>Další</h4><div class="chips">
            ${chip('data-fflag', 'must', 'Jen to nejlepší (4–5 ★)', f.must)}${chip('data-fflag', 'hideDone', 'Skrýt navštívené', f.hideDone)}
          </div></div>
          <div><h4>Řadit</h4><div class="chips">
            ${chip('data-fsort', 'must', 'Podle atraktivity', f.sort === 'must')}${chip('data-fsort', 'dist', 'Podle vzdálenosti', f.sort === 'dist')}
          </div></div>
          <button class="linkish" data-freset>Zrušit všechny filtry</button>
        </div>` : ''}
      </div>
      ${f.view === 'map' ? '<div class="map" id="map"></div>' : `
      <div class="list">${list.length ? list.map(a => actCard(a, { date: tripToday() })).join('') : `
        <div class="empty"><p>Těmto filtrům nic neodpovídá.</p><button class="btn btn--sm" data-freset>Zrušit filtry</button></div>`}</div>`}`;
    if (f.view === 'map') drawMap(list);
  }

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
  async function drawMap(list) {
    const box = $('#map');
    try { await loadLeaflet(); } catch { box.innerHTML = '<div class="empty">Mapa potřebuje internet.</div>'; return; }
    if (!document.body.contains(box)) return;
    const map = L.map(box, { zoomControl: true }).setView([STAY.lat, STAY.lon], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    const pin = (e) => L.divIcon({ className: 'map-pin', html: e, iconSize: [26, 26], iconAnchor: [13, 13] });
    L.marker([STAY.lat, STAY.lon], { icon: pin('🏠') }).addTo(map).bindPopup('<b>Ubytování</b>');
    const pts = [[STAY.lat, STAY.lon]];
    list.forEach(a => {
      pts.push([a.lat, a.lon]);
      L.marker([a.lat, a.lon], { icon: pin(a.emoji || CATS[a.cat].emoji) }).addTo(map)
        .bindPopup(`<b>${a.name}</b><br>${a.dur} · ${fmtKm(a.km)}<br>${a.how.sum}<br><a href="#" data-showcard="${a.id}">Zobrazit detail</a>`);
    });
    // přiblížit na město, výlety mimo Málagu jsou vidět po oddálení
    const inCity = [[STAY.lat, STAY.lon], ...list.filter(a => !a.out).map(a => [a.lat, a.lon])];
    map.fitBounds(inCity.length > 1 ? inCity : pts, { padding: [24, 24] });
  }

  /* ---------- Záložka Cesta ---------- */
  function renderCesta() {
    const el = $('#tab-cesta');
    const seg = state.cesta;
    let body = '';
    if (seg === 'pred') body = renderChecklist();
    else {
      const it = ITINERARY[seg];
      body = `
        ${passCard(it.pass)}
        ${it.alert ? `<div class="card card--alert card--flat">${it.alert}</div>` : ''}
        <ol class="tl">${it.items.map(x => `
          <li class="tl__item ${x.key ? 'is-key' : ''}">
            <span class="tl__time">${x.t}</span><span class="tl__dot" aria-hidden="true"></span>
            <div class="tl__card">
              <p class="tl__title">${x.title}</p>
              ${x.text ? `<p class="tl__text">${x.text}</p>` : ''}
              ${x.more ? `<details><summary>Podrobnosti</summary><div class="tl__text">${x.more}</div></details>` : ''}
              ${x.img ? `<details><summary>${x.img.label}</summary><a href="${x.img.src}" target="_blank" rel="noopener"><img src="${x.img.src}" alt="${x.img.alt}" loading="lazy"></a></details>` : ''}
              ${x.links ? `<div class="btn-row">${x.links.map(([l, u], i) => `<a class="btn btn--sm ${i === 0 ? 'btn--primary' : ''}" href="${u}" target="_blank" rel="noopener">${l}</a>`).join('')}</div>` : ''}
            </div>
          </li>`).join('')}</ol>`;
    }
    el.innerHTML = `
      <div class="seg" role="group" aria-label="Část cesty">
        <button data-cesta="tam" aria-pressed="${seg === 'tam'}">Tam<small>so 31. 10.</small></button>
        <button data-cesta="zpet" aria-pressed="${seg === 'zpet'}">Zpět<small>po 9. 11.</small></button>
        <button data-cesta="pred" aria-pressed="${seg === 'pred'}">Příprava<small>${checkProgress().done}/${checkProgress().total} hotovo</small></button>
      </div>
      ${body}`;
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
  function checkProgress() {
    const all = CHECKLIST.flatMap(g => g.items);
    return { total: all.length, done: all.filter(i => state.checks[i.id]).length };
  }
  function renderChecklist() {
    const p = checkProgress();
    return `
      <div class="card card--flat">
        <div class="sec-head"><h2 class="h-sec">Před odjezdem<small>Zaškrtnutí se ukládá jen v tomhle telefonu.</small></h2></div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}"><i style="width:${p.total ? p.done / p.total * 100 : 0}%"></i></div>
      </div>
      ${CHECKLIST.map(g => `
        <section aria-label="${g.title}">
          <h3 class="h-sec" style="font-size:19px;margin-bottom:8px">${g.title}</h3>
          <ul class="checks">${g.items.map(i => `
            <li><label class="check"><input type="checkbox" data-check="${i.id}" ${state.checks[i.id] ? 'checked' : ''}><span>${i.t}${i.n ? `<small>${i.n}</small>` : ''}</span></label></li>`).join('')}
          </ul>
        </section>`).join('')}`;
  }

  /* ---------- Záložka Tipy ---------- */
  function renderTipy() {
    const el = $('#tab-tipy');
    el.innerHTML = `
      <div class="sec-head"><h2 class="h-sec">Tipy a kontakty<small>Co se hodí vědět předem a co hledat v nouzi.</small></h2></div>
      <section class="card" aria-label="Kontakty">
        <h3>Důležité kontakty</h3>
        <div>${CONTACTS.map(c => `
          <div class="contact"><div><b>${c.name}</b><small>${c.note || ''}</small></div>
          ${c.tel ? `<a class="btn btn--sm" href="tel:${c.tel.replace(/\s/g, '')}">${c.tel}</a>` : c.url ? `<a class="btn btn--sm" href="${c.url}" target="_blank" rel="noopener">Otevřít</a>` : ''}</div>`).join('')}</div>
      </section>
      ${TIPS.map((s, i) => `
        <details class="acc" ${i === 0 ? '' : ''}>
          <summary><span class="acc__ico" aria-hidden="true">${s.icon}</span><span><span class="acc__t">${s.title}</span><span class="acc__s">${s.sub}</span></span>${icon('chev')}</summary>
          <div class="acc__in">${s.html ? s.html() : s.items.map(t => `
            <div class="tip"><h4>${t.h}</h4>${t.p ? `<p>${t.p}</p>` : ''}${t.ul ? `<ul>${t.ul.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}${t.links ? `<div class="btn-row" style="margin-top:6px">${t.links.map(([l, u]) => `<a class="btn btn--sm" href="${u}" target="_blank" rel="noopener">${l} ${icon('ext')}</a>`).join('')}</div>` : ''}</div>`).join('')}
          </div>
        </details>`).join('')}`;
  }

  /* ---------- Navigace a události ---------- */
  const renderers = { dnes: renderToday, vylety: renderTrips, cesta: renderCesta, tipy: renderTipy };
  function go(tab, { scroll = true } = {}) {
    state.tab = tab; store.set('tab', tab);
    $$('.panel').forEach(p => { p.hidden = p.dataset.tab !== tab; });
    $$('.tabbar__btn').forEach(b => b.setAttribute('aria-current', b.dataset.go === tab ? 'page' : 'false'));
    renderers[tab]();
    if (scroll) window.scrollTo({ top: 0 });
  }
  function saveF() { const { more, ...rest } = state.f; store.set('filters', { ...rest, more }); }
  const toggleIn = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  document.addEventListener('click', e => {
    const t = e.target.closest('button, a[data-showcard]');
    if (!t) return;
    const d = t.dataset;
    if (d.go) return go(d.go);
    if (d.wxmode) { state.wxMode = d.wxmode; store.set('wxMode', d.wxmode); if (d.wxmode !== 'pobyt') loadWeather(); return renderToday(); }
    if (d.stayday) { state.stayDay = d.stayday; store.set('stayDay', d.stayday); renderToday(); return $('.hero').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if ('refresh' in d) return loadWeather(true);
    if (d.done) { state.done[d.done] = !state.done[d.done]; if (!state.done[d.done]) delete state.done[d.done]; store.set('done', state.done); return renderers[state.tab](); }
    if (d.gotoFilter) { state.f = { ...state.f, wx: d.gotoFilter, cats: [], dur: [], dist: [], view: 'list' }; saveF(); return go('vylety'); }
    if (d.fwx) { state.f.wx = d.fwx; saveF(); return renderTrips(); }
    if (d.fcat) { state.f.cats = toggleIn(state.f.cats, d.fcat); saveF(); return renderTrips(); }
    if (d.fdur) { state.f.dur = toggleIn(state.f.dur, d.fdur); saveF(); return renderTrips(); }
    if (d.fdist) { state.f.dist = toggleIn(state.f.dist, d.fdist); saveF(); return renderTrips(); }
    if (d.fflag) { state.f[d.fflag] = !state.f[d.fflag]; saveF(); return renderTrips(); }
    if (d.fsort) { state.f.sort = d.fsort; saveF(); return renderTrips(); }
    if ('fmore' in d) { state.f.more = !state.f.more; saveF(); return renderTrips(); }
    if ('fview' in d) { state.f.view = state.f.view === 'map' ? 'list' : 'map'; saveF(); return renderTrips(); }
    if ('freset' in d) { state.f = { ...state.f, wx: 'vse', cats: [], dur: [], dist: [], must: false, hideDone: false }; saveF(); return renderTrips(); }
    if (d.cesta) { state.cesta = d.cesta; store.set('cesta', d.cesta); return renderCesta(); }
    if ('showAddress' in d) { $('#show-driver-text').innerHTML = STAY.addressBig; return $('#show-driver').showModal(); }
    if ('close' in d) return t.closest('dialog').close();
    if (d.showcard) {
      e.preventDefault();
      state.f.view = 'list'; saveF(); renderTrips();
      const card = $('#act-' + d.showcard);
      if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
  });
  document.addEventListener('change', e => {
    const id = e.target.dataset.check;
    if (!id) return;
    state.checks[id] = e.target.checked; if (!e.target.checked) delete state.checks[id];
    store.set('checks', state.checks);
    const p = checkProgress();
    const bar = $('.progress i'); if (bar) bar.style.width = (p.done / p.total * 100) + '%';
    const lab = $('[data-cesta="pred"] small'); if (lab) lab.textContent = `${p.done}/${p.total} hotovo`;
  });

  /* ---------- Odpočet v hlavičce ---------- */
  function countdown() {
    const t = todayStr();
    const el = $('#countdown');
    if (t < TRIP.start) { const n = dayDiff(t, TRIP.start); el.textContent = n === 1 ? 'Letíme zítra' : `Letíme za ${n} ${plural(n, 'den', 'dny', 'dní')}`; }
    else if (t <= TRIP.end) el.textContent = `Den ${dayDiff(TRIP.start, t) + 1} z ${stayDays.length}`;
    else el.textContent = 'Zase doma';
  }

  /* ---------- Start ---------- */
  countdown();
  go(state.tab, { scroll: false });
  loadWeather();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { countdown(); loadWeather(); } });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
