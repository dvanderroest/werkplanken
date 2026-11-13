<?php
declare(strict_types=1);

/**
 * PDO Database-laag voor Mijn Werkplank (ondersteunt standaard SQLite én optioneel MySQL/MariaDB).
 */

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $cfg = app_config();
    $dsn = (string) $cfg['db_dsn'];

    if (str_starts_with($dsn, 'sqlite:')) {
        $sqlitePath = substr($dsn, 7);
        $dir = dirname($sqlitePath);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
    }

    $pdo = new PDO($dsn, (string) $cfg['db_user'], (string) $cfg['db_pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    if (str_starts_with($dsn, 'sqlite:')) {
        $pdo->exec('PRAGMA journal_mode = WAL;');
        $pdo->exec('PRAGMA foreign_keys = ON;');
        $pdo->exec('PRAGMA busy_timeout = 5000;');
    }

    initialize_schema($pdo);
    ensure_schema_upgrades($pdo);
    seed_database_if_empty($pdo);
    ensure_platform_admin_exists($pdo);

    return $pdo;
}

function is_sqlite_driver(PDO $pdo): bool
{
    return $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
}

function initialize_schema(PDO $pdo): void
{
    if (is_sqlite_driver($pdo)) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS lodges (
                id TEXT PRIMARY KEY,
                number INTEGER NOT NULL,
                name TEXT NOT NULL,
                city TEXT NOT NULL,
                meeting_day TEXT NOT NULL,
                address TEXT NOT NULL,
                accent_color TEXT NOT NULL DEFAULT '#1B365D',
                logo_url TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                phone TEXT NOT NULL DEFAULT '',
                city TEXT NOT NULL DEFAULT '',
                avatar_url TEXT NOT NULL DEFAULT '',
                degree INTEGER NOT NULL CHECK(degree IN (1, 2, 3)),
                is_platform_admin INTEGER NOT NULL DEFAULT 0,
                primary_lodge_id TEXT NOT NULL REFERENCES lodges(id),
                dietary_default TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS lodge_memberships (
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                lodge_id TEXT NOT NULL REFERENCES lodges(id) ON DELETE CASCADE,
                role TEXT NOT NULL CHECK(role IN ('member', 'board', 'secretary')),
                officer_title TEXT,
                sort_order INTEGER NOT NULL DEFAULT 100,
                joined_year INTEGER,
                PRIMARY KEY (user_id, lodge_id)
            );

            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                lodge_id TEXT NOT NULL REFERENCES lodges(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                event_type TEXT NOT NULL,
                min_degree INTEGER NOT NULL CHECK(min_degree IN (1, 2, 3)),
                event_date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                doors_open_time TEXT NOT NULL DEFAULT '19:30',
                location TEXT NOT NULL,
                speaker TEXT NOT NULL DEFAULT '',
                has_meal INTEGER NOT NULL DEFAULT 1,
                meal_info TEXT NOT NULL DEFAULT '',
                allow_visitors INTEGER NOT NULL DEFAULT 1,
                werkplank_text TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS rsvps (
                id TEXT PRIMARY KEY,
                event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status TEXT NOT NULL CHECK(status IN ('attending', 'declined')),
                joins_meal INTEGER NOT NULL DEFAULT 0,
                is_visitor INTEGER NOT NULL DEFAULT 0,
                dietary_note TEXT NOT NULL DEFAULT '',
                comment TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL,
                UNIQUE (event_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                lodge_id TEXT NOT NULL REFERENCES lodges(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                category TEXT NOT NULL,
                min_degree INTEGER NOT NULL CHECK(min_degree IN (1, 2, 3)),
                published_date TEXT NOT NULL,
                summary TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS announcements (
                id TEXT PRIMARY KEY,
                lodge_id TEXT NOT NULL REFERENCES lodges(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                author_name TEXT NOT NULL,
                body TEXT NOT NULL,
                is_pinned INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS auth_challenges (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                code TEXT NOT NULL,
                magic_token TEXT UNIQUE NOT NULL,
                expires_at INTEGER NOT NULL,
                used_at INTEGER,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                active_lodge_id TEXT NOT NULL REFERENCES lodges(id),
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                last_seen_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS rsvp_tokens (
                token TEXT PRIMARY KEY,
                event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS email_outbox (
                id TEXT PRIMARY KEY,
                to_email TEXT NOT NULL,
                to_name TEXT NOT NULL DEFAULT '',
                subject TEXT NOT NULL,
                html_body TEXT NOT NULL,
                text_body TEXT NOT NULL,
                preview_code TEXT,
                preview_link TEXT,
                delivery_mode TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        ");
        return;
    }

    // MySQL / MariaDB variant voor shared webhosting
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS lodges (
            id VARCHAR(80) PRIMARY KEY,
            number INT NOT NULL,
            name VARCHAR(190) NOT NULL,
            city VARCHAR(120) NOT NULL,
            meeting_day VARCHAR(190) NOT NULL,
            address VARCHAR(255) NOT NULL,
            accent_color VARCHAR(20) NOT NULL DEFAULT '#1B365D',
            logo_url MEDIUMTEXT NOT NULL,
            description TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(80) PRIMARY KEY,
            email VARCHAR(190) UNIQUE NOT NULL,
            full_name VARCHAR(190) NOT NULL,
            phone VARCHAR(60) NOT NULL DEFAULT '',
            city VARCHAR(120) NOT NULL DEFAULT '',
            avatar_url MEDIUMTEXT NOT NULL,
            degree TINYINT NOT NULL,
            is_platform_admin TINYINT NOT NULL DEFAULT 0,
            primary_lodge_id VARCHAR(80) NOT NULL,
            dietary_default VARCHAR(255) NOT NULL DEFAULT '',
            created_at VARCHAR(40) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS lodge_memberships (
            user_id VARCHAR(80) NOT NULL,
            lodge_id VARCHAR(80) NOT NULL,
            role VARCHAR(30) NOT NULL,
            officer_title VARCHAR(120) NULL,
            sort_order INT NOT NULL DEFAULT 100,
            joined_year INT NULL,
            PRIMARY KEY (user_id, lodge_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS events (
            id VARCHAR(80) PRIMARY KEY,
            lodge_id VARCHAR(80) NOT NULL,
            title VARCHAR(255) NOT NULL,
            event_type VARCHAR(60) NOT NULL,
            min_degree TINYINT NOT NULL,
            event_date VARCHAR(20) NOT NULL,
            start_time VARCHAR(20) NOT NULL,
            doors_open_time VARCHAR(20) NOT NULL DEFAULT '19:30',
            location VARCHAR(255) NOT NULL,
            speaker VARCHAR(190) NOT NULL DEFAULT '',
            has_meal TINYINT NOT NULL DEFAULT 1,
            meal_info VARCHAR(255) NOT NULL DEFAULT '',
            allow_visitors TINYINT NOT NULL DEFAULT 1,
            werkplank_text MEDIUMTEXT NOT NULL,
            created_at VARCHAR(40) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS rsvps (
            id VARCHAR(80) PRIMARY KEY,
            event_id VARCHAR(80) NOT NULL,
            user_id VARCHAR(80) NOT NULL,
            status VARCHAR(30) NOT NULL,
            joins_meal TINYINT NOT NULL DEFAULT 0,
            is_visitor TINYINT NOT NULL DEFAULT 0,
            dietary_note VARCHAR(255) NOT NULL DEFAULT '',
            comment TEXT NOT NULL,
            updated_at VARCHAR(40) NOT NULL,
            UNIQUE KEY uniq_event_user (event_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS documents (
            id VARCHAR(80) PRIMARY KEY,
            lodge_id VARCHAR(80) NOT NULL,
            title VARCHAR(255) NOT NULL,
            author VARCHAR(190) NOT NULL,
            category VARCHAR(60) NOT NULL,
            min_degree TINYINT NOT NULL,
            published_date VARCHAR(20) NOT NULL,
            summary TEXT NOT NULL,
            content MEDIUMTEXT NOT NULL,
            created_at VARCHAR(40) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS announcements (
            id VARCHAR(80) PRIMARY KEY,
            lodge_id VARCHAR(80) NOT NULL,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(60) NOT NULL,
            author_name VARCHAR(190) NOT NULL,
            body MEDIUMTEXT NOT NULL,
            is_pinned TINYINT NOT NULL DEFAULT 0,
            created_at VARCHAR(40) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS auth_challenges (
            id VARCHAR(80) PRIMARY KEY,
            email VARCHAR(190) NOT NULL,
            code VARCHAR(10) NOT NULL,
            magic_token VARCHAR(120) UNIQUE NOT NULL,
            expires_at BIGINT NOT NULL,
            used_at BIGINT NULL,
            created_at BIGINT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS sessions (
            token_hash VARCHAR(80) PRIMARY KEY,
            user_id VARCHAR(80) NOT NULL,
            active_lodge_id VARCHAR(80) NOT NULL,
            expires_at BIGINT NOT NULL,
            created_at BIGINT NOT NULL,
            last_seen_at BIGINT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS rsvp_tokens (
            token VARCHAR(120) PRIMARY KEY,
            event_id VARCHAR(80) NOT NULL,
            user_id VARCHAR(80) NOT NULL,
            expires_at BIGINT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS email_outbox (
            id VARCHAR(80) PRIMARY KEY,
            to_email VARCHAR(190) NOT NULL,
            to_name VARCHAR(190) NOT NULL DEFAULT '',
            subject VARCHAR(255) NOT NULL,
            html_body MEDIUMTEXT NOT NULL,
            text_body MEDIUMTEXT NOT NULL,
            preview_code VARCHAR(20) NULL,
            preview_link TEXT NULL,
            delivery_mode VARCHAR(30) NOT NULL,
            created_at VARCHAR(40) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
}

function ensure_sqlite_column(PDO $pdo, string $table, string $column, string $definition): void
{
    $cols = $pdo->query("PRAGMA table_info($table)")->fetchAll();
    foreach ($cols as $col) {
        if (($col['name'] ?? '') === $column) {
            return;
        }
    }
    $pdo->exec("ALTER TABLE $table ADD COLUMN $column $definition;");
}

function ensure_schema_upgrades(PDO $pdo): void
{
    if (is_sqlite_driver($pdo)) {
        ensure_sqlite_column($pdo, 'lodges', 'logo_url', "TEXT NOT NULL DEFAULT ''");
        ensure_sqlite_column($pdo, 'users', 'avatar_url', "TEXT NOT NULL DEFAULT ''");
        ensure_sqlite_column($pdo, 'users', 'is_platform_admin', 'INTEGER NOT NULL DEFAULT 0');
    }

    // Zorg dat voorbeeld-emblemen en portretten netjes gevuld zijn bij testdata
    $demoLodges = [
        'loge-noorderster' => '/demo/loge-noorderster.jpg',
        'loge-concordia'   => '/demo/loge-concordia.jpg',
        'loge-ars-regia'   => '/demo/loge-ars-regia.jpg',
    ];
    $stmtLodge = $pdo->prepare(
        "UPDATE lodges SET logo_url = ? WHERE id = ? AND (logo_url IS NULL OR logo_url = '' OR logo_url LIKE '/demo/%.png')"
    );
    foreach ($demoLodges as $id => $url) {
        $stmtLodge->execute([$url, $id]);
    }

    $demoUsers = [
        'usr-eduard'   => '/demo/usr-eduard.jpg',
        'usr-willem'   => '/demo/usr-willem.jpg',
        'usr-hendrik'  => '/demo/usr-hendrik.jpg',
        'usr-thomas'   => '/demo/usr-thomas.jpg',
        'usr-daan'     => '/demo/usr-daan.jpg',
        'usr-johannes' => '/demo/usr-johannes.jpg',
        'usr-arthur'   => '/demo/usr-arthur.jpg',
        'usr-gerard'   => '/demo/usr-gerard.jpg',
        'usr-maarten'  => '/demo/usr-maarten.jpg',
        'usr-karel'    => '/demo/usr-karel.jpg',
        'usr-pieter'   => '/demo/usr-pieter.jpg',
        'usr-roelof'   => '/demo/usr-roelof.jpg',
    ];
    $stmtUser = $pdo->prepare(
        "UPDATE users SET avatar_url = ? WHERE id = ? AND (avatar_url IS NULL OR avatar_url = '' OR avatar_url LIKE '/demo/%.png')"
    );
    foreach ($demoUsers as $id => $url) {
        $stmtUser->execute([$url, $id]);
    }
}

/**
 * Zorgt dat er in een bestaande testdatabase ook direct een Platformbeheerder aanwezig is.
 */
function ensure_platform_admin_exists(PDO $pdo): void
{
    $count = (int) $pdo->query('SELECT COUNT(*) FROM users WHERE is_platform_admin = 1')->fetchColumn();
    if ($count > 0) {
        return;
    }

    // Kijk of een van de standaard demo-loges aanwezig is
    $lodge = $pdo->query("SELECT id FROM lodges WHERE id = 'loge-ars-regia' LIMIT 1")->fetchColumn();
    if (!$lodge) {
        $lodge = $pdo->query('SELECT id FROM lodges ORDER BY number ASC LIMIT 1')->fetchColumn();
    }
    if (!$lodge) {
        return;
    }

    $existingEduard = $pdo->query("SELECT id FROM users WHERE id = 'usr-eduard' OR LOWER(email) = 'beheer@werkplanken.loge'")->fetch();
    if ($existingEduard) {
        $pdo->prepare('UPDATE users SET is_platform_admin = 1 WHERE id = ?')->execute([$existingEduard['id']]);
        return;
    }

    $nowIso = gmdate('c');
    $pdo->prepare("
        INSERT INTO users (id, email, full_name, phone, city, avatar_url, degree, is_platform_admin, primary_lodge_id, dietary_default, created_at)
        VALUES ('usr-eduard', 'beheer@werkplanken.loge', 'Br. Eduard van Pallandt', '033-4618820', 'Amersfoort', '/demo/usr-eduard.jpg', 3, 1, ?, '', ?)
    ")->execute([(string) $lodge, $nowIso]);

    $pdo->prepare("
        INSERT INTO lodge_memberships (user_id, lodge_id, role, officer_title, sort_order, joined_year)
        VALUES ('usr-eduard', ?, 'member', 'Platformbeheerder', 10, 2005)
    ")->execute([(string) $lodge]);
}

// ============================================================================
// Autorisatie-controles (strikte scheiding van rollen, loges en graden)
// ============================================================================

function is_platform_admin(?array $user): bool
{
    return !empty($user) && ((int) ($user['is_platform_admin'] ?? 0) === 1);
}

function is_member_of_lodge(array $user, string $lodgeId): bool
{
    foreach ($user['memberships'] ?? [] as $m) {
        if ($m['lodge_id'] === $lodgeId) {
            return true;
        }
    }
    return false;
}

function can_manage_lodge(array $user, string $lodgeId): bool
{
    foreach ($user['memberships'] ?? [] as $m) {
        if ($m['lodge_id'] === $lodgeId && in_array($m['role'], ['secretary', 'board'], true)) {
            return true;
        }
    }
    return false;
}

// ============================================================================
// Query-functies voor Loges, Werkplanken, Visiteren, Wie-is-wie & Bouwstukken
// ============================================================================

function get_lodge_by_id(string $lodgeId): ?array
{
    $stmt = db()->prepare('SELECT * FROM lodges WHERE id = ?');
    $stmt->execute([$lodgeId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function get_user_memberships(string $userId): array
{
    $stmt = db()->prepare("
        SELECT m.lodge_id, m.role, m.officer_title, m.sort_order, m.joined_year,
               l.name AS lodge_name, l.number AS lodge_number, l.city AS lodge_city,
               l.accent_color AS lodge_accent_color, l.logo_url AS lodge_logo_url
        FROM lodge_memberships m
        JOIN lodges l ON l.id = m.lodge_id
        WHERE m.user_id = ?
        ORDER BY l.number ASC
    ");
    $stmt->execute([$userId]);
    return $stmt->fetchAll();
}

function get_own_lodge_events(array $user, string $lodgeId): array
{
    if (!is_member_of_lodge($user, $lodgeId)) {
        return [];
    }

    $todayIso = date('Y-m-d');
    $stmt = db()->prepare("
        SELECT e.*, l.name AS lodge_name, l.number AS lodge_number, l.city AS lodge_city,
               l.accent_color AS lodge_accent_color, l.logo_url AS lodge_logo_url,
               mr.status AS my_status, mr.joins_meal AS my_meal, mr.is_visitor AS my_visitor,
               mr.dietary_note AS my_diet, mr.comment AS my_comment,
               (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'attending' AND r.is_visitor = 0) AS attending_members,
               (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'attending' AND r.is_visitor = 1) AS attending_visitors,
               (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'declined') AS declined_members,
               (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'attending' AND r.joins_meal = 1) AS meal_count
        FROM events e
        JOIN lodges l ON l.id = e.lodge_id
        LEFT JOIN rsvps mr ON mr.event_id = e.id AND mr.user_id = ?
        WHERE e.lodge_id = ? AND e.min_degree <= ? AND e.event_date >= ?
        ORDER BY e.event_date ASC, e.start_time ASC
    ");
    $stmt->execute([$user['id'], $lodgeId, (int) $user['degree'], $todayIso]);
    return $stmt->fetchAll();
}

function get_visitor_events(array $user, string $activeLodgeId): array
{
    $todayIso = date('Y-m-d');
    $stmt = db()->prepare("
        SELECT e.*, l.name AS lodge_name, l.number AS lodge_number, l.city AS lodge_city,
               l.accent_color AS lodge_accent_color, l.logo_url AS lodge_logo_url,
               mr.status AS my_status, mr.joins_meal AS my_meal, mr.is_visitor AS my_visitor,
               mr.dietary_note AS my_diet, mr.comment AS my_comment,
               (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'attending' AND r.is_visitor = 0) AS attending_members,
               (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'attending' AND r.is_visitor = 1) AS attending_visitors,
               (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'declined') AS declined_members,
               (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'attending' AND r.joins_meal = 1) AS meal_count
        FROM events e
        JOIN lodges l ON l.id = e.lodge_id
        LEFT JOIN rsvps mr ON mr.event_id = e.id AND mr.user_id = ?
        WHERE e.lodge_id <> ? AND e.allow_visitors = 1 AND e.min_degree <= ? AND e.event_date >= ?
        ORDER BY e.event_date ASC, e.start_time ASC
    ");
    $stmt->execute([$user['id'], $activeLodgeId, (int) $user['degree'], $todayIso]);
    return $stmt->fetchAll();
}

/**
 * Slaat een aan- of afmelding op (voor zowel eigen logeleden als visiteurs!).
 *
 * @return array{ok: bool, is_visitor?: bool, error?: string}
 */
function save_user_rsvp(
    array $user,
    string $eventId,
    string $status,
    bool $joinsMeal,
    ?string $dietaryNote = null,
    ?string $comment = null
): array {
    if (!in_array($status, ['attending', 'declined'], true)) {
        return ['ok' => false, 'error' => 'Ongeldige keuze voor aanwezigheid.'];
    }

    $pdo = db();
    $stmt = $pdo->prepare('SELECT id, lodge_id, min_degree, allow_visitors, has_meal FROM events WHERE id = ?');
    $stmt->execute([$eventId]);
    $event = $stmt->fetch();

    if (!$event) {
        return ['ok' => false, 'error' => 'Deze bijeenkomst kon niet worden gevonden.'];
    }

    if ((int) $user['degree'] < (int) $event['min_degree']) {
        return ['ok' => false, 'error' => 'Deze arbeid vereist een hogere graad.'];
    }

    $memberOfHost = is_member_of_lodge($user, (string) $event['lodge_id']);
    if (!$memberOfHost && (int) $event['allow_visitors'] !== 1) {
        return ['ok' => false, 'error' => 'Deze bijeenkomst is besloten voor leden van de eigen loge.'];
    }

    $isVisitor = $memberOfHost ? 0 : 1;
    $mealInt = ($status === 'attending' && (int) $event['has_meal'] === 1 && $joinsMeal) ? 1 : 0;
    $diet = trim((string) ($dietaryNote !== null ? $dietaryNote : ($user['dietary_default'] ?? '')));
    $note = trim((string) ($comment ?? ''));
    $nowIso = gmdate('c');

    $check = $pdo->prepare('SELECT id FROM rsvps WHERE event_id = ? AND user_id = ?');
    $check->execute([$eventId, $user['id']]);
    $existingId = $check->fetchColumn();

    if ($existingId) {
        $pdo->prepare("
            UPDATE rsvps
            SET status = ?, joins_meal = ?, is_visitor = ?, dietary_note = ?, comment = ?, updated_at = ?
            WHERE id = ?
        ")->execute([$status, $mealInt, $isVisitor, $diet, $note, $nowIso, $existingId]);
    } else {
        $pdo->prepare("
            INSERT INTO rsvps (id, event_id, user_id, status, joins_meal, is_visitor, dietary_note, comment, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ")->execute([new_id('rsvp'), $eventId, $user['id'], $status, $mealInt, $isVisitor, $diet, $note, $nowIso]);
    }

    return ['ok' => true, 'is_visitor' => ($isVisitor === 1)];
}

function get_lodge_members(array $user, string $lodgeId): array
{
    // Strikte AVG- & discretie-regel: uitsluitend eigen leden van deze loge mogen de ledenlijst zien!
    if (!is_member_of_lodge($user, $lodgeId)) {
        return [];
    }

    $stmt = db()->prepare("
        SELECT u.id AS user_id, u.full_name, u.email, u.phone, u.city, u.avatar_url, u.degree,
               m.role, m.officer_title, m.sort_order, m.joined_year
        FROM lodge_memberships m
        JOIN users u ON u.id = m.user_id
        WHERE m.lodge_id = ?
        ORDER BY m.sort_order ASC, u.full_name ASC
    ");
    $stmt->execute([$lodgeId]);
    return $stmt->fetchAll();
}

function get_lodge_documents(array $user, string $lodgeId): array
{
    // Strikte scheiding: alleen eigen loge én maximaal de graad van de ingelogde broeder!
    if (!is_member_of_lodge($user, $lodgeId)) {
        return [];
    }

    $stmt = db()->prepare("
        SELECT *
        FROM documents
        WHERE lodge_id = ? AND min_degree <= ?
        ORDER BY published_date DESC, created_at DESC
    ");
    $stmt->execute([$lodgeId, (int) $user['degree']]);
    return $stmt->fetchAll();
}

function get_lodge_announcements(array $user, string $lodgeId): array
{
    if (!is_member_of_lodge($user, $lodgeId)) {
        return [];
    }

    $stmt = db()->prepare("
        SELECT *
        FROM announcements
        WHERE lodge_id = ?
        ORDER BY is_pinned DESC, created_at DESC
    ");
    $stmt->execute([$lodgeId]);
    return $stmt->fetchAll();
}

function get_event_rsvps_for_management(array $user, string $eventId): array
{
    $pdo = db();
    $stmt = $pdo->prepare('SELECT lodge_id FROM events WHERE id = ?');
    $stmt->execute([$eventId]);
    $lodgeId = $stmt->fetchColumn();

    if (!$lodgeId || !can_manage_lodge($user, (string) $lodgeId)) {
        return [];
    }

    $rows = $pdo->prepare("
        SELECT r.*, u.full_name, u.email, u.phone, u.avatar_url, u.degree,
               hl.name AS home_lodge_name, hl.number AS home_lodge_number, hl.city AS home_lodge_city
        FROM rsvps r
        JOIN users u ON u.id = r.user_id
        JOIN lodges hl ON hl.id = u.primary_lodge_id
        WHERE r.event_id = ?
        ORDER BY r.status ASC, r.is_visitor ASC, u.full_name ASC
    ");
    $rows->execute([$eventId]);
    return $rows->fetchAll();
}

// ============================================================================
// Platformbeheerder-queries (alleen voor is_platform_admin = 1, zonder in te breken
// op interne bouwstukken of volledige ledenlijsten van afzonderlijke loges!)
// ============================================================================

function get_all_lodges_for_platform_admin(array $user): array
{
    if (!is_platform_admin($user)) {
        return [];
    }

    $pdo = db();
    $lodges = $pdo->query("
        SELECT l.*,
               (SELECT COUNT(*) FROM lodge_memberships m WHERE m.lodge_id = l.id) AS member_count,
               (SELECT COUNT(*) FROM events e WHERE e.lodge_id = l.id) AS event_count
        FROM lodges l
        ORDER BY l.number ASC
    ")->fetchAll();

    $secStmt = $pdo->prepare("
        SELECT u.id, u.full_name, u.email
        FROM lodge_memberships m
        JOIN users u ON u.id = m.user_id
        WHERE m.lodge_id = ? AND m.role = 'secretary'
        ORDER BY u.full_name ASC
    ");

    foreach ($lodges as &$lodge) {
        $secStmt->execute([$lodge['id']]);
        $lodge['secretaries'] = $secStmt->fetchAll();
    }
    unset($lodge);

    return $lodges;
}

function get_platform_admins_list(array $user): array
{
    if (!is_platform_admin($user)) {
        return [];
    }

    return db()->query("
        SELECT u.id, u.full_name, u.email, u.avatar_url, u.is_platform_admin,
               l.name AS lodge_name, l.number AS lodge_number, l.city AS lodge_city
        FROM users u
        JOIN lodges l ON l.id = u.primary_lodge_id
        ORDER BY u.is_platform_admin DESC, u.full_name ASC
    ")->fetchAll();
}

function get_recent_outbox_emails(int $limit = 15): array
{
    $stmt = db()->prepare('SELECT * FROM email_outbox ORDER BY created_at DESC LIMIT ?');
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}
