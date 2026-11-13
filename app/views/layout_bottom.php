<?php
/** @var bool $devMailbox */
/** @var array $outboxEmails */
?>
  <!-- Modal: Uitleg voor installeren op telefoon of computer -->
  <div id="install-help-modal" class="modal-backdrop no-print" role="dialog" aria-modal="true" aria-labelledby="install-title">
    <div class="modal-panel">
      <div class="flex-between mb-3">
        <h2 id="install-title" class="mb-0" style="color: var(--navy);">Zet Mijn Werkplank op uw startscherm</h2>
        <button type="button" class="btn btn-sm btn-neutral" data-close-modal="install-help-modal">Sluiten ✕</button>
      </div>
      <p class="text-muted text-sm">
        U hoeft niets uit een ingewikkelde App Store te downloaden en geen Apple- of Google-wachtwoord te weten:
      </p>
      <div class="stack-md mt-3">
        <div class="card-muted">
          <strong>Op iPhone of iPad (Safari):</strong>
          <p class="text-sm mb-0 mt-1">
            Tik onderaan op het <strong>Deel-icoontje</strong> (vierkantje met pijltje omhoog) en kies <strong>"Zet op beginscherm"</strong>.
          </p>
        </div>
        <div class="card-muted">
          <strong>Op Android-telefoon (Chrome):</strong>
          <p class="text-sm mb-0 mt-1">
            Tik rechtsboven op de <strong>drie puntjes (⋮)</strong> en kies <strong>"App installeren"</strong> of <strong>"Toevoegen aan startscherm"</strong>.
          </p>
        </div>
        <div class="card-muted">
          <strong>Op Windows-pc of Mac (Chrome / Edge):</strong>
          <p class="text-sm mb-0 mt-1">
            Klik rechts in de adresbalk op het icoontje <strong>"Mijn Werkplank installeren"</strong> of maak een bladwijzer aan. U blijft 1 jaar automatisch ingelogd.
          </p>
        </div>
      </div>
    </div>
  </div>

  <?php if (!empty($devMailbox)): ?>
    <!-- Modal: Proef-postvak om lokaal verstuurde e-mails (inlogcodes & 1-klik RSVP uitnodigingen) te bekijken -->
    <div id="mailbox-modal" class="modal-backdrop no-print" role="dialog" aria-modal="true" aria-labelledby="mailbox-title">
      <div class="modal-panel modal-panel-wide">
        <div class="flex-between mb-3">
          <div>
            <h2 id="mailbox-title" class="mb-0" style="color: var(--navy);">✉️ Lokaal Proef-postvak (Testmodus)</h2>
            <div class="text-xs text-muted mt-1">
              Hier ziet u alle inlogmails en werkplank-uitnodigingen die de app in testmodus verstuurt.
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-neutral" data-close-modal="mailbox-modal">Sluiten ✕</button>
        </div>

        <?php if (empty($outboxEmails)): ?>
          <div class="card-muted text-sm">
            Er zijn nog geen e-mails verstuurd in deze sessie. Vraag een inlogcode aan of verstuur als Secretaris een werkplank-uitnodiging om ze hier direct te zien verschijnen!
          </div>
        <?php else: ?>
          <div class="stack-md">
            <?php foreach ($outboxEmails as $mail): ?>
              <details class="clean-details" style="display: block;">
                <summary style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                  <span>
                    <strong><?= e($mail['subject']) ?></strong>
                    <span class="text-xs text-muted"> — Aan: <?= e($mail['to_name'] ?: $mail['to_email']) ?> (<?= e($mail['to_email']) ?>)</span>
                  </span>
                  <span class="badge badge-navy">Open e-mail ▾</span>
                </summary>
                <div class="mt-2" style="padding: 1rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px;">
                  <?php if (!empty($mail['preview_code'])): ?>
                    <div class="mb-2 text-sm">
                      <strong>6-cijferige code:</strong>
                      <code style="font-size: 1.1rem; font-weight: bold; padding: 2px 8px; background: #fff; border: 1px solid #94a3b8; border-radius: 6px;"><?= e($mail['preview_code']) ?></code>
                    </div>
                  <?php endif; ?>
                  <?php if (!empty($mail['preview_link'])): ?>
                    <div class="mb-3">
                      <a href="<?= e($mail['preview_link']) ?>" class="btn btn-sm btn-primary">Test 1-klik knop uit deze mail →</a>
                    </div>
                  <?php endif; ?>
                  <div><?= $mail['html_body'] /* Veilig opgebouwd in build_login_email / build_werkplank_invite_email */ ?></div>
                </div>
              </details>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
      </div>
    </div>
  <?php endif; ?>

  <footer class="no-print" style="text-align: center; padding: 2.5rem 1rem 3rem; color: var(--text-muted); font-size: 0.85rem;">
    <div><strong>Mijn Werkplank</strong> · Open-Source Vrijmetselaars Portaal (PHP &amp; SQLite/MySQL · MIT-licentie)</div>
    <div class="mt-1">Ontworpen met rust, leesbaarheid en broederlijke discretie (AVG-proof).</div>
  </footer>

  <script src="/assets/app.js?v=3"></script>
</body>
</html>
