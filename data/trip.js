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
    alert: '<b>Online check-in v pátek 30. 10. od 10:50</b> (otevírá se 24 h před odletem, když nemáte koupená místa). Palubenky jsou jen v aplikaci Ryanair. Odbavení na letišti v Ostravě stojí 55 € za osobu.',
    items: [
      { t: '06:15', title: 'Budíček a snídaně', text: 'Rodiče v 6:15, děti v 6:30. Batole nakrmit ještě doma.',
        more: 'Mléko, vodu pro miminko a příkrmy na cestu dejte do zvláštní tašky, ne do sáčku s tekutinami: dětská strava má výjimku z limitu 100 ml. Zimní bundy nechte v autě a do příručního zavazadla přibalte lehké bundy na návrat 9. 11. večer.' },
      { t: '07:50', key: true, title: 'Odjezd z domova na letiště Mošnov', text: '24 km, 25–35 minut přes Plzeňskou na silnici I/58 směr Příbor. V čase je rezerva 15–20 minut.',
        links: [['Navigovat na letiště', NAV('Letiště Leoše Janáčka Ostrava, Mošnov')]] },
      { t: '08:20', title: 'Vyložit rodinu před odletovou halou', text: 'Před halou je prvních 15 minut zdarma. Jeden rodič zůstane s dětmi a kufry, druhý jede parkovat.' },
      { t: '08:30', key: true, title: 'Parkování P5 (záloha P6)', text: 'P5 i P6 stojí 130 Kč za den, za 11 započatých dní tedy 1 430 Kč. P5 leží přímo před železničním terminálem, do haly je to pěšky 3–5 minut.',
        more: 'S rezervací přes Parkum otevře závoru SPZ, případně QR kód z voucheru. Bez rezervace si vezmete lístek a ten <b>neztraťte</b> (ztráta stojí 2 000 Kč). Vyfoťte si lístek i místo stání. Když je plno, stejnou cenu mají P3, P3A a P4. Parkoviště nejsou hlídaná.',
        img: { label: 'Plánek parkovišť', src: 'img/parking-ostrava.png', alt: 'Plánek parkovacích ploch letiště Ostrava 2026' },
        links: [['Navigovat na P5', NAV('Parkoviště P5 Letiště Ostrava Mošnov')], ['Rezervace parkování', 'https://airport-ostrava.parkum.cz/booking?_locale=cs']] },
      { t: '08:45', title: 'Bag drop Ryanair', text: 'Přepážka otevírá nejpozději v 8:50 a zavírá v 10:10. Přijděte i bez odbaveného kufru: kočárek a autosedačky tu dostanou visačku.',
        more: 'Kočárek pak máte až ke schůdkům letadla. Každé dítě má zdarma 2 kusy výbavy (kočárek a k tomu autosedačku, podsedák nebo postýlku).' },
      { t: '09:05', title: 'Bezpečnostní kontrola', text: 'Tekutiny do 100 ml v jednom litrovém sáčku. Dětské mléko, vodu a příkrmy vyndejte zvlášť; personál může chtít, abyste je ochutnali.' },
      { t: '09:25', title: 'Dětský koutek, přebalit, nakrmit', text: 'Koutky jsou v obou patrech odletové haly za kontrolou. V 1. patře je místnost pro rodiče s dětmi s vlastním WC. Přebalte těsně před nástupem.' },
      { t: '10:05', title: 'K bráně', text: 'Brána zavírá v 10:20. Letadlo z Málagy přistává v 10:25, takže nástup začne nejspíš kolem 10:30 a zpoždění se přenáší. Svačinu mějte po ruce.' },
      { t: '10:50', key: true, title: 'Odlet FR 4086', text: 'Při startu kojit, dát lahev nebo dudlík, aby polykání vyrovnalo tlak v uších.',
        more: 'Přebalovací pult je na toaletě vzadu nebo uprostřed letadla. Posádka lahve ani jídlo neohřívá. O pás pro miminko na klíně si řekněte posádce při nástupu. S miminkem nesmíte sedět v řadě u nouzového východu.' },
      { t: '14:25', key: true, title: 'Přistání v Málaze', text: 'Let je v rámci Schengenu, pasová kontrola není. Kočárek bude buď u schůdků, nebo až na pásu nadrozměrných zavazadel, proto miminko zatím do nosítka.' },
      { t: '14:50', title: 'Zavazadla, terminál T3, přízemí', text: 'Od přistání po výstup do haly počítejte 30–50 minut. Aena půjčuje kočárky zdarma, kdyby ten váš přišel pozdě.' },
      { t: '15:20', key: true, title: 'Řidič v příletové hale', text: 'Čeká s cedulkou se jménem. Před nastoupením zkontrolujte autosedačky: vajíčko proti směru jízdy pro miminko a sedačku s pásy pro předškoláka.',
        more: 'Kontakt na řidiče: <b>doplnit</b> (jméno, WhatsApp, cena, čekání zdarma). Když se neozve: napište mu po přistání, počkejte u informací Aena v příletové hale a po 30 minutách volejte taxi (Taxi Unión +34 952 04 04 04). Taxi z letiště v sobotu stojí asi 23–25 € (sobotní minimum 22,48 € plus 0,58 € za kufr). Taxi smí ve městě vézt děti bez sedačky na zadním sedadle; je to legální, ale ne bezpečné.' },
      { t: '15:35', title: 'Transfer do ubytování', text: 'Asi 7 km, 10–20 minut.' },
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
    alert: '<b>Online check-in v neděli 8. 11. od 17:05.</b> Předem domluvte s hostitelem úschovu kufrů od 12:00 do 14:00 (nebo pozdní check-out) a odvoz na letiště ve 14:10 se sedačkami.',
    items: [
      { t: '08:00', title: 'Snídaně a balení', text: 'Doklady stejné jako na cestu tam, palubenky v aplikaci v obou telefonech, jídlo a pití na let.' },
      { t: '10:30', title: 'Poslední procházka', text: 'Parque del Oeste (680 m, hřiště, jezírko) nebo pláž Misericordia (550 m).' },
      { t: '11:30', title: 'Oběd', text: 'Najíst se ještě v klidu, na letišti bude fronta a hluk.' },
      { t: '12:00', key: true, title: 'Check-out', text: 'Kufry nechat u hostitele do 14:00. Když to nejde, je tu úschovna Radical Storage na Carretera de Cádiz u Parque de Huelin (od 5 € za kus a den).',
        links: [['Úschovny v okolí', 'https://radicalstorage.com/luggage-storage/malaga']] },
      { t: '12:15', title: 'Siesta v kočárku, hřiště', text: 'Batole a předškolák by měli usnout teď, ne v letadle o hodinu později, kdy to bude potřeba nejvíc.' },
      { t: '14:10', key: true, title: 'Odjezd na letiště', text: 'Transfer se sedačkami, nebo taxi (asi 17–19 € ve všední den včetně letištního příplatku 6,49 €), 10–15 minut.',
        more: 'Záloha MHD: expresní autobus A (4 €) ze zastávky Héroe de Sostoa – Girón (asi 15 minut pěšky) ve 13:55 nebo 14:21, na letišti ve 14:10 nebo 14:36.' },
      { t: '14:30', title: 'Odbavení Ryanair', text: 'Podle Wikipedie terminál T2, ověřte na tabulích. Bag drop otevírá nejpozději v 15:05 a zavírá v 16:25. Kočárek opět s visačkou.' },
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

const CHECKLIST = [
  { title: 'Doklady', items: [
    { id: 'doc-op', t: 'Každý ze 4 má vlastní platný OP nebo pas, i miminko', n: 'Ryanair nepřijme rodný list ani zápis v dokladu rodiče.' },
    { id: 'doc-same', t: 'Na cestu tam i zpět zadat do check-inu stejný doklad' },
    { id: 'doc-ehic', t: 'Průkazy pojištěnce s modrou EHIC na rubu pro všechny 4', n: 'Zkontrolovat platnost.' },
    { id: 'doc-car', t: 'Řidičák a doklady od auta' },
  ] },
  { title: 'Pojištění a registrace', items: [
    { id: 'ins-cpzp', t: 'Cestovní pojištění ČPZP pro 4 osoby na 31. 10. – 9. 11.', n: 'Smlouvu mít v PDF v telefonu.' },
    { id: 'ins-tel', t: 'Uložit do telefonu asistenci Global Assistance +420 266 799 788', n: 'Nonstop, česky. Při ošetření volat jako první.' },
    { id: 'ins-drozd', t: 'Registrace DROZD včetně dětí', n: 'drozd.mzv.cz' },
  ] },
  { title: 'Ryanair', items: [
    { id: 'fr-seats', t: 'Rozhodnout o sedadlech', n: 'Zdarma posadí dítě vedle jednoho rodiče, druhý může sedět jinde. Všichni čtyři spolu jen s koupenými místy.' },
    { id: 'fr-app', t: 'Aplikace Ryanair v obou telefonech s přihlášenou rezervací' },
    { id: 'fr-ci-out', t: 'Online check-in TAM: pátek 30. 10. od 10:50', n: 'Nastavit si připomínku.' },
    { id: 'fr-ci-back', t: 'Online check-in ZPĚT: neděle 8. 11. od 17:05' },
    { id: 'fr-bags', t: 'Ověřit zaplacená zavazadla', n: 'Malá taška 40×30×20 cm na osobu se sedadlem, taška pro miminko do 5 kg (45×35×20 cm).' },
    { id: 'fr-seatsdec', t: 'Rozhodnout, jestli poletí vlastní autosedačky', n: 'Zdarma v podpalubí (2 kusy výbavy na dítě včetně kočárku).' },
  ] },
  { title: 'Parkování a transfer', items: [
    { id: 'pk-res', t: 'Rezervace parkování P5 (Parkum)', n: 'Okno 31. 10. 6:50 až 10. 11. 0:30, voucher s QR kódem do telefonu.' },
    { id: 'tr-in', t: 'Řidiči poslat let FR 4086, přílet 14:25, 2 dospělí + 2 děti + kočárek', n: 'Písemně potvrdit sedačky: vajíčko proti směru jízdy pro 10 měsíců a sedačku s pásy pro 3,5 roku. Vyžádat jméno a WhatsApp.' },
    { id: 'tr-out', t: 'Domluvit odvoz na letiště 9. 11. ve 14:10 se sedačkami' },
    { id: 'host-bags', t: 'S hostitelem domluvit úschovu kufrů 12:00–14:00 v den odjezdu' },
  ] },
  { title: 'Do příručního zavazadla', items: [
    { id: 'cb-docs', t: 'Doklady, telefony, powerbanka', n: 'Max. 2 powerbanky na osobu, ne do přihrádky nad hlavou.' },
    { id: 'cb-food', t: 'Mléko, voda, příkrmy a svačiny na let', n: 'Mimo sáček s tekutinami.' },
    { id: 'cb-nappy', t: 'Pleny (6–8), ubrousky, přebalovací podložka, pytlíky' },
    { id: 'cb-clothes', t: 'Náhradní oblečení pro obě děti i pro rodiče' },
    { id: 'cb-ears', t: 'Dudlík nebo pití na start a přistání' },
    { id: 'cb-fun', t: '2–3 nové hračky nebo knížky, tablet se staženými pohádkami a sluchátka' },
    { id: 'cb-carrier', t: 'Ergonosítko', n: 'Na cestu z letadla, než přijede kočárek.' },
    { id: 'cb-meds', t: 'Dětský paracetamol nebo ibuprofen, teploměr, náplasti' },
    { id: 'cb-jackets', t: 'Lehké bundy na návrat do Ostravy 9. 11. večer' },
  ] },
];

const CONTACTS = [
  { name: 'Tísňová linka', note: 'Vše (záchranka, policie, hasiči), mluví i anglicky', tel: '112' },
  { name: 'Asistence pojištění ČPZP', note: 'Global Assistance, nonstop, česky. Volat jako první.', tel: '+420 266 799 788' },
  { name: 'Řidič (transfer)', note: 'Doplnit jméno a číslo', tel: '' },
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
