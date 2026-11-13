<?php
/**
 * Bevestigingspagina voor 1-klik RSVP vanuit een Werkplank-uitnodigingsmail (zonder in te loggen).
 *
 * @var array|null $tokenInfo
 * @var string     $recordedChoice
 * @var array|null $flash
 */
?>
<main class="container-narrow" style="padding-top: 2.5rem; padding-bottom: 2.5rem;">
  <?php if ($flash): ?>
    <div role="alert" class="alert <?= $flash['type'] === 'error' ? 'alert-error' : 'alert-success' ?>">
      <?= e($flash['message']) ?>
    </div>
  <?php endif; ?>

  <?php if (!$tokenInfo): ?>
    <section class="card" style="text-align: center;">
      <h1 style="font-size: 1.65rem; color: var(--navy);">Deze aanmeldlink is verlopen</h1>
      <p class="text-muted">Log eenvoudig in met uw e-mailadres om uw aanwezigheid door te geven.</p>
      <a href="/" class="btn btn-primary">Naar Mijn Werkplank →</a>
    </section>
  <?php else: ?>
    <?php
    $rsvpStmt = db()->prepare('SELECT * FROM rsvps WHERE event_id = ? AND user_id = ? LIMIT 1');
    $rsvpStmt->execute([$tokenInfo['event_id'], $tokenInfo['user_id']]);
    $currentRsvp = $rsvpStmt->fetch() ?: [
        'status'       => 'attending',
        'joins_meal'   => 1,
        'dietary_note' => $tokenInfo['dietary_default'] ?? '',
        'comment'      => '',
    ];
    ?>
    <section class="card">
      <div class="badge badge-green mb-2">✓ Uw keuze is direct vastgelegd</div>
      <h1 style="font-size: 1.7rem; color: var(--navy); margin-bottom: 0.4rem;">
        Dank u wel, <?= e($tokenInfo['full_name']) ?>!
      </h1>
      <p class="text-muted text-sm mb-4">
        Voor <strong><?= e($tokenInfo['event_title']) ?></strong> op <strong><?= e(format_dutch_date((string) $tokenInfo['event_date'])) ?></strong>
        (Loge <?= e($tokenInfo['lodge_name']) ?> Nr. <?= (int) $tokenInfo['lodge_number'] ?>) staat nu genoteerd:
      </p>

      <div class="card-muted mb-4">
        <?php if ($currentRsvp['status'] === 'declined'): ?>
          <strong>✕ Verhinderd (afgemeld bij de Secretaris)</strong>
        <?php elseif ((int) $currentRsvp['joins_meal'] === 1 && (int) $tokenInfo['has_meal'] === 1): ?>
          <strong style="color: var(--green);">✓ Aanwezig bij de Arbeid én het Broedermaal</strong>
        <?php else: ?>
          <strong style="color: var(--navy);">✓ Aanwezig (alleen Arbeid, geen Broedermaal)</strong>
        <?php endif; ?>
      </div>

      <form method="post" action="/">
        <?= csrf_field() ?>
        <input type="hidden" name="form_action" value="rsvp_token_update">
        <input type="hidden" name="token" value="<?= e($tokenInfo['token']) ?>">

        <h2 style="font-size: 1.15rem; color: var(--navy); margin-bottom: 0.6rem;">
          Wilt u nog een dieetwens of opmerking meegeven?
        </h2>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label text-xs">Aanwezigheid</label>
            <select name="status" class="select">
              <option value="attending" <?= $currentRsvp['status'] === 'attending' ? 'selected' : '' ?>>Aanwezig</option>
              <option value="declined" <?= $currentRsvp['status'] === 'declined' ? 'selected' : '' ?>>Verhinderd</option>
            </select>
          </div>
          <?php if ((int) $tokenInfo['has_meal'] === 1): ?>
            <div class="form-group">
              <label class="form-label text-xs">Broedermaal</label>
              <label class="card-muted flex-row" style="padding: 0.65rem; cursor: pointer;">
                <input type="checkbox" name="joins_meal" value="1" <?= (int) $currentRsvp['joins_meal'] === 1 ? 'checked' : '' ?>>
                <span class="text-sm">Ik eet mee bij het Broedermaal</span>
              </label>
            </div>
          <?php endif; ?>
        </div>

        <div class="form-group">
          <label class="form-label text-xs">Dieetwens / allergie voor de Hofmeester</label>
          <input type="text" name="dietary_note" value="<?= e((string) $currentRsvp['dietary_note']) ?>" placeholder="bijv. Vegetarisch, glutenvrij..." class="input">
        </div>

        <div class="form-group">
          <label class="form-label text-xs">Opmerking voor de Secretaris</label>
          <input type="text" name="comment" value="<?= e((string) $currentRsvp['comment']) ?>" placeholder="Optionele toelichting..." class="input">
        </div>

        <div class="flex-row">
          <button type="submit" class="btn btn-primary">Voorkeur opslaan</button>
          <a href="/" class="btn btn-outline">Open het volledige portaal →</a>
        </div>
      </form>
    </section>
  <?php endif; ?>
</main>
