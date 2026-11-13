<?php
declare(strict_types=1);

/**
 * Opmaak en verzending van e-mails (Inlogcode/Magic-Link & Werkplank-uitnodigingen met 1-klik RSVP).
 * In lokale testmodus (`dev_mailbox = true`) worden alle e-mails opgeslagen in het Proef-postvak.
 */

function send_portal_mail(array $params): string
{
    $cfg = app_config();
    $driver = (string) ($cfg['mail_driver'] ?? 'dev_mailbox');
    $toEmail = (string) $params['to_email'];
    $toName  = (string) ($params['to_name'] ?? '');
    $subject = (string) $params['subject'];
    $html    = (string) $params['html_body'];
    $text    = (string) $params['text_body'];
    $code    = $params['preview_code'] ?? null;
    $link    = $params['preview_link'] ?? null;

    $deliveryMode = is_dev_mailbox_enabled() ? 'dev_mailbox' : $driver;

    // Sla in ontwikkel-/testmodus (of als archief) op in email_outbox zodat het Proef-postvak werkt
    db()->prepare("
        INSERT INTO email_outbox (id, to_email, to_name, subject, html_body, text_body, preview_code, preview_link, delivery_mode, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ")->execute([
        new_id('mail'),
        $toEmail,
        $toName,
        $subject,
        $html,
        $text,
        $code,
        $link,
        $deliveryMode,
        gmdate('c'),
    ]);

    // Op echte PHP-webhosting (`mail_driver => 'php_mail'` en `dev_mailbox => false`) verstuurt PHP de mail direct
    if (!is_dev_mailbox_enabled() && $driver === 'php_mail') {
        $fromAddr = (string) ($cfg['mail_from_address'] ?? 'no-reply@mijnwerkplank.nl');
        $fromName = (string) ($cfg['mail_from_name'] ?? 'Mijn Werkplank');
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . $fromName . ' <' . $fromAddr . '>',
            'Reply-To: ' . $fromAddr,
        ];
        @mail($toEmail, $encodedSubject, $html, implode("\r\n", $headers));
    }

    return $deliveryMode;
}

function build_login_email(string $fullName, string $code, string $magicUrl): array
{
    $safeName = e($fullName);
    $safeCode = e($code);
    $safeUrl  = e($magicUrl);

    $subject = "Uw inlogcode ($code) voor Mijn Werkplank";

    $htmlBody = <<<HTML
<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b; background: #faf8f5; border: 1px solid #d6d0c4; border-radius: 12px;">
  <h2 style="margin-top: 0; color: #1B365D;">Welkom terug, {$safeName}</h2>
  <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6;">
    U hoeft geen wachtwoord te onthouden. Klik hieronder direct op de blauwe knop om in te loggen:
  </p>
  <p style="margin: 24px 0;">
    <a href="{$safeUrl}" style="display: inline-block; background: #1B365D; color: #ffffff; text-decoration: none; font-family: Arial, sans-serif; font-weight: bold; font-size: 17px; padding: 14px 26px; border-radius: 10px;">
      Direct inloggen op Mijn Werkplank →
    </a>
  </p>
  <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
    Of typ deze <strong>6-cijferige code</strong> in op het scherm waar u zojuist uw e-mailadres invulde (handig als u de mail op uw telefoon leest maar op uw computer wilt inloggen):
  </p>
  <div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; background: #ffffff; border: 2px solid #1B365D; border-radius: 10px; color: #1B365D;">
    {$safeCode}
  </div>
  <p style="font-family: Arial, sans-serif; font-size: 13px; color: #64748b; margin-top: 20px;">
    Deze code en link zijn 30 minuten geldig. Na het inloggen blijft u op uw eigen toestel automatisch 1 jaar ingelogd.
  </p>
</div>
HTML;

    $textBody = "Welkom terug, $fullName\n\n"
        . "Klik op deze link om direct in te loggen:\n$magicUrl\n\n"
        . "Of gebruik uw 6-cijferige inlogcode: $code\n";

    return [
        'subject'   => $subject,
        'html_body' => $htmlBody,
        'text_body' => $textBody,
    ];
}

