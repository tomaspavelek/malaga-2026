/* Základní fakta cesty, itinerář tam/zpět, checklist a kontakty.
   Zdroj: Malaga - Základní informace.csv + research/01-cesta-tam-zpet.md (stav k 19.10.2026). */

const TRIP = {
  start: '2026-10-31',
  end: '2026-11-09',
  stay: {
    name: 'Ubytování',
    address: 'Calle Cañada del Tesoro 12, 29003 Málaga',
    addressBig: 'Calle Cañada del Tesoro 12<br>29003 Málaga<br><span style="font-size:20px">barrio Pacífico, Carretera de Cádiz</span>',
    lat: 36.69518, lon: -4.44059,
  },
  // Klimatický průměr pro dny mimo 16denní předpověď (AEMET, letiště Málaga: listopad max 20,1 °C, min 11,3 °C)
  // Firebase Realtime Database pro sdílený plán (prázdné = plán jen v tomhle telefonu). Pravidla: CONTEXT.md.
  sync: 'https://malaga-2026-25099-default-rtdb.europe-west1.firebasedatabase.app',
  // Otisk vstupního kódu (SHA-256 z 'malaga-2026:zamek:' + kód). Z kódu se odvozuje i klíč sdíleného plánu, viz app.js.
  lock: 'a76251d72cd48ec801a0436e72bedc9ce231773997ee3da49ae4a1115aa895c6',
  climate: { tmaxStart: 22, tmaxEnd: 21, tminStart: 13, tminEnd: 12, sea: 19, note: 'začátkem listopadu kolem 21–22 °C přes den a 12–13 °C v noci. V listopadu prší v průměru 5–6 dní, zato vydatně (AEMET).' },
  cats: {
    zvirata: { label: 'Zvířata', emoji: '🐠' },
    more: { label: 'Moře a pláž', emoji: '🏖️' },
    pamatky: { label: 'Památky', emoji: '🏰' },
    park: { label: 'Parky a hřiště', emoji: '🛝' },
    indoor: { label: 'Muzea a herny', emoji: '🎨' },
    jidlo: { label: 'Jídlo a trhy', emoji: '🍤' },
  },
};

const G = q => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
const NAV = (q, mode = 'driving') => 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q) + '&travelmode=' + mode;

