<?php
declare(strict_types=1);

/**
 * Bootstrap: laadt alle PHP-onderdelen, start de sessie (voor CSRF & meldingen)
 * en zet anti-cache headers zodat Chrome en mobiele browsers altijd de actuele stand tonen.
 */

if (PHP_SAPI !== 'cli') {
    if (session_status() === PHP_SESSION_NONE) {
        session_start([
            'cookie_httponly' => true,
            'cookie_samesite' => 'Lax',
        ]);
    }

    header('Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate');
    header('Pragma: no-cache');
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/seed.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mail.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/actions.php';