function build_werkplank_invite_email(array $member, array $lodge, array $event, string $rsvpToken): array
{
    $baseUrl   = app_base_url();
    $urlMeal   = $baseUrl . '/rsvp?token=' . urlencode($rsvpToken) . '&keuze=arbeid_en_maal';
    $urlNoMeal = $baseUrl . '/rsvp?token=' . urlencode($rsvpToken) . '&keuze=alleen_arbeid';
    $urlAbsent = $baseUrl . '/rsvp?token=' . urlencode($rsvpToken) . '&keuze=afwezig';

    $dateFormatted = format_dutch_date((string) $event['event_date']);
    $degreeText    = degree_short_label((int) $event['min_degree']);

    $safeMemberName = e((string) $member['full_name']);
    $safeLodgeName  = e((string) $lodge['name']);
    $safeLodgeNum   = (int) $lodge['number'];
    $safeTitle      = e((string) $event['title']);
    $safeDate       = e($dateFormatted);
    $safeStart      = e((string) $event['start_time']);
    $safeLocation   = e((string) $event['location']);
    $safeDegree     = e($degreeText);
    $safeMealInfo   = e((string) ($event['meal_info'] ?? ''));
    $safeWerkplank  = nl2br(e((string) $event['werkplank_text']));

    $mealBtnHtml = '';
    if ((int) $event['has_meal'] === 1) {
        $mealBtnHtml = '<a href="' . e($urlMeal) . '" style="display: inline-block; margin: 4px 6px 4px 0; background: #15803d; color: #ffffff; text-decoration: none; font-family: Arial, sans-serif; font-weight: bold; font-size: 15px; padding: 12px 18px; border-radius: 8px;">✓ Aanwezig + Broedermaal</a>';
    }

    $subject = "Werkplank Loge {$lodge['name']} Nr. {$safeLodgeNum}: {$event['title']} ({$dateFormatted})";

    $htmlBody = <<<HTML
<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #1e293b; background: #faf8f5; border: 1px solid #d6d0c4; border-radius: 12px;">
  <div style="font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #92400e;">
    Loge {$safeLodgeName} Nr. {$safeLodgeNum} · {$safeDegree}
  </div>
  <h2 style="margin: 6px 0 12px 0; color: #1B365D;">{$safeTitle}</h2>
  <p style="font-family: Arial, sans-serif; font-size: 15px; margin: 0 0 16px 0;">
    <strong>Datum:</strong> {$safeDate} om {$safeStart} uur<br>
    <strong>Locatie:</strong> {$safeLocation}<br>
    <strong>Broedermaal:</strong> {$safeMealInfo}
  </p>
  <p style="font-family: Arial, sans-serif; font-size: 15px;">Waarde {$safeMemberName},</p>
  <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; font-family: Georgia, serif; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
    {$safeWerkplank}
  </div>
  <div style="background: #eff6ff; border: 1px solid #93c5fd; border-radius: 10px; padding: 16px;">
    <div style="font-family: Arial, sans-serif; font-weight: bold; color: #1B365D; margin-bottom: 10px;">
      Geef direct met 1 klik uw aanwezigheid door (zonder in te loggen):
    </div>
    {$mealBtnHtml}
    <a href="{$urlNoMeal}" style="display: inline-block; margin: 4px 6px 4px 0; background: #1B365D; color: #ffffff; text-decoration: none; font-family: Arial, sans-serif; font-weight: bold; font-size: 15px; padding: 12px 18px; border-radius: 8px;">✓ Alleen Arbeid</a>
    <a href="{$urlAbsent}" style="display: inline-block; margin: 4px 0; background: #475569; color: #ffffff; text-decoration: none; font-family: Arial, sans-serif; font-weight: bold; font-size: 15px; padding: 12px 18px; border-radius: 8px;">✕ Ik ben verhinderd</a>
  </div>
</div>
HTML;

    $textBody = "Loge {$lodge['name']} Nr. {$safeLodgeNum} — {$event['title']}\n"
        . "Datum: $dateFormatted om {$event['start_time']} uur\n\n"
        . $event['werkplank_text'] . "\n\n"
        . "Aanwezig + Broedermaal: $urlMeal\n"
        . "Alleen Arbeid: $urlNoMeal\n"
        . "Verhinderd: $urlAbsent\n";

    return [
        'subject'      => $subject,
        'html_body'    => $htmlBody,
        'text_body'    => $textBody,
        'preview_link' => ((int) $event['has_meal'] === 1) ? $urlMeal : $urlNoMeal,
    ];
}
