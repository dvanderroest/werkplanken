<?php
/**
 * Archief van Bouwstukken & Documenten — uitsluitend eigen loge én maximaal eigen graad!
 *
 * @var array $currentUser
 * @var array $activeLodge
 * @var array $documents
 */
$readingId = trim((string) ($_GET['lees'] ?? ''));
$readingDoc = null;
if ($readingId !== '') {
    foreach ($documents as $doc) {
        if ($doc['id'] === $readingId) {
            $readingDoc = $doc;
            break;
        }
    }
}
?>
<?php if ($readingDoc): ?>
  <article class="card" style="max-width: 48rem; margin: 0 auto; padding: 2rem;">
    <a href="/?tab=bouwstukken" class="btn btn-sm btn-neutral mb-4">
      ← Terug naar overzicht Bouwstukken
    </a>

    <div class="flex-row mb-2">
      <span class="badge badge-navy"><?= e($readingDoc['category']) ?></span>
      <span class="badge badge-gold">🔒 <?= e(degree_short_label((int) $readingDoc['min_degree'])) ?></span>
      <span class="text-xs text-muted"><?= e(format_dutch_date((string) $readingDoc['published_date'])) ?></span>
    </div>

    <h2 style="font-size: 1.9rem; color: var(--navy); margin-bottom: 0.35rem;">
      <?= e($readingDoc['title']) ?>
    </h2>
    <div class="text-sm text-muted mb-4" style="padding-bottom: 0.85rem; border-bottom: 1px solid #e2e8f0; font-weight: 600;">
      Door <?= e($readingDoc['author']) ?>
    </div>

    <div class="serif" style="font-size: 1.12rem; line-height: 1.75; white-space: pre-line;">
      <?= e($readingDoc['content']) ?>
    </div>
  </article>
<?php else: ?>
  <div class="stack-lg">
    <div class="card flex-between">
      <div style="max-width: 40rem;">
        <h2 style="font-size: 1.6rem; color: var(--navy); margin-bottom: 0.35rem;">
          📖 Bouwstukken &amp; Documenten — Loge <?= e($activeLodge['name']) ?>
        </h2>
        <p class="text-sm text-muted mb-0">
          Beveiligd op uw graad (<strong><?= e(degree_label((int) $currentUser['degree'])) ?></strong>). Klik op een stuk om het in een rustige boek-opmaak te lezen.
        </p>
      </div>

      <div style="min-width: 16rem; flex: 1; max-width: 22rem;">
        <label for="doc-search" class="form-label text-xs">Zoek in bouwstukken</label>
        <input id="doc-search" type="search" placeholder="bijv. Ruwe Steen, Stilte..." data-filter-target="docs" class="input">
      </div>
    </div>

    <?php if (empty($documents)): ?>
      <div class="card text-muted">Er staan nog geen bouwstukken of documenten in het archief van deze loge.</div>
    <?php else: ?>
      <div class="grid-2">
        <?php foreach ($documents as $doc): ?>
          <article
            class="card"
            style="display: flex; flex-direction: column; justify-content: space-between;"
            data-filter-item="docs"
            data-filter-text="<?= e($doc['title'] . ' ' . $doc['author'] . ' ' . $doc['summary'] . ' ' . $doc['category']) ?>"
          >
            <div>
              <div class="flex-row mb-2">
                <span class="badge badge-navy"><?= e($doc['category']) ?></span>
                <span class="badge badge-gold"><?= e(degree_short_label((int) $doc['min_degree'])) ?></span>
              </div>
              <h3 style="font-size: 1.25rem; color: var(--navy); margin-bottom: 0.3rem;">
                <?= e($doc['title']) ?>
              </h3>
              <div class="text-xs text-muted mb-2" style="font-weight: 700;">
                <?= e($doc['author']) ?> · <?= e(format_dutch_date((string) $doc['published_date'])) ?>
              </div>
              <p class="text-sm text-muted mb-3"><?= e($doc['summary']) ?></p>
            </div>

            <a href="/?tab=bouwstukken&amp;lees=<?= urlencode($doc['id']) ?>" class="btn btn-outline btn-block">
              Bouwstuk rustig lezen →
            </a>
          </article>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>
<?php endif; ?>