const ITINERARY = {
  tam: {
    pass: {
      airline: 'Ryanair', date: 'sobota 31. 10. 2026', flight: 'FR 4086', duration: '3 h 35 min',
      from: { code: 'OSR', name: 'Ostrava', time: '10:50' }, to: { code: 'AGP', name: 'Málaga', time: '14:25' },
      info: [['Bag drop', 'do 10:10'], ['Brána zavírá', '10:20'], ['Časový posun', 'žádný']],
    },
    alert: '<b>Online check-in jde udělat už teď.</b> S koupenými místy ho Ryanair otevírá 60 dní před letem. Palubenky jsou jen v aplikaci Ryanair. Odbavení na letišti v Ostravě stojí 55 € za osobu.',
    items: [
      { t: '07:00', title: 'Budíček a snídaně', text: 'Děti budíme v 7:00, snídaně v klidu doma. Batole nakrmit ještě před odjezdem.',
        more: 'Mléko, vodu pro miminko a příkrmy na cestu dejte do zvláštní tašky, ne do sáčku s tekutinami: dětská strava má výjimku z limitu 100 ml. Zimní bundy nechte v autě a do příručního zavazadla přibalte lehké bundy na návrat 9. 11. večer.' },
      { t: '08:30', key: true, title: 'Odjezd z domova na letiště Mošnov', text: '24 km, 25–35 minut přes Plzeňskou na silnici I/58 směr Příbor. Na P5 budete kolem 9:00, do zavření bag dropu v 10:10 tak zbývá asi hodina.',
        links: [['Navigovat na P5', NAV('Parkoviště P5 Letiště Ostrava Mošnov')]] },
      { t: '09:00', key: true, title: 'Parkování P5 a pěšky do haly', text: 'Rovnou na P5 a do odletové haly jdete všichni spolu, s kočárkem a kufry 3–5 minut. P5 stojí 130 Kč za den, za 11 započatých dní tedy 1 430 Kč. Rezervace není potřeba.',
        more: 'U vjezdu si vezmete lístek a ten <b>neztraťte</b> (ztráta stojí 2 000 Kč). Vyfoťte si lístek i místo stání. Platí se až při návratu: v automatu v příletové hale, nebo kartou u výjezdu. Když je P5 plné, stejnou cenu mají P6, P3, P3A a P4 (do 5–8 minut pěšky). Parkoviště nejsou hlídaná.',
        img: { label: 'Plánek parkovišť', src: 'img/parking-ostrava.png', alt: 'Plánek parkovacích ploch letiště Ostrava 2026' } },
      { t: '09:10', title: 'Bag drop Ryanair', text: 'Přepážka zavírá v 10:10. Odevzdáte kufry a kočárek tu dostane visačku.',
        more: 'Kočárek pak máte až ke schůdkům letadla.' },
      { t: '09:30', title: 'Bezpečnostní kontrola', text: 'Tekutiny do 100 ml v jednom litrovém sáčku. Dětské mléko, vodu a příkrmy vyndejte zvlášť; personál může chtít, abyste je ochutnali.' },
      { t: '09:45', title: 'Dětský koutek, přebalit, nakrmit', text: 'Koutky jsou v obou patrech odletové haly za kontrolou. V 1. patře je místnost pro rodiče s dětmi s vlastním WC. Přebalte těsně před nástupem.' },
      { t: '10:05', title: 'K bráně', text: 'Brána zavírá v 10:20. Letadlo z Málagy přistává v 10:25, takže nástup začne nejspíš kolem 10:30 a zpoždění se přenáší. Svačinu mějte po ruce.' },
      { t: '10:50', key: true, title: 'Odlet FR 4086', text: 'Při startu kojit, dát lahev nebo dudlík, aby polykání vyrovnalo tlak v uších.',
        more: 'Přebalovací pult je na toaletě vzadu nebo uprostřed letadla. Posádka lahve ani jídlo neohřívá. O pás pro miminko na klíně si řekněte posádce při nástupu. S miminkem nesmíte sedět v řadě u nouzového východu.' },
      { t: '14:25', key: true, title: 'Přistání v Málaze', text: 'Let je v rámci Schengenu, pasová kontrola není. Kočárek bude buď u schůdků, nebo až na pásu nadrozměrných zavazadel, proto miminko zatím do nosítka.' },
      { t: '14:50', title: 'Zavazadla, terminál T3, přízemí', text: 'Pásy 35–41, číslo ukáže monitor. Od přistání po výstup do haly počítejte 30–50 minut. Jakmile máte kufry, napište Julii na WhatsApp, že jdete nahoru k odletům.' },
      { t: '15:20', key: true, title: 'Julia vás vyzvedne u odletů, o patro výš', text: 'Kolegyně Julie píše: „Bežne sa nakladá na odletoch. Z príletov treba ísť k odletom, to je len na poschodí od príletov a tam Vás vyzdvihne.“ Z výdeje vyjdete celnicí do příletové haly. Jděte halou rovně (východy ven máte vpravo) kolem informačního pultu, kavárny La Manon a dětského koutku až na konec, asi 80 m. Tam vyjeďte výtahem B do patra 1 k odletům. Nahoře jste u informačního pultu Aena před bezpečnostní kontrolou: když Julii hned neuvidíte, počkejte tam a zavolejte jí. Před nastoupením zkontrolujte autosedačky: vajíčko proti směru jízdy pro miminko a sedačku s pásy pro předškoláka.',
        driver: true,
        img: { label: 'Mapka: z příletů nahoru k odletům', src: 'img/letiste-agp.svg', alt: 'Schéma terminálu T3: od pásu se zavazadly výtahem B k odletům v patře 1', open: true, wide: true },
        more: 'Výtah A je blíž: uprostřed haly na levé stěně naproti turistickým informacím, trochu schovaný. Vyjede ke Starbucks uprostřed odletové haly a odtud jdete ke kontrole asi 100 m. U obou výtahů jsou i pohyblivé chodníky, s kočárkem jeďte výtahem. Toalety jsou na konci příletové haly u výtahu B. Na silnici u odletů se podle Aeny nestaví, krátké zastavení je v Parking Express přes silnici naproti T2 (prvních 10 minut zdarma). Když se Julia neozve, počkejte u informací Aena a po 30 minutách volejte taxi (Taxi Unión +34 952 04 04 04, stanoviště je venku před příletovou halou směrem k T2). Taxi z letiště v sobotu stojí asi 23–25 € (sobotní minimum 22,48 € plus 0,58 € za kufr) a smí ve městě vézt děti bez sedačky na zadním sedadle; je to legální, ale ne bezpečné.',
        links: [['Terminál v mapě Aeny', 'https://www.aena.es/es/map.html?ca=AGP&poi=1575034702802']] },
      { t: '15:35', title: 'Transfer do ubytování', text: 'S Julií k autu u odletů, pak asi 7 km, 10–20 minut.' },
      { t: '16:00', key: true, title: 'Check-in', text: 'Calle Cañada del Tesoro 12. Vybalit, svačina, chvíle klidu.' },
      { t: '17:15', key: true, title: 'Velký nákup na neděli i pondělí', text: 'V neděli 1. 11. je zavřeno a pondělí 2. 11. je v Andalusii svátek. Nakupte teď na dva dny dopředu.',
        more: 'Seznam: pleny, ubrousky, mléko nebo umělé mléko, příkrmy, voda, pečivo na 2 dny, ovoce, snídaně, dětský paracetamol nebo ibuprofen. Mercadona i Lidl mají v sobotu otevřeno do 21:30. Na drobnosti je nejblíž supermarket Mas (170 m, možná otevřený i v neděli) a lékárna Farmacia Pacífico (150 m) má otevřeno i v neděli. Rovnou si v kiosku na C/ Pacífico 59 (75 m) kupte kartu Consorcio na MHD pro celou rodinu.',
        links: [['Mercadona (850 m)', NAV('Mercadona, Avenida de Velázquez 43, Málaga', 'walking')], ['Lidl (1,2 km)', NAV('Lidl, Avenida de Velázquez 60, Málaga', 'walking')], ['Mas (170 m)', NAV('Supermercado Mas, Carril de la Chupa 9, Málaga', 'walking')]] },
      { t: '18:00', title: 'Krátce k moři', text: 'Pláž Misericordia je 550 m (7 minut pěšky), slunce zapadá kolem 18:20. Kolem 19:30 můžou kvůli trajektu z Melilly přijít větší vlny: batole dál od vody.' },
      { t: '19:00', title: 'Večeře a spát', text: 'První den bez dalšího programu, ať jsou děti zítra odpočaté.' },
    ],
  },
  zpet: {
    pass: {
      airline: 'Ryanair', date: 'pondělí 9. 11. 2026', flight: 'FR 4085', duration: '3 h 25 min',
      from: { code: 'AGP', name: 'Málaga', time: '17:05' }, to: { code: 'OSR', name: 'Ostrava', time: '20:30' },
      info: [['Bag drop', 'do 16:25'], ['Brána zavírá', '16:35'], ['Brány', 'D (Schengen)']],
    },
    alert: '<b>Online check-in na zpáteční let jde udělat taky už teď</b> (koupená místa). Předem vyřešte úschovu kufrů od 12:00 do 14:00 (hostitel, pozdní check-out nebo úschovna) a s Julií čas odvozu na letiště (návrh 14:10).',
    items: [
      { t: '08:00', title: 'Snídaně a balení', text: 'Doklady stejné jako na cestu tam, palubenky v aplikaci v obou telefonech, jídlo a pití na let.' },
      { t: '10:30', title: 'Poslední procházka', text: 'Parque del Oeste (680 m, hřiště, jezírko) nebo pláž Misericordia (550 m).' },
      { t: '11:30', title: 'Oběd', text: 'Najíst se ještě v klidu, na letišti bude fronta a hluk.' },
      { t: '12:00', key: true, title: 'Check-out', text: 'Kufry nechat u hostitele do 14:00. Když to nejde, je tu úschovna Radical Storage na Carretera de Cádiz u Parque de Huelin (od 5 € za kus a den).',
        links: [['Úschovny v okolí', 'https://radicalstorage.com/luggage-storage/malaga']] },
      { t: '12:15', title: 'Siesta v kočárku, hřiště', text: 'Batole a předškolák by měli usnout teď, ne v letadle o hodinu později, kdy to bude potřeba nejvíc.' },
      { t: '14:10', key: true, title: 'Julia nás veze na letiště', text: 'Čas ještě domluvit, 14:10 je návrh. Cesta trvá 10–15 minut. Kdyby odvoz nevyšel, taxi stojí asi 17–19 € ve všední den včetně letištního příplatku 6,49 €.', driver: true,
        more: 'Záloha MHD: expresní autobus A (4 €) ze zastávky Héroe de Sostoa – Girón (asi 15 minut pěšky) ve 13:55 nebo 14:21, na letišti ve 14:10 nebo 14:36.' },
      { t: '14:30', title: 'Odbavení Ryanair, T3, patro 1', text: 'Julia vás vysadí u odletů. V odletové hale jděte až na konec k bezpečnostní kontrole (od vstupu u T2 asi 200 m vpravo): přepážky Ryanairu 363–370 a bag drop jsou vedle ní, u informačního pultu Aena, kam jste při příletu vyjeli výtahem B. Bag drop otevírá nejpozději v 15:05 a zavírá v 16:25. Kočárek opět s visačkou.' },
      { t: '15:15', title: 'Bezpečnostní kontrola', text: 'Centrální kontrola v T3, 1. patro. Limit 100 ml v Málaze stále platí.' },
      { t: '15:35', title: 'Hřiště u zóny D, jídlo, přebalit', text: 'Herní koutky jsou za kontrolou v 1. patře u zóny D a ve 2. patře. Aena půjčuje zdarma kočárky v tranzitní zóně.' },
      { t: '16:15', title: 'K bráně D (Schengen)', text: 'Brána zavírá v 16:35.' },
      { t: '17:05', key: true, title: 'Odlet FR 4085', text: 'Kojení, lahev nebo dudlík při startu i přistání. Unavené děti: tablet, nová knížka, svačina.' },
      { t: '20:30', key: true, title: 'Přílet do Ostravy', text: 'Kočárek může být vydán přímo u letadla. Vezměte si bundy z příručního zavazadla, venku bude zima a tma.' },
      { t: '21:00', title: 'Zaplatit parkovné a přivézt auto', text: 'Automat je v příletové hale, platit jde i kartou u výjezdu. Jeden rodič přiveze auto před halu (15 minut zdarma), druhý čeká s dětmi uvnitř.' },
      { t: '21:45', title: 'Doma', text: '25–35 minut jízdy. Děti nejspíš usnou v autě, pyžamo nechte navrchu v tašce.' },
    ],
  },
};

