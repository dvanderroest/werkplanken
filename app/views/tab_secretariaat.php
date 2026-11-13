<?php
/**
 * Secretariaat & Hofmeester paneel — UITSLUITEND voor het beheren van de eigen actieve loge.
 * Nieuwe loges aanmaken hoort bewust NIET hier, maar uitsluitend bij de Platformbeheerder.
 *
 * @var array $currentUser
 * @var array $activeLodge
 * @var array $ownEvents
 * @var array $members
 */

$subTabs = [
    'aanmeldingen'     => '📋 Aanmeldingen & Tafellijst',
    'nieuwe_werkplank' => '➕ Nieuwe Werkplank',
    'leden'            => '👥 Leden & Graden',
    'mededelingen'     => '📣 Mededeling plaatsen',
    'bouwstukken'      => '📖 Bouwstuk plaatsen',
    'loge'             => '🏛️ Eigen Loge & Embleem',
];

$sub = (string) ($_GET['sub'] ?? 'aanmeldingen');
if (!array_key_exists($sub, $subTabs)) {
    $sub = 'aanmeldingen';
}

$selectedEventId = (string) ($_GET['event_id'] ?? ($ownEvents[0]['id'] ?? ''));
$selectedEvent = null;
foreach ($ownEvents as $ev) {
    if ($ev['id'] === $selectedEventId) {
        $selectedEvent = $ev;
        break;
    }
}
if (!$selectedEvent && !empty($ownEvents[0])) {
    $selectedEvent = $ownEvents[0];
    $selectedEventId = (string) $selectedEvent['id'];
}

