<?php
declare(strict_types=1);

/**
 * Algemene hulpfuncties voor veilige HTML-uitvoer, Nederlandse datums, CSRF en afbeeldingen.
 */

function e(?string $value): string
{
    return htmlspecialchars((string) ($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function str_lower(string $value): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
}

function str_len(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function str_sub(string $value, int $start, ?int $length = null): string
{
    if (function_exists('mb_substr')) {
        return $length === null
            ? mb_substr($value, $start, null, 'UTF-8')
            : mb_substr($value, $start, $length, 'UTF-8');
    }
    return $length === null ? substr($value, $start) : substr($value, $start, $length);
}

function new_id(string $prefix): string
{
    return $prefix . '-' . bin2hex(random_bytes(6));
}

function degree_label(int $degree): string
{
    return match ($degree) {
        1 => 'Leerling (1e graad)',
        2 => 'Gezel (2e graad)',
        3 => 'Meester (3e graad)',
        default => 'Leerling (1e graad)',
    };
}

function degree_short_label(int $degree): string
{
    return match ($degree) {
        1 => '1e graad · Leerling',
        2 => '2e graad · Gezel',
        3 => '3e graad · Meester',
        default => '1e graad · Leerling',
    };
}

function role_label(string $role): string
{
    return match ($role) {
        'secretary' => 'Secretaris (Beheer)',
        'board'     => 'Bestuur / Officier',
        default     => 'Lid',
    };
}

function format_dutch_date(string $isoDate): string
{
    $dt = DateTimeImmutable::createFromFormat('Y-m-d', substr($isoDate, 0, 10));
    if (!$dt) {
        return $isoDate;
    }

    $dagen = [
        0 => 'zondag',
        1 => 'maandag',
        2 => 'dinsdag',
        3 => 'woensdag',
        4 => 'donderdag',
        5 => 'vrijdag',
        6 => 'zaterdag',
    ];
    $maanden = [
        1  => 'januari',
        2  => 'februari',
        3  => 'maart',
        4  => 'april',
        5  => 'mei',
        6  => 'juni',
        7  => 'juli',
        8  => 'augustus',
        9  => 'september',
        10 => 'oktober',
        11 => 'november',
        12 => 'december',
    ];

    $dagNaam = $dagen[(int) $dt->format('w')] ?? '';
    $dagNummer = (int) $dt->format('j');
    $maandNaam = $maanden[(int) $dt->format('n')] ?? '';
    $jaar = $dt->format('Y');

    return trim("$dagNaam $dagNummer $maandNaam $jaar");
}

function days_until_label(string $isoDate): string
{
    $target = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', substr($isoDate, 0, 10) . ' 12:00:00');
    if (!$target) {
        return '';
    }
    $today = new DateTimeImmutable('today 12:00:00');
    $diffDays = (int) $today->diff($target)->format('%r%a');

    if ($diffDays === 0) {
        return 'Vandaag';
    }
    if ($diffDays === 1) {
        return 'Morgen';
    }
    if ($diffDays > 1) {
        return "Over $diffDays dagen";
    }
    return 'Geweest';
}

function user_initials(string $fullName): string
{
    $clean = trim((string) preg_replace('/^Br\.\s*/iu', '', $fullName));
    $parts = preg_split('/\s+/u', $clean) ?: [];
    $out = '';
    foreach (array_slice($parts, 0, 2) as $part) {
        if ($part !== '') {
            $out .= strtoupper(substr($part, 0, 1));
        }
    }
    return $out !== '' ? $out : 'BR';
}

/**
 * Controleert een geüploade foto/embleem (data:image/... base64 of /demo/... pad).
 *
 * @return array{ok: bool, value?: string, error?: string}
 */
function validate_image_value(?string $input): array
{
    $trimmed = trim((string) ($input ?? ''));
    if ($trimmed === '') {
        return ['ok' => true, 'value' => ''];
    }

    if (preg_match('#^/?demo/[a-z0-9_-]+\.(jpg|jpeg|png|webp|svg)$#i', $trimmed)) {
        $normalized = '/' . ltrim($trimmed, '/');
        return ['ok' => true, 'value' => $normalized];
    }

    if (strlen($trimmed) > 550000) {
        return [
            'ok'    => false,
            'error' => 'De afbeelding is te groot. Kies alstublieft een kleinere foto.',
        ];
    }

    if (!preg_match('#^data:image/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$#', $trimmed)) {
        return [
            'ok'    => false,
            'error' => 'Alleen JPG, PNG, WebP of GIF afbeeldingen worden ondersteund.',
        ];
    }

    return ['ok' => true, 'value' => $trimmed];
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(24));
    }
    return (string) $_SESSION['csrf_token'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf_token" value="' . e(csrf_token()) . '">';
}

function verify_csrf(): bool
{
    $sent = (string) ($_POST['csrf_token'] ?? '');
    $expected = (string) ($_SESSION['csrf_token'] ?? '');
    return $sent !== '' && $expected !== '' && hash_equals($expected, $sent);
}

function set_flash(string $type, string $message): void
{
    $_SESSION['flash'] = [
        'type'    => $type,
        'message' => $message,
    ];
}

function pull_flash(): ?array
{
    if (empty($_SESSION['flash']) || !is_array($_SESSION['flash'])) {
        return null;
    }
    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);
    return $flash;
}

function redirect_to(string $url): never
{
    header('Location: ' . $url);
    exit;
}