/* Výchozí úkoly v Info → Příprava. Úpravy, nové úkoly a sekce, pořadí, osoba a odškrtnutí se ukládají
   ke sdílenému plánu (prep/tasks, prep/secs), id sekcí i úkolů proto neměnit. */
const CHECKLIST = [
  { id: 'doklady', title: 'Doklady', items: [
    { id: 'doc-op', t: 'Každý ze 4 má vlastní platný OP nebo pas, i miminko', n: 'Ryanair nepřijme rodný list ani zápis v dokladu rodiče.' },
    { id: 'doc-same', t: 'Na cestu tam i zpět zadat do check-inu stejný doklad' },
    { id: 'doc-ehic', t: 'Průkazy pojištěnce s modrou EHIC na rubu pro všechny 4', n: 'Zkontrolovat platnost.' },
    { id: 'doc-car', t: 'Řidičák a doklady od auta' },
  ] },
  { id: 'pojisteni', title: 'Pojištění a registrace', items: [
    { id: 'ins-cpzp', t: 'Cestovní pojištění ČPZP pro 4 osoby na 31. 10. – 9. 11.', n: 'Smlouvu mít v PDF v telefonu.' },
    { id: 'ins-tel', t: 'Uložit do telefonu asistenci Global Assistance +420 266 799 788', n: 'Nonstop, česky. Při ošetření volat jako první.' },
    { id: 'ins-drozd', t: 'Registrace DROZD včetně dětí', n: 'drozd.mzv.cz' },
  ] },
  { id: 'ryanair', title: 'Ryanair', items: [
    { id: 'fr-app', t: 'Aplikace Ryanair', n: 'Zkontrolovat aktualizaci.' },
    { id: 'fr-ci-out', t: 'Online check-in TAM (FR 4086)', n: 'S koupenými místy jde už teď, Ryanair ho otevírá 60 dní před letem.' },
    { id: 'fr-ci-back', t: 'Online check-in ZPĚT (FR 4085)', n: 'Taky už teď. Palubenky pak mít v aplikaci v obou telefonech.' },
  ] },
  { id: 'transfer', title: 'Transfer a kufry', items: [
    { id: 'tr-in', t: 'Julii poslat let FR 4086, přílet 14:25, 2 dospělí + 2 děti + kočárek', n: 'Písemně potvrdit sedačky: vajíčko proti směru jízdy pro 10 měsíců a sedačku s pásy pro 3,5 roku. Vyzvedne vás u odletů o patro výš (píše její kolegyně); když se hned nepotkáte, čekejte u informačního pultu Aena před bezpečnostní kontrolou.' },
    { id: 'tr-out', t: 'Domluvit s Julií čas odvozu na letiště 9. 11. (návrh 14:10) se sedačkami' },
    { id: 'host-bags', t: 'Vyřešit úschovu kufrů v den odjezdu' },
  ] },
];

