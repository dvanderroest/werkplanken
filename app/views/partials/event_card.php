<?php
/**
 * Herbruikbare Werkplank-kaart voor zowel de eigen loge als het visiteren bij zusterloges.
 *
 * @var array  $event
 * @var array  $currentUser
 * @var string $returnTab
 * @var bool   $showLodgeBadge
 * @var bool   $defaultExpanded
 */
$accent = !empty($event['lodge_accent_color']) ? $event['lodge_accent_color'] : '#1B365D';
$myStatus = $event['my_status'] ?? null;
$myMeal   = ((int) ($event['my_meal'] ?? 0) === 1);
$myVisit  = ((int) ($event['my_visitor'] ?? 0) === 1);
$hasMeal  = ((int) ($event['has_meal'] ?? 0) === 1);
$myDiet   = (string) ($event['my_diet'] ?? ($currentUser['dietary_default'] ?? ''));
$myNote   = (string) ($event['my_comment'] ?? '');
?>
<article
  id="evt-<?= e($event['id']) ?>"
  class="event-card"
  style="border-top: 5px solid <?= e($accent) ?>;"
  data-filter-item="visiteren"
  data-filter-text="<?= e($event['lodge_city'] . ' ' . $event['lodge_name'] . ' ' . $event['title']) ?>"
