<?php
/** @var array|null $flash */
$step = (($_GET['stap'] ?? '') === 'code' && !empty($_SESSION['login_pending_email'])) ? 'code' : 'email';
$pendingEmail = (string) ($_SESSION['login_pending_email'] ?? '');
$devCode      = $_SESSION['login_dev_preview_code'] ?? null;
$devMagicUrl  = $_SESSION['login_dev_preview_magic'] ?? null;
$devMailbox   = is_dev_mailbox_enabled();

$demoAccounts = [
    [
        'email'      => 'beheer@werkplanken.loge',
        'name'       => 'Br. Eduard van Pallandt',
        'avatar'     => '/demo/usr-eduard.jpg',
        'lodge_logo' => '/demo/loge-ars-regia.jpg',
        'badge'      => 'Platformbeheerder · Meester (3e graad)',
        'detail'     => 'Kan nieuwe loges aansluiten op het platform en hun eerste Secretaris aanwijzen.',
        'is_admin'   => true,
    ],
    [
        'email'      => 'secretaris@noorderster.loge',
        'name'       => 'Br. Willem Vermeer',
        'avatar'     => '/demo/usr-willem.jpg',
        'lodge_logo' => '/demo/loge-noorderster.jpg',
        'badge'      => 'Loge-Secretaris · Meester (3e graad)',
        'detail'     => 'Beheert uitsluitend Loge De Noorderster (en is gewoon nevenlid bij Studieloge Ars Regia).',
        'is_admin'   => false,
    ],
    [
        'email'      => 'gezel@noorderster.loge',
        'name'       => 'Br. Thomas Bakker',
        'avatar'     => '/demo/usr-thomas.jpg',
        'lodge_logo' => '/demo/loge-noorderster.jpg',
        'badge'      => 'Gezel (2e graad)',
        'detail'     => 'Loge De Noorderster · Ziet 1e & 2e graad, géén Meesterarbeid.',
        'is_admin'   => false,
    ],
    [
        'email'      => 'leerling@noorderster.loge',
        'name'       => 'Br. Daan Meijer',
        'avatar'     => '/demo/usr-daan.jpg',
        'lodge_logo' => '/demo/loge-noorderster.jpg',
        'badge'      => 'Leerling (1e graad)',
        'detail'     => 'Loge De Noorderster · Ziet uitsluitend 1e-graads bijeenkomsten & stukken.',
        'is_admin'   => false,
    ],
    [
        'email'      => 'secretaris@concordia.loge',
        'name'       => 'Br. Karel van Dijk',
        'avatar'     => '/demo/usr-karel.jpg',
        'lodge_logo' => '/demo/loge-concordia.jpg',
        'badge'      => 'Loge-Secretaris · Meester (3e graad)',
        'detail'     => 'Zusterloge Concordia Nr. 18 (Utrecht) · Kan visiteren in Haarlem.',
        'is_admin'   => false,
    ],
];
?>
<main class="container-narrow" style="padding-top: 2rem; padding-bottom: 2rem;">
  <div style="text-align: center; margin-bottom: 1.75rem;">
    <div style="display: inline-flex; width: 4.75rem; height: 4.75rem; align-items: center; justify-content: center; border-radius: 16px; background: var(--navy); border: 2px solid var(--gold-bright); box-shadow: 0 4px 10px rgba(0,0,0,0.12); margin-bottom: 0.85rem;">
      <img src="/icon.svg" alt="Passer en Winkelhaak" style="width: 3.6rem; height: 3.6rem;">
    </div>
    <h1 style="font-size: 2.2rem; color: var(--navy); margin-bottom: 0.4rem;">Mijn Werkplank</h1>
    <p class="text-muted" style="font-size: 1.08rem; max-width: 34rem; margin: 0 auto;">
      Het rustige, veilige broederportaal voor werkplanken, broedermaal, ledenlijst en visiteren — zonder wachtwoorden.
    </p>
  </div>

  <?php if ($flash): ?>
    <div role="alert" class="alert <?= $flash['type'] === 'error' ? 'alert-error' : 'alert-success' ?>">
      <?= e($flash['message']) ?>
    </div>
  <?php endif; ?>

  <section class="card">
    <?php if ($step === 'email'): ?>
      <form method="post" action="/">
        <?= csrf_field() ?>
        <input type="hidden" name="form_action" value="auth_request_code">

        <h2 style="font-size: 1.45rem; color: var(--navy); margin-bottom: 0.4rem;">
          Eenvoudig inloggen met uw e-mailadres
        </h2>
        <p class="text-muted text-sm mb-4">
          U hoeft <strong>geen wachtwoord</strong> te weten. Vul het e-mailadres in dat bij uw Secretaris bekend is; u ontvangt direct een e-mail met een duidelijke klikknop én een 6-cijferige code.
        </p>

        <div class="form-group">
          <label for="login-email" class="form-label">Uw e-mailadres</label>
          <input
            id="login-email"
            type="email"
            name="email"
            required
            autocomplete="email"
            placeholder="bijv. j.vandam@noorderster.loge"
            class="input"
          >
        </div>

        <button type="submit" class="btn btn-primary btn-lg btn-block">
          Stuur mijn inlogcode per e-mail →
        </button>

        <div class="card-muted mt-4 text-sm">
          🔒 <strong>Discretie &amp; AVG:</strong> Alleen broeders die door de Secretaris van een aangesloten loge zijn uitgenodigd hebben toegang. Na inloggen blijft u <strong>1 jaar ingelogd</strong> op uw eigen telefoon of computer.
        </div>
      </form>
    <?php else: ?>
      <form method="post" action="/" class="mb-3">
        <?= csrf_field() ?>
        <input type="hidden" name="form_action" value="auth_back_to_email">
        <button type="submit" class="btn btn-sm btn-neutral">← Ander e-mailadres kiezen</button>
      </form>

      <div class="alert alert-success">
        ✓ We hebben een inlogcode en directe kliklink gestuurd naar <strong><?= e($pendingEmail) ?></strong>.
      </div>

      <?php if ($devMailbox && $devCode): ?>
        <div class="card-dashed mb-4" style="background: #fffbeb;">
          <div class="text-xs" style="text-transform: uppercase; font-weight: 800; color: #92400e;">
            Lokale Testmodus — Directe weergave van de verzonden e-mail
          </div>
          <p class="text-sm mt-1 mb-2">
            In productie leest de broeder dit in zijn e-mailprogramma. Klik hieronder om met 1 tik in te loggen of typ de 6 cijfers over:
          </p>
          <div class="flex-row">
            <span class="badge badge-navy" style="font-size: 1.25rem; letter-spacing: 0.25em; padding: 0.45rem 0.9rem; font-family: monospace;">
              <?= e($devCode) ?>
            </span>
            <?php if ($devMagicUrl): ?>
              <a href="<?= e($devMagicUrl) ?>" class="btn btn-primary btn-sm">
                Klik hier voor 1-klik Magic Link →
              </a>
            <?php endif; ?>
          </div>
        </div>
      <?php endif; ?>

      <form method="post" action="/">
        <?= csrf_field() ?>
        <input type="hidden" name="form_action" value="auth_verify_code">
        <input type="hidden" name="email" value="<?= e($pendingEmail) ?>">

        <div class="form-group">
          <label for="login-code" class="form-label">Vul de 6 cijfers uit de e-mail in:</label>
          <input
            id="login-code"
            type="text"
            name="code"
            inputmode="numeric"
            maxlength="6"
            pattern="[0-9]{6}"
            required
            autofocus
            placeholder="000000"
            class="input input-code"
          >
        </div>

        <label class="card-muted flex-row mb-4" style="cursor: pointer;">
          <input type="checkbox" name="keep_signed_in" value="1" checked style="width: 1.25rem; height: 1.25rem;">
          <span class="text-sm">
            <strong>Blijf 1 jaar ingelogd op dit apparaat</strong> (aanbevolen op uw eigen telefoon, tablet of thuiscomputer).
          </span>
        </label>

        <button type="submit" class="btn btn-primary btn-lg btn-block">
          Nu inloggen →
        </button>
      </form>
    <?php endif; ?>
  </section>

  <?php if ($devMailbox): ?>
    <section class="card-dashed mt-4">
      <h2 style="font-size: 1.25rem; color: var(--navy); margin-bottom: 0.3rem;">
        ✨ Snel meekijken per Rol of Graad (Testmodus)
      </h2>
      <p class="text-muted text-sm mb-3">
        Klik op een van de voorbeeld-broeders hieronder om direct met 1 klik te ervaren hoe de app werkt voor de <strong>Platformbeheerder</strong>, een <strong>Loge-Secretaris</strong>, <strong>Gezel</strong>, <strong>Leerling</strong> of <strong>Zusterloge</strong>:
      </p>

      <div class="grid-2">
        <?php foreach ($demoAccounts as $index => $acc): ?>
          <form method="post" action="/" style="<?= $index === 0 ? 'grid-column: 1 / -1;' : '' ?>">
            <?= csrf_field() ?>
            <input type="hidden" name="form_action" value="auth_demo_login">
            <input type="hidden" name="email" value="<?= e($acc['email']) ?>">
            <button type="submit" class="demo-card-btn <?= $acc['is_admin'] ? 'demo-card-admin' : '' ?>">
              <div>
                <div class="flex-row" style="align-items: center;">
                  <img src="<?= e($acc['avatar']) ?>" alt="<?= e($acc['name']) ?>" class="avatar" style="border-color: var(--navy);">
                  <div style="flex: 1; min-width: 0;">
                    <div class="flex-row" style="gap: 0.4rem;">
                      <strong style="color: var(--text-main);"><?= e($acc['name']) ?></strong>
                      <img src="<?= e($acc['lodge_logo']) ?>" alt="" style="width: 1.25rem; height: 1.25rem; border-radius: 4px; object-fit: cover;">
                    </div>
                    <div class="mt-1">
                      <span class="badge <?= $acc['is_admin'] ? 'badge-gold' : 'badge-navy' ?>"><?= e($acc['badge']) ?></span>
                    </div>
                  </div>
                </div>
                <p class="text-xs text-muted mt-2 mb-0"><?= e($acc['detail']) ?></p>
              </div>
              <div class="text-xs mt-2" style="font-weight: 800; color: var(--navy);">
                Open als <?= e(preg_replace('/^Br\.\s*/', '', $acc['name'])) ?> →
              </div>
            </button>
          </form>
        <?php endforeach; ?>
      </div>
    </section>
  <?php endif; ?>
</main>
