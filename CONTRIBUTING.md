# Meebouwen aan Mijn Werkplank (Contributing)

Hartelijk dank voor je interesse om bij te dragen aan **Mijn Werkplank**! Dit open-source project heeft als doel om alle vrijmetselaarsloges een uiterst gebruiksvriendelijke, veilige en toegankelijke app te bieden voor pc, tablet en telefoon.

## Belangrijkste uitgangspunten

1. **Eenvoud boven alles (Senior-vriendelijk):** Elke schermwijziging moet duidelijk, rustig en leesbaar zijn — óók voor een broeder van 80+ met `Tekstgrootte A++`. Geen verborgen menu's of ingewikkelde wachtwoorden.
2. **Strikte Discretie & AVG:**
   - Plaats **nooit** echte namen, e-mailadressen, telefoonnummers of interne logestukken in broncode, issues of pull requests op GitHub. Gebruik uitsluitend fictieve voorbeeldnamen.
   - Bewaak altijd op de server (`src/lib/db.ts`) dat gegevens van een loge (ledenlijst, bouwstukken, mededelingen) nooit zichtbaar zijn buiten die loge, en dat 2e- en 3e-graads stukken nooit naar lagere graden worden gestuurd.
3. **Geen onnodige afhankelijkheden:** Houd het project licht en onderhoudsarm (standaard Node.js + SQLite + Next.js), zodat een loge het jarenlang zonder kopzorgen kan draaien.

## Lokaal ontwikkelen en testen

1. Installeer **Node.js 24 LTS** (minimaal v22.5 i.v.m. de ingebouwde `node:sqlite` module).
2. Installeer de pakketten:
   ```bash
   npm install
   ```
3. Start de ontwikkelserver:
   ```bash
   npm run dev
   ```
4. Controleer vóór het indienen van een Pull Request of het project foutloos bouwt:
   ```bash
   npm run build
   ```
