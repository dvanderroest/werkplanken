<?php
/**
 * Ledenlijst "Wie is wie" — strikt beperkt tot leden van de eigen actieve loge (AVG & discretie).
 *
 * @var array $activeLodge
 * @var array $members
 */
$officers = array_values(array_filter($members, static fn(array $m): bool => !empty($m['officer_title'])));
$regulars = array_values(array_filter($members, static fn(array $m): bool => empty($m['officer_title'])));
?>
<div class="stack-lg">
  <div class="card flex-between">
    <div style="max-width: 40rem;">
      <h2 style="font-size: 1.6rem; color: var(--navy); margin-bottom: 0.35rem;">
        Wie is wie — Broederlijst Loge <?= e($activeLodge['name']) ?> Nr. <?= (int) $activeLodge['number'] ?>
      </h2>
      <p class="text-sm text-muted mb-0">
        🔒 Uit oogpunt van broederlijke discretie en de AVG is deze ledenlijst <strong>uitsluitend zichtbaar voor leden van Loge <?= e($activeLodge['name']) ?></strong>.
      </p>
    </div>

    <div style="min-width: 16rem; flex: 1; max-width: 22rem;">
      <label for="member-search" class="form-label text-xs">Zoek op naam, functie of woonplaats</label>
      <input
        id="member-search"
        type="search"
        placeholder="bijv. Secretaris, Bloemendaal..."
        data-filter-target="leden"
        class="input"
      >
    </div>
  </div>

  <?php if (!empty($officers)): ?>
    <section>
      <h3 style="font-size: 1.3rem; color: var(--navy); margin-bottom: 0.75rem;">Bestuur &amp; Officieren</h3>
      <div class="grid-2">
        <?php foreach ($officers as $m): ?>
          <article
            class="card"
            data-filter-item="leden"
            data-filter-text="<?= e($m['full_name'] . ' ' . ($m['officer_title'] ?? '') . ' ' . $m['city'] . ' ' . $m['email']) ?>"
          >
            <div class="flex-row" style="align-items: flex-start;">
              <?php if (!empty($m['avatar_url'])): ?>
                <img src="<?= e($m['avatar_url']) ?>" alt="<?= e($m['full_name']) ?>" class="avatar-lg">
              <?php else: ?>
                <div class="avatar-lg avatar-initials"><?= e(user_initials($m['full_name'])) ?></div>
              <?php endif; ?>

              <div style="flex: 1; min-width: 0;">
                <span class="badge badge-navy mb-2"><?= e($m['officer_title']) ?></span>
                <div style="font-weight: 700; font-size: 1.12rem;"><?= e($m['full_name']) ?></div>
                <div class="text-xs text-muted mt-1">
                  <strong><?= e(degree_short_label((int) $m['degree'])) ?></strong>
                  <?php if (!empty($m['city'])): ?> · 📍 <?= e($m['city']) ?><?php endif; ?>
                  <?php if (!empty($m['joined_year'])): ?> · Lid sinds <?= (int) $m['joined_year'] ?><?php endif; ?>
                </div>

                <div class="flex-row mt-3">
                  <?php if (!empty($m['phone'])): ?>
                    <a href="tel:<?= e($m['phone']) ?>" class="btn btn-sm btn-neutral">📞 <?= e($m['phone']) ?></a>
                  <?php endif; ?>
                  <a href="mailto:<?= e($m['email']) ?>" class="btn btn-sm btn-neutral">✉️ <?= e($m['email']) ?></a>
                </div>
              </div>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    </section>
  <?php endif; ?>

  <?php if (!empty($regulars)): ?>
    <section>
      <h3 style="font-size: 1.3rem; color: var(--navy); margin-bottom: 0.75rem;">Broeders</h3>
      <div class="grid-2">
        <?php foreach ($regulars as $m): ?>
          <article
            class="card"
            data-filter-item="leden"
            data-filter-text="<?= e($m['full_name'] . ' ' . $m['city'] . ' ' . $m['email']) ?>"
          >
            <div class="flex-row" style="align-items: flex-start;">
              <?php if (!empty($m['avatar_url'])): ?>
                <img src="<?= e($m['avatar_url']) ?>" alt="<?= e($m['full_name']) ?>" class="avatar-lg">
              <?php else: ?>
                <div class="avatar-lg avatar-initials"><?= e(user_initials($m['full_name'])) ?></div>
              <?php endif; ?>

              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 700; font-size: 1.12rem;"><?= e($m['full_name']) ?></div>
                <div class="text-xs text-muted mt-1">
                  <strong><?= e(degree_short_label((int) $m['degree'])) ?></strong>
                  <?php if (!empty($m['city'])): ?> · 📍 <?= e($m['city']) ?><?php endif; ?>
                  <?php if (!empty($m['joined_year'])): ?> · Lid sinds <?= (int) $m['joined_year'] ?><?php endif; ?>
                </div>

                <div class="flex-row mt-3">
                  <?php if (!empty($m['phone'])): ?>
                    <a href="tel:<?= e($m['phone']) ?>" class="btn btn-sm btn-neutral">📞 <?= e($m['phone']) ?></a>
                  <?php endif; ?>
                  <a href="mailto:<?= e($m['email']) ?>" class="btn btn-sm btn-neutral">✉️ <?= e($m['email']) ?></a>
                </div>
              </div>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    </section>
  <?php endif; ?>
</div>
