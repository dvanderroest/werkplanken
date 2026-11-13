# Mijn Werkplank — Open-Source Vrijmetselaars App (100% PHP + SQLite/MySQL + PowerShell)

**Mijn Werkplank** is een toegankelijke, open-source web- en mobiele applicatie (Progressive Web App) voor vrijmetselaarsloges. De gehele applicatie is geschreven in **overzichtelijke, pure PHP (zonder zware frameworks of Node.js build-stappen)** met handige **PowerShell-beheerscripts** voor Windows. Hierdoor draait het zowel op je eigen laptop als op elk voordelig Nederlands/Europees shared webhostingpakket (`public_html/`).

---

## Waarom deze app?

1. **Nooit meer wachtwoorden kwijt:** Inloggen werkt met alleen het e-mailadres. De broeder ontvangt één overzichtelijke e-mail met **zowel een directe klikknop (Magic Link)** voor op hetzelfde apparaat **als een grote 6-cijferige code** voor wanneer hij de mail op zijn telefoon leest terwijl hij op zijn computer of iPad wil inloggen.
2. **1 jaar ingelogd blijven:** Op het eigen apparaat hoeft een broeder niet telkens opnieuw in te loggen.
3. **1-klik aanmelden vanuit de e-mail:** De Secretaris kan een Werkplank versturen met directe knoppen (*Aanwezig + Broedermaal*, *Alleen Arbeid*, *Verhinderd*) waarmee een broeder zich zonder inloggen aan- of afmeldt voor het Broedermaal.
4. **Werkt op PC én Telefoon zonder App Store:** Geen Apple ID of Google Play wachtwoorden nodig; werkt razendsnel in elke browser en kan als icoontje op het startscherm van iPhone en Android worden gezet.
5. **Senior-vriendelijk:** Hoog contrast, rustige typografie, pasfoto's in *Wie is wie* en een `A / A+ / A++` tekstgrootte-knop bovenin.
6. **Duidelijke rolverdeling tussen Platformbeheerder & Loge-Secretaris:**
   - **Platformbeheerder:** Kan als enige nieuwe loges aanmaken op het platform (inclusief loge-embleem), de eerste **Secretaris** van een loge aanwijzen (of vervangen bij bestuurswissel), en andere Platformbeheerders aanstellen. Uit maçonnieke discretie leest een Platformbeheerder *niet* mee in interne bouwstukken of ledenlijsten van loges waarvan hij zelf geen lid is.
   - **Loge-Secretaris (en Bestuur):** Beheert uitsluitend de **eigen loge** (Werkplanken, Aanmeldingen & Tafellijst voor de Hofmeester, Ledenlijst, Mededelingen, Bouwstukken en het eigen loge-embleem). Een Secretaris kan geen andere loges aanmaken of wijzigen.
   - **Meerdere loges per broeder:** Is een broeder lid van bijvoorbeeld zowel zijn moederloge als een studieloge, dan kan hij linksboven met één klik wisselen tussen zijn loges.
   - **Harde graad- & AVG-afscherming op de server:** Een *Leerling (1e graad)* krijgt nooit 2e- of 3e-graads arbeid of bouwstukken te zien; een *Gezel (2e graad)* nooit 3e-graads stukken. *Wie is wie*, mededelingen en bouwstukken zijn strikt afgeschermd tot de eigen loge.
   - **Veilig Visiteren:** Opengestelde bijeenkomsten van zusterloges verschijnen op het tabblad *Visiteren* (gefilterd op graad).

---

## Snel starten op Windows (PHP + PowerShell)

Vereiste: **PHP 8.1 of nieuwer** met `pdo_sqlite` ingeschakeld (bijv. in `C:\php`, XAMPP of Laragon).

1. Dubbelklik op **`Start-Werkplanken.bat`** of voer in PowerShell uit:
   ```powershell
   .\Start-Werkplanken.ps1
   ```
2. De browser opent automatisch op **http://localhost:3000**.
3. Op het inlogscherm staan in deze ontwikkelmodus 5 handige voorbeeldknoppen klaar:
   - **Platformbeheerder** (*Br. Eduard van Pallandt*) — om nieuwe loges aan te maken en secretarissen te koppelen.
   - **Secretaris / 3e graad** (*Br. Willem Vermeer*) — Secretaris van Loge De Noorderster Nr. 42 én gewoon nevenlid bij Studieloge Ars Regia Nr. 305.
   - **Gezel / 2e graad**, **Leerling / 1e graad** en **Zusterloge**.

