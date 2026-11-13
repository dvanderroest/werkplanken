<?php
/**
 * Landelijke arbeidstafel voor Visiteren bij aangesloten zusterloges (gefilterd op graad).
 *
 * @var array $currentUser
 * @var array $visitorEvents
 */
?>
<div class="stack-lg">
  <div class="card flex-between">
    <div style="max-width: 40rem;">
      <h2 style="font-size: 1.6rem; color: var(--navy); margin-bottom: 0.35rem;">
        🧭 Visiteren bij Zusterloges (Arbeidstafel)
      </h2>
      <p class="text-sm text-muted mb-0">
        Opengestelde bijeenkomsten van aangesloten loges die passen bij uw graad (<strong><?= e(degree_label((int) $currentUser['degree'])) ?></strong>). Wanneer u op <em>Aanwezig</em> klikt, worden uw naam, graad en moederloge (<strong>Loge <?= e($currentUser['primary_lodge_name']) ?> Nr. <?= (int) $currentUser['primary_lodge_number'] ?></strong>) netjes doorgegeven aan de ontvangende Secretaris.
      </p>
    </div>

    <div style="min-width: 16rem; flex: 1; max-width: 22rem;">
      <label for="visit-search" class="form-label text-xs">Zoek op stad (Oosten), loge of onderwerp</label>
      <input
        id="visit-search"
        type="search"
        placeholder="bijv. Utrecht, Amersfoort..."
        data-filter-target="visiteren"
        class="input"
      >
    </div>
  </div>

  <?php if (empty($visitorEvents)): ?>
    <div class="card text-muted">Er zijn momenteel geen opengestelde bijeenkomsten van andere loges beschikbaar.</div>
  <?php else: ?>
    <?php foreach ($visitorEvents as $evt): ?>
      <?php
      $event = $evt;
      $returnTab = 'visiteren';
      $showLodgeBadge = true;
      $defaultExpanded = false;
      require __DIR__ . '/partials/event_card.php';
      ?>
    <?php endforeach; ?>
  <?php endif; ?>
</div>
