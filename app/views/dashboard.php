<?php
/**
 * Hoofdportaal voor ingelogde broeders.
 *
 * @var array      $currentUser
 * @var array      $activeLodge
 * @var bool       $canManage
 * @var bool       $isPlatformAdmin
 * @var array      $ownEvents
 * @var array      $visitorEvents
 * @var array      $members
 * @var array      $documents
 * @var array      $announcements
 * @var array|null $flash
 */

$allowedTabs = ['start', 'werkplanken', 'visiteren', 'leden', 'bouwstukken'];
if ($canManage) {
    $allowedTabs[] = 'secretariaat';
}
if ($isPlatformAdmin) {
    $allowedTabs[] = 'platformbeheer';
}

$activeTab = (string) ($_GET['tab'] ?? 'start');
if (!in_array($activeTab, $allowedTabs, true)) {
    $activeTab = 'start';
}

$activeMembership = null;
foreach ($currentUser['memberships'] as $m) {
    if ($m['lodge_id'] === $activeLodge['id']) {
        $activeMembership = $m;
        break;
    }
}

$headerColor = !empty($activeLodge['accent_color']) ? $activeLodge['accent_color'] : '#1B365D';
$openProfileModal = !empty($_GET['profiel']);
?>
<header class="portal-header no-print" style="background-color: <?= e($headerColor) ?>;">
  <div class="container">
    <div class="portal-header-top">
      <!-- Links: Loge-embleem, Naam & eventuele Logewisselaar (bij nevenlidmaatschap) -->
      <div class="lodge-identity">
        <img
          src="<?= e(!empty($activeLodge['logo_url']) ? $activeLodge['logo_url'] : '/icon.svg') ?>"
          alt="Embleem van Loge <?= e($activeLodge['name']) ?>"
          class="lodge-emblem"
        >
        <div>
          <div class="lodge-kicker">
            Oosten <?= e($activeLodge['city']) ?> · <?= e($activeLodge['meeting_day']) ?>
          </div>
          <h1 class="lodge-title">
            Loge <?= e($activeLodge['name']) ?> Nr. <?= (int) $activeLodge['number'] ?>
          </h1>

          <?php if (count($currentUser['memberships']) > 1): ?>
            <form method="post" action="/" class="lodge-switcher-box">
              <?= csrf_field() ?>
              <input type="hidden" name="form_action" value="auth_switch_lodge">
              <label for="lodge-switcher" class="text-xs" style="font-weight: 700; color: rgba(255,255,255,0.92);">
                🏛️ Wissel tussen uw loges:
              </label>
              <select
                id="lodge-switcher"
                name="lodge_id"
                class="lodge-switcher-select"
                onchange="this.form.submit()"
              >
                <?php foreach ($currentUser['memberships'] as $m): ?>
                  <option value="<?= e($m['lodge_id']) ?>" <?= $m['lodge_id'] === $activeLodge['id'] ? 'selected' : '' ?>>
                    Loge <?= e($m['lodge_name']) ?> Nr. <?= (int) $m['lodge_number'] ?> (<?= e($m['lodge_city']) ?>)
                  </option>
                <?php endforeach; ?>
              </select>
            </form>
          <?php endif; ?>
        </div>
      </div>

      <!-- Rechts: Profielkaart met Pasfoto, Graad, Mijn gegevens & Uitloggen -->
      <div class="user-box">
        <?php if (!empty($currentUser['avatar_url'])): ?>
          <img src="<?= e($currentUser['avatar_url']) ?>" alt="<?= e($currentUser['full_name']) ?>" class="avatar">
        <?php else: ?>
          <div class="avatar avatar-initials"><?= e(user_initials($currentUser['full_name'])) ?></div>
        <?php endif; ?>

        <div style="margin-right: 0.35rem;">
          <div style="font-weight: 700; line-height: 1.25;">
            <?= e($currentUser['full_name']) ?>
          </div>
          <div class="text-xs" style="color: #fde68a; font-weight: 700;">
            <?= e(degree_label((int) $currentUser['degree'])) ?>
            <?php if (!empty($activeMembership['officer_title'])): ?>
              · <?= e($activeMembership['officer_title']) ?>
            <?php endif; ?>
            <?php if ($isPlatformAdmin): ?>
              · <span style="text-decoration: underline;">Platformbeheerder</span>
            <?php endif; ?>
          </div>
        </div>

        <button type="button" class="btn btn-sm btn-subtle" data-open-modal="profile-modal">
          ⚙️ Mijn gegevens
        </button>

        <form method="post" action="/" style="margin: 0;">
          <?= csrf_field() ?>
          <input type="hidden" name="form_action" value="auth_logout">
          <button type="submit" class="btn btn-sm btn-subtle">
            ↪ Uitloggen
          </button>
        </form>
      </div>
    </div>

    <!-- Navigatie-tabbladen -->
    <nav class="portal-nav" aria-label="Hoofdnavigatie">
      <a href="/?tab=start" class="nav-tab <?= $activeTab === 'start' ? 'active' : '' ?>">
        🏠 Start &amp; Nieuws
      </a>
      <a href="/?tab=werkplanken" class="nav-tab <?= $activeTab === 'werkplanken' ? 'active' : '' ?>">
        📅 Werkplanken (<?= count($ownEvents) ?>)
      </a>
      <a href="/?tab=visiteren" class="nav-tab <?= $activeTab === 'visiteren' ? 'active' : '' ?>">
        🧭 Visiteren (<?= count($visitorEvents) ?>)
      </a>
      <a href="/?tab=leden" class="nav-tab <?= $activeTab === 'leden' ? 'active' : '' ?>">
        👥 Wie is wie
      </a>
      <a href="/?tab=bouwstukken" class="nav-tab <?= $activeTab === 'bouwstukken' ? 'active' : '' ?>">
        📖 Bouwstukken
      </a>

      <?php if ($canManage): ?>
        <a href="/?tab=secretariaat" class="nav-tab <?= $activeTab === 'secretariaat' ? 'active' : '' ?>">
          🛡️ Secretariaat
        </a>
      <?php endif; ?>

      <?php if ($isPlatformAdmin): ?>
        <a href="/?tab=platformbeheer" class="nav-tab nav-tab-admin <?= $activeTab === 'platformbeheer' ? 'active' : '' ?>">
          🏛️ Platformbeheer
        </a>
      <?php endif; ?>
    </nav>
  </div>