### Beheer via PowerShell of PHP CLI

Voor beheertaken, backups en controles kun je het interactieve PowerShell-menu starten:

```powershell
.\Beheer-Werkplanken.ps1
```

Of roep specifieke taken direct aan (bijvoorbeeld vanuit Windows Taakplanner voor automatische backups):

```powershell
.\Beheer-Werkplanken.ps1 -Actie Status
.\Beheer-Werkplanken.ps1 -Actie Backup
.\Beheer-Werkplanken.ps1 -Actie Lint
```

Rechtstreeks via PHP CLI kan ook (op zowel Windows als Linux):

```bash
php cli/beheer.php status
php cli/beheer.php maak-beheerder beheer@uwloge.nl "Br. Jan Jansen"
php cli/beheer.php nieuw-loge 142 "De Morgenster" "Groningen" "Turfsingel 46, Groningen" "Br. Piet Bakker" secretaris@morgenster.nl
```

---

## Overzichtelijke bestandsstructuur

```text
├── index.php                 # Hoofdingang (routing + weergave)
├── router.php                # Router voor lokale PHP-server (php -S localhost:3000 router.php)
├── config.example.php        # Voorbeeldconfiguratie (kopieer naar config.local.php in productie)
├── Start-Werkplanken.ps1     # PowerShell startscript voor Windows
├── Beheer-Werkplanken.ps1    # PowerShell beheermenu, SQLite-backup & syntaxcontrole
├── cli/beheer.php            # PHP command-line tool voor Platformbeheer
├── app/
│   ├── bootstrap.php         # Sessie, anti-cache headers & autoloading
│   ├── config.php            # Standaardinstellingen + inladen config.local.php
│   ├── db.php                # PDO database-laag (SQLite én MySQL/MariaDB) + autorisatie
│   ├── auth.php              # Wachtwoordloos inloggen (6-cijferige code + Magic Link)
│   ├── actions.php           # Verwerking van alle POST-formulieren (Post-Redirect-Get)
│   ├── mail.php              # Opmaak en verzending van inlog- en werkplankmails
│   ├── helpers.php           # Hulpfuncties, CSRF-beveiliging & Nederlandse datums
│   └── views/                # Heldere HTML/PHP-templates per tabblad
├── assets/                   # Standalone CSS (app.css) en lichte browser-JS (app.js)
├── demo/                     # Voorbeeldportretten en loge-emblemen
└── data/                     # Beveiligde map (.htaccess Deny) voor werkplanken.sqlite
```

---

## Online zetten op gewone PHP-webhosting (bijv. TransIP, Vimexx, Antagonist, Hostnet)

1. Upload alle bestanden via FTP/SFTP naar de map `public_html/` (inclusief de `.htaccess`-bestanden in de hoofdmap, `app/`, `data/` en `cli/`).
2. Kopieer `config.example.php` naar **`config.local.php`** en pas daarin aan:
   - `'app_url' => 'https://werkplank.uwloge.nl'`
   - `'dev_mailbox' => false` (zodat de testknoppen en het Proef-postvak uitstaan)
   - `'mail_driver' => 'php_mail'` (zodat PHP echte e-mails verstuurt op het hostingpakket)
   - Optioneel kun je in `config.local.php` ook een MySQL/MariaDB-database invullen in plaats van SQLite.
3. Zorg dat de map `data/` schrijfrechten heeft voor PHP (`chmod 775`) — de `.htaccess` in `data/` blokkeert elke directe webtoegang tot het SQLite-bestand.
4. Maak via SSH (`php cli/beheer.php maak-beheerder uw@email.nl "Uw Naam"`) je eigen account Platformbeheerder.

*(Liever met Docker draaien op een Europese VPS? Gebruik eenvoudig `docker compose up -d --build`.)*

---

## Open Source Licentie

Dit project wordt vrijgegeven onder de [MIT Licentie](./LICENSE), zodat elke loge of groep loges het vrij kan gebruiken, controleren en verbeteren.
