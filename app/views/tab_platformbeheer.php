<?php
/**
 * Platformbeheer — UITSLUITEND zichtbaar voor Platformbeheerders (`is_platform_admin = 1`).
 *
 * Ontwerpprincipe (AVG & broederlijke discretie):
 * - Alleen de Platformbeheerder kan een NIEUWE loge op het platform aanmaken en haar eerste Secretaris aanwijzen.
 * - De Platformbeheerder ziet hier het overzicht van aangesloten loges en hun Secretaris(sen),
 *   zónder in de besloten bouwstukken of volledige ledenlijsten van andere loges te kijken.
 *
 * @var array $currentUser
 */
$allLodges = get_all_lodges_for_platform_admin($currentUser);
$allUsersForAdmin = get_platform_admins_list($currentUser);
?>
<div class="stack-lg">
  <div class="card" style="border-left: 6px solid var(--gold);">
    <div class="badge badge-gold mb-2">🏛️ Overkoepelend Platformbeheer</div>
    <h2 style="font-size: 1.65rem; color: var(--navy); margin-bottom: 0.35rem;">
      Aangesloten Loges &amp; Secretarissen beheren
    </h2>
    <p class="text-sm text-muted mb-0">
      Alleen een <strong>Platformbeheerder</strong> kan op dit scherm nieuwe loges aansluiten en hun eerste Secretaris aanwijzen. Uit oogpunt van vrijmetselaars-discretie worden interne bouwstukken en volledige ledenlijsten van andere loges hier bewust <strong>niet</strong> getoond: elke loge beheert haar eigen huishouden zelfstandig via haar Secretaris.
    </p>
  </div>

  <!-- 1. Nieuwe Loge aanmaken + Eerste Secretaris toewijzen -->
  <section class="card">
    <h3 style="font-size: 1.4rem; color: var(--navy); margin-bottom: 0.3rem;">
      ➕ Nieuwe Loge aanmaken op het platform
    </h3>
    <p class="text-sm text-muted mb-4">
      Vul de gegevens van de loge én de naam + het e-mailadres van haar eerste Secretaris in. Deze Secretaris kan daarna direct zonder wachtwoord inloggen om de overige broeders en werkplanken van zijn loge toe te voegen.
    </p>

    <form method="post" action="/">
      <?= csrf_field() ?>
      <input type="hidden" name="form_action" value="admin_create_lodge">
      <input type="hidden" id="new-lodge-logo-hidden" name="logo_url" value="">

      <div class="card-muted flex-row mb-4">
        <img
          id="new-lodge-logo-preview"
          src="/icon.svg"
          data-placeholder="/icon.svg"
          alt="Voorbeeld embleem"
          style="width: 4.25rem; height: 4.25rem; border-radius: 12px; object-fit: cover; border: 2px solid var(--border-warm); background: #fff;"
        >
        <div>
          <div class="form-label mb-1">Embleem / foto van de nieuwe Loge (optioneel)</div>
          <div class="text-xs text-muted mb-2">Kan nu direct worden gekozen of later door de Secretaris van de loge zelf worden geüpload.</div>
          <div class="flex-row">
            <label class="btn btn-sm btn-primary" style="cursor: pointer;">
              📷 Kies loge-afbeelding
              <input
                type="file"
                accept="image/*"
                data-image-upload="new-lodge-logo"
                data-max-size="300"
                data-preserve-alpha="1"
                style="display: none;"
              >
            </label>
            <button type="button" class="btn btn-sm btn-neutral" data-clear-image="new-lodge-logo">Wissen</button>
          </div>
        </div>
      </div>

      <div class="grid-3">
        <div class="form-group">
          <label class="form-label">Logenummer *</label>
          <input type="number" name="number" min="1" required placeholder="bijv. 74" class="input">
        </div>
        <div class="form-group">
          <label class="form-label">Naam van de Loge (zonder 'Loge') *</label>
          <input type="text" name="name" required placeholder="bijv. La Paix" class="input">
        </div>
        <div class="form-group">
          <label class="form-label">Oosten (Stad) *</label>
          <input type="text" name="city" required placeholder="bijv. Amsterdam" class="input">
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Vaste vergaderavond</label>
          <input type="text" name="meeting_day" value="Woensdagavond (aanvang 20:00 uur)" class="input">
        </div>
        <div class="form-group">
          <label class="form-label">Logekleur</label>
          <select name="accent_color" class="select">
            <option value="#1B365D">Koningsblauw (#1B365D)</option>
            <option value="#7F1D1D">Bordeauxrood (#7F1D1D)</option>
            <option value="#14532D">Bosgroen (#14532D)</option>
            <option value="#4C1D95">Purper (#4C1D95)</option>
            <option value="#78350F">Warm Brons (#78350F)</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Adres van het Logegebouw *</label>
        <input type="text" name="address" required placeholder="bijv. Vondelstraat 39, 1054 GJ Amsterdam" class="input">
      </div>

      <div class="form-group">
        <label class="form-label">Korte omschrijving (optioneel)</label>
        <input type="text" name="description" placeholder="Korte toelichting over de werkplaats..." class="input">
      </div>

      <div class="card-muted mb-4" style="background: #fffbeb; border-color: #f59e0b;">
        <div style="font-weight: 700; color: #78350f; margin-bottom: 0.5rem;">
          🔑 Eerste Secretaris van deze nieuwe Loge aanwijzen *
        </div>
        <div class="grid-2">
          <div>
            <label class="form-label text-xs">Naam van de Secretaris *</label>
            <input type="text" name="secretary_name" required placeholder="bijv. Br. P. van Leeuwen" class="input">
          </div>
          <div>
            <label class="form-label text-xs">E-mailadres van de Secretaris *</label>
            <input type="email" name="secretary_email" required placeholder="secretaris@lapaix.loge" class="input">
          </div>
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-lg">
        Loge aanmaken &amp; Secretaris activeren →
      </button>
    </form>
  </section>

  <!-- 2. Overzicht van alle aangesloten loges op het platform -->
  <section class="card">
    <h3 style="font-size: 1.4rem; color: var(--navy); margin-bottom: 0.85rem;">
      Aangesloten Loges op dit platform (<?= count($allLodges) ?>)
    </h3>

    <div class="stack-md">
      <?php foreach ($allLodges as $l): ?>
        <div class="card-muted" style="border-left: 5px solid <?= e($l['accent_color'] ?: '#1B365D') ?>;">
          <div class="flex-between">
            <div class="flex-row">
              <img
                src="<?= e(!empty($l['logo_url']) ? $l['logo_url'] : '/icon.svg') ?>"
                alt=""
                style="width: 3.4rem; height: 3.4rem; border-radius: 10px; object-fit: cover; border: 1px solid #cbd5e1; background: #fff;"
              >
              <div>
                <div style="font-weight: 700; font-size: 1.15rem; color: var(--navy);">
                  Loge <?= e($l['name']) ?> Nr. <?= (int) $l['number'] ?> — Oosten <?= e($l['city']) ?>
                </div>
                <div class="text-xs text-muted">
                  <?= e($l['meeting_day']) ?> · <?= e($l['address']) ?>
                </div>
                <div class="text-xs mt-1">
                  <strong>Secretaris(sen):</strong>
                  <?php if (empty($l['secretaries'])): ?>
                    <span class="badge badge-red">Geen secretaris gekoppeld!</span>
                  <?php else: ?>
                    <?php foreach ($l['secretaries'] as $sec): ?>
                      <span class="badge badge-navy"><?= e($sec['full_name']) ?> (<?= e($sec['email']) ?>)</span>
                    <?php endforeach; ?>
                  <?php endif; ?>
                </div>
              </div>
            </div>

            <div class="flex-row">
              <span class="badge badge-slate"><?= (int) $l['member_count'] ?> leden</span>
              <span class="badge badge-slate"><?= (int) $l['event_count'] ?> werkplanken</span>
            </div>
          </div>

          <details class="mt-3">
            <summary class="text-xs" style="cursor: pointer; font-weight: 700; color: var(--navy);">
              ⚙️ Nieuwe Secretaris toewijzen (bijv. bij bestuurswissel) of basisgegevens wijzigen ▾
            </summary>
            <div class="grid-2 mt-3">
              <!-- Extra / nieuwe secretaris koppelen -->
              <form method="post" action="/" class="card" style="padding: 1rem;">
                <?= csrf_field() ?>
                <input type="hidden" name="form_action" value="admin_assign_secretary">
                <input type="hidden" name="lodge_id" value="<?= e($l['id']) ?>">
                <div class="form-label text-sm mb-2">Secretaris aan Loge <?= e($l['name']) ?> toewijzen</div>
                <div class="form-group">
                  <input type="text" name="secretary_name" required placeholder="Naam broeder (bijv. Br. A. Jansen)" class="input" style="padding: 0.5rem;">
                </div>
                <div class="form-group">
                  <input type="email" name="secretary_email" required placeholder="E-mailadres secretaris" class="input" style="padding: 0.5rem;">
                </div>
                <button type="submit" class="btn btn-sm btn-primary">Secretaris koppelen</button>
              </form>

              <!-- Basisgegevens van de loge aanpassen -->
              <form method="post" action="/" class="card" style="padding: 1rem;">
                <?= csrf_field() ?>
                <input type="hidden" name="form_action" value="admin_update_lodge">
                <input type="hidden" name="lodge_id" value="<?= e($l['id']) ?>">
                <input type="hidden" name="logo_url" value="<?= e($l['logo_url']) ?>">
                <div class="form-label text-sm mb-2">Basisgegevens Loge <?= e($l['name']) ?></div>
                <div class="grid-2">
                  <div class="form-group">
                    <input type="text" name="name" value="<?= e($l['name']) ?>" required class="input" style="padding: 0.5rem;">
                  </div>
                  <div class="form-group">
                    <input type="text" name="city" value="<?= e($l['city']) ?>" required class="input" style="padding: 0.5rem;">
                  </div>
                </div>
                <div class="form-group">
                  <input type="text" name="meeting_day" value="<?= e($l['meeting_day']) ?>" required class="input" style="padding: 0.5rem;">
                </div>
                <div class="form-group">
                  <input type="text" name="address" value="<?= e($l['address']) ?>" required class="input" style="padding: 0.5rem;">
                </div>
                <input type="hidden" name="accent_color" value="<?= e($l['accent_color']) ?>">
                <button type="submit" class="btn btn-sm btn-outline">Gegevens bijwerken</button>
              </form>
            </div>
          </details>
        </div>
      <?php endforeach; ?>
    </div>
  </section>

  <!-- 3. Platformbeheerders aanwijzen -->
  <section class="card">
    <h3 style="font-size: 1.3rem; color: var(--navy); margin-bottom: 0.3rem;">
      🛡️ Platformbeheerders
    </h3>
    <p class="text-sm text-muted mb-3">
      Hier ziet u wie Platformbeheerder-rechten heeft om nieuwe loges aan te sluiten.
    </p>

    <div class="table-wrap">
      <table class="clean-table">
        <thead>
          <tr>
            <th>Broeder</th>
            <th>Moederloge</th>
            <th>Rol op platform</th>
            <th>Actie</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($allUsersForAdmin as $u): ?>
            <tr>
              <td>
                <strong><?= e($u['full_name']) ?></strong><br>
                <span class="text-xs text-muted"><?= e($u['email']) ?></span>
              </td>
              <td class="text-sm">
                Loge <?= e($u['lodge_name']) ?> Nr. <?= (int) $u['lodge_number'] ?> (<?= e($u['lodge_city']) ?>)
              </td>
              <td>
                <?php if ((int) $u['is_platform_admin'] === 1): ?>
                  <span class="badge badge-gold">🏛️ Platformbeheerder</span>
                <?php else: ?>
                  <span class="text-xs text-muted">Geen platformbeheerder</span>
                <?php endif; ?>
              </td>
              <td>
                <?php if ($u['id'] === $currentUser['id']): ?>
                  <span class="text-xs text-muted">(Uzelf)</span>
                <?php else: ?>
                  <form method="post" action="/" style="margin: 0;">
                    <?= csrf_field() ?>
                    <input type="hidden" name="form_action" value="admin_toggle_platform_admin">
                    <input type="hidden" name="user_id" value="<?= e($u['id']) ?>">
                    <input type="hidden" name="make_admin" value="<?= (int) $u['is_platform_admin'] === 1 ? '0' : '1' ?>">
                    <button type="submit" class="btn btn-sm <?= (int) $u['is_platform_admin'] === 1 ? 'btn-danger-outline' : 'btn-outline' ?>">
                      <?= (int) $u['is_platform_admin'] === 1 ? 'Rechten intrekken' : 'Maak Platformbeheerder' ?>
                    </button>
                  </form>
                <?php endif; ?>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </section>
</div>
