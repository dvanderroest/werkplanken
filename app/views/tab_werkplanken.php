<?php
/**
 * Volledig overzicht van de aankomende Werkplanken van de eigen loge (gefilterd op graad).
 *
 * @var array $currentUser
 * @var array $activeLodge
 * @var array $ownEvents
 */
?>
<div class="stack-lg">
  <div class="card">
    <h2 style="font-size: 1.6rem; color: var(--navy); margin-bottom: 0.35rem;">
      Werkplanken &amp; Rooster — Loge <?= e($activeLodge['name']) ?> Nr. <?= (int) $activeLodge['number'] ?>
    </h2>
    <p class="text-sm text-muted mb-0">
      U ziet hier automatisch alle bijeenkomsten van uw loge tot en met uw eigen graad (<strong><?= e(degree_label((int) $currentUser['degree'])) ?></strong>).<br>
      📍 Adres werkplaats: <strong><?= e($activeLodge['address']) ?></strong>
    </p>
  </div>

  <?php if (empty($ownEvents)): ?>
    <div class="card text-muted">Er staan momenteel geen aankomende werkplanken op het rooster.</div>
  <?php else: ?>
    <?php foreach ($ownEvents as $idx => $evt): ?>
      <?php
      $event = $evt;
      $returnTab = 'werkplanken';
      $showLodgeBadge = false;
      $defaultExpanded = ($idx === 0);
      require __DIR__ . '/partials/event_card.php';
      ?>
    <?php endforeach; ?>
  <?php endif; ?>
</div>