/* Cestovní pojištění v Info → Tipy, podle kartiček ČPP (pojistka přes ČPZP). Repo je veřejné, proto bez jmen,
   rodných čísel a adresy pojistníka: kartičky s nimi mají Tom a Míša v PDF v telefonu. */
const INSURANCE = {
  name: 'Česká podnikatelská pojišťovna (ČPP), sjednané přes ČPZP',
  policy: '1611786509',
  valid: 'Platí 31. 10.–9. 11. 2026 pro všechny 4, celá Evropa.',
  tel: '+420 266 799 788',
  mail: 'dispecink@1220.cz',
  first: 'Než půjdete k lékaři, volejte asistenci Global Assistance (nonstop, česky). Řekne vám, kam jít, a ošetření zaplatí. V ohrožení života volejte nejdřív 112 a asistenci hned, jak to půjde.',
  say: [
    'jméno, příjmení a rodné číslo toho, komu se něco stalo (rodná čísla jsou na kartičkách v PDF)',
    'číslo smlouvy 1611786509',
    'kde jste a číslo telefonu, ze kterého voláte',
    'pokud vás už ošetřili: číslo na lékaře, název a adresu zařízení',
  ],
  covers: 'léčebné výlohy do 10 000 000 Kč (i ošetření po úrazu), odpovědnost za škodu, kterou způsobíte jiným, do 4 000 000 Kč, a asistenci.',
  not: 'úrazové pojištění, zavazadla a storno cesty. Ukradené věci pojištění nenahradí, ztracený kufr hlaste u Ryanairu (Azul Handling, kontakt níž).',
  more: 'Když platíte sami, třeba v lékárně, schovejte účty a lékařské zprávy. Kartičky v PDF mají i anglický text, v nemocnici je ukažte jako doklad o pojištění.',
};