$rsvpRows = $selectedEvent ? get_event_rsvps_for_management($currentUser, $selectedEventId) : [];
$attendingList = array_values(array_filter($rsvpRows, static fn(array $r): bool => $r['status'] === 'attending'));
$declinedList  = array_values(array_filter($rsvpRows, static fn(array $r): bool => $r['status'] === 'declined'));
$mealList      = array_values(array_filter($attendingList, static fn(array $r): bool => (int) $r['joins_meal'] === 1));
$visitorList   = array_values(array_filter($attendingList, static fn(array $r): bool => (int) $r['is_visitor'] === 1));
?>
<div class="stack-lg">
  <nav class="subnav no-print" aria-label="Secretariaat onderdelen">
    <?php foreach ($subTabs as $key => $label): ?>
      <a href="/?tab=secretariaat&amp;sub=<?= e($key) ?>" class="subnav-link <?= $sub === $key ? 'active' : '' ?>">
        <?= e($label) ?>
      </a>
    <?php endforeach; ?>
  </nav>

  <?php if ($sub === 'aanmeldingen'): ?>
    <section class="card">
      <div class="flex-between mb-3 no-print">
        <div>
          <h2 class="mb-0" style="font-size: 1.5rem; color: var(--navy);">
            Aanmeldingen, Visiteurs &amp; Tafellijst — Loge <?= e($activeLodge['name']) ?>
          </h2>
          <div class="text-xs text-muted mt-1">
            Overzicht voor Secretaris, Ceremoniemeester en Hofmeester (inclusief printknop voor in de keuken of Voorhof).
          </div>
        </div>

        <?php if ($selectedEvent): ?>
          <div class="flex-row">
            <form method="post" action="/" style="margin: 0;">
              <?= csrf_field() ?>
              <input type="hidden" name="form_action" value="sec_send_invites">
              <input type="hidden" name="event_id" value="<?= e($selectedEventId) ?>">
              <button type="submit" class="btn btn-sm btn-outline">
                ✉️ Verstuur uitnodigingsmail (1-klik RSVP)
              </button>
            </form>
            <button type="button" onclick="window.print()" class="btn btn-sm btn-primary">
              🖨️ Print Tafellijst
            </button>
          </div>
        <?php endif; ?>
      </div>

      <?php if (empty($ownEvents)): ?>
        <p class="text-muted">Er staan nog geen aankomende werkplanken gepland.</p>
      <?php else: ?>
        <form method="get" action="/" class="mb-4 no-print">
          <input type="hidden" name="tab" value="secretariaat">
          <input type="hidden" name="sub" value="aanmeldingen">
          <label for="select-event-rsvp" class="form-label">Kies bijeenkomst:</label>
          <select id="select-event-rsvp" name="event_id" class="select" onchange="this.form.submit()">
            <?php foreach ($ownEvents as $ev): ?>
              <option value="<?= e($ev['id']) ?>" <?= $ev['id'] === $selectedEventId ? 'selected' : '' ?>>
                <?= e(format_dutch_date((string) $ev['event_date'])) ?> — <?= e($ev['title']) ?> (<?= e(degree_short_label((int) $ev['min_degree'])) ?>)
              </option>
            <?php endforeach; ?>
          </select>
        </form>

        <?php if ($selectedEvent): ?>
          <div class="card-muted mb-4">
            <strong style="font-size: 1.15rem; color: var(--navy);"><?= e($selectedEvent['title']) ?></strong>
            <div class="text-sm text-muted">
              <?= e(format_dutch_date((string) $selectedEvent['event_date'])) ?> om <?= e($selectedEvent['start_time']) ?> uur · <?= e($selectedEvent['location']) ?>
            </div>
            <div class="flex-row mt-2">
              <span class="badge badge-green">Aanwezig totaal: <?= count($attendingList) ?></span>
              <span class="badge badge-gold">Waarvan visiteurs: <?= count($visitorList) ?></span>
              <span class="badge badge-navy">Eters Broedermaal: <?= count($mealList) ?></span>
              <span class="badge badge-slate">Afgemeld: <?= count($declinedList) ?></span>
            </div>
          </div>

          <h3 style="font-size: 1.15rem; color: var(--navy); margin-bottom: 0.6rem;">Aanwezige Broeders &amp; Visiteurs</h3>
          <?php if (empty($attendingList)): ?>
            <p class="text-sm text-muted">Nog geen aanmeldingen ontvangen voor deze avond.</p>
          <?php else: ?>
            <div class="table-wrap mb-4">
              <table class="clean-table">
                <thead>
                  <tr>
                    <th>Broeder</th>
                    <th>Graad &amp; Moederloge</th>
                    <th>Broedermaal</th>
                    <th>Dieetwens / Opmerking</th>
                  </tr>
                </thead>
                <tbody>
                  <?php foreach ($attendingList as $r): ?>
                    <tr>
                      <td>
                        <div class="flex-row">
                          <?php if (!empty($r['avatar_url'])): ?>
                            <img src="<?= e($r['avatar_url']) ?>" alt="" style="width: 2.25rem; height: 2.25rem; border-radius: 999px; object-fit: cover; border: 1px solid #cbd5e1;">
                          <?php endif; ?>
                          <div>
                            <strong><?= e($r['full_name']) ?></strong>
                            <?php if ((int) $r['is_visitor'] === 1): ?>
                              <span class="badge badge-gold">Visiteur</span>
                            <?php endif; ?>
                          </div>
                        </div>
                      </td>
                      <td>
                        <?= e(degree_short_label((int) $r['degree'])) ?><br>
                        <span class="text-xs text-muted">Loge <?= e($r['home_lodge_name']) ?> Nr. <?= (int) $r['home_lodge_number'] ?> (<?= e($r['home_lodge_city']) ?>)</span>
                      </td>
                      <td>
                        <?php if ((int) $r['joins_meal'] === 1): ?>
                          <span class="badge badge-green">🍽️ Eet mee</span>
                        <?php else: ?>
                          <span class="text-xs text-muted">Alleen arbeid</span>
                        <?php endif; ?>
                      </td>
                      <td class="text-sm">
                        <?php if (!empty($r['dietary_note'])): ?>
                          <div><strong style="color: #92400e;">Dieet: <?= e($r['dietary_note']) ?></strong></div>
                        <?php endif; ?>
                        <?php if (!empty($r['comment'])): ?>
                          <div class="text-muted"><?= e($r['comment']) ?></div>
                        <?php endif; ?>
                      </td>
                    </tr>
                  <?php endforeach; ?>
                </tbody>
              </table>
            </div>
          <?php endif; ?>

          <?php if (!empty($declinedList)): ?>
            <h3 style="font-size: 1.05rem; color: var(--text-muted); margin-bottom: 0.5rem;">Berichten van verhindering (<?= count($declinedList) ?>)</h3>
            <div class="card-muted text-sm stack-sm">
              <?php foreach ($declinedList as $d): ?>
                <div>
                  <strong><?= e($d['full_name']) ?></strong>
                  <?php if (!empty($d['comment'])): ?> — <em>"<?= e($d['comment']) ?>"</em><?php endif; ?>
                </div>
              <?php endforeach; ?>
            </div>
          <?php endif; ?>
        <?php endif; ?>
      <?php endif; ?>
    </section>

  <?php elseif ($sub === 'nieuwe_werkplank'): ?>
    <section class="card">
      <h2 style="font-size: 1.5rem; color: var(--navy); margin-bottom: 0.3rem;">
        Nieuwe Werkplank opstellen — Loge <?= e($activeLodge['name']) ?>
      </h2>
      <p class="text-sm text-muted mb-4">
        Kies zorgvuldig de vereiste graad: een 2e- of 3e-graads arbeid wordt automatisch afgeschermd voor broeders met een lagere graad.
      </p>

      <form method="post" action="/">
        <?= csrf_field() ?>
        <input type="hidden" name="form_action" value="sec_create_event">

        <div class="form-group">
          <label class="form-label">Titel / Onderwerp van de avond *</label>
          <input type="text" name="title" required placeholder="bijv. Comparitie: De Symboliek van de Ruwe Steen" class="input">
        </div>

        <div class="grid-3">
          <div class="form-group">
            <label class="form-label">Soort bijeenkomst</label>
            <select name="event_type" class="select">
              <option value="Comparitie">Comparitie</option>
              <option value="Open Loge">Open Loge (Ritueel)</option>
              <option value="Tafelloge">Tafelloge</option>
              <option value="Huishoudelijke Vergadering">Huishoudelijke Vergadering</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Minimale Graad (Toegang) *</label>
            <select name="min_degree" class="select">
              <option value="1">1e graad — Leerling, Gezel &amp; Meester</option>
              <option value="2">2e graad — Uitsluitend Gezel &amp; Meester</option>
              <option value="3">3e graad — Uitsluitend Meesterkamer</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Datum *</label>
            <input type="date" name="event_date" required value="<?= e((new DateTimeImmutable('+14 days'))->format('Y-m-d')) ?>" class="input">
          </div>
        </div>

        <div class="grid-3">
          <div class="form-group">
            <label class="form-label">Voorhof open</label>
            <input type="text" name="doors_open_time" value="19:30" class="input">
          </div>
          <div class="form-group">
            <label class="form-label">Aanvang arbeid *</label>
            <input type="text" name="start_time" value="20:00" required class="input">
          </div>
          <div class="form-group">
            <label class="form-label">Spreker / Voorganger</label>
            <input type="text" name="speaker" placeholder="bijv. Br. J. van Dam" class="input">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Locatie *</label>
          <input type="text" name="location" required value="<?= e($activeLodge['address']) ?>" class="input">
        </div>

        <div class="grid-2 mb-3">
          <label class="card-muted flex-row" style="cursor: pointer;">
            <input type="checkbox" name="has_meal" value="1" checked style="width: 1.2rem; height: 1.2rem;">
            <span class="text-sm"><strong>Broedermaal aanwezig</strong> (leden kunnen mee-eten aanvinken)</span>
          </label>
          <label class="card-muted flex-row" style="cursor: pointer;">
            <input type="checkbox" name="allow_visitors" value="1" checked style="width: 1.2rem; height: 1.2rem;">
            <span class="text-sm"><strong>Visiteurs welkom</strong> (zichtbaar onder Visiteren bij zusterloges)</span>
          </label>
        </div>

        <div class="form-group">
          <label class="form-label">Toelichting Broedermaal (tijdstip &amp; kosten)</label>
          <input type="text" name="meal_info" value="Broedermaal om 18:30 uur (€ 15,00 p.p.)" class="input">
        </div>

        <div class="form-group">
          <label class="form-label">Volledige tekst van de Werkplank / Uitnodiging *</label>
          <textarea name="werkplank_text" rows="6" required placeholder="Waarde Broeders, op deze avond..." class="textarea"></textarea>
        </div>

        <label class="card-muted flex-row mb-4" style="cursor: pointer; background: #eff6ff; border-color: #93c5fd;">
          <input type="checkbox" name="send_invites_now" value="1" checked style="width: 1.2rem; height: 1.2rem;">
          <span class="text-sm">
            <strong>Stuur direct per e-mail naar alle broeders van deze graad</strong> (inclusief persoonlijke 1-klik aanmeldknoppen zonder inloggen).
          </span>
        </label>

        <button type="submit" class="btn btn-primary btn-lg">
          Werkplank publiceren →
        </button>
      </form>
    </section>

  <?php elseif ($sub === 'leden'): ?>
    <div class="stack-lg">
      <section class="card">
        <h2 style="font-size: 1.45rem; color: var(--navy); margin-bottom: 0.3rem;">
          Nieuwe Broeder uitnodigen bij Loge <?= e($activeLodge['name']) ?>
        </h2>
        <p class="text-sm text-muted mb-4">
          Zodra u het e-mailadres toevoegt, kan de broeder direct zonder wachtwoord inloggen op zijn telefoon en computer. Bestaat hij al bij een andere loge, dan wordt hij als nevenlid aan uw loge gekoppeld.
        </p>

        <form method="post" action="/">
          <?= csrf_field() ?>
          <input type="hidden" name="form_action" value="sec_add_member">

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Volledige naam *</label>
              <input type="text" name="full_name" required placeholder="bijv. Br. Jan de Groot" class="input">
            </div>
            <div class="form-group">
              <label class="form-label">E-mailadres *</label>
              <input type="email" name="email" required placeholder="j.degroot@voorbeeld.nl" class="input">
            </div>
          </div>

          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">Graad</label>
              <select name="degree" class="select">
                <option value="1">1e graad — Leerling</option>
                <option value="2">2e graad — Gezel</option>
                <option value="3">3e graad — Meester</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Rol in uw loge</label>
              <select name="role" class="select">
                <option value="member">Gewoon lid</option>
                <option value="board">Bestuur / Officier</option>
                <option value="secretary">Secretaris (Beheer)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Officiersfunctie (optioneel)</label>
              <input type="text" name="officer_title" placeholder="bijv. Redenaar, Hofmeester..." class="input">
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Telefoonnummer</label>
              <input type="tel" name="phone" placeholder="06-..." class="input">
            </div>
            <div class="form-group">
              <label class="form-label">Woonplaats</label>
              <input type="text" name="city" placeholder="bijv. Haarlem" class="input">
            </div>
          </div>

          <button type="submit" class="btn btn-primary">
            Broeder toevoegen aan Loge <?= e($activeLodge['name']) ?>
          </button>
        </form>
      </section>

      <section class="card">
        <h3 style="font-size: 1.3rem; color: var(--navy); margin-bottom: 0.75rem;">
          Huidige leden van Loge <?= e($activeLodge['name']) ?> (<?= count($members) ?>) — Bevordering, Verheffing &amp; Functies
        </h3>

        <div class="stack-sm">
          <?php foreach ($members as $mem): ?>
            <form method="post" action="/" class="card-muted flex-between">
              <?= csrf_field() ?>
              <input type="hidden" name="form_action" value="sec_update_member">
              <input type="hidden" name="user_id" value="<?= e($mem['user_id']) ?>">

              <div class="flex-row">
                <?php if (!empty($mem['avatar_url'])): ?>
                  <img src="<?= e($mem['avatar_url']) ?>" alt="" style="width: 2.75rem; height: 2.75rem; border-radius: 999px; object-fit: cover; border: 1px solid #cbd5e1;">
                <?php endif; ?>
                <div>
                  <strong><?= e($mem['full_name']) ?></strong>
                  <div class="text-xs text-muted"><?= e($mem['email']) ?><?= !empty($mem['phone']) ? ' · ' . e($mem['phone']) : '' ?></div>
                </div>
              </div>

              <div class="flex-row">
                <select name="degree" class="select" style="width: auto; padding: 0.4rem 0.65rem; font-size: 0.88rem;">
                  <option value="1" <?= (int) $mem['degree'] === 1 ? 'selected' : '' ?>>1e gr. Leerling</option>
                  <option value="2" <?= (int) $mem['degree'] === 2 ? 'selected' : '' ?>>2e gr. Gezel</option>
                  <option value="3" <?= (int) $mem['degree'] === 3 ? 'selected' : '' ?>>3e gr. Meester</option>
                </select>

                <select name="role" class="select" style="width: auto; padding: 0.4rem 0.65rem; font-size: 0.88rem;">
                  <option value="member" <?= $mem['role'] === 'member' ? 'selected' : '' ?>>Lid</option>
                  <option value="board" <?= $mem['role'] === 'board' ? 'selected' : '' ?>>Officier / Bestuur</option>
                  <option value="secretary" <?= $mem['role'] === 'secretary' ? 'selected' : '' ?>>Secretaris</option>
                </select>

                <input
                  type="text"
                  name="officer_title"
                  value="<?= e((string) ($mem['officer_title'] ?? '')) ?>"
                  placeholder="Functietitel (optioneel)"
                  class="input"
                  style="width: 11rem; padding: 0.4rem 0.65rem; font-size: 0.88rem;"
                >

                <button type="submit" class="btn btn-sm btn-primary">Opslaan</button>
              </div>
            </form>
          <?php endforeach; ?>
        </div>
      </section>
    </div>

  <?php elseif ($sub === 'mededelingen'): ?>
    <section class="card">
      <h2 style="font-size: 1.45rem; color: var(--navy); margin-bottom: 0.35rem;">
        Mededeling of Lief &amp; Leed plaatsen (Loge <?= e($activeLodge['name']) ?>)
      </h2>
      <p class="text-sm text-muted mb-4">
        Dit bericht verschijnt uitsluitend voor de leden van uw eigen loge op de Startpagina.
      </p>

      <form method="post" action="/">
        <?= csrf_field() ?>
        <input type="hidden" name="form_action" value="sec_add_announcement">

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Onderwerp *</label>
            <input type="text" name="title" required placeholder="bijv. Lief en Leed: bezoek aan Br. ..." class="input">
          </div>
          <div class="form-group">
            <label class="form-label">Rubriek</label>
            <select name="category" class="select">
              <option value="Secretariaat">Secretariaat</option>
              <option value="Bestuur">Bestuur</option>
              <option value="Lief en Leed">Lief en Leed</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Berichttekst *</label>
          <textarea name="body" rows="5" required class="textarea"></textarea>
        </div>

        <label class="card-muted flex-row mb-4" style="cursor: pointer;">
          <input type="checkbox" name="is_pinned" value="1" style="width: 1.2rem; height: 1.2rem;">
          <span class="text-sm"><strong>Bovenaan vastpinnen op de Startpagina</strong></span>
        </label>

        <button type="submit" class="btn btn-primary">Mededeling plaatsen</button>
      </form>
    </section>

  <?php elseif ($sub === 'bouwstukken'): ?>
    <section class="card">
      <h2 style="font-size: 1.45rem; color: var(--navy); margin-bottom: 0.35rem;">
        Bouwstuk of Document toevoegen aan archief (Loge <?= e($activeLodge['name']) ?>)
      </h2>
      <p class="text-sm text-muted mb-4">
        Stukken worden strikt afgeschermd voor andere loges én op de hieronder ingestelde minimale graad.
      </p>

      <form method="post" action="/">
        <?= csrf_field() ?>
        <input type="hidden" name="form_action" value="sec_add_document">

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Titel van het bouwstuk / document *</label>
            <input type="text" name="title" required placeholder="bijv. Bouwstuk: De Symboliek van het Schietlood" class="input">
          </div>
          <div class="form-group">
            <label class="form-label">Auteur / Spreker</label>
            <input type="text" name="author" value="<?= e($currentUser['full_name']) ?>" class="input">
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Categorie</label>
            <select name="category" class="select">
              <option value="Bouwstuk">Bouwstuk</option>
              <option value="Rituaal & Instructie">Rituaal &amp; Instructie</option>
              <option value="Verslag">Verslag / Huishoudelijk</option>
              <option value="Werkplank">Werkplank-archief</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Minimale Graad om te mogen lezen *</label>
            <select name="min_degree" class="select">
              <option value="1">1e graad — Zichtbaar voor alle eigen leden</option>
              <option value="2">2e graad — Alleen Gezellen &amp; Meesters</option>
              <option value="3">3e graad — Alleen Meesters</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Korte samenvatting (1-2 zinnen)</label>
          <input type="text" name="summary" placeholder="Korte omschrijving voor op de overzichtskaart..." class="input">
        </div>

        <div class="form-group">
          <label class="form-label">Volledige tekst *</label>
          <textarea name="content" rows="9" required class="textarea"></textarea>
        </div>

        <button type="submit" class="btn btn-primary">Opslaan in loge-archief</button>
      </form>
    </section>

  <?php elseif ($sub === 'loge'): ?>
    <section class="card">
      <h2 style="font-size: 1.45rem; color: var(--navy); margin-bottom: 0.35rem;">
        Gegevens &amp; Embleem van uw eigen Loge (Loge <?= e($activeLodge['name']) ?> Nr. <?= (int) $activeLodge['number'] ?>)
      </h2>
      <p class="text-sm text-muted mb-4">
        Hier past u het wapen/embleem, de logekleur en het adres van uw eigen loge aan. (Het aansluiten van <em>nieuwe</em> loges op het platform is voorbehouden aan de Platformbeheerder.)
      </p>

      <form method="post" action="/">
        <?= csrf_field() ?>
        <input type="hidden" name="form_action" value="sec_update_lodge">
        <input type="hidden" id="sec-lodge-logo-hidden" name="logo_url" value="<?= e($activeLodge['logo_url']) ?>">

        <div class="card-muted flex-row mb-4">
          <img
            id="sec-lodge-logo-preview"
            src="<?= e(!empty($activeLodge['logo_url']) ? $activeLodge['logo_url'] : '/icon.svg') ?>"
            data-placeholder="/icon.svg"
            alt="Loge-embleem"
            style="width: 4.5rem; height: 4.5rem; border-radius: 12px; object-fit: cover; border: 2px solid var(--border-warm);"
          >
          <div>
            <div class="form-label mb-1">Embleem, onderscheidingsteken of foto van uw Loge</div>
            <div class="flex-row mt-2">
              <label class="btn btn-sm btn-primary" style="cursor: pointer;">
                📷 Nieuwe afbeelding kiezen
                <input
                  type="file"
                  accept="image/*"
                  data-image-upload="sec-lodge-logo"
                  data-max-size="300"
                  data-preserve-alpha="1"
                  style="display: none;"
                >
              </label>
              <button type="button" class="btn btn-sm btn-danger-outline" data-clear-image="sec-lodge-logo">
                Standaard icoon gebruiken
              </button>
            </div>
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Vaste vergaderavond &amp; aanvangstijd *</label>
            <input type="text" name="meeting_day" required value="<?= e($activeLodge['meeting_day']) ?>" class="input">
          </div>
          <div class="form-group">
            <label class="form-label">Logekleur (kopbalk)</label>
            <select name="accent_color" class="select">
              <option value="#1B365D" <?= $activeLodge['accent_color'] === '#1B365D' ? 'selected' : '' ?>>Koningsblauw (#1B365D)</option>
              <option value="#7F1D1D" <?= $activeLodge['accent_color'] === '#7F1D1D' ? 'selected' : '' ?>>Bordeauxrood (#7F1D1D)</option>
              <option value="#14532D" <?= $activeLodge['accent_color'] === '#14532D' ? 'selected' : '' ?>>Bosgroen (#14532D)</option>
              <option value="#4C1D95" <?= $activeLodge['accent_color'] === '#4C1D95' ? 'selected' : '' ?>>Purper (#4C1D95)</option>
              <option value="#78350F" <?= $activeLodge['accent_color'] === '#78350F' ? 'selected' : '' ?>>Warm Brons (#78350F)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Adres van het Logegebouw *</label>
          <input type="text" name="address" required value="<?= e($activeLodge['address']) ?>" class="input">
        </div>

        <div class="form-group">
          <label class="form-label">Korte beschrijving van uw werkplaats</label>
          <textarea name="description" rows="3" class="textarea"><?= e($activeLodge['description']) ?></textarea>
        </div>

        <button type="submit" class="btn btn-primary">Loge-instellingen opslaan</button>
      </form>
    </section>
  <?php endif; ?>
</div>
