<?php
declare(strict_types=1);

/**
 * Laadt de configuratie uit standaardwaarden + optioneel `config.local.php` of omgevingsvariabelen.
 */
function app_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $rootDir = dirname(__DIR__);
    $defaults = [
        'app_url'           => getenv('APP_URL') ?: '',
        'db_dsn'            => getenv('DB_DSN') ?: ('sqlite:' . $rootDir . '/data/werkplanken.sqlite'),
        'db_user'           => getenv('DB_USER') ?: '',
        'db_pass'           => getenv('DB_PASS') ?: '',
        'dev_mailbox'       => getenv('DEV_MAILBOX') !== false
            ? filter_var(getenv('DEV_MAILBOX'), FILTER_VALIDATE_BOOLEAN)
            : true,
        'mail_driver'       => getenv('MAIL_DRIVER') ?: 'dev_mailbox',
        'mail_from_address' => getenv('MAIL_FROM_ADDRESS') ?: 'no-reply@mijnwerkplank.nl',
        'mail_from_name'    => getenv('MAIL_FROM_NAME') ?: 'Mijn Werkplank',
        'smtp_host'         => getenv('SMTP_HOST') ?: '',
        'smtp_port'         => (int) (getenv('SMTP_PORT') ?: 587),
        'smtp_user'         => getenv('SMTP_USER') ?: '',
        'smtp_pass'         => getenv('SMTP_PASS') ?: '',
    ];

    $localFile = $rootDir . '/config.local.php';
    if (is_file($localFile)) {
        $local = require $localFile;
        if (is_array($local)) {
            $defaults = array_merge($defaults, $local);
        }
    }

    $config = $defaults;
    return $config;
}

function is_dev_mailbox_enabled(): bool
{
    $cfg = app_config();
    return !empty($cfg['dev_mailbox']);
}

function app_base_url(): string
{
    $cfg = app_config();
    if (!empty($cfg['app_url'])) {
        return rtrim((string) $cfg['app_url'], '/');
    }

    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $scheme = $https ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost:3000';

    $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/index.php'));
    $basePath = ($scriptDir === '/' || $scriptDir === '.') ? '' : rtrim($scriptDir, '/');

    return $scheme . '://' . $host . $basePath;
}
