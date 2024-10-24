// Nettverkskommunikasjon
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const rateLimit = require('express-rate-limit');

const bodyParser = require('body-parser');
const validator = require('validator');
// Filsystem
const fs = require('fs');
const path = require('path');

const loggar = require('./models/utils/loggar');
const meldingarLogg = require('./models/utils/meldingarLogg');

// Klasser
const { Brukar, Tilgangsnivå } = require('./models/Brukar');
const Talegruppe = require('./models/Talegruppe');
const Folkeregister = require('./models/Folkeregister');
const Person = require('./models/Person');

// Initialisering av server
const app = express();
const server = http.createServer(app);
const ws = new WebSocket.Server({ server });
app.use(bodyParser.json());

// Konstantar
const PORT = 3000;
const RATE_MINUTT = 15; //rate limit i minutt
const RATE_FØRESPURNADER = 100; //maks førespurnader per IP per tid

// Dummy-database
let talegrupper = [
    new Talegruppe(10101, '01-SAR-A1'),
    new Talegruppe(10102, '01-SAR-A2'),
];

function finnTalegruppe(id) {
    return talegrupper.find(talegruppe => talegruppe.id === id);
}

// Les frå dummyPersonar.json og legg til personane i folkeregisteret
function genererFolkeregister() {
    const folkeregister = new Folkeregister();
    const data = fs.readFileSync(path.join(__dirname, 'dummyPersonar.json'), 'utf8');
    const personar = JSON.parse(data);

    personar.forEach(personData => {
        const person = new Person(
            personData.fødselsnummer,
            personData.fødselsdato,
            personData.etternamn,
            personData.fornamn,
            personData.mobilnummer
        );
        folkeregister.leggTilPerson(person);
    });
    return folkeregister;
}

const folkeregister = genererFolkeregister();

// Lagar brukarar
// fødselsnummer, liste over talegrupper, folkeregister
// Lista tek inn talegrupper som objekt, så finn talegruppa frå ID

let brukarar = [];
function genererBrukarar() {
    const data = fs.readFileSync(path.join(__dirname, 'brukarar.json'), 'utf8');
    const brukarData = JSON.parse(data);

    brukarData.forEach(brukar => {
        const talegrupper = brukar.talegrupper.map(id => finnTalegruppe(id));
        const nyBrukar = new Brukar(
            brukar.fødselsnummer,
            talegrupper,
            folkeregister,
            brukar.tilgangsnivå
        );
        brukarar.push(nyBrukar);
        
    })
    console.log('Brukarar:', brukarar);
}

genererBrukarar();

// Lagar ein map for å halde styr på tilkoplingar
// Brukar socket som nøkkel og ein objekt som inneheld brukar, talegruppe og socketId
// Sidan me brukar socket som nøkkel, brukar me ein Map
let socketTilkoplingar = new Map();

// Tilkoplings-ID counter
let counter = 0;

// Innlogging
// req tek inn fødselsnummer frå body
// res sender tilbake brukar-objektet dersom brukaren finst
app.post('/innlogging', (req, res) => {

    const { fødselsnummer } = req.body;

    // Validering av fødselsnummer
    if (!validator.isNumeric(fødselsnummer)) {
        return res.status(400).json({ melding: 'Fødselsnummer inneheld berre tal' });
    }
    if (!(fødselsnummer.length == 11)) {
        return res.status(400).json({ melding: 'Fødselsnummer må vera 11 siffer' });
    }
    else {
        // Finn brukar frå fødselsnummer
        const brukar = brukarar.find(u => u.fødselsnummer === fødselsnummer);
        // Dersom brukaren finst, får me logga inn
        if (brukar) {
            loggar.info(`Autentisert brukar: ${brukar.hentNamn()} (fnr.: ${brukar.hentFødselsnummer()}) med tilgang til ${brukar.talegrupper.length} talegrupper`);
            return res.status(200).json({ brukar });
        }
        else {
            // Dersom brukaren ikkje finst, opprettar me ein ny brukar automatisk
            // Me får feilmelding dersom brukaren ikkje finst i folkeregisteret
            try {
                const nyBrukar = new Brukar(fødselsnummer, [], folkeregister, "gjest");
                brukarar.push(nyBrukar);
                loggar.info('Ny brukar:', nyBrukar.hentNamn());
                return res.status(400).json({ 
                    melding: `Ny brukar oppretta for ${nyBrukar.hentNamn()}, gjer vel og logg inn på nytt.` });
            } catch (error) {
                loggar.error('Feil:', error.message);
                return res.status(400).json({ melding: error.message });
            }
        }
}
// Dersom brukaren ikkje finst, får me feilmelding. blir ikkje brukt
    return res.status(401).json({ melding: 'Fann ikkje brukaren' });
});

