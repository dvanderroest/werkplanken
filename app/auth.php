<?php
declare(strict_types=1);

/**
 * Wachtwoordloze authenticatie (6-cijferige code + Magic Link + 1-jarige sessiecookie)
 * én persoonlijke 1-klik RSVP-tokens voor in uitnodigingsmails.
 */

const SESSION_COOKIE_NAME = 'werkplank_sessie';
const ONE_YEAR_SECONDS    = 31536000; // 365 dagen
const ONE_YEAR_MS         = 31536000000;
const CHALLENGE_TTL_MS    = 1800000;  // 30 minuten

function now_ms(): int
{
    return (int) round(microtime(true) * 1000);
}

/**
 * Genereert en verstuurt een 6-cijferige inlogcode én klikbare Magic Link.
 *
 * @return array{ok: bool, error?: string, dev_code?: string, dev_magic_url?: string}
 */
function request_login_challenge(string $rawEmail): array
{
    $email = str_lower(trim($rawEmail));
    if ($email === '' || !str_contains($email, '@')) {
        return [
            'ok'    => false,
            'error' => 'Vul alstublieft een geldig e-mailadres in.',
        ];
    }

    $pdo = db();
    $stmt = $pdo->prepare('SELECT id, email, full_name FROM users WHERE LOWER(email) = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        return [
            'ok'    => false,
            'error' => 'Dit e-mailadres is nog niet bekend. Alleen leden die door de Secretaris van hun loge (of de Platformbeheerder) zijn toegevoegd kunnen inloggen.',
        ];
    }

    $code       = (string) random_int(100000, 999999);
    $magicToken = bin2hex(random_bytes(24));
    $now        = now_ms();
    $expiresAt  = $now + CHALLENGE_TTL_MS;

    $pdo->prepare("
        INSERT INTO auth_challenges (id, email, code, magic_token, expires_at, used_at, created_at)
        VALUES (?, ?, ?, ?, ?, NULL, ?)
    ")->execute([new_id('chal'), $user['email'], $code, $magicToken, $expiresAt, $now]);

    $magicUrl = app_base_url() . '/inloggen/bevestig?token=' . urlencode($magicToken);
    $mailData = build_login_email((string) $user['full_name'], $code, $magicUrl);

    $mode = send_portal_mail([
        'to_email'     => $user['email'],
        'to_name'      => $user['full_name'],
        'subject'      => $mailData['subject'],
        'html_body'    => $mailData['html_body'],
        'text_body'    => $mailData['text_body'],
        'preview_code' => $code,
        'preview_link' => $magicUrl,
    ]);

    return [
        'ok'            => true,
        'dev_code'      => ($mode === 'dev_mailbox') ? $code : null,
        'dev_magic_url' => ($mode === 'dev_mailbox') ? $magicUrl : null,
    ];
}

/**
 * Controleert de 6-cijferige code en maakt een sessie aan.
 *
 * @return array{ok: bool, error?: string}
 */
