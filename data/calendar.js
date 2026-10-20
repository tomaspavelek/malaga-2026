/* Co se v Málaze který den děje: svátky, tradice, akce, zápasy, výletní lodě, vstup zdarma, trhy.
   Rešerše: research/09-kalendar-dni.md (stav k 20.10.2026).
   Položka: date, kind (klíč z DAY_KINDS), title, text; volitelně time, where, act (id karty výletu),
   emoji (jinak podle druhu), key: true (hlavní věc dne, jde první), verified: false (nepotvrzené pro rok 2026), src.
   Řazení dne: nejdřív key, pak pořadí DAY_KINDS. První položka dává dni symbol v Plánu. */
const DAY_KINDS = {
  svatek: { label: 'Svátek', emoji: '🗓️' },
  tradice: { label: 'Tradice', emoji: '🕯️' },
  akce: { label: 'Akce', emoji: '🎭' },
  sport: { label: 'Sport', emoji: '⚽' },
  lod: { label: 'Výletní lodě', emoji: '🚢' },
  zdarma: { label: 'Zdarma', emoji: '🎟️' },
  trh: { label: 'Trh', emoji: '🧺' },
  tip: { label: 'Tip', emoji: '💡' },
};

const CALENDAR = [
  {
    date: '2026-10-31', kind: 'tip', emoji: '🛒', title: 'Začíná prodloužený víkend',
    time: 'do 21:30', where: 'Mercadona a Lidl, Av. Velázquez',
    text: 'V neděli 1. 11. supermarkety nemají otevřeno a otevírací doba na sváteční pondělí 2. 11. je nejistá. Velký nákup na tři dny udělejte dnes, Mercadona i Lidl na Av. Velázquez mají do 21:30.',
    src: [['BOJA: svátky 2026', 'https://juntadeandalucia.es/boja/2025/93/1'], ['Ministerstvo obchodu: prodejní dny 2026', 'https://comercio.gob.es/ComercioInterior/EjercicioActividadComercial/Documents/CALENDARIO_DOMINGOS_FESTIVOS_APERTURA_COMERCIAL_2026.pdf']],
  },
  {
    date: '2026-10-31', kind: 'akce', emoji: '🎃', title: 'Halloween na Muelle Uno',
    time: '17:30–21:00', where: 'Muelle Uno', act: 'muelle-uno',
    text: 'Zapojené obchody rozdávají sladkosti do vyčerpání, ve fotokoutku dostanete vytištěnou fotku a soutěž kostýmů má kategorii pro rodiny. Bus 40 v sobotu nejede, jeďte busem 7 nebo taxi (o víkendu 9–12 €).',
    src: [['Muelle Uno: Halloween 2026', 'https://www.muelleuno.com/eventos/cielito-lindo-halloween/']],
  },
  {
    date: '2026-10-31', kind: 'akce', emoji: '🎃', title: 'Halloween v Parque de Huelin',
    time: '18:00–22:00', where: 'Parque de Huelin', act: 'parque-huelin', verified: false,
    text: 'V letech 2024 a 2025 tu městská část Carretera de Cádiz pořádala slavnost zdarma s dílnami, fotokoutkem a strašidelným průchodem zvlášť pro děti. Program na rok 2026 město zveřejní kolem 24. 10., ověřte na malaga.eu; pěšky je to 20 minut po promenádě.',
    src: [['malaga.eu: Halloween 2024', 'https://malaga.eu/visorcontenido/ANUDocumentDisplayer/174831/COMUNICADO.pdf'], ['Malaga Weekender: Halloween 2025', 'https://www.malagaweekender.com/p/malaga-weekender-october-30-november-2']],
  },
  {
    date: '2026-11-01', kind: 'svatek', title: 'Všech svatých: neděle, obchody zavřené',
    text: 'Většina supermarketů a tržnice mají zavřeno, lékárna na C/ Pacífico 34 jede. EMT jezdí podle nedělního řádu: bus 40 nejede, bus 7 co 15–19 minut.',
    src: [['BOJA: svátky 2026', 'https://juntadeandalucia.es/boja/2025/93/1'], ['Ministerstvo obchodu: prodejní dny 2026', 'https://comercio.gob.es/ComercioInterior/EjercicioActividadComercial/Documents/CALENDARIO_DOMINGOS_FESTIVOS_APERTURA_COMERCIAL_2026.pdf']],
  },
  {
    date: '2026-11-01', kind: 'tradice', emoji: '🌰', title: 'Kaštany a huesos de santo',
    text: 'Stánky s pečenými kaštany stojí v centru, mějte na ně hotovost. Cukrárny ke svátku prodávají huesos de santo (marcipánové trubičky se žloutkovým krémem) a buñuelos (smažené koblížky), místní rodiny dopoledne chodí na hřbitovy.',
    src: [['El Debate: tradice Všech svatých v Málaze', 'https://www.eldebate.com/espana/andalucia/malaga/20241101/huesos-santo-bunuelos-esta-tradicion-malaguena-excelencia-fiesta-todos-santos_240842_amp.html']],
  },
  {
    date: '2026-11-01', kind: 'akce', title: 'Péťa a vlk v Teatro Echegaray',
    time: '11:00 a 13:00', where: 'Teatro Echegaray', act: 'echegaray',
    text: 'Hudební pohádka od 3 let na hodinu, vyprávění španělsky, lístek 8 €. Bus 40 v neděli nejede, na představení v 11:00 vyražte busem 7 nejpozději v 10:15.',
    src: [['Teatro Málaga: program', 'https://teatromalaga.com/cartelera'], ['mMálaga: dětské divadlo Echegaray', 'https://mmalaga.es/agenda/programa-teatro-infantil-echegaray/']],
  },
  {
    date: '2026-11-01', kind: 'akce', title: 'Rodinné představení v La Cochera',
    time: '12:00', where: 'La Cochera Cabaret', act: 'cochera-cabaret',
    text: '„Los viajes de la Tripulación Sonrisas“, interaktivní představení pro děti, hraje se španělsky. Sál je 17 minut pěšky od ubytka, v neděli bez autobusu.',
    src: [['Teatro Málaga: program', 'https://teatromalaga.com/cartelera'], ['La Cochera: program', 'https://lacocheracabaret.com/programacion/']],
  },
  {
    date: '2026-11-01', kind: 'trh', title: 'Řemeslný trh na Plaza de la Merced',
    time: '11:00–19:00', where: 'Plaza de la Merced', act: 'casa-natal', verified: false,
    text: 'Trh LaMerced&Co bývá první neděli v měsíci, pro 1. 11. je datum jen dopočítané. Na náměstí se dají honit holubi a od 16:00 je vedle zdarma rodný dům Picassa.',
    src: [['mercadillos.org: Plaza de la Merced', 'https://mercadillos.org/es/malaga/mercadillo-plaza-de-la-merced']],
  },
  {
    date: '2026-11-01', kind: 'trh', title: 'Podzimní trh na Muelle Uno',
    time: '10:00–22:00', where: 'Muelle Uno', act: 'muelle-uno',
    text: 'Stánky s oblečením, jídlem a drobnostmi mají otevřeno i v neděli a ve svátek 2. 11., kdy jinde obchody zavírají. Trh běží denně až do 9. 11.',
    src: [['Muelle Uno: Mercado de Otoño', 'https://www.muelleuno.com/eventos/mercado-de-otono-5/']],
  },
  {
    date: '2026-11-01', kind: 'zdarma', title: 'Alcazaba a Gibralfaro zdarma od 14:00',
    time: '14:00–18:00', where: 'Alcazaba', act: 'alcazaba',
    text: 'Vstup zdarma pro všechny, děti do 6 let mají zdarma vždy, rodiče ušetří 14 €. Poslední vstup je v 17:00 a odpoledne bývá fronta.',
    src: [['Alcazaba: hodiny a ceny', 'https://alcazabaygibralfaro.malaga.eu/es/visitas/horarios-y-tarifas/']],
  },
  {
    date: '2026-11-01', kind: 'zdarma', title: 'Muzea a botanická zahrada zdarma',
    time: 'od 14:00 a 16:00', act: 'pompidou',
    text: 'Pompidou, Museo Ruso a Thyssen od 16:00, Museo Picasso 16–18, rodný dům Picassa 16–20, botanická zahrada La Concepción 14:00–17:30. Děti mají vstup zdarma i jindy, ušetří hlavně rodiče.',
    src: [['Museo Picasso: návštěva', 'https://www.museopicassomalaga.org/visita'], ['Pompidou: návštěva', 'https://centrepompidou-malaga.eu/visita/'], ['La Concepción: hodiny a ceny', 'https://laconcepcion.malaga.eu/es/visita/horarios-y-tarifas/']],
  },
  {
    date: '2026-11-01', kind: 'lod', title: 'V přístavu možná Norwegian Escape',
    time: '7:00–20:00', where: 'přístav', verified: false,
    text: 'Loď s kapacitou 5 218 cestujících má podle CruiseDig a Cruisebound kotvit 7:00–20:00, CruiseTimetables ji neuvádí. Spolu s odpoledním vstupem zdarma počítejte s plnou Alcazabou a Calle Larios.',
    src: [['CruiseDig: příjezdy Málaga', 'https://cruisedig.com/ports/malaga-spain/arrivals'], ['Cruisebound: Norwegian Escape', 'https://www.cruisebound.com/en-US/sailing/95125']],
  },
  {
    date: '2026-11-01', kind: 'sport', emoji: '🏀', title: 'Basket: Unicaja proti Barceloně',
    time: '19:00', where: 'Palacio Martín Carpena',
    text: 'Největší basketbalový zápas pobytu v hale Martín Carpena, 2,3 km od ubytka. Kolem 18:00–21:30 bude víc aut na Carretera de Cádiz a taxi z centra může chvíli trvat.',
    src: [['Unicaja: kalendář', 'https://www.unicajabaloncesto.com/en/calendario']],
  },
  {
    date: '2026-11-01', kind: 'akce', emoji: '🎵', title: 'Coco: hudební pocta filmu',
    time: '19:00', where: 'Teatro ESAD', verified: false,
    text: 'Písně z filmu Coco naživo v divadle ESAD v Teatinos, 3,2 km od ubytka (taxi). Cenu ani věk agenda neuvádí a začátek v 19:00 je pro malé děti pozdě.',
    src: [['Teatro Málaga: program', 'https://teatromalaga.com/cartelera']],
  },
  {
    date: '2026-11-02', kind: 'svatek', title: 'Sváteční pondělí, školy mají volno',
    text: 'Andalusie přesunula Všech svatých na pondělí, místní rodiny mají volno a v Bioparku, Sea Life i v parcích bude plno jako o víkendu. Obchody smí otevřít a velká nákupní centra mají otevřeno, tržnice nejspíš ne; bus 40 nejede, EMT jezdí podle svátečního řádu.',
    src: [['BOJA: svátky 2026', 'https://juntadeandalucia.es/boja/2025/93/1'], ['Junta: školní kalendář Málaga 2026/27', 'https://www.juntadeandalucia.es/educacion/portales/documents/2854624/4501041/RESOLUCION%20CALENDARIO%20ESCOLAR%202026_27%20MALAGA.pdf/6f0af8f4-b17b-3b67-2797-e53eb85376e9?version=1.0'], ['BOJA: prodejní dny 2026', 'https://www.juntadeandalucia.es/boja/2025/121/17']],
  },
  {
    date: '2026-11-02', kind: 'lod', title: 'Dvě velké lodě, 9 100 cestujících',
    time: '7:00–20:00', where: 'přístav, centrum', act: 'alcazaba',
    text: 'Celebrity Ascent (3 950 míst) a Sun Princess (5 186) kotví od 7:00 do večera, k tomu sváteční den místních. Na Alcazabu přijďte hned v 9:00, nebo ji dejte na úterý.',
    src: [['CruiseDig: příjezdy Málaga', 'https://cruisedig.com/ports/malaga-spain/arrivals'], ['CruiseTimetables: 2. 11.', 'https://www.cruisetimetables.com/visitingmalagaspain-02nov2026.html']],
  },
  {
    date: '2026-11-03', kind: 'tip', emoji: '🏰', title: 'Klidný přístav, den na Alcazabu',
    where: 'přístav, centrum', act: 'alcazaba',
    text: 'Kotví jen Mein Schiff 4 a plachetnice Wind Surf, dohromady asi 3 100 míst, a děti jsou ve škole. Bus 40 jede, na historický půlden je to lepší den než čtvrtek a pátek; Pompidou má zavřeno.',
    src: [['CruiseDig: příjezdy Málaga', 'https://cruisedig.com/ports/malaga-spain/arrivals'], ['CruiseTimetables: 3. 11.', 'https://www.cruisetimetables.com/visitingmalagaspain-03nov2026.html']],
  },
  {
    date: '2026-11-04', kind: 'trh', title: 'Trh v Huelinu',
    time: '9:00–14:00', where: 'Avenida de Europa, Huelin', act: 'mercado-huelin',
    text: 'Asi 160 stánků s oblečením a drobnostmi na Avenida de Europa, kilometr od ubytka. Oběd pak v baru tržnice Mercado de Huelin do 15:00.',
    src: [['mercadillos.org: Mercadillo Huelin', 'https://mercadillos.org/es/malaga/mercadillo-huelin']],
  },
  {
    date: '2026-11-04', kind: 'lod', title: 'Čtyři lodě, asi 6 100 míst',
    time: '8:00–18:00', where: 'přístav, centrum', act: 'alcazaba',
    text: 'Carnival Legend (2 549 míst) kotví 8:00–18:00, Marella Voyager (2 669) tu končí plavbu a velká část cestujících jede rovnou na letiště, k tomu malé Silver Ray a Star Flyer. Na Alcazabu radši v 9:00–9:30, než dorazí výlety z lodí.',
    src: [['CruiseDig: příjezdy Málaga', 'https://cruisedig.com/ports/malaga-spain/arrivals'], ['CruiseTimetables: 4. 11.', 'https://www.cruisetimetables.com/visitingmalagaspain-04nov2026.html']],
  },
  {
    date: '2026-11-05', kind: 'lod', title: 'Nejrušnější den v přístavu',
    time: '8:00–18:00', where: 'přístav, centrum', act: 'alcazaba',
    text: 'Costa Diadema (4 526 míst) a Brilliance of the Seas (2 580) kotví 8:00–18:00, s dalšími třemi loděmi je to kolem 10 200 cestujících. Alcazabu a centrum přesuňte na úterý nebo středu, dnes se hodí výlet vlakem C1 nebo ústí Guadalhorce.',
    src: [['CruiseDig: příjezdy Málaga', 'https://cruisedig.com/ports/malaga-spain/arrivals'], ['CruiseTimetables: 5. 11.', 'https://www.cruisetimetables.com/visitingmalagaspain-05nov2026.html']],
  },
  {
    date: '2026-11-06', kind: 'lod', title: 'Rušno v přístavu: 6 000–9 000 lidí',
    time: '8:00–19:00', where: 'přístav, centrum', act: 'alcazaba',
    text: 'Celebrity Constellation (2 556 míst), Oosterdam (2 429) a Oceania Insignia (803) kotví 8:00–18:00/19:00; Norwegian Pearl (2 873) uvádí jen jeden zdroj. Centrum s Alcazabou dopoledne plné, lepší je výlet mimo město.',
    src: [['CruiseDig: příjezdy Málaga', 'https://cruisedig.com/ports/malaga-spain/arrivals'], ['CruiseTimetables: 6. 11.', 'https://www.cruisetimetables.com/visitingmalagaspain-06nov2026.html']],
  },
  {
    date: '2026-11-07', kind: 'trh', title: 'Trh v Huelinu',
    time: '9:00–14:00', where: 'Avenida de Europa, Huelin', act: 'mercado-huelin',
    text: 'Sobotní trh se stejnými asi 160 stánky jako ve středu, kilometr od ubytka. Tržnice Mercado de Huelin s barem je v sobotu otevřená.',
    src: [['mercadillos.org: Mercadillo Huelin', 'https://mercadillos.org/es/malaga/mercadillo-huelin']],
  },
  {
    date: '2026-11-07', kind: 'akce', title: 'Picasso en familia',
    time: '11:00–12:30', where: 'Museo Casa Natal Picasso', act: 'casa-natal', verified: false,
    text: 'Sobotní dílna pro rodiny s dětmi 3–12 let, zdarma, jen 15 míst, registrace formulářem na webu muzea. Program na 7. 11. ke 20. 10. ještě není vypsaný.',
    src: [['Casa Natal: Picasso en familia 2026/27', 'https://museocasanatalpicasso.malaga.eu/sgevento/Picasso-en-familia-2026-2027/']],
  },
  {
    date: '2026-11-07', kind: 'akce', emoji: '🏃', title: 'Dětský běh Kids Race',
    time: '13:00–13:30', where: 'u FYCMA (Palacio de Ferias)',
    text: 'Doprovodný závod maratonu: děti narozené 2019 a později běží 100 m, startovné 5 €, registrace online do 6. 11. 20:00 nebo do vyprodání 1 700 míst. Číslo se vyzvedává osobně v FYCMA (2,2 km od ubytka), podle reglementu v pátek 6. 11. 10:00–20:00.',
    src: [['Maraton: reglement Kids Race', 'https://www.generalimaratonmalaga.com/reglamento-brunch-y-kids-race/'], ['Maraton: Feria del Corredor', 'https://www.generalimaratonmalaga.com/feria-del-corredor/']],
  },
  {
    date: '2026-11-07', kind: 'sport', key: true, title: 'Fotbal: Málaga CF proti Racingu',
    time: '14:00', where: 'Estadio La Rosaleda',
    text: 'Ligový zápas první ligy na stadionu La Rosaleda, 4,6 km od ubytka. Bus 15 z naší zastávky Parque Mediterráneo jede ke stadionu, kolem 12:30–14:00 a po 16:00 bude plný fanoušků.',
    src: [['LaLiga: zápasy Málaga CF', 'https://www.laliga.com/en-GB/clubs/malaga-cf/next-matches'], ['Guide to Málaga: fotbal 2026/27', 'https://www.guidetomalaga.com/do/football-in-malaga/']],
  },
  {
    date: '2026-11-08', kind: 'sport', key: true, emoji: '🏃', title: 'Maraton: dopoledne zavřené ulice',
    time: '8:30–14:30', where: 'centrum a západ města',
    text: 'Maraton a půlmaraton startují v 8:30 z Paseo del Parque, limit je 5,5 hodiny; v roce 2025 běželo kolem 22 500 lidí a EMT jezdila objížďkami až do 17:00. Metro a vlak C1 jezdí normálně, nejjistější je dopoledne zůstat u domu nebo jet vlakem na výlet.',
    src: [['Maraton: reglement 2026', 'https://www.generalimaratonmalaga.com/regulations-marathon-malaga/'], ['Půlmaraton: reglement 2026', 'https://www.generalimaratonmalaga.com/reglamento_media_maraton_malaga/'], ['malaga.eu: uzavírky 2025', 'https://www.malaga.eu/visorcontenido/ANUDocumentDisplayer/178687/COMUNICADO.pdf']],
  },
  {
    date: '2026-11-08', kind: 'sport', emoji: '🚧', title: 'Uzavírky u ubytka (podle roku 2025)',
    time: '8:15–14:30', where: 'Calle Pacífico, Huelin, centrum', verified: false,
    text: 'V roce 2025 byla Calle Pacífico, 75 m od ubytka, zavřená 9:30–14:15, Paseo Antonio Machado u Huelinu a mosty přes řeku 8:15–12:30, Calle Larios 10:15–14:30. Trasa 2026 zatím není zveřejněná; když bude stejná, běžce můžete s dětmi povzbuzovat přímo u domu, ale na pláž a do centra se půjde přes trasu podle pokynů policie.',
    src: [['malaga.eu: uzavírky maratonu 2025', 'https://www.malaga.eu/visorcontenido/ANUDocumentDisplayer/178687/COMUNICADO.pdf'], ['Maraton: trasa', 'https://www.generalimaratonmalaga.com/recorrido-generali-maraton-malaga/']],
  },
  {
    date: '2026-11-08', kind: 'akce', title: 'Nera v Echegaray, pozor na maraton',
    time: '11:00 a 13:00', where: 'Teatro Echegaray', act: 'echegaray',
    text: 'Představení beze slov pro všechny věky, 50 minut, 8 €. Calle Larios a Plaza de la Constitución vedle divadla byly při maratonu 2025 zavřené 10:15–14:30 a bus 7 jezdil objížďkou, vyražte s hodinovou rezervou.',
    src: [['Teatro Málaga: program', 'https://teatromalaga.com/cartelera'], ['malaga.eu: uzavírky maratonu 2025', 'https://www.malaga.eu/visorcontenido/ANUDocumentDisplayer/178687/COMUNICADO.pdf']],
  },
  {
    date: '2026-11-08', kind: 'akce', title: 'Dadadá pro miminka, pozor na maraton',
    time: '12:00', where: 'Teatro Cánovas', act: 'dadada',
    text: 'Divadlo beze slov pro děti 0–3 roky v malém sále Teatro Cánovas, 8 €, od dvou lístků 6 €. Mosty přes řeku byly při maratonu 2025 pro auta zavřené do 12:30, s taxi na 12:00 nepočítejte.',
    src: [['Teatro Cánovas: Dadadá', 'https://www.juntadeandalucia.es/aaiicc/teatros/teatro-canovas/dadada-1'], ['malaga.eu: uzavírky maratonu 2025', 'https://www.malaga.eu/visorcontenido/ANUDocumentDisplayer/178687/COMUNICADO.pdf']],
  },
  {
    date: '2026-11-08', kind: 'akce', title: 'Beatelitis v La Cochera',
    time: '12:00', where: 'La Cochera Cabaret', act: 'cochera-cabaret',
    text: 'Písničky Beatles pro děti od 3 let, 50 minut, předškolák nemusí rozumět španělsky. Sál je 17 minut pěšky, v den maratonu nejsnáz dostupné představení, cesta ale může křížit trasu u haly Carpena.',
    src: [['Teatro Málaga: program', 'https://teatromalaga.com/cartelera'], ['La Cochera: Beatelitis', 'https://lacocheracabaret.com/evento/beatelitis-3/']],
  },
  {
    date: '2026-11-08', kind: 'zdarma', title: 'Alcazaba zdarma od 14:00',
    time: '14:00–18:00', where: 'Alcazaba', act: 'alcazaba',
    text: 'Platí stejně jako 1. 11., poslední vstup v 17:00. Paseo del Parque pod Alcazabou byl v roce 2025 kvůli cíli maratonu zavřený zhruba do 17:00, počítejte s davy kolem.',
    src: [['Alcazaba: hodiny a ceny', 'https://alcazabaygibralfaro.malaga.eu/es/visitas/horarios-y-tarifas/'], ['malaga.eu: uzavírky maratonu 2025', 'https://www.malaga.eu/visorcontenido/ANUDocumentDisplayer/178687/COMUNICADO.pdf']],
  },
  {
    date: '2026-11-08', kind: 'zdarma', title: 'Muzea a botanická zahrada zdarma',
    time: 'od 14:00 a 16:00', act: 'pompidou',
    text: 'Pompidou, Museo Ruso a Thyssen od 16:00, Museo Picasso 16–18, rodný dům Picassa 16–20, La Concepción 14:00–17:30. Uzavírky v centru v roce 2025 skončily ve 14:30.',
    src: [['Museo Picasso: návštěva', 'https://www.museopicassomalaga.org/visita'], ['Pompidou: návštěva', 'https://centrepompidou-malaga.eu/visita/'], ['La Concepción: hodiny a ceny', 'https://laconcepcion.malaga.eu/es/visita/horarios-y-tarifas/']],
  },
  {
    date: '2026-11-08', kind: 'akce', emoji: '🎵', title: 'Frozen: hudební pocta v ESAD',
    time: '18:00', where: 'Teatro ESAD', verified: false,
    text: 'Písně z Ledového království naživo, El Corte Inglés ji vede jako dětské divadlo; v Palmě trvá hodinu a půl. Divadlo ESAD je 3,2 km od ubytka, cenu agenda neuvádí.',
    src: [['Teatro Málaga: program', 'https://teatromalaga.com/cartelera'], ['El Corte Inglés: dětské muzikály Málaga', 'https://www.elcorteingles.es/entradas/en-familia/malaga/musicales/']],
  },
];