// Når ei tilkopling er etablert, lytt etter meldingar
ws.on('connection', (socket, req) => {

    // Når me mottar ei melding, handter ho
    socket.on('message', async (melding) => {
        const data = JSON.parse(melding);
        function sendTilTalegruppe() {
            for (let [socket, socketTilkopling] of socketTilkoplingar.entries()) {
                if (socketTilkopling.talegruppe && 
                    socketTilkopling.talegruppe.id === data.avsendarTalegruppe.id && 
                    socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify(data));
                }
            }
        }
        switch (data.type) {

            case 'CONNECTION_START':
                socketTilkoplingar.set(socket, {
                    brukar: data.avsendarBrukar,
                    talegruppe: null,
                    socketId: counter,
                });
                loggar.info(`Ny tilkopling: ${data.avsendarBrukar.namn} med ID ${counter}`);
                counter++;
                break;
            case 'TEKSTMELDING_TIL_TALEGRUPPE':
                const meldingsdata = {
                    tidspunkt: new Date().toISOString(),
                    avsendar: {
                        namn: data.avsendarBrukar.namn,
                        fødselsnummer: data.avsendarBrukar.fødselsnummer,
                        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
                    },
                    talegruppe: data.avsendarTalegruppe.namn,
                    melding: data.tekstmelding
                };
                meldingarLogg(meldingsdata);
                loggar.info(`TEKSTMELDING: i ${data.avsendarTalegruppe.namn} frå ${data.avsendarBrukar.namn}:`);
                loggar.info(`   ${data.tekstmelding}`);
                sendTilTalegruppe();
                break;

            case 'TEKSTMELDING_TIL_ALLE':
                const meldingsdataTilAlle = {
                    tidspunkt: new Date().toISOString(),
                    avsendar: {
                        namn: data.avsendarBrukar.namn,
                        fødselsnummer: data.avsendarBrukar.fødselsnummer,
                        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
                    },
                    talegruppe: 'Alle',
                    melding: data.tekstmelding
                };
                meldingarLogg(meldingsdataTilAlle);
                loggar.info(`TEKSTMELDING til alle: frå ${data.avsendarBrukar.namn}:`);
                loggar.info(`   ${data.tekstmelding}`);
                sendTilTalegruppe();
                break;

            case 'PTT_START':
            case 'PTT_END':
                loggar.info(`${data.type}: ${data.avsendarTalegruppe.namn} - ${data.avsendarBrukar.namn}`)
                sendTilTalegruppe();
                break;
            case 'VEL_TALEGRUPPE':
                if (socketTilkoplingar.get(socket)) {
                    socketTilkoplingar.get(socket).talegruppe = data.talegruppe;
                }
                loggar.info(`Tilkopling ${socketTilkoplingar.get(socket).socketId} (${data.avsendarBrukar.namn}) valde talegruppe ${data.talegruppe.namn}`);
                break;
            default:
                loggar.error('Ukjent meldingstype mottatt:', data.type);
                break;
        }
    });

    socket.on('close', () => {
        socketTilkoplingar.delete(socket);
    });
});

module.exports.skrivUtMeldingar = function () {
    const data = fs.readFileSync('meldingar.json', 'utf8');
    const meldingar = JSON.parse(data);
    meldingar.forEach(melding => {
        console.log(`[${melding.tidspunkt}] ${melding.avsendar.namn} i ${melding.talegruppe}: ${melding.melding}`);
    });  };

module.exports.sendTekstmeldingTilAlle = function (tekstmelding) {
    for (let [socket, socketTilkopling] of socketTilkoplingar.entries()) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'TEKSTMELDING_TIL_ALLE',
                tekstmelding: tekstmelding,
            }));
        }
    }
}

// Serve frontend-filer
app.use(express.static('public'));

// Avgrense førespurnader til serveren
const avgrensing = rateLimit({
    windowMs: RATE_MINUTT * 60 * 1000,
    max: RATE_FØRESPURNADER
});

app.use(avgrensing);

// Start serveren
server.listen(PORT, () => {
    loggar.info(`Serveren køyrer på port ${PORT}`);
});