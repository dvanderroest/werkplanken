# Mijn Werkplank — Open-Source Vrijmetselaars App (PC & Mobiel)

**Mijn Werkplank** is een toegankelijke, open-source web- en mobiele applicatie (Progressive Web App) voor vrijmetselaarsloges. De app is speciaal ontworpen om **wachtwoord- en inlogproblemen definitief op te lossen**, zodat zowel jongere als oudere broeders op hun computer, tablet én smartphone moeiteloos kunnen deelnemen.

---

## Waarom deze app?

1. **Nooit meer wachtwoorden kwijt:** Inloggen werkt met alleen het e-mailadres. De broeder ontvangt één overzichtelijke e-mail met **zowel een directe klikknop** (voor op hetzelfde apparaat) **als een grote 6-cijferige code** (voor wanneer de mail op de telefoon wordt gelezen terwijl de app op de laptop of iPad openstaat).
2. **1 jaar ingelogd blijven:** Op het eigen apparaat hoeft een broeder niet telkens opnieuw in te loggen.
3. **1-klik aanmelden vanuit de e-mail:** De Secretaris kan een Werkplank mailen met directe knoppen (*Aanwezig + Broedermaal*, *Alleen Arbeid*, *Verhinderd*) waarmee een broeder zich zonder inloggedoe aan- of afmeldt.
4. **Werkt op PC én Telefoon zonder App Store:** Geen Apple ID of Google Play wachtwoorden nodig; werkt in elke browser en kan als echt app-icoontje op het startscherm van iPhone en Android worden gezet.
5. **Senior-vriendelijk:** Hoog contrast, rustige typografie en een `A / A+ / A++` tekstgrootte-knop bovenin.
6. **Meerdere Loges, Graden & AVG-discretie:**
   - Ondersteunt meerdere loges op één platform (inclusief broeders die lid zijn van meerdere loges, zoals een moederloge en een studieloge).
   - **Strikte AVG-scheiding:** De ledenlijst (*Wie is wie*), mededelingen en bouwstukken zijn uitsluitend zichtbaar voor leden van de eigen loge.
   - **Harde graad-afscherming op de server:** Een *Leerling (1e graad)* krijgt nooit 2e- of 3e-graads arbeid of bouwstukken te zien; een *Gezel (2e graad)* nooit 3e-graads stukken.
   - **Veilig Visiteren:** Opengestelde bijeenkomsten van zusterloges zijn zichtbaar op de Landelijke Arbeidstafel (gefilterd op graad). Bij aanmelding als visiteur worden naam, moederloge en geverifieerde graad automatisch doorgegeven aan de ontvangende Secretaris en Hofmeester.

---

## Snel starten op uw eigen computer (Windows)

Vereiste: [Node.js](https://nodejs.org/) (versie 22.5 of nieuwer — versie 24 aanbevolen).

1. Dubbelklik in Verkenner op **`Start-Werkplanken.bat`** *(of open een terminal in deze map en typ `npm run dev`)*.
2. Open uw browser op **http://localhost:3000**.
3. In deze lokale testmodus staat rechtsboven het **Proef-postvak** aan en vindt u op het inlogscherm handige knoppen om met 1 klik mee te kijken als *Secretaris/Meester*, *Gezel*, *Leerling* of *Zusterloge*.

---

## Online zetten in productie (AVG-proof in Europa)

Omdat vrijmetselaarslidmaatschap onder de AVG een bijzonder persoonsgegeven is, raden wij aan om de app te hosten op een Europese server (bijv. in Nederland of Duitsland) met **Docker**:

1. Kopieer `.env.example` naar `.env` en vul uw domeinnaam (`PUBLIC_APP_URL`) en Europese SMTP-mailgegevens in.
2. Zet `ENABLE_DEV_MAILBOX=false` en `HTTPS=true` in `.env` (dit schakelt het Proef-postvak en de demo-knoppen volledig uit).
3. Start de applicatie met één commando:
   ```bash
   docker compose up -d --build
   ```

---

## Open Source Licentie

Dit project wordt vrijgegeven onder de [MIT Licentie](./LICENSE), zodat elke loge of groep loges het vrij kan gebruiken, controleren en verbeteren.