function verify_code_and_login(string $rawEmail, string $rawCode, bool $keepSignedIn = true): array
{
    $email     = str_lower(trim($rawEmail));
    $cleanCode = preg_replace('/\D+/', '', $rawCode) ?? '';

    if (strlen($cleanCode) !== 6) {
        return ['ok' => false, 'error' => 'Vul de 6 cijfers uit de e-mail in.'];
    }

    $pdo = db();
    $now = now_ms();

    $stmt = $pdo->prepare("
        SELECT id, email FROM auth_challenges
        WHERE LOWER(email) = ? AND code = ? AND used_at IS NULL AND expires_at > ?
        ORDER BY created_at DESC LIMIT 1
    ");
    $stmt->execute([$email, $cleanCode, $now]);
    $challenge = $stmt->fetch();

    if (!$challenge) {
        return [
            'ok'    => false,
            'error' => 'Deze 6-cijferige code klopt niet of is verlopen (langer dan 30 minuten oud). Vraag gerust een nieuwe code aan.',
        ];
    }

    $uStmt = $pdo->prepare('SELECT id, primary_lodge_id FROM users WHERE LOWER(email) = ? LIMIT 1');
    $uStmt->execute([$email]);
    $user = $uStmt->fetch();

    if (!$user) {
        return ['ok' => false, 'error' => 'Gebruiker niet gevonden.'];
    }

    $pdo->prepare('UPDATE auth_challenges SET used_at = ? WHERE id = ?')->execute([$now, $challenge['id']]);
    create_session_for_user((string) $user['id'], (string) $user['primary_lodge_id'], $keepSignedIn);

    return ['ok' => true];
}

/**
 * Controleert een Magic Link uit de e-mail en logt de broeder direct in.
 *
 * @return array{ok: bool, error?: string}
 */
function verify_magic_token_and_login(string $rawToken): array
{
    $token = trim($rawToken);
    if ($token === '') {
        return ['ok' => false, 'error' => 'Ongeldige inloglink.'];
    }

    $pdo = db();
    $now = now_ms();

    $stmt = $pdo->prepare('SELECT id, email, used_at, expires_at FROM auth_challenges WHERE magic_token = ? LIMIT 1');
    $stmt->execute([$token]);
    $challenge = $stmt->fetch();

    if (!$challenge || (int) $challenge['expires_at'] <= $now) {
        return [
            'ok'    => false,
            'error' => 'Deze inloglink is verlopen (langer dan 30 minuten oud). Vraag op het inlogscherm eenvoudig een nieuwe aan.',
        ];
    }

    // Korte coulance van 2 minuten als iemand op zijn telefoon per ongeluk dubbel tikt op de link
    if (!empty($challenge['used_at']) && ($now - (int) $challenge['used_at']) > 120000) {
        return [
            'ok'    => false,
            'error' => 'Deze inloglink is al eerder gebruikt. Vraag gerust even een nieuwe inlogcode aan.',
        ];
    }

    $uStmt = $pdo->prepare('SELECT id, primary_lodge_id FROM users WHERE LOWER(email) = ? LIMIT 1');
    $uStmt->execute([str_lower((string) $challenge['email'])]);
    $user = $uStmt->fetch();

    if (!$user) {
        return ['ok' => false, 'error' => 'Gebruiker niet gevonden.'];
    }

    if (empty($challenge['used_at'])) {
        $pdo->prepare('UPDATE auth_challenges SET used_at = ? WHERE id = ?')->execute([$now, $challenge['id']]);
    }

    create_session_for_user((string) $user['id'], (string) $user['primary_lodge_id'], true);
    return ['ok' => true];
}

function create_session_for_user(string $userId, string $preferredLodgeId, bool $keepSignedIn = true): void
{
    $memberships = get_user_memberships($userId);
    $activeLodgeId = $preferredLodgeId;

    $foundPreferred = false;
    foreach ($memberships as $m) {
        if ($m['lodge_id'] === $preferredLodgeId) {
            $foundPreferred = true;
            break;
        }
    }
    if (!$foundPreferred && !empty($memberships[0]['lodge_id'])) {
        $activeLodgeId = (string) $memberships[0]['lodge_id'];
    }

    $rawToken  = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $rawToken);
    $now       = now_ms();
    $ttlSec    = $keepSignedIn ? ONE_YEAR_SECONDS : 43200; // 1 jaar of 12 uur
    $ttlMs     = $ttlSec * 1000;

    db()->prepare("
        INSERT INTO sessions (token_hash, user_id, active_lodge_id, expires_at, created_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ")->execute([$tokenHash, $userId, $activeLodgeId, $now + $ttlMs, $now, $now]);

    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    setcookie(SESSION_COOKIE_NAME, $rawToken, [
        'expires'  => time() + $ttlSec,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    $_COOKIE[SESSION_COOKIE_NAME] = $rawToken;
}

function switch_active_lodge_for_current_session(string $lodgeId): bool
{
    $rawToken = $_COOKIE[SESSION_COOKIE_NAME] ?? '';
    if ($rawToken === '') {
        return false;
    }

    $tokenHash = hash('sha256', $rawToken);
    $pdo = db();
    $stmt = $pdo->prepare('SELECT user_id FROM sessions WHERE token_hash = ? LIMIT 1');
    $stmt->execute([$tokenHash]);
    $userId = $stmt->fetchColumn();

    if (!$userId) {
        return false;
    }

    $memberships = get_user_memberships((string) $userId);
    $allowed = false;
    foreach ($memberships as $m) {
        if ($m['lodge_id'] === $lodgeId) {
            $allowed = true;
            break;
        }
    }
    if (!$allowed) {
        return false;
    }

    $pdo->prepare('UPDATE sessions SET active_lodge_id = ? WHERE token_hash = ?')->execute([$lodgeId, $tokenHash]);
    return true;
}

function destroy_current_session(): void
{
    $rawToken = $_COOKIE[SESSION_COOKIE_NAME] ?? '';
    if ($rawToken !== '') {
        $tokenHash = hash('sha256', $rawToken);
        db()->prepare('DELETE FROM sessions WHERE token_hash = ?')->execute([$tokenHash]);
    }

    setcookie(SESSION_COOKIE_NAME, '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    unset($_COOKIE[SESSION_COOKIE_NAME]);
}

function get_current_user_from_session(): ?array
{
    $rawToken = $_COOKIE[SESSION_COOKIE_NAME] ?? '';
    if ($rawToken === '') {
        return null;
    }

    $tokenHash = hash('sha256', $rawToken);
    $pdo = db();
    $now = now_ms();

    $stmt = $pdo->prepare("
        SELECT s.user_id, s.active_lodge_id, s.expires_at, s.last_seen_at,
               u.email, u.full_name, u.phone, u.city, u.avatar_url, u.degree,
               u.is_platform_admin, u.primary_lodge_id, u.dietary_default,
               pl.name AS primary_lodge_name, pl.number AS primary_lodge_number, pl.city AS primary_lodge_city
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        JOIN lodges pl ON pl.id = u.primary_lodge_id
        WHERE s.token_hash = ? AND s.expires_at > ?
        LIMIT 1
    ");
    $stmt->execute([$tokenHash, $now]);
    $row = $stmt->fetch();

    if (!$row) {
        return null;
    }

    // Verleng de sessie stilzwijgend maximaal 1x per uur
    if (($now - (int) $row['last_seen_at']) > 3600000) {
        $nextExpiry = max((int) $row['expires_at'], $now + ONE_YEAR_MS);
        $pdo->prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?')
            ->execute([$now, $nextExpiry, $tokenHash]);
    }

    $memberships = get_user_memberships((string) $row['user_id']);
    $activeLodgeId = (string) $row['active_lodge_id'];
    $validActive = false;
    foreach ($memberships as $m) {
        if ($m['lodge_id'] === $activeLodgeId) {
            $validActive = true;
            break;
        }
    }
    if (!$validActive && !empty($memberships[0]['lodge_id'])) {
        $activeLodgeId = (string) $memberships[0]['lodge_id'];
    }

    return [
        'id'                   => (string) $row['user_id'],
        'email'                => (string) $row['email'],
        'full_name'            => (string) $row['full_name'],
        'phone'                => (string) $row['phone'],
        'city'                 => (string) $row['city'],
        'avatar_url'           => (string) ($row['avatar_url'] ?? ''),
        'degree'               => (int) $row['degree'],
        'is_platform_admin'    => (int) ($row['is_platform_admin'] ?? 0),
        'primary_lodge_id'     => (string) $row['primary_lodge_id'],
        'primary_lodge_name'   => (string) $row['primary_lodge_name'],
        'primary_lodge_number' => (int) $row['primary_lodge_number'],
        'primary_lodge_city'   => (string) $row['primary_lodge_city'],
        'dietary_default'      => (string) $row['dietary_default'],
        'active_lodge_id'      => $activeLodgeId,
        'memberships'          => $memberships,
    ];
}

function create_rsvp_email_token(string $eventId, string $userId): string
{
    $token     = bin2hex(random_bytes(20));
    $expiresAt = now_ms() + (60 * 86400 * 1000); // 60 dagen geldig

    db()->prepare('INSERT INTO rsvp_tokens (token, event_id, user_id, expires_at) VALUES (?, ?, ?, ?)')
        ->execute([$token, $eventId, $userId, $expiresAt]);

    return $token;
}

function resolve_rsvp_email_token(string $rawToken): ?array
{
    $token = trim($rawToken);
    if ($token === '') {
        return null;
    }

    $stmt = db()->prepare("
        SELECT t.token, t.event_id, t.user_id, t.expires_at,
               u.full_name, u.email, u.degree, u.dietary_default,
               e.title AS event_title, e.event_date, e.start_time, e.location,
               e.has_meal, e.meal_info, e.lodge_id, e.min_degree,
               l.name AS lodge_name, l.number AS lodge_number, l.city AS lodge_city
        FROM rsvp_tokens t
        JOIN users u ON u.id = t.user_id
        JOIN events e ON e.id = t.event_id
        JOIN lodges l ON l.id = e.lodge_id
        WHERE t.token = ? AND t.expires_at > ?
        LIMIT 1
    ");
    $stmt->execute([$token, now_ms()]);
    $row = $stmt->fetch();

    return $row ?: null;
}
