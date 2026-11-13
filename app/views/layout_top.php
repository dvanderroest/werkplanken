<?php
/** @var array|null $flash */
$devMailbox = is_dev_mailbox_enabled();
$outboxEmails = $devMailbox ? get_recent_outbox_emails(12) : [];
?>
<!DOCTYPE html>
<html lang="nl" data-font-scale="normal">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#1B365D">
  <title>Mijn Werkplank — Open-Source Vrijmetselaars App</title>
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" href="/icon.svg">
  <link rel="apple-touch-icon" href="/icon.svg">
  <link rel="stylesheet" href="/assets/app.css?v=3">
  <script>
    (function(){
      try {
        var s = localStorage.getItem('werkplank_font_scale');
        if (s === 'large' || s === 'xlarge') {
          document.documentElement.setAttribute('data-font-scale', s);
        }
      } catch(e){}
    })();
  </script>
</head>
<body>
  <!-- Bovenste toegankelijkheidsbalk voor senioren, mobiele installatie & proef-postvak -->
  <div class="topbar no-print">
    <div class="container topbar-inner">
      <div class="flex-row">
        <span><strong>Tekstgrootte:</strong></span>
        <div class="scale-group" role="group" aria-label="Kies tekstgrootte">
          <button type="button" class="scale-btn active" data-set-scale="normal" title="Normale letters">A</button>
          <button type="button" class="scale-btn" data-set-scale="large" title="Grotere letters">A+</button>
          <button type="button" class="scale-btn" data-set-scale="xlarge" title="Extra grote letters">A++</button>
        </div>
      </div>

      <div class="topbar-actions">
        <button type="button" class="topbar-btn" data-open-modal="install-help-modal">
          📱 Zet als App op telefoon / pc
        </button>

        <?php if ($devMailbox): ?>
          <button type="button" class="topbar-btn topbar-btn-gold" data-open-modal="mailbox-modal">
            ✉️ Proef-postvak (<?= count($outboxEmails) ?>)
          </button>
        <?php endif; ?>
      </div>
    </div>
  </div>
