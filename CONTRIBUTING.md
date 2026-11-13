# Meebouwen aan Mijn Werkplank (Contributing)

Hartelijk dank voor je interesse om bij te dragen aan **Mijn Werkplank**! Dit open-source project heeft als doel om vrijmetselaarsloges een uiterst gebruiksvriendelijke, veilige en begrijpelijke web- en mobiele app te bieden.

## Belangrijkste uitgangspunten

1. **Begrijpelijke pure PHP & PowerShell:** Geen ingewikkelde JavaScript-bundlers, frameworks of tientallen npm-afhankelijkheden. Elke pagina en elk formulier gebruikt heldere PHP 8+ met PDO (SQLite/MySQL) en het klassieke *Post-Redirect-Get* patroon, zodat iedere beheerder met kennis van PHP en PowerShell de code direct kan lezen en aanpassen.
2. **Eenvoud boven alles (Senior-vriendelijk):** Elke schermwijziging moet duidelijk, rustig en leesbaar zijn — óók voor een broeder van 80+ met `Tekstgrootte A++`. Geen wachtwoorden of verborgen menu's.
3. **Strikte Discretie, Rolscheiding & AVG:**
   - Plaats **nooit** echte namen, e-mailadressen, telefoonnummers, `.sqlite`-databases of interne logestukken op GitHub. Gebruik uitsluitend fictieve voorbeeldnamen.
   - Alleen een **Platformbeheerder** (`is_platform_admin = 1`) kan nieuwe loges aanmaken en de eerste Secretaris toewijzen (`app/actions.php`).
   - Een **Loge-Secretaris** beheert uitsluitend zijn eigen actieve loge (`can_manage_lodge()` in `app/db.php`).
   - Ledenlijsten (*Wie is wie*), mededelingen en bouwstukken blijven strikt binnen de eigen loge en worden op de server gefilterd op graad (`min_degree <= $user['degree']`).

## Lokaal ontwikkelen en controleren

1. Start de lokale PHP-server via PowerShell:
   ```powershell
   .\Start-Werkplanken.ps1
   ```
2. Controleer vóór het indienen van een Pull Request of alle PHP-bestanden vrij zijn van syntaxfouten:
   ```powershell
   .\Beheer-Werkplanken.ps1 -Actie Lint
   ```
