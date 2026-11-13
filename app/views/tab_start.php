<?php
/**
 * Startpagina van het portaal: Eerstvolgende arbeid, Mededelingen / Lief en Leed & Snelkoppelingen.
 *
 * @var array $currentUser
 * @var array $activeLodge
 * @var array $ownEvents
 * @var array $visitorEvents
 * @var array $members
 * @var array $documents
 * @var array $announcements
 */
$nextEvent = $ownEvents[0] ?? null;
?>
<div class="stack-lg">
  <!-- 1. Eerstvolgende Arbeid -->
  <section>
    <div class="flex-between mb-3">
      <h2 class="mb-0" style="font-size: 1.55rem; color: var(--navy);">Eerstvolgende Arbeid van uw Loge</h2>
      <a href="/?tab=werkplanken" class="btn btn-sm btn-outline">
        Bekijk volledige agenda (<?= count($ownEvents) ?>) →
      </a>
    </div>

    <?php if ($nextEvent): ?>
      <?php
      $event = $nextEvent;
      $returnTab = 'start';
      $showLodgeBadge = false;
      $defaultExpanded = false;
      require __DIR__ . '/partials/event_card.php';
      ?>
    <?php else: ?>
      <div class="card text-muted">
        Er staan momenteel geen aankomende bijeenkomsten gepland voor uw graad in Loge <?= e($activeLodge['name']) ?>.
      </div>
    <?php endif; ?>
  </section>

  <!-- 2. Mededelingen & Lief en Leed (Uitsluitend eigen loge!) -->
  <section>
    <h2 style="font-size: 1.45rem; color: var(--navy); margin-bottom: 0.85rem;">
      📣 Mededelingen &amp; Lief en Leed (Loge <?= e($activeLodge['name']) ?>)
    </h2>

    <?php if (empty($announcements)): ?>
      <div class="card text-muted text-sm">Nog geen mededelingen geplaatst door het bestuur of secretariaat.</div>
    <?php else: ?>
      <div class="grid-2">
        <?php foreach ($announcements as $ann): ?>
          <article class="card">
            <div class="flex-row mb-2">
              <span class="badge <?= $ann['category'] === 'Lief en Leed' ? 'badge-gold' : 'badge-navy' ?>">
                <?= e($ann['category']) ?>
              </span>
              <?php if ((int) $ann['is_pinned'] === 1): ?>
                <span class="badge badge-slate">📌 Vastgepind</span>
              <?php endif; ?>
            </div>
            <h3 style="font-size: 1.18rem; color: var(--text-main); margin-bottom: 0.45rem;">
              <?= e($ann['title']) ?>
            </h3>
            <p class="text-sm mb-2" style="white-space: pre-line; color: #334155;">
              <?= e($ann['body']) ?>
            </p>
            <div class="text-xs text-muted">
              Geplaatst door <strong><?= e($ann['author_name']) ?></strong>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </section>

  <!-- 3. Drie overzichtelijke snelkoppelingen -->
  <section class="grid-3">
    <a href="/?tab=visiteren" class="card" style="text-decoration: none; color: inherit;">
      <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">🧭</div>
      <h3 style="font-size: 1.15rem; color: var(--navy); margin-bottom: 0.3rem;">Visiteren bij Zusterloges</h3>
      <p class="text-sm text-muted mb-0">
        Bekijk <strong><?= count($visitorEvents) ?></strong> opengestelde avonden in het land voor uw graad.
      </p>
    </a>

    <a href="/?tab=leden" class="card" style="text-decoration: none; color: inherit;">
      <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">👥</div>
      <h3 style="font-size: 1.15rem; color: var(--navy); margin-bottom: 0.3rem;">Wie is wie (<?= count($members) ?> broeders)</h3>
      <p class="text-sm text-muted mb-0">
        Officieren, pasfoto's, telefoonnummers en e-mailadressen van uw eigen loge.
      </p>
    </a>

    <a href="/?tab=bouwstukken" class="card" style="text-decoration: none; color: inherit;">
      <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">📖</div>
      <h3 style="font-size: 1.15rem; color: var(--navy); margin-bottom: 0.3rem;">Bouwstukken &amp; Stukken (<?= count($documents) ?>)</h3>
      <p class="text-sm text-muted mb-0">
        Rustig teruglezen op uw computer, tablet of telefoon.
      </p>
    </a>
  </section>
</div>
