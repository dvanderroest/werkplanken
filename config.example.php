<?php
/**
 * Voorbeeldconfiguratie voor Mijn Werkplank.
 *
 * Kopieer dit bestand eventueel naar `config.local.php` om instellingen aan te passen
 * voor uw eigen webhosting (config.local.php wordt genegeerd door Git zodat wachtwoorden nooit op GitHub komen).
 * Zonder config.local.php draait de app direct uit de doos op SQLite in `data/werkplanken.sqlite`.
 */

return [
    // Basis-URL van uw installatie (laat leeg om automatisch te detecteren)
    'app_url' => '',

    // Database: standaard SQLite (nul configuratie nodig!).
    // Voor MySQL / MariaDB op shared webhosting kunt u hier bijv. invullen:
    //   'db_dsn'  => 'mysql:host=localhost;dbname=werkplanken;charset=utf8mb4',
    //   'db_user' => 'uw_db_gebruiker',
    //   'db_pass' => 'uw_db_wachtwoord',
    'db_dsn'  => 'sqlite:' . __DIR__ . '/data/werkplanken.sqlite',
    'db_user' => '',
    'db_pass' => '',

    // Proef-postvak & snelle testaccounts op het inlogscherm:
    // Zet op `false` zodra de app live staat voor echte loges!
    'dev_mailbox' => true,

    // E-mailverzending in productie:
    // 'mail_driver' => 'dev_mailbox' (alleen lokaal testen) | 'php_mail' (standaard mail() op webhosting) | 'smtp'
    'mail_driver' => 'dev_mailbox',
    'mail_from_address' => 'no-reply@mijnwerkplank.nl',
    'mail_from_name'    => 'Mijn Werkplank',

    // Optionele SMTP-gegevens als mail_driver = 'smtp'
    'smtp_host' => '',
    'smtp_port' => 587,
    'smtp_user' => '',
    'smtp_pass' => '',
];