</header>

<main class="container" style="padding-top: 1.65rem; padding-bottom: 2.5rem;">
  <?php if ($flash): ?>
    <div role="alert" class="alert no-print <?= $flash['type'] === 'error' ? 'alert-error' : 'alert-success' ?>">
      <?= e($flash['message']) ?>
    </div>
  <?php endif; ?>

  <?php
  switch ($activeTab) {
      case 'werkplanken':
          require __DIR__ . '/tab_werkplanken.php';
          break;
      case 'visiteren':
          require __DIR__ . '/tab_visiteren.php';
          break;
      case 'leden':
          require __DIR__ . '/tab_leden.php';
          break;
      case 'bouwstukken':
          require __DIR__ . '/tab_bouwstukken.php';
          break;
      case 'secretariaat':
          if ($canManage) {
              require __DIR__ . '/tab_secretariaat.php';
          }
          break;
      case 'platformbeheer':
          if ($isPlatformAdmin) {
              require __DIR__ . '/tab_platformbeheer.php';
          }
          break;
      case 'start':
      default:
          require __DIR__ . '/tab_start.php';
          break;
  }
  ?>
</main>

<!-- Modal: Mijn eigen contactgegevens, pasfoto & standaard dieetwens -->
<div id="profile-modal" class="modal-backdrop no-print <?= $openProfileModal ? 'open' : '' ?>" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
  <div class="modal-panel">
    <div class="flex-between mb-3">
      <div>
        <h2 id="profile-modal-title" class="mb-0" style="color: var(--navy);">Mijn gegevens &amp; Pasfoto</h2>
        <div class="text-xs text-muted mt-1">
          Zichtbaar voor de broeders van uw eigen loge onder "Wie is wie".
        </div>
      </div>
      <button type="button" class="btn btn-sm btn-neutral" data-close-modal="profile-modal">Sluiten ✕</button>
    </div>

    <form method="post" action="/">
      <?= csrf_field() ?>
      <input type="hidden" name="form_action" value="profile_save">
      <input type="hidden" name="return_tab" value="<?= e($activeTab) ?>">
      <input type="hidden" id="profile-photo-hidden" name="avatar_url" value="<?= e($currentUser['avatar_url']) ?>">

      <div class="card-muted flex-row mb-3">
        <img
          id="profile-photo-preview"
          src="<?= e(!empty($currentUser['avatar_url']) ? $currentUser['avatar_url'] : '/icon.svg') ?>"
          data-placeholder="/icon.svg"
          alt="Profielfoto"
          class="avatar-lg"
        >
        <div style="flex: 1;">
          <div class="form-label mb-1">Uw profielfoto</div>
          <div class="text-xs text-muted mb-2">
            Wordt automatisch netjes vierkant bijgesneden en verkleind in uw browser.
          </div>
          <div class="flex-row">
            <label class="btn btn-sm btn-primary" style="cursor: pointer;">
              📷 Kies foto
              <input
                type="file"
                accept="image/*"
                data-image-upload="profile-photo"
                data-max-size="280"
                data-preserve-alpha="0"
                style="display: none;"
              >
            </label>
            <button type="button" class="btn btn-sm btn-danger-outline" data-clear-image="profile-photo">
              Foto verwijderen
            </button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Naam &amp; Graad</label>
        <div class="card-muted text-sm">
          <strong><?= e($currentUser['full_name']) ?></strong> · <?= e(degree_label((int) $currentUser['degree'])) ?><br>
          <span class="text-xs text-muted"><?= e($currentUser['email']) ?></span>
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label for="prof-phone" class="form-label">Telefoonnummer</label>
          <input id="prof-phone" type="tel" name="phone" value="<?= e($currentUser['phone']) ?>" placeholder="bijv. 06-12345678" class="input">
        </div>
        <div class="form-group">
          <label for="prof-city" class="form-label">Woonplaats</label>
          <input id="prof-city" type="text" name="city" value="<?= e($currentUser['city']) ?>" placeholder="bijv. Haarlem" class="input">
        </div>
      </div>

      <div class="form-group">
        <label for="prof-diet" class="form-label">Standaard dieetwens voor het Broedermaal</label>
        <input id="prof-diet" type="text" name="dietary_default" value="<?= e($currentUser['dietary_default']) ?>" placeholder="bijv. Vegetarisch, glutenvrij, geen noten..." class="input">
        <div class="form-hint">Wordt automatisch alvast ingevuld wanneer u zich aanmeldt voor een Broedermaal.</div>
      </div>

      <button type="submit" class="btn btn-primary btn-lg btn-block">
        Gegevens opslaan
      </button>
    </form>
  </div>
</div>