const CONTACTS = [
  { name: 'Tísňová linka', note: 'Vše (záchranka, policie, hasiči), mluví i anglicky', tel: '112' },
  { name: 'Julia, řidička (tam i zpět)', note: 'Slovenka, pište česky nebo slovensky, nejlíp WhatsApp. Fotka je v Info → Tam u příletu.', secret: 'driver' },
  { name: 'Taxi Unión Málaga', note: 'Ve městě smí vézt děti bez sedačky vzadu', tel: '+34 952 04 04 04' },
  { name: 'Unitaxi Málaga', note: '', tel: '+34 952 33 33 33' },
  { name: 'Quirónsalud Málaga', note: 'Soukromá nemocnice, pohotovost 24 h i pro děti, asi 2 km. Nejdřív volat asistenci.', tel: '951 940 000' },
  { name: 'Hospital Materno-Infantil', note: 'Veřejná dětská pohotovost (EHIC), asi 5 km', tel: '951 290 000' },
  { name: 'Záchranka Andalusie', note: '', tel: '061' },
  { name: 'Ztracené zavazadlo Ryanair v Málaze', note: 'Azul Handling, přízemí T3', tel: '+34 679 392 572' },
  { name: 'Nouzová linka MZV ČR', note: 'Nonstop, ztráta dokladů a vážné problémy', tel: '+420 222 420 222' },
  { name: 'Velvyslanectví ČR Madrid', note: 'Konzulární oddělení Po–Čt 10–13', tel: '+34 91 353 18 80' },
  { name: 'Letiště Ostrava, informace', note: 'Parkování, zpoždění', tel: '+420 597 471 136' },
];
