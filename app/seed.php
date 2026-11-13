<?php
declare(strict_types=1);

/**
 * Voorbeelddata (seed) voor een nieuwe installatie van Mijn Werkplank.
 * Wordt uitsluitend uitgevoerd als de tabel `lodges` nog helemaal leeg is.
 */
function seed_database_if_empty(PDO $pdo): void
{
    $count = (int) $pdo->query('SELECT COUNT(*) FROM lodges')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $nowIso = gmdate('c');
    $futureDate = static fn(int $days): string => (new DateTimeImmutable("+$days days"))->format('Y-m-d');
    $pastDate   = static fn(int $days): string => (new DateTimeImmutable("-$days days"))->format('Y-m-d');

    // 1. Drie voorbeeldloges
    $insLodge = $pdo->prepare("
        INSERT INTO lodges (id, number, name, city, meeting_day, address, accent_color, logo_url, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $insLodge->execute([
        'loge-noorderster',
        42,
        'De Noorderster',
        'Haarlem',
        'Dinsdagavond (aanvang 20:00 uur)',
        'Logegebouw Ripperdapark 14, 2011 NP Haarlem',
        '#1B365D',
        '/demo/loge-noorderster.jpg',
        'Opgericht in 1854 in het Oosten Haarlem. Wekelijkse arbeid op dinsdagavond met afwisselend Open Loges en Comparities.',
    ]);

    $insLodge->execute([
        'loge-concordia',
        18,
        'Concordia',
        'Utrecht',
        'Woensdagavond (aanvang 20:00 uur)',
        'Maliebaan 70, 3581 CV Utrecht',
        '#7F1D1D',
        '/demo/loge-concordia.jpg',
        'Werkplaats in het Oosten Utrecht waar broederschap, verdieping en gastvrijheid voor visiteurs centraal staan.',
    ]);

    $insLodge->execute([
        'loge-ars-regia',
        305,
        'Studieloge Ars Regia',
        'Amersfoort',
        'Tweede donderdag van de maand (19:30 uur)',
        'Van Persijnstraat 17, 3811 LS Amersfoort',
        '#14532D',
        '/demo/loge-ars-regia.jpg',
        'Bovenlokale studieloge gericht op symboliek, rituaalgeschiedenis en verdiepende bouwstukken.',
    ]);

    // 2. Broeders (inclusief één overkoepelende Platformbeheerder: Br. Eduard van Pallandt)
    $insUser = $pdo->prepare("
        INSERT INTO users (id, email, full_name, phone, city, avatar_url, degree, is_platform_admin, primary_lodge_id, dietary_default, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    // Platformbeheerder
    $insUser->execute([
        'usr-eduard',
        'beheer@werkplanken.loge',
        'Br. Eduard van Pallandt',
        '033-4618820',
        'Amersfoort',
        '/demo/usr-eduard.jpg',
        3,
        1, // <-- Platformbeheerder! Mag nieuwe loges aansluiten en eerste secretarissen aanwijzen
        'loge-ars-regia',
        '',
        $nowIso,
    ]);

    // Hoofd-testaccounts voor Loge De Noorderster
    $insUser->execute(['usr-willem',   'secretaris@noorderster.loge', 'Br. Willem Vermeer',   '06-21448810', 'Haarlem',        '/demo/usr-willem.jpg',   3, 0, 'loge-noorderster', '',                             $nowIso]);
    $insUser->execute(['usr-hendrik',  'meester@noorderster.loge',    'Br. Hendrik de Vries', '06-51223344', 'Bloemendaal',    '/demo/usr-hendrik.jpg',  3, 0, 'loge-noorderster', 'Geen schaal- en schelpdieren', $nowIso]);
    $insUser->execute(['usr-thomas',   'gezel@noorderster.loge',      'Br. Thomas Bakker',    '06-38991122', 'Heemstede',      '/demo/usr-thomas.jpg',   2, 0, 'loge-noorderster', 'Vegetarisch',                  $nowIso]);
    $insUser->execute(['usr-daan',     'leerling@noorderster.loge',   'Br. Daan Meijer',      '06-44776655', 'Haarlem',        '/demo/usr-daan.jpg',     1, 0, 'loge-noorderster', '',                             $nowIso]);

    // Overige leden van De Noorderster
    $insUser->execute(['usr-johannes', 'j.vandam@noorderster.loge',   'Br. Johannes van Dam', '023-5314422', 'Santpoort-Zuid', '/demo/usr-johannes.jpg', 3, 0, 'loge-noorderster', '',                             $nowIso]);
    $insUser->execute(['usr-arthur',   'a.mulder@noorderster.loge',   'Br. Arthur Mulder',    '06-19283746', 'Overveen',       '/demo/usr-arthur.jpg',   3, 0, 'loge-noorderster', '',                             $nowIso]);
    $insUser->execute(['usr-gerard',   'g.bos@noorderster.loge',      'Br. Gerard Bos',       '023-5248890', 'Aerdenhout',     '/demo/usr-gerard.jpg',   3, 0, 'loge-noorderster', 'Glutenvrij',                   $nowIso]);
    $insUser->execute(['usr-maarten',  'm.vos@noorderster.loge',      'Br. Maarten Vos',      '06-82736455', 'Zandvoort',      '/demo/usr-maarten.jpg',  3, 0, 'loge-noorderster', '',                             $nowIso]);

    // Broeders van Loge Concordia (Utrecht)
    $insUser->execute(['usr-karel',    'secretaris@concordia.loge',   'Br. Karel van Dijk',   '06-77665544', 'Utrecht',        '/demo/usr-karel.jpg',    3, 0, 'loge-concordia',   '',                             $nowIso]);
    $insUser->execute(['usr-pieter',   'p.jansen@concordia.loge',     'Br. Pieter Jansen',    '06-66554433', 'Zeist',          '/demo/usr-pieter.jpg',   3, 0, 'loge-concordia',   'Vegetarisch',                  $nowIso]);
    $insUser->execute(['usr-roelof',   'r.smits@concordia.loge',      'Br. Roelof Smits',     '030-2719988', 'De Bilt',        '/demo/usr-roelof.jpg',   2, 0, 'loge-concordia',   '',                             $nowIso]);

    // 3. Lidmaatschappen & Officieren per Loge
    $insMem = $pdo->prepare("
        INSERT INTO lodge_memberships (user_id, lodge_id, role, officer_title, sort_order, joined_year)
        VALUES (?, ?, ?, ?, ?, ?)
    ");

    // De Noorderster
    $insMem->execute(['usr-hendrik',  'loge-noorderster', 'board',     'Voorzittend Meester',      1,   2001]);
    $insMem->execute(['usr-johannes', 'loge-noorderster', 'board',     '1e Opziener',              2,   2006]);
    $insMem->execute(['usr-arthur',   'loge-noorderster', 'board',     '2e Opziener',              3,   2011]);
    $insMem->execute(['usr-willem',   'loge-noorderster', 'secretary', 'Secretaris',               4,   2008]);
    $insMem->execute(['usr-gerard',   'loge-noorderster', 'board',     'Thesaurier',               5,   1994]);
    $insMem->execute(['usr-maarten',  'loge-noorderster', 'board',     'Hofmeester (Broedermaal)', 6,   2015]);
    $insMem->execute(['usr-thomas',   'loge-noorderster', 'member',    null,                       100, 2023]);
    $insMem->execute(['usr-daan',     'loge-noorderster', 'member',    null,                       100, 2025]);

    // Studieloge Ars Regia (voorbeeld van nevenlidmaatschap naast de moederloge)
    $insMem->execute(['usr-eduard',   'loge-ars-regia',   'board',     'Voorzittend Meester',      1,   2005]);
    $insMem->execute(['usr-hendrik',  'loge-ars-regia',   'secretary', 'Secretaris',               2,   2016]);
    $insMem->execute(['usr-willem',   'loge-ars-regia',   'member',    null,                       100, 2018]);

    // Concordia Utrecht
    $insMem->execute(['usr-pieter',   'loge-concordia',   'board',     'Voorzittend Meester',      1,   1999]);
    $insMem->execute(['usr-karel',    'loge-concordia',   'secretary', 'Secretaris',               4,   2004]);
    $insMem->execute(['usr-roelof',   'loge-concordia',   'member',    null,                       100, 2022]);

    // 4. Bijeenkomsten / Werkplanken
    $insEvt = $pdo->prepare("
        INSERT INTO events (
            id, lodge_id, title, event_type, min_degree, event_date, start_time, doors_open_time,
            location, speaker, has_meal, meal_info, allow_visitors, werkplank_text, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $insEvt->execute([
        'evt-ns-1',
        'loge-noorderster',
        'Open Loge: Feestelijke Inwijding in de Leerlinggraad',
        'Open Loge',
        1,
        $futureDate(6),
        '20:00',
        '19:15',
        'Logegebouw Ripperdapark 14, Haarlem (Grote Tempel)',
        'Voorzittend Meester Br. H. de Vries & Officieren',
        1,
        'Aansluitend feestelijk Broedermaal in de Voorhof (€ 19,50 p.p., graag uiterlijk zondag 20:00 uur doorgeven)',
        1,
        "Waarde Broeders,\n\nOp deze bijzondere dinsdagavond openen wij de werkplaats in de Eerste Graad voor de plechtige aanneming van een duisterling in onze broederketen.\n\nKLEDINGVOORSCHRIFT\n• Eigen leden & Officieren: Rokkostuum of smoking met witte handschoenen en schootsvel.\n• Visiteurs: Donker kostuum of smoking met eigen regalia (1e, 2e of 3e graad).\n\nPROGRAMMA\n• 19:15 uur — Ontvangst met koffie in de Voorhof & tekenen presentielijst\n• 19:45 uur — Voorbereiding in stilte\n• 20:00 uur — Opening der werkzaamheden in de Leerlinggraad\n• 22:00 uur — Feestelijke Tafelloge / Broedermaal\n\nGeef hieronder met één klik door of u aanwezig bent en of de Hofmeester op u mag rekenen bij het Broedermaal.",
        $nowIso,
    ]);

    $insEvt->execute([
        'evt-ns-2',
        'loge-noorderster',
        'Comparitie: "De Stilte in een Luidruchtige Tijd"',
        'Comparitie',
        1,
        $futureDate(13),
        '20:00',
        '19:30',
        'Logegebouw Ripperdapark 14, Haarlem (Comparitiekamer)',
        'Br. Johannes van Dam',
        1,
        'Voorafgaand eenvoudige maaltijd om 18:30 uur (€ 12,50 p.p.)',
        1,
        "Waarde Broeders,\n\nTijdens deze comparitie verzorgt Br. Johannes van Dam een persoonlijk bouwstuk over de betekenis van stilte tijdens de rituele arbeid en hoe wij die verstilling meenemen in het dagelijks leven buiten de tempel.\n\nNa de pauze wisselen wij onder leiding van de Voorzittend Meester in broederlijke harmonie van gedachten (geen debat, maar naast elkaar leggen van inzichten).\n\nVoorafgaand serveert onze Hofmeester om 18:30 uur een warme dagschotel voor wie direct uit het werk komt.",
        $nowIso,
    ]);

    $insEvt->execute([
        'evt-ns-3',
        'loge-noorderster',
        'Open Loge in de Tweede Graad: Bevordering tot Gezel',
        'Open Loge',
        2,
        $futureDate(20),
        '20:00',
        '19:30',
        'Logegebouw Ripperdapark 14, Haarlem (Grote Tempel)',
        'Voorzittend Meester & Redenaar',
        1,
        'Broedermaal vooraf om 18:15 uur (€ 17,50 p.p.)',
        1,
        "Waarde Broeders Gezellen en Meesters,\n\nWij komen bijeen in de Gezellengraad voor de rituele bevordering van een onzer Leerlingen die zijn leerlingtijd met toewijding heeft volbracht.\n\nLet op: deze arbeid is uitsluitend toegankelijk voor Gezellen en Meesters. Visiteurs vanaf de 2e graad zijn van harte welkom mits vooraf aangemeld via deze app.",
        $nowIso,
    ]);

    $insEvt->execute([
        'evt-ns-4',
        'loge-noorderster',
        'Meesterkamer: Verheffing tot Meester Vrijmetselaar',
        'Open Loge',
        3,
        $futureDate(27),
        '19:45',
        '19:15',
        'Logegebouw Ripperdapark 14, Haarlem (Meesterkamer)',
        'Voorzittend Meester Br. H. de Vries',
        1,
        'Broedermaal na afloop rond 22:15 uur (€ 15,00 p.p.)',
        1,
        "Waarde Broeders Meesters,\n\nDe Meesterkamer wordt geopend voor een plechtige Verheffing in de Derde Graad. Gezien het intieme en ingrijpende karakter van het Meesterrituaal verzoeken wij alle Meesters uiterlijk om 19:30 uur aanwezig te zijn.",
        $nowIso,
    ]);

    $insEvt->execute([
        'evt-ut-1',
        'loge-concordia',
        'Open Loge: Sint-Jansviering & Lichtsymboliek',
        'Open Loge',
        1,
        $futureDate(8),
        '20:00',
        '19:15',
        'Maliebaan 70, Utrecht',
        'Redenaar Loge Concordia',
        1,
        'Feestelijke Tafelloge (€ 22,50 voor visiteurs, betalen per pin aan de zaal)',
        1,
        "Broeders uit den lande zijn van harte uitgenodigd om met Loge Concordia Nr. 18 in het Oosten Utrecht een gezamenlijke Open Loge in de Eerste Graad te beleven rond het thema Licht en Verbinding.\n\nVisiteurs kunnen zich met één klik hieronder aanmelden; uw naam, moederloge en graad worden automatisch doorgegeven aan onze Secretaris en Ceremoniemeester.",
        $nowIso,
    ]);

    $insEvt->execute([
        'evt-ut-2',
        'loge-concordia',
        'Gezellencomparitie: "Reizen langs de Vrije Kunsten"',
        'Comparitie',
        2,
        $futureDate(15),
        '20:00',
        '19:30',
        'Maliebaan 70, Utrecht',
        'Br. Roelof Smits (Gezel-bouwstuk)',
        0,
        'Geen maaltijd, borrel na afloop in de Voorhof',
        1,
        "Onze Gezel Br. Roelof Smits legt zijn reisbouwstuk op de arbeidstafel over geometrie en muziek in de Tweede Graad. Gezellen en Meesters van zusterloges zijn bijzonder welkom om mee te luisteren!",
        $nowIso,
    ]);

    $insEvt->execute([
        'evt-ar-1',
        'loge-ars-regia',
        'Studiecomparitie (3e graad): "Oorsprong van de Hiram-legende in de 18e eeuw"',
        'Comparitie',
        3,
        $futureDate(11),
        '19:30',
        '19:00',
        'Van Persijnstraat 17, Amersfoort',
        'Br. dr. M. Koster',
        1,
        'Broodmaaltijd vooraf om 18:00 uur (€ 11,00 p.p.)',
        1,
        "Historisch en symbolisch onderzoek naar de vroegste handschriften van het Meesterrituaal in Engeland, Frankrijk en de Republiek der Zeven Verenigde Nederlanden. Open voor alle Meesters uit aangesloten loges.",
        $nowIso,
    ]);

    // 5. Voorbeeld-aanmeldingen
    $insRsvp = $pdo->prepare("
        INSERT INTO rsvps (id, event_id, user_id, status, joins_meal, is_visitor, dietary_note, comment, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $insRsvp->execute(['rsvp-1', 'evt-ns-1', 'usr-willem',  'attending', 1, 0, '',                             '',                                                                         $nowIso]);
    $insRsvp->execute(['rsvp-2', 'evt-ns-1', 'usr-hendrik', 'attending', 1, 0, 'Geen schaal- en schelpdieren', '',                                                                         $nowIso]);
    $insRsvp->execute(['rsvp-3', 'evt-ns-1', 'usr-thomas',  'attending', 1, 0, 'Vegetarisch',                  'Ik help graag vooraf met klaarzetten.',                                    $nowIso]);
    $insRsvp->execute(['rsvp-4', 'evt-ns-1', 'usr-daan',    'attending', 0, 0, '',                             '',                                                                         $nowIso]);
    $insRsvp->execute(['rsvp-5', 'evt-ns-1', 'usr-gerard',  'declined',  0, 0, '',                             'Helaas verhinderd wegens verblijf in het buitenland, goede arbeid gewenst!', $nowIso]);
    $insRsvp->execute(['rsvp-6', 'evt-ns-1', 'usr-pieter',  'attending', 1, 1, 'Vegetarisch',                  'Brengt warme groeten mee uit het Oosten Utrecht.',                         $nowIso]);

    // 6. Bouwstukken & Documenten (met strikte graadscheiding 1, 2, 3)
    $insDoc = $pdo->prepare("
        INSERT INTO documents (
            id, lodge_id, title, author, category, min_degree, published_date, summary, content, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $insDoc->execute([
        'doc-1',
        'loge-noorderster',
        'Welkom in de Werkplaats: Wegwijzer voor Nieuwe Leerlingen',
        'Br. Johannes van Dam (1e Opziener)',
        'Rituaal & Instructie',
        1,
        $pastDate(30),
        'Praktische en warme uitleg over onze gebruiken tijdens een Open Loge, een Comparitie en de zevenslag aan de Tafelloge.',
        "Welkom in onze broederketen! Wanneer je net bent ingewijd, komt er veel op je af: nieuwe woorden, symbolen en gewoonten. Deze korte gids neemt alle onzekerheid weg zodat je ontspannen kunt deelnemen aan de arbeid.\n\n1. DE VOORHOF\nEen half uur voor aanvang drinken we rustig koffie in de Voorhof. Vergeet niet je naam te tekenen in het presentieboek bij de ingang. Zoals het gezegde luidt: een goede bijeenkomst begint met aandacht voor elkaar.\n\n2. DE COMPARITIE\nOp een comparitieavond draagt één broeder een bouwstuk op. Wij gaan niet met elkaar in discussie om gelijk te krijgen (\"wrijving geeft geen glans, maar krassen\"), maar leggen onze eigen ervaring naast die van de spreker. Spreek altijd vanuit jezelf en richt het woord via de Voorzittend Meester.\n\n3. DE OPEN LOGE & KLEDIJ\nBij een Open Loge werken wij in de Tempel met rituaal, muziek en regalia. Twijfel je over kleding of het omdoen van je schootsvel? De Ceremoniemeester of je Mentor helpt je altijd met plezier in de kleedruimte.",
        $nowIso,
    ]);

    $insDoc->execute([
        'doc-2',
        'loge-noorderster',
        'Bouwstuk: "Werken aan de Ruwe Steen zonder Haast"',
        'Br. Daan Meijer',
        'Bouwstuk',
        1,
        $pastDate(14),
        'Een beschouwing vanuit de Leerlinggraad over perfectionisme in onze moderne maatschappij tegenover mild en geduldig zelfonderzoek.',
        "Waarde Broeders,\n\nToen ik enkele maanden geleden het Licht ontving, viel mijn oog direct op de Ruwe Steen. In mijn werkzame leven ben ik gewend dat elk project een strakke deadline kent en meetbaar \"af\" moet zijn.\n\nIn de werkplaats ontdekte ik iets bevrijdends: de Ruwe Steen is geen fout die zo snel mogelijk weggebeiteld moet worden, maar kostbaar basismateriaal met een eigen nerf. Wie te hard slaat met hamer en beitel, breekt het steen in plaats van het vorm te geven.\n\nVoor mij betekent vrijmetselarij daarom oefenen in mildheid én aandacht: elke dinsdagavond even het gereedschap neerleggen, luisteren naar een broeder van een heel andere generatie, en met een rustiger blik naar huis keren.",
        $nowIso,
    ]);

    $insDoc->execute([
        'doc-3',
        'loge-noorderster',
        'Gezellenbouwstuk: "Van Loodlijn naar Waterpas — Samenwerken aan het Bouwwerk"',
        'Br. Thomas Bakker',
        'Bouwstuk',
        2,
        $pastDate(21),
        'Verdiepend bouwstuk in de Tweede Graad over de overgang van individueel zelfonderzoek naar verbinding met de medemens.',
        "Waarde Broeders Gezellen en Meesters,\n\nWaar de Leerling vooral naar binnen kijkt langs de verticale lijn van het schietlood, nodigt de Gezellengraad ons uit om op reis te gaan en onze blik horizontaal te verruimen.\n\nTijdens mijn bezoeken als visiteur bij drie zusterloges merkte ik hoe herkenbaar én tegelijk verschillend elke werkplaats werkt. Juist die ontmoeting buiten het vertrouwde nest scherpt het oordeel en laat zien dat geen enkele steen op zichzelf een tempel vormt: pas in het verband met andere stenen ontstaat draagkracht.",
        $nowIso,
    ]);

    $insDoc->execute([
        'doc-4',
        'loge-noorderster',
        'Meesterstudie: "Eindigheid, Overdracht en het Meesterwoord"',
        'Br. Hendrik de Vries (Voorzittend Meester)',
        'Bouwstuk',
        3,
        $pastDate(45),
        'Besloten beschouwing voor de Meesterkamer over sterfelijkheid, vertrouwen en het doorgeven van de fakkel aan een volgende generatie.',
        "Waarde Broeders Meesters,\n\nIn de Derde Graad worden wij geconfronteerd met de uiterste grens van ons menselijk bestaan. Waar de eerste twee graden spreken over groei en ontplooiing, vraagt de Meesterkamer wat er overblijft wanneer ons eigen werk onvoltooid uit onze handen valt.\n\nHet antwoord van ons rituaal is even nuchter als troostrijk: wij hoeven het bouwwerk niet alleen te voltooien. Wat telt is dat wij rechtop staan voor wat waarachtig is, en dat een broeder ons bij de hand vat om weer op te staan in verbondenheid.",
        $nowIso,
    ]);

    // 7. Mededelingen
    $insAnn = $pdo->prepare("
        INSERT INTO announcements (id, lodge_id, title, category, author_name, body, is_pinned, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $insAnn->execute([
        'ann-1',
        'loge-noorderster',
        'Welkom op onze nieuwe, eenvoudige Werkplanken-app!',
        'Secretariaat',
        'Br. Willem Vermeer (Secretaris)',
        'Waarde Broeders, vanaf heden hoeft niemand meer een wachtwoord te onthouden. U blijft op uw eigen telefoon of computer gewoon een heel jaar ingelogd, en aan- of afmelden voor de dinsdagavond en het Broedermaal gaat voortaan met één druk op de knop. Rechtsboven kunt u met "A+" de letters groter zetten.',
        1,
        $nowIso,
    ]);

    $insAnn->execute([
        'ann-2',
        'loge-noorderster',
        'Lief en Leed: Kaartje voor Br. Gerard Bos',
        'Lief en Leed',
        'Br. Hendrik de Vries (Voorzittend Meester)',
        'Onze Thesaurier Br. Gerard Bos herstelt thuis voorspoedig van een kleine knieoperatie en hoopt over twee weken weer in ons midden te zijn. Een telefoontje of kaartje (zie telefoonnummer en gegevens onder "Wie is wie") wordt bijzonder gewaardeerd!',
        0,
        $nowIso,
    ]);

    $insAnn->execute([
        'ann-ut-1',
        'loge-concordia',
        'Parkeerinformatie rond de Maliebaan in november',
        'Secretariaat',
        'Br. Karel van Dijk (Secretaris)',
        'In verband met wegwerkzaamheden aan de Oosterspoorbaan raden wij broeders en visiteurs aan via de Nachtegaalstraat aan te rijden.',
        1,
        $nowIso,
    ]);
}