>
  <div class="event-card-top flex-between">
    <div class="flex-row">
      <?php if (!empty($showLodgeBadge)): ?>
        <span class="badge" style="background: <?= e($accent) ?>; color: #fff; padding: 0.25rem 0.65rem;">
          <?php if (!empty($event['lodge_logo_url'])): ?>
            <img src="<?= e($event['lodge_logo_url']) ?>" alt="" style="width: 1.15rem; height: 1.15rem; border-radius: 3px; object-fit: cover;">
          <?php endif; ?>
          Loge <?= e($event['lodge_name']) ?> Nr. <?= (int) $event['lodge_number'] ?> · Oosten <?= e($event['lodge_city']) ?>
        </span>
      <?php endif; ?>
      <strong>📅 <?= e(format_dutch_date((string) $event['event_date'])) ?></strong>
      <span class="badge badge-slate"><?= e(days_until_label((string) $event['event_date'])) ?></span>
    </div>

    <div>
      <?php if ($myStatus === 'attending'): ?>
        <span class="badge badge-green">
          ✓ U bent aangemeld<?= $myVisit ? ' (als Visiteur)' : '' ?><?= ($hasMeal && $myMeal) ? ' + Broedermaal' : ' (alleen Arbeid)' ?>
        </span>
      <?php elseif ($myStatus === 'declined'): ?>
        <span class="badge badge-slate">✕ Afgemeld (verhinderd)</span>
      <?php else: ?>
        <span class="badge badge-gold">Aanwezigheid nog doorgeven</span>
      <?php endif; ?>
    </div>
  </div>

  <div class="event-card-body">
    <div class="flex-row mb-2">
      <span class="badge badge-navy"><?= e($event['event_type']) ?></span>
      <span class="badge badge-gold">🔒 <?= e(degree_short_label((int) $event['min_degree'])) ?></span>
      <?php if ((int) $event['allow_visitors'] === 1): ?>
        <span class="badge badge-slate">Visiteurs welkom</span>
      <?php endif; ?>
    </div>

    <h3 style="font-size: 1.38rem; color: var(--navy); margin-bottom: 0.45rem;">
      <?= e($event['title']) ?>
    </h3>

    <div class="text-sm text-muted stack-sm mb-3">
      <div>🕒 <strong>Aanvang <?= e($event['start_time']) ?> uur</strong> (Voorhof open vanaf <?= e($event['doors_open_time']) ?> uur) · 📍 <?= e($event['location']) ?></div>
      <?php if (!empty($event['speaker'])): ?>
        <div>🎙️ <strong>Verzorgd door:</strong> <?= e($event['speaker']) ?></div>
      <?php endif; ?>
      <?php if ($hasMeal && !empty($event['meal_info'])): ?>
        <div>🍽️ <strong>Broedermaal:</strong> <?= e($event['meal_info']) ?></div>
      <?php endif; ?>
    </div>

    <details class="clean-details mb-3" <?= !empty($defaultExpanded) ? 'open' : '' ?>>
      <summary>📖 Lees de volledige Werkplank &amp; programma ▾</summary>
      <div class="werkplank-box"><?= e($event['werkplank_text']) ?></div>
    </details>

    <!-- 1-klik Aan- en Afmeldknoppen (echte PHP-formulieren, werkt direct in elke browser) -->
    <form method="post" action="/" class="card-muted">
      <?= csrf_field() ?>
      <input type="hidden" name="form_action" value="rsvp_save">
      <input type="hidden" name="event_id" value="<?= e($event['id']) ?>">
      <input type="hidden" name="return_tab" value="<?= e($returnTab) ?>">

      <div class="text-sm mb-2"><strong>Geef met 1 klik uw aanwezigheid door:</strong></div>

      <div class="flex-row">
        <?php if ($hasMeal): ?>
          <button
            type="submit"
            name="choice"
            value="arbeid_en_maal"
            class="btn <?= ($myStatus === 'attending' && $myMeal) ? 'btn-success' : 'btn-primary' ?>"
          >
            ✓ Aanwezig + Broedermaal
          </button>
          <button
            type="submit"
            name="choice"
            value="alleen_arbeid"
            class="btn <?= ($myStatus === 'attending' && !$myMeal) ? 'btn-primary' : 'btn-outline' ?>"
          >
            ✓ Alleen Arbeid (geen maaltijd)
          </button>
        <?php else: ?>
          <button
            type="submit"
            name="choice"
            value="alleen_arbeid"
            class="btn <?= ($myStatus === 'attending') ? 'btn-success' : 'btn-primary' ?>"
          >
            ✓ Ik ben aanwezig
          </button>
        <?php endif; ?>

        <button
          type="submit"
          name="choice"
          value="afwezig"
          class="btn <?= ($myStatus === 'declined') ? 'btn-danger-outline' : 'btn-neutral' ?>"
        >
          ✕ Ik ben verhinderd
        </button>
      </div>

      <details class="mt-2" <?= ($myDiet !== '' || $myNote !== '') ? 'open' : '' ?>>
        <summary class="text-xs" style="cursor: pointer; font-weight: 700; color: var(--navy);">
          + Dieetwens of opmerking voor Secretaris / Hofmeester toevoegen (optioneel)
        </summary>
        <div class="grid-2 mt-2">
          <div>
            <label class="form-label text-xs">Dieetwens / allergie</label>
            <input type="text" name="dietary_note" value="<?= e($myDiet) ?>" placeholder="bijv. Vegetarisch, glutenvrij..." class="input" style="padding: 0.45rem 0.7rem; font-size: 0.9rem;">
          </div>
          <div>
            <label class="form-label text-xs">Korte opmerking</label>
            <input type="text" name="comment" value="<?= e($myNote) ?>" placeholder="bijv. Ik kom iets later uit mijn werk" class="input" style="padding: 0.45rem 0.7rem; font-size: 0.9rem;">
          </div>
        </div>
      </details>

      <div class="text-xs text-muted mt-2">
        Huidige stand: <strong><?= (int) ($event['attending_members'] ?? 0) ?></strong> eigen leden aanwezig
        · <strong><?= (int) ($event['attending_visitors'] ?? 0) ?></strong> visiteur(s) aangemeld
        <?php if ($hasMeal): ?>
          · <strong><?= (int) ($event['meal_count'] ?? 0) ?></strong> eters bij het Broedermaal
        <?php endif; ?>
      </div>
    </form>
  </div>
</article>
