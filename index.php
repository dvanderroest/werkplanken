<?php
declare(strict_types=1);

/**
 * Mijn Werkplank — Hoofdingang (index.php)
 * Volledig geschreven in overzichtelijke PHP zonder Node.js of build-stappen.
 */

require_once __DIR__ . '/app/bootstrap.php';

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$currentUser = get_current_user_from_session();

// 1. Verwerk eventuele POST-formulieren (Post-Redirect-Get)
handle_post_action($currentUser);

// 2. Klikbare Magic Link uit de e-mail: /inloggen/bevestig?token=...
if ($requestPath === '/inloggen/bevestig' || isset($_GET['magic_token'])) {
    $token = (string) ($_GET['token'] ?? $_GET['magic_token'] ?? '');
    $res = verify_magic_token_and_login($token);
    if ($res['ok']) {
        unset($_SESSION['login_pending_email'], $_SESSION['login_dev_preview_code'], $_SESSION['login_dev_preview_magic']);
        set_flash('success', 'Welkom terug! U bent met 1 klik via de e-maillink ingelogd.');
    } else {
        set_flash('error', (string) $res['error']);
    }
    redirect_to('/');
}

// 3. Persoonlijke 1-klik RSVP-link uit een Werkplank-uitnodigingsmail: /rsvp?token=...&keuze=...
if ($requestPath === '/rsvp') {
    $token  = (string) ($_GET['token'] ?? '');
    $keuze  = (string) ($_GET['keuze'] ?? '');
    $tokenInfo = resolve_rsvp_email_token($token);

    if ($tokenInfo && $keuze !== '' && empty($_GET['opgeslagen'])) {
        $status    = ($keuze === 'afwezig') ? 'declined' : 'attending';
        $joinsMeal = ($keuze === 'arbeid_en_maal' && (int) $tokenInfo['has_meal'] === 1);

        $tokenUser = [
            'id'              => (string) $tokenInfo['user_id'],
            'degree'          => (int) $tokenInfo['degree'],
            'dietary_default' => (string) $tokenInfo['dietary_default'],
            'memberships'     => get_user_memberships((string) $tokenInfo['user_id']),
        ];
        save_user_rsvp($tokenUser, (string) $tokenInfo['event_id'], $status, $joinsMeal);
    }

    $flash = pull_flash();
    require __DIR__ . '/app/views/layout_top.php';
    require __DIR__ . '/app/views/rsvp_confirm.php';
    require __DIR__ . '/app/views/layout_bottom.php';
    exit;
}

// 4. Reguliere weergave: Inlogscherm (als niet ingelogd) of het Logeportaal
$flash = pull_flash();

if (!$currentUser) {
    require __DIR__ . '/app/views/layout_top.php';
    require __DIR__ . '/app/views/login.php';
    require __DIR__ . '/app/views/layout_bottom.php';
    exit;
}

$activeLodge = get_lodge_by_id((string) $currentUser['active_lodge_id']);
if (!$activeLodge) {
    destroy_current_session();
    redirect_to('/');
}

$canManage       = can_manage_lodge($currentUser, (string) $activeLodge['id']);
$isPlatformAdmin = is_platform_admin($currentUser);
$ownEvents       = get_own_lodge_events($currentUser, (string) $activeLodge['id']);
$visitorEvents   = get_visitor_events($currentUser, (string) $activeLodge['id']);
$members         = get_lodge_members($currentUser, (string) $activeLodge['id']);
$documents       = get_lodge_documents($currentUser, (string) $activeLodge['id']);
$announcements   = get_lodge_announcements($currentUser, (string) $activeLodge['id']);

require __DIR__ . '/app/views/layout_top.php';
require __DIR__ . '/app/views/dashboard.php';
require __DIR__ . '/app/views/layout_bottom.php';
