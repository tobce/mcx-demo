# Demo av MCX

Dette prosjektet er ein demo av ein Push-to-Talk over IP (PTToIP) applikasjon. Applikasjonen består av ein backend-server som handterer autentisering og WebSocket-kommunikasjon, og ein frontend som gir brukarane eit grensesnitt for å logge inn og kommunisere med talegrupper.

## Innhald

- [Demo av MCX](#demo-av-mcx)
  - [Innhald](#innhald)
  - [Installasjon](#installasjon)
  - [Bruk](#bruk)
  - [Struktur](#struktur)
  - [Backend](#backend)
  - [Frontend](#frontend)
  - [Lisens](#lisens)

## Installasjon

For å køyre prosjektet lokalt, følg desse stega:

1. Klon repositoriet:

    ```git clone https://github.com/tobce/mcx-demo
    cd mcx-demo
    ```

2. Installer `Node.js` og `npm`

3. Installer avhengigheiter:

    ```npm install express ws```

4. Start serveren:

    ```node server.js```

Serveren skal no køyre på port 3000.

## Bruk

Når serveren er i gang, kan du opne `localhost:3000` i ein nettlesar. Du vil sjå eit innloggingsskjema der du kan skrive inn eit fødselsnummer for å logge inn. Du kan bruke 00000000001 som døme. Etter innlogging vil du få tilgang til PTX-kontrollane.

## Struktur

Prosjektet har følgjande struktur: ...

## Backend

Backend-koden er implementert i [server.js](server.js) ...

## Frontend

Frontend-koden er implementert i [public/index.html](public/index.html) ...

## Lisens

Dette prosjektet har førebels ingen lisens og er difor ikkje til fri bruk.
