// Nettverkskommunikasjon
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const bodyParser = require('body-parser');
const validator = require('validator');
// Filsystem
const fs = require('fs');
const path = require('path');

// Loggar
const winston = require('winston');
const loggar = winston.createLogger({
    level: 'silly',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console({ level: 'silly', forceConsole: true }),
        new winston.transports.File({ filename: 'server.log' })
    ]
});

// Logge tekstmeldingar frå brukarar til meldingar.json, fomatert som JSON.
function meldingarLogg(meldingsdata) {
    const jsonMeldingar = JSON.stringify(meldingsdata, null, 2);
    const filnamn = 'meldingar.json';
    if (!fs.existsSync(filnamn)) {
        fs.writeFileSync(filnamn, '');
    }
    let fil = fs.readFileSync(filnamn, 'utf8');
    
    if (fil.endsWith(']')) {
        fil = fil.slice(0, -1);
    }

    fil = fil + ',\n' + jsonMeldingar;

    if (fil.startsWith(',')) {
        fil = fil.slice(1);
    }
    
    if (!fil.startsWith('[')) {fil = '[' + fil;}
    
    if (!fil.endsWith(']')) {fil = fil + ']';}
    fs.writeFileSync(filnamn, fil);
}

// Klasser
const Brukar = require('./models/Brukar');
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

let brukarar = [
    new Brukar('20070000000', [finnTalegruppe(10101), finnTalegruppe(10102)], folkeregister),
    new Brukar('00000000001', [finnTalegruppe(10101)], folkeregister),
];

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
                const nyBrukar = new Brukar(fødselsnummer, [], folkeregister);
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
        delete socketTilkoplingar[socket];
    });
});

// Serve frontend-filer
app.use(express.static('public'));

const rateLimit = require('express-rate-limit');

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