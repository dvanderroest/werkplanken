<?php
declare(strict_types=1);

/**
 * Router voor de ingebouwde PHP-ontwikkelserver:
 *   php -S localhost:3000 router.php
 */
$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Blokkeer directe toegang tot interne mappen en gevoelige bestanden
if (
    preg_match('#^/(app|data|cli|\.git)(/|$)#i', $uriPath) ||
    preg_match('#\.(sqlite|sqlite-wal|sqlite-shm|sqlite-journal|env|ps1|bat)$#i', $uriPath) ||
    strtolower(basename($uriPath)) === 'config.local.php'
) {
    http_response_code(403);
    echo 'Toegang geweigerd.';
    return true;
}

// Serveer bestaande statische bestanden (CSS, JS, demo-afbeeldingen, icon.svg, sw.js) rechtstreeks
$fullFile = __DIR__ . $uriPath;
if ($uriPath !== '/' && is_file($fullFile)) {
    return false;
}

require __DIR__ . '/index.php';
return true;
