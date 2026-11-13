<?php
declare(strict_types=1);

/**
 * Verwerkt alle POST-formulieren volgens het klassieke PHP Post-Redirect-Get patroon:
 * formulier opslaan -> duidelijke melding klaarzetten -> direct doorsturen met header('Location: ...').
 * Hierdoor werkt alles in elke browser (Chrome, Safari, Firefox, mobiel) razendsnel zonder cache-gedoe.
 */

function slugify_lodge_id(string $name, int $number): string
{
    $clean = strtolower((string) preg_replace('/[^a-zA-Z0-9]+/', '-', $name));
    $clean = trim($clean, '-');
    return 'loge-' . $number . '-' . ($clean !== '' ? $clean : 'werkplaats');
}

function handle_post_action(?array $currentUser): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        return;
    }

    $action = (string) ($_POST['form_action'] ?? '');
    if ($action === '') {
        return;
    }

    if (!verify_csrf()) {
        set_flash('error', 'Uw formuliersessie was verlopen. Probeer het alstublieft nog een keer.');
        redirect_to('/');
    }

    $pdo = db();

    // ========================================================================
    // 1. Authenticatie-acties (Inloggen, Demo-inloggen, Loge wisselen, Uitloggen)
    // ========================================================================

    if ($action === 'auth_request_code') {
        $email = trim((string) ($_POST['email'] ?? ''));
        $res = request_login_challenge($email);
        if (!$res['ok']) {
            set_flash('error', (string) $res['error']);
            redirect_to('/');
        }
        $_SESSION['login_pending_email']     = $email;
        $_SESSION['login_dev_preview_code']  = $res['dev_code'] ?? null;
        $_SESSION['login_dev_preview_magic'] = $res['dev_magic_url'] ?? null;
        redirect_to('/?stap=code');
    }

    if ($action === 'auth_back_to_email') {
        unset($_SESSION['login_pending_email'], $_SESSION['login_dev_preview_code'], $_SESSION['login_dev_preview_magic']);
        redirect_to('/');
    }

    if ($action === 'auth_verify_code') {
        $email = trim((string) ($_POST['email'] ?? ($_SESSION['login_pending_email'] ?? '')));
        $code  = trim((string) ($_POST['code'] ?? ''));
        $keep  = !empty($_POST['keep_signed_in']);

        $res = verify_code_and_login($email, $code, $keep);
        if (!$res['ok']) {
            set_flash('error', (string) $res['error']);
            redirect_to('/?stap=code');
        }

        unset($_SESSION['login_pending_email'], $_SESSION['login_dev_preview_code'], $_SESSION['login_dev_preview_magic']);
        set_flash('success', 'Welkom terug! U bent succesvol ingelogd.');
        redirect_to('/');
    }

    if ($action === 'auth_demo_login') {
        if (!is_dev_mailbox_enabled()) {
            set_flash('error', 'Voorbeeldaccounts staan uit in productie.');
            redirect_to('/');
        }
        $email = str_lower(trim((string) ($_POST['email'] ?? '')));
        $stmt = $pdo->prepare('SELECT id, full_name, is_platform_admin, primary_lodge_id FROM users WHERE LOWER(email) = ? LIMIT 1');
        $stmt->execute([$email]);
        $u = $stmt->fetch();
        if (!$u) {
            set_flash('error', 'Voorbeeldaccount niet gevonden.');
            redirect_to('/');
        }

        create_session_for_user((string) $u['id'], (string) $u['primary_lodge_id'], true);

        // Als je met het Platformbeheerder-testaccount inlogt, open dan direct het Platformbeheer-overzicht
        if ((int) $u['is_platform_admin'] === 1) {
            set_flash('success', 'Ingelogd als ' . $u['full_name'] . ' (Platformbeheerder).');
            redirect_to('/?tab=platformbeheer');
        }

        set_flash('success', 'Ingelogd als ' . $u['full_name'] . '.');
        redirect_to('/');
    }

    if ($action === 'auth_logout') {
        destroy_current_session();
        set_flash('success', 'U bent veilig uitgelogd.');
        redirect_to('/');
    }

    // 1-klik RSVP dieetwens bijwerken vanuit de e-mailbevestigingspagina (zonder inloggen)
    if ($action === 'rsvp_token_update') {
        $token = trim((string) ($_POST['token'] ?? ''));
        $info = resolve_rsvp_email_token($token);
        if (!$info) {
            set_flash('error', 'Deze aanmeldlink is verlopen.');
            redirect_to('/');
        }

        $status    = ($_POST['status'] ?? 'attending') === 'declined' ? 'declined' : 'attending';
        $joinsMeal = ($status === 'attending' && !empty($_POST['joins_meal']) && (int) $info['has_meal'] === 1);
        $diet      = trim((string) ($_POST['dietary_note'] ?? ''));
        $comment   = trim((string) ($_POST['comment'] ?? ''));

        $fakeUser = [
            'id'              => (string) $info['user_id'],
            'degree'          => (int) $info['degree'],
            'dietary_default' => (string) $info['dietary_default'],
            'memberships'     => get_user_memberships((string) $info['user_id']),
        ];

        save_user_rsvp($fakeUser, (string) $info['event_id'], $status, $joinsMeal, $diet, $comment);
        set_flash('success', 'Uw voorkeur en eventuele dieetwens zijn bijgewerkt!');
        redirect_to('/rsvp?token=' . urlencode($token) . '&opgeslagen=1');
    }

    // Alle onderstaande acties vereisen een ingelogde broeder
    if (!$currentUser) {
        set_flash('error', 'Uw sessie is verlopen. Log alstublieft opnieuw in.');
        redirect_to('/');
    }

    if ($action === 'auth_switch_lodge') {
        $nextLodgeId = trim((string) ($_POST['lodge_id'] ?? ''));
        if ($nextLodgeId !== '' && switch_active_lodge_for_current_session($nextLodgeId)) {
            $lodge = get_lodge_by_id($nextLodgeId);
            if ($lodge) {
                set_flash('success', 'Overgeschakeld naar Loge ' . $lodge['name'] . ' Nr. ' . $lodge['number'] . ' (' . $lodge['city'] . ').');
            }
        } else {
            set_flash('error', 'U bent geen lid van de gekozen loge.');
        }
        redirect_to('/');
    }

    // ========================================================================
    // 2. Leden-acties (Aanmelden Werkplank/Broedermaal & Mijn gegevens + pasfoto)
    // ========================================================================

    if ($action === 'rsvp_save') {
        $eventId   = trim((string) ($_POST['event_id'] ?? ''));
        $choice    = (string) ($_POST['choice'] ?? 'arbeid_en_maal');
        $diet      = isset($_POST['dietary_note']) ? (string) $_POST['dietary_note'] : null;
        $comment   = isset($_POST['comment']) ? (string) $_POST['comment'] : null;
        $returnTab = trim((string) ($_POST['return_tab'] ?? 'start'));

        $status    = ($choice === 'afwezig') ? 'declined' : 'attending';
        $joinsMeal = ($choice === 'arbeid_en_maal');

        $res = save_user_rsvp($currentUser, $eventId, $status, $joinsMeal, $diet, $comment);
        if (!$res['ok']) {
            set_flash('error', (string) $res['error']);
        } elseif ($status === 'declined') {
            set_flash('success', 'Uw afmelding is netjes doorgegeven aan de Secretaris.');
        } elseif (!empty($res['is_visitor'])) {
            set_flash(
                'success',
                $joinsMeal
                    ? 'U staat aangemeld als Visiteur (inclusief Broedermaal)! Uw moederloge en graad zijn doorgegeven.'
                    : 'U staat aangemeld als Visiteur! Uw moederloge en graad zijn doorgegeven aan de ontvangende Secretaris.'
            );
        } else {
            set_flash(
                'success',
                $joinsMeal
                    ? 'Opgeslagen: u staat genoteerd voor de Arbeid én het Broedermaal!'
                    : 'Opgeslagen: u staat als aanwezig genoteerd (alleen Arbeid).'
            );
        }

        redirect_to('/?tab=' . urlencode($returnTab) . '#evt-' . urlencode($eventId));
    }

    if ($action === 'profile_save') {
        $phone   = trim((string) ($_POST['phone'] ?? ''));
        $city    = trim((string) ($_POST['city'] ?? ''));
        $diet    = trim((string) ($_POST['dietary_default'] ?? ''));
        $avatar  = isset($_POST['avatar_url']) ? (string) $_POST['avatar_url'] : $currentUser['avatar_url'];
        $retTab  = trim((string) ($_POST['return_tab'] ?? 'start'));

        $imgCheck = validate_image_value($avatar);
        if (!$imgCheck['ok']) {
            set_flash('error', (string) $imgCheck['error']);
            redirect_to('/?tab=' . urlencode($retTab) . '&profiel=1');
        }

        $pdo->prepare('UPDATE users SET phone = ?, city = ?, dietary_default = ?, avatar_url = ? WHERE id = ?')
            ->execute([$phone, $city, $diet, $imgCheck['value'], $currentUser['id']]);

        set_flash('success', 'Uw persoonlijke gegevens en profielfoto zijn opgeslagen!');
        redirect_to('/?tab=' . urlencode($retTab));
    }

    // ========================================================================
    // 3. Loge-Secretariaat acties (ALLEEN voor de eigen loge van de Secretaris!)
    //    Let op: een Secretaris kan GEEN nieuwe loge aanmaken — dat doet de Platformbeheerder.
    // ========================================================================

    $activeLodgeId = (string) $currentUser['active_lodge_id'];

    if (str_starts_with($action, 'sec_')) {
        if (!can_manage_lodge($currentUser, $activeLodgeId)) {
            set_flash('error', 'U heeft geen beheerrechten voor het secretariaat van deze loge.');
            redirect_to('/');
        }

        if ($action === 'sec_update_lodge') {
            $meetingDay  = trim((string) ($_POST['meeting_day'] ?? ''));
            $address     = trim((string) ($_POST['address'] ?? ''));
            $accentColor = trim((string) ($_POST['accent_color'] ?? '#1B365D'));
            $description = trim((string) ($_POST['description'] ?? ''));
            $logoRaw     = isset($_POST['logo_url']) ? (string) $_POST['logo_url'] : '';

            $imgCheck = validate_image_value($logoRaw);
            if (!$imgCheck['ok']) {
                set_flash('error', (string) $imgCheck['error']);
                redirect_to('/?tab=secretariaat&sub=loge');
            }

            if ($address === '' || $meetingDay === '') {
                set_flash('error', 'Vul het adres en de vergaderavond van uw loge in.');
                redirect_to('/?tab=secretariaat&sub=loge');
            }

            $pdo->prepare("
                UPDATE lodges
                SET meeting_day = ?, address = ?, accent_color = ?, logo_url = ?, description = ?
                WHERE id = ?
            ")->execute([$meetingDay, $address, $accentColor, $imgCheck['value'], $description, $activeLodgeId]);

            set_flash('success', 'De instellingen en het embleem van uw eigen loge zijn bijgewerkt!');
            redirect_to('/?tab=secretariaat&sub=loge');
        }

        if ($action === 'sec_create_event') {
            $title         = trim((string) ($_POST['title'] ?? ''));
            $eventType     = trim((string) ($_POST['event_type'] ?? 'Comparitie'));
            $minDegree     = (int) ($_POST['min_degree'] ?? 1);
            $eventDate     = trim((string) ($_POST['event_date'] ?? ''));
            $startTime     = trim((string) ($_POST['start_time'] ?? '20:00'));
            $doorsOpenTime = trim((string) ($_POST['doors_open_time'] ?? '19:30'));
            $location      = trim((string) ($_POST['location'] ?? ''));
            $speaker       = trim((string) ($_POST['speaker'] ?? ''));
            $hasMeal       = !empty($_POST['has_meal']) ? 1 : 0;
            $mealInfo      = trim((string) ($_POST['meal_info'] ?? ''));
            $allowVisitors = !empty($_POST['allow_visitors']) ? 1 : 0;
            $werkplankText = trim((string) ($_POST['werkplank_text'] ?? ''));
            $sendInvites   = !empty($_POST['send_invites_now']);

            if ($title === '' || $eventDate === '' || $location === '' || $werkplankText === '') {
                set_flash('error', 'Vul titel, datum, locatie en de tekst van de werkplank in.');
                redirect_to('/?tab=secretariaat&sub=nieuwe_werkplank');
            }
            if (!in_array($minDegree, [1, 2, 3], true)) {
                $minDegree = 1;
            }

            $eventId = new_id('evt');
            $pdo->prepare("
                INSERT INTO events (
                    id, lodge_id, title, event_type, min_degree, event_date, start_time, doors_open_time,
                    location, speaker, has_meal, meal_info, allow_visitors, werkplank_text, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([
                $eventId,
                $activeLodgeId,
                $title,
                $eventType,
                $minDegree,
                $eventDate,
                $startTime,
                $doorsOpenTime,
                $location,
                $speaker,
                $hasMeal,
                $mealInfo,
                $allowVisitors,
                $werkplankText,
                gmdate('c'),
            ]);

            if ($sendInvites) {
                $sentCount = send_invites_for_event($activeLodgeId, $eventId);
                set_flash('success', "Werkplank aangemaakt én uitnodigingsmail met 1-klik RSVP verstuurd naar $sentCount broeder(s)!");
            } else {
                set_flash('success', 'Nieuwe werkplank is gepubliceerd op het rooster van uw loge!');
            }

            redirect_to('/?tab=secretariaat&sub=aanmeldingen&event_id=' . urlencode($eventId));
        }

        if ($action === 'sec_send_invites') {
            $eventId = trim((string) ($_POST['event_id'] ?? ''));
            $sentCount = send_invites_for_event($activeLodgeId, $eventId);
            set_flash('success', "Uitnodigingsmail met 1-klik aanmeldknoppen verstuurd naar $sentCount broeder(s) van de vereiste graad! (Zie ook 'Proef-postvak' rechtsboven)");
            redirect_to('/?tab=secretariaat&sub=aanmeldingen&event_id=' . urlencode($eventId));
        }

        if ($action === 'sec_add_member') {
            $fullName     = trim((string) ($_POST['full_name'] ?? ''));
            $email        = str_lower(trim((string) ($_POST['email'] ?? '')));
            $phone        = trim((string) ($_POST['phone'] ?? ''));
            $city         = trim((string) ($_POST['city'] ?? ''));
            $degree       = (int) ($_POST['degree'] ?? 1);
            $role         = (string) ($_POST['role'] ?? 'member');
            $officerTitle = trim((string) ($_POST['officer_title'] ?? ''));

            if ($fullName === '' || $email === '' || !str_contains($email, '@')) {
                set_flash('error', 'Vul de volledige naam en een geldig e-mailadres van de broeder in.');
                redirect_to('/?tab=secretariaat&sub=leden');
            }
            if (!in_array($degree, [1, 2, 3], true)) {
                $degree = 1;
            }
            if (!in_array($role, ['member', 'board', 'secretary'], true)) {
                $role = 'member';
            }

            $uStmt = $pdo->prepare('SELECT id, degree FROM users WHERE LOWER(email) = ? LIMIT 1');
            $uStmt->execute([$email]);
            $existing = $uStmt->fetch();

            if ($existing) {
                $targetUserId = (string) $existing['id'];
                if ($degree > (int) $existing['degree']) {
                    $pdo->prepare('UPDATE users SET degree = ? WHERE id = ?')->execute([$degree, $targetUserId]);
                }
            } else {
                $targetUserId = new_id('usr');
                $formattedName = str_starts_with($fullName, 'Br.') ? $fullName : ('Br. ' . $fullName);
                $pdo->prepare("
                    INSERT INTO users (id, email, full_name, phone, city, avatar_url, degree, is_platform_admin, primary_lodge_id, dietary_default, created_at)
                    VALUES (?, ?, ?, ?, ?, '', ?, 0, ?, '', ?)
                ")->execute([$targetUserId, $email, $formattedName, $phone, $city, $degree, $activeLodgeId, gmdate('c')]);
            }

            // Upsert lidmaatschap binnen déze loge
            $pdo->prepare('DELETE FROM lodge_memberships WHERE user_id = ? AND lodge_id = ?')
                ->execute([$targetUserId, $activeLodgeId]);
            $pdo->prepare("
                INSERT INTO lodge_memberships (user_id, lodge_id, role, officer_title, sort_order, joined_year)
                VALUES (?, ?, ?, ?, ?, ?)
            ")->execute([
                $targetUserId,
                $activeLodgeId,
                $role,
                $officerTitle !== '' ? $officerTitle : null,
                $officerTitle !== '' ? 10 : 100,
                (int) date('Y'),
            ]);

            set_flash('success', 'Broeder is toegevoegd aan uw loge! Hij kan nu direct zonder wachtwoord inloggen met zijn e-mailadres.');
            redirect_to('/?tab=secretariaat&sub=leden');
        }

        if ($action === 'sec_update_member') {
            $userId       = trim((string) ($_POST['user_id'] ?? ''));
            $degree       = (int) ($_POST['degree'] ?? 1);
            $role         = (string) ($_POST['role'] ?? 'member');
            $officerTitle = trim((string) ($_POST['officer_title'] ?? ''));

            if (!in_array($degree, [1, 2, 3], true)) {
                $degree = 1;
            }
            if (!in_array($role, ['member', 'board', 'secretary'], true)) {
                $role = 'member';
            }

            $chk = $pdo->prepare('SELECT user_id FROM lodge_memberships WHERE user_id = ? AND lodge_id = ?');
            $chk->execute([$userId, $activeLodgeId]);
            if ($chk->fetchColumn()) {
                $pdo->prepare('UPDATE users SET degree = ? WHERE id = ?')->execute([$degree, $userId]);
                $pdo->prepare("
                    UPDATE lodge_memberships
                    SET role = ?, officer_title = ?, sort_order = ?
                    WHERE user_id = ? AND lodge_id = ?
                ")->execute([
                    $role,
                    $officerTitle !== '' ? $officerTitle : null,
                    $officerTitle !== '' ? 10 : 100,
                    $userId,
                    $activeLodgeId,
                ]);
                set_flash('success', 'Graad, rol en functie van de broeder zijn bijgewerkt.');
            }
            redirect_to('/?tab=secretariaat&sub=leden');
        }

        if ($action === 'sec_add_announcement') {
            $title    = trim((string) ($_POST['title'] ?? ''));
            $category = trim((string) ($_POST['category'] ?? 'Secretariaat'));
            $body     = trim((string) ($_POST['body'] ?? ''));
            $isPinned = !empty($_POST['is_pinned']) ? 1 : 0;

            if ($title === '' || $body === '') {
                set_flash('error', 'Vul zowel een onderwerp als de tekst van het bericht in.');
                redirect_to('/?tab=secretariaat&sub=mededelingen');
            }

            $authorLabel = $currentUser['full_name'];
            foreach ($currentUser['memberships'] as $m) {
                if ($m['lodge_id'] === $activeLodgeId && !empty($m['officer_title'])) {
                    $authorLabel .= ' (' . $m['officer_title'] . ')';
                    break;
                }
            }

            $pdo->prepare("
                INSERT INTO announcements (id, lodge_id, title, category, author_name, body, is_pinned, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([new_id('ann'), $activeLodgeId, $title, $category, $authorLabel, $body, $isPinned, gmdate('c')]);

            set_flash('success', 'Mededeling is geplaatst op de startpagina van uw loge!');
            redirect_to('/?tab=secretariaat&sub=mededelingen');
        }

        if ($action === 'sec_add_document') {
            $title     = trim((string) ($_POST['title'] ?? ''));
            $author    = trim((string) ($_POST['author'] ?? $currentUser['full_name']));
            $category  = trim((string) ($_POST['category'] ?? 'Bouwstuk'));
            $minDegree = (int) ($_POST['min_degree'] ?? 1);
            $summary   = trim((string) ($_POST['summary'] ?? ''));
            $content   = trim((string) ($_POST['content'] ?? ''));

            if ($title === '' || $content === '') {
                set_flash('error', 'Vul een titel en de volledige tekst van het bouwstuk of verslag in.');
                redirect_to('/?tab=secretariaat&sub=bouwstukken');
            }
            if (!in_array($minDegree, [1, 2, 3], true)) {
                $minDegree = 1;
            }
            if ($summary === '') {
                $summary = str_sub($content, 0, 180) . (str_len($content) > 180 ? '…' : '');
            }

            $pdo->prepare("
                INSERT INTO documents (
                    id, lodge_id, title, author, category, min_degree, published_date, summary, content, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([
                new_id('doc'),
                $activeLodgeId,
                $title,
                $author !== '' ? $author : $currentUser['full_name'],
                $category,
                $minDegree,
                date('Y-m-d'),
                $summary,
                $content,
                gmdate('c'),
            ]);

            set_flash('success', 'Het bouwstuk/document is toegevoegd aan het archief van uw loge (beveiligd op graad).');
            redirect_to('/?tab=secretariaat&sub=bouwstukken');
        }
    }

    // ========================================================================
    // 4. Platformbeheerder-acties (UITSLUITEND toegankelijk voor is_platform_admin = 1!)
    //    Hiermee sluit de Platformbeheerder nieuwe loges aan en wijst hun eerste Secretaris aan.
    // ========================================================================

    if (str_starts_with($action, 'admin_')) {
        if (!is_platform_admin($currentUser)) {
            set_flash('error', 'Alleen een Platformbeheerder mag nieuwe loges aanmaken of platforminstellingen wijzigen.');
            redirect_to('/');
        }

        if ($action === 'admin_create_lodge') {
            $number      = (int) ($_POST['number'] ?? 0);
            $name        = trim((string) ($_POST['name'] ?? ''));
            $city        = trim((string) ($_POST['city'] ?? ''));
            $meetingDay  = trim((string) ($_POST['meeting_day'] ?? 'Wekelijkse arbeid (20:00 uur)'));
            $address     = trim((string) ($_POST['address'] ?? ''));
            $accentColor = trim((string) ($_POST['accent_color'] ?? '#1B365D'));
            $description = trim((string) ($_POST['description'] ?? ''));
            $logoRaw     = (string) ($_POST['logo_url'] ?? '');

            $secName     = trim((string) ($_POST['secretary_name'] ?? ''));
            $secEmail    = str_lower(trim((string) ($_POST['secretary_email'] ?? '')));

            if ($number <= 0 || $name === '' || $city === '' || $address === '') {
                set_flash('error', 'Vul het logenummer, de naam van de loge, het Oosten (stad) en het adres in.');
                redirect_to('/?tab=platformbeheer');
            }
            if ($secName === '' || $secEmail === '' || !str_contains($secEmail, '@')) {
                set_flash('error', 'Vul ook de naam en het e-mailadres in van de eerste Secretaris die deze loge gaat beheren.');
                redirect_to('/?tab=platformbeheer');
            }

            $logoCheck = validate_image_value($logoRaw);
            if (!$logoCheck['ok']) {
                set_flash('error', (string) $logoCheck['error']);
                redirect_to('/?tab=platformbeheer');
            }

            $lodgeId = slugify_lodge_id($name, $number);
            $chk = $pdo->prepare('SELECT id FROM lodges WHERE id = ? OR number = ? LIMIT 1');
            $chk->execute([$lodgeId, $number]);
            if ($chk->fetch()) {
                set_flash('error', "Er bestaat al een loge met nummer $number op dit platform.");
                redirect_to('/?tab=platformbeheer');
            }

            $pdo->prepare("
                INSERT INTO lodges (id, number, name, city, meeting_day, address, accent_color, logo_url, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([
                $lodgeId,
                $number,
                $name,
                $city,
                $meetingDay !== '' ? $meetingDay : 'Wekelijkse arbeid (20:00 uur)',
                $address,
                $accentColor,
                $logoCheck['value'],
                $description,
            ]);

            // Koppel of maak de eerste Secretaris van deze nieuwe loge aan (zonder de Platformbeheerder zelf lid te maken!)
            assign_secretary_to_lodge($pdo, $lodgeId, $secName, $secEmail, $city);

            set_flash(
                'success',
                "Loge $name Nr. $number ($city) is aangemaakt! $secName ($secEmail) is ingesteld als eerste Secretaris en kan direct zonder wachtwoord inloggen."
            );
            redirect_to('/?tab=platformbeheer');
        }

        if ($action === 'admin_assign_secretary') {
            $lodgeId  = trim((string) ($_POST['lodge_id'] ?? ''));
            $secName  = trim((string) ($_POST['secretary_name'] ?? ''));
            $secEmail = str_lower(trim((string) ($_POST['secretary_email'] ?? '')));

            $lodge = get_lodge_by_id($lodgeId);
            if (!$lodge) {
                set_flash('error', 'Gekozen loge bestaat niet.');
                redirect_to('/?tab=platformbeheer');
            }
            if ($secName === '' || $secEmail === '' || !str_contains($secEmail, '@')) {
                set_flash('error', 'Vul naam en geldig e-mailadres in van de nieuwe Secretaris.');
                redirect_to('/?tab=platformbeheer');
            }

            assign_secretary_to_lodge($pdo, $lodgeId, $secName, $secEmail, (string) $lodge['city']);
            set_flash('success', "$secName ($secEmail) is nu gekoppeld als Secretaris van Loge {$lodge['name']} Nr. {$lodge['number']}.");
            redirect_to('/?tab=platformbeheer');
        }

        if ($action === 'admin_update_lodge') {
            $lodgeId     = trim((string) ($_POST['lodge_id'] ?? ''));
            $name        = trim((string) ($_POST['name'] ?? ''));
            $city        = trim((string) ($_POST['city'] ?? ''));
            $meetingDay  = trim((string) ($_POST['meeting_day'] ?? ''));
            $address     = trim((string) ($_POST['address'] ?? ''));
            $accentColor = trim((string) ($_POST['accent_color'] ?? '#1B365D'));
            $logoRaw     = (string) ($_POST['logo_url'] ?? '');

            $lodge = get_lodge_by_id($lodgeId);
            if (!$lodge) {
                set_flash('error', 'Loge niet gevonden.');
                redirect_to('/?tab=platformbeheer');
            }

            $logoCheck = validate_image_value($logoRaw);
            if (!$logoCheck['ok']) {
                set_flash('error', (string) $logoCheck['error']);
                redirect_to('/?tab=platformbeheer');
            }

            $pdo->prepare("
                UPDATE lodges
                SET name = ?, city = ?, meeting_day = ?, address = ?, accent_color = ?, logo_url = ?
                WHERE id = ?
            ")->execute([
                $name !== '' ? $name : $lodge['name'],
                $city !== '' ? $city : $lodge['city'],
                $meetingDay !== '' ? $meetingDay : $lodge['meeting_day'],
                $address !== '' ? $address : $lodge['address'],
                $accentColor,
                $logoCheck['value'],
                $lodgeId,
            ]);

            set_flash('success', "Gegevens van Loge {$lodge['name']} Nr. {$lodge['number']} zijn bijgewerkt.");
            redirect_to('/?tab=platformbeheer');
        }

        if ($action === 'admin_toggle_platform_admin') {
            $targetUserId = trim((string) ($_POST['user_id'] ?? ''));
            $makeAdmin    = !empty($_POST['make_admin']) ? 1 : 0;

            if ($makeAdmin === 0 && $targetUserId === $currentUser['id']) {
                set_flash('error', 'U kunt uw eigen Platformbeheerder-rol niet zelf intrekken (om buitensluiting te voorkomen).');
                redirect_to('/?tab=platformbeheer');
            }

            $pdo->prepare('UPDATE users SET is_platform_admin = ? WHERE id = ?')
                ->execute([$makeAdmin, $targetUserId]);

            set_flash(
                'success',
                $makeAdmin === 1
                    ? 'Broeder heeft nu Platformbeheerder-rechten gekregen.'
                    : 'Platformbeheerder-rechten zijn ingetrokken.'
            );
            redirect_to('/?tab=platformbeheer');
        }
    }
}

function assign_secretary_to_lodge(PDO $pdo, string $lodgeId, string $secName, string $secEmail, string $defaultCity): void
{
    $uStmt = $pdo->prepare('SELECT id, degree FROM users WHERE LOWER(email) = ? LIMIT 1');
    $uStmt->execute([$secEmail]);
    $existing = $uStmt->fetch();

    if ($existing) {
        $secUserId = (string) $existing['id'];
        if ((int) $existing['degree'] < 3) {
            $pdo->prepare('UPDATE users SET degree = 3 WHERE id = ?')->execute([$secUserId]);
        }
    } else {
        $secUserId = new_id('usr');
        $formatted = str_starts_with($secName, 'Br.') ? $secName : ('Br. ' . $secName);
        $pdo->prepare("
            INSERT INTO users (id, email, full_name, phone, city, avatar_url, degree, is_platform_admin, primary_lodge_id, dietary_default, created_at)
            VALUES (?, ?, ?, '', ?, '', 3, 0, ?, '', ?)
        ")->execute([$secUserId, $secEmail, $formatted, $defaultCity, $lodgeId, gmdate('c')]);
    }

    $pdo->prepare('DELETE FROM lodge_memberships WHERE user_id = ? AND lodge_id = ?')
        ->execute([$secUserId, $lodgeId]);
    $pdo->prepare("
        INSERT INTO lodge_memberships (user_id, lodge_id, role, officer_title, sort_order, joined_year)
        VALUES (?, ?, 'secretary', 'Secretaris', 4, ?)
    ")->execute([$secUserId, $lodgeId, (int) date('Y')]);
}

function send_invites_for_event(string $lodgeId, string $eventId): int
{
    $pdo = db();
    $eStmt = $pdo->prepare('SELECT * FROM events WHERE id = ? AND lodge_id = ? LIMIT 1');
    $eStmt->execute([$eventId, $lodgeId]);
    $event = $eStmt->fetch();
    $lodge = get_lodge_by_id($lodgeId);

    if (!$event || !$lodge) {
        return 0;
    }

    $mStmt = $pdo->prepare("
        SELECT u.id, u.full_name, u.email
        FROM lodge_memberships m
        JOIN users u ON u.id = m.user_id
        WHERE m.lodge_id = ? AND u.degree >= ?
        ORDER BY u.full_name ASC
    ");
    $mStmt->execute([$lodgeId, (int) $event['min_degree']]);
    $recipients = $mStmt->fetchAll();

    $count = 0;
    foreach ($recipients as $member) {
        $token = create_rsvp_email_token($eventId, (string) $member['id']);
        $mail  = build_werkplank_invite_email($member, $lodge, $event, $token);
        send_portal_mail([
            'to_email'     => $member['email'],
            'to_name'      => $member['full_name'],
            'subject'      => $mail['subject'],
            'html_body'    => $mail['html_body'],
            'text_body'    => $mail['text_body'],
            'preview_link' => $mail['preview_link'],
        ]);
        $count++;
    }

    return $count;
}
