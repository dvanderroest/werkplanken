<?php
declare(strict_types=1);

/**
 * CLI-beheertool voor Mijn Werkplank (aan te roepen vanuit PowerShell of terminal).
 *
 * Voorbeelden:
 *   php cli/beheer.php status
 *   php cli/beheer.php maak-beheerder beheer@mijnloge.nl "Br. Jan Jansen"
 *   php cli/beheer.php verwijder-beheerder oud@mijnloge.nl
 *   php cli/beheer.php nieuw-loge 142 "De Morgenster" "Groningen" "Turfsingel 46, Groningen" "Br. Piet Bakker" secretaris@morgenster.nl
 *   php cli/beheer.php koppel-secretaris 142 "Br. Klaas de Vries" nieuwesecretaris@morgenster.nl
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Dit script mag uitsluitend via de command-line (PowerShell / PHP CLI) worden uitgevoerd.');
}

require_once dirname(__DIR__) . '/app/bootstrap.php';

$pdo = db();
$cmd = strtolower((string) ($argv[1] ?? 'help'));

switch ($cmd) {
    case 'status':
        $cfg = app_config();
        echo "============================================================\n";
        echo "  MIJN WERKPLANK — PLATFORMSTATUS (PHP " . PHP_VERSION . ")\n";
        echo "============================================================\n";
        echo "Database DSN : " . $cfg['db_dsn'] . "\n";
        echo "Mail-driver  : " . ($cfg['mail_driver'] ?? 'dev_mailbox') . " (dev_mailbox=" . (!empty($cfg['dev_mailbox']) ? 'true' : 'false') . ")\n\n";

        $admins = $pdo->query("
            SELECT full_name, email FROM users WHERE is_platform_admin = 1 ORDER BY full_name ASC
        ")->fetchAll();

        echo "Platformbeheerders (" . count($admins) . "):\n";
        foreach ($admins as $a) {
            echo "  * {$a['full_name']} <{$a['email']}>\n";
        }
        echo "\n";

        $lodges = $pdo->query("
            SELECT l.id, l.number, l.name, l.city,
                   (SELECT COUNT(*) FROM lodge_memberships m WHERE m.lodge_id = l.id) AS member_count,
                   (SELECT COUNT(*) FROM events e WHERE e.lodge_id = l.id) AS event_count
            FROM lodges l
            ORDER BY l.number ASC
        ")->fetchAll();

        $secStmt = $pdo->prepare("
            SELECT u.full_name, u.email
            FROM lodge_memberships m
            JOIN users u ON u.id = m.user_id
            WHERE m.lodge_id = ? AND m.role = 'secretary'
            ORDER BY u.full_name ASC
        ");

        echo "Aangesloten Loges (" . count($lodges) . "):\n";
        foreach ($lodges as $l) {
            $secStmt->execute([$l['id']]);
            $secs = $secStmt->fetchAll();
            $secLabels = [];
            foreach ($secs as $s) {
                $secLabels[] = "{$s['full_name']} <{$s['email']}>";
            }
            $secText = !empty($secLabels) ? implode(', ', $secLabels) : '(Nog geen secretaris gekoppeld!)';

            echo sprintf(
                "  - Nr. %-4d %-26s (%s) | %d leden, %d werkplanken\n    Secretaris: %s\n",
                (int) $l['number'],
                $l['name'],
                $l['city'],
                (int) $l['member_count'],
                (int) $l['event_count'],
                $secText
            );
        }
        echo "============================================================\n";
        exit(0);

    case 'maak-beheerder':
        $email = str_lower(trim((string) ($argv[2] ?? '')));
        $name  = trim((string) ($argv[3] ?? 'Platformbeheerder'));

        if ($email === '' || !str_contains($email, '@')) {
            fwrite(STDERR, "Gebruik: php cli/beheer.php maak-beheerder <email> [\"Volledige Naam\"]\n");
            exit(1);
        }

        $stmt = $pdo->prepare('SELECT id, full_name FROM users WHERE LOWER(email) = ? LIMIT 1');
        $stmt->execute([$email]);
        $existing = $stmt->fetch();

        if ($existing) {
            $pdo->prepare('UPDATE users SET is_platform_admin = 1 WHERE id = ?')->execute([$existing['id']]);
            echo "[OK] {$existing['full_name']} <{$email}> is nu ingesteld als Platformbeheerder.\n";
            exit(0);
        }

        $firstLodge = $pdo->query('SELECT id, city FROM lodges ORDER BY number ASC LIMIT 1')->fetch();
        if (!$firstLodge) {
            fwrite(STDERR, "Fout: er is nog geen loge in de database aanwezig.\n");
            exit(1);
        }

        $newUserId = new_id('usr');
        $formatted = str_starts_with($name, 'Br.') ? $name : ('Br. ' . $name);
        $pdo->prepare("
            INSERT INTO users (id, email, full_name, phone, city, avatar_url, degree, is_platform_admin, primary_lodge_id, dietary_default, created_at)
            VALUES (?, ?, ?, '', ?, '', 3, 1, ?, '', ?)
        ")->execute([$newUserId, $email, $formatted, $firstLodge['city'], $firstLodge['id'], gmdate('c')]);

        $pdo->prepare("
            INSERT INTO lodge_memberships (user_id, lodge_id, role, officer_title, sort_order, joined_year)
            VALUES (?, ?, 'member', 'Platformbeheerder', 10, ?)
        ")->execute([$newUserId, $firstLodge['id'], (int) date('Y')]);

        echo "[OK] Nieuw account aangemaakt voor {$formatted} <{$email}> met Platformbeheerder-rechten.\n";
        exit(0);

    case 'verwijder-beheerder':
        $email = str_lower(trim((string) ($argv[2] ?? '')));
        if ($email === '') {
            fwrite(STDERR, "Gebruik: php cli/beheer.php verwijder-beheerder <email>\n");
            exit(1);
        }

        $totalAdmins = (int) $pdo->query('SELECT COUNT(*) FROM users WHERE is_platform_admin = 1')->fetchColumn();
        if ($totalAdmins <= 1) {
            fwrite(STDERR, "Geweigerd: er moet altijd minimaal 1 Platformbeheerder actief blijven.\n");
            exit(1);
        }

        $stmt = $pdo->prepare('SELECT id, full_name FROM users WHERE LOWER(email) = ? AND is_platform_admin = 1 LIMIT 1');
        $stmt->execute([$email]);
        $target = $stmt->fetch();

        if (!$target) {
            fwrite(STDERR, "Geen actieve Platformbeheerder gevonden met e-mailadres {$email}.\n");
            exit(1);
        }

        $pdo->prepare('UPDATE users SET is_platform_admin = 0 WHERE id = ?')->execute([$target['id']]);
        echo "[OK] Platformbeheerder-rechten ingetrokken voor {$target['full_name']} <{$email}>.\n";
        exit(0);

    case 'nieuw-loge':
        $number   = (int) ($argv[2] ?? 0);
        $name     = trim((string) ($argv[3] ?? ''));
        $city     = trim((string) ($argv[4] ?? ''));
        $address  = trim((string) ($argv[5] ?? ''));
        $secName  = trim((string) ($argv[6] ?? ''));
        $secEmail = str_lower(trim((string) ($argv[7] ?? '')));

        if ($number <= 0 || $name === '' || $city === '' || $address === '' || $secName === '' || !str_contains($secEmail, '@')) {
            fwrite(STDERR, "Gebruik: php cli/beheer.php nieuw-loge <nummer> \"<naam>\" \"<stad>\" \"<adres>\" \"<secretaris-naam>\" <secretaris-email>\n");
            exit(1);
        }

        $lodgeId = slugify_lodge_id($name, $number);
        $chk = $pdo->prepare('SELECT id FROM lodges WHERE id = ? OR number = ? LIMIT 1');
        $chk->execute([$lodgeId, $number]);
        if ($chk->fetch()) {
            fwrite(STDERR, "Fout: er bestaat al een loge met nummer {$number}.\n");
            exit(1);
        }

        $pdo->prepare("
            INSERT INTO lodges (id, number, name, city, meeting_day, address, accent_color, logo_url, description)
            VALUES (?, ?, ?, ?, 'Wekelijkse arbeid (20:00 uur)', ?, '#1B365D', '', '')
        ")->execute([$lodgeId, $number, $name, $city, $address]);

        assign_secretary_to_lodge($pdo, $lodgeId, $secName, $secEmail, $city);
        echo "[OK] Loge {$name} Nr. {$number} ({$city}) is aangemaakt.\n";
        echo "[OK] Eerste Secretaris gekoppeld: {$secName} <{$secEmail}>.\n";
        exit(0);

    case 'koppel-secretaris':
        $number   = (int) ($argv[2] ?? 0);
        $secName  = trim((string) ($argv[3] ?? ''));
        $secEmail = str_lower(trim((string) ($argv[4] ?? '')));

        if ($number <= 0 || $secName === '' || !str_contains($secEmail, '@')) {
            fwrite(STDERR, "Gebruik: php cli/beheer.php koppel-secretaris <logenummer> \"<secretaris-naam>\" <secretaris-email>\n");
            exit(1);
        }

        $stmt = $pdo->prepare('SELECT id, name, number, city FROM lodges WHERE number = ? LIMIT 1');
        $stmt->execute([$number]);
        $lodge = $stmt->fetch();

        if (!$lodge) {
            fwrite(STDERR, "Fout: geen loge gevonden met nummer {$number}.\n");
            exit(1);
        }

        assign_secretary_to_lodge($pdo, (string) $lodge['id'], $secName, $secEmail, (string) $lodge['city']);
        echo "[OK] {$secName} <{$secEmail}> is nu Secretaris van Loge {$lodge['name']} Nr. {$lodge['number']} ({$lodge['city']}).\n";
        exit(0);

    default:
        echo "Mijn Werkplank CLI-beheer (PHP)\n\n";
        echo "Beschikbare commando's:\n";
        echo "  php cli/beheer.php status\n";
        echo "  php cli/beheer.php maak-beheerder <email> [\"Volledige Naam\"]\n";
        echo "  php cli/beheer.php verwijder-beheerder <email>\n";
        echo "  php cli/beheer.php nieuw-loge <nr> \"<naam>\" \"<stad>\" \"<adres>\" \"<sec-naam>\" <sec-email>\n";
        echo "  php cli/beheer.php koppel-secretaris <logenummer> \"<sec-naam>\" <sec-email>\n";
        exit(0);
}
