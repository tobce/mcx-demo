const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const validator = require('validator');

// Eigne klasser
const Brukar = require('./models/Brukar');
const Talegruppe = require('./models/Talegruppe');

const app = express();
const server = http.createServer(app);
const ws = new WebSocket.Server({ server });

app.use(bodyParser.json());

// Konstantar
const PORT = 3000;
const RATE_MINUTT = 15; //rate limit i minutt
const RATE_FØRESPURNADER = 100; //maks førespurnader per IP per tid

// Dummy-database for brukarar og talegrupper
let talegrupper = [
    new Talegruppe(10101, '01-SAR-A1'),
    new Talegruppe(10102, '01-SAR-A2'),
];

function finnTalegruppe(id) {
    return talegrupper.find(talegruppe => talegruppe.id === id);
}

let brukarar = [
    new Brukar('20070000000', [finnTalegruppe(10101), finnTalegruppe(10102)]),
    new Brukar('00000000001', [finnTalegruppe(10101)]),
];

let socketTilkoplingar = new Map();
let counter = 0;

app.post('/innlogging', (req, res) => {
    const { fødselsnummer } = req.body;
    if (!validator.isNumeric(fødselsnummer)) {
        return res.status(400).json({ melding: 'Fødselsnummer inneheld berre tal' });
    }
    if (!(fødselsnummer.length == 11)) {
        return res.status(400).json({ melding: 'Fødselsnummer må vera 11 siffer' });
    }
    else {
        const brukar = brukarar.find(u => u.fødselsnummer === fødselsnummer);
        if (brukar) {
            console.log('Autentisert brukar:', brukar.hentNamn());
            return res.status(200).json({ brukar });
        }
        else {
            try {
                const nyBrukar = new Brukar(fødselsnummer, []);
                brukarar.push(nyBrukar);
                console.log('Ny brukar:', nyBrukar.hentNamn());
                return res.status(400).json({ 
                    melding: `Ny brukar oppretta for ${nyBrukar.hentNamn()}, gjer vel og logg inn på nytt.` });
            } catch (error) {
                return res.status(400).json({ melding: error.message });
            }
        }
}
    return res.status(401).json({ melding: 'Fann ikkje brukaren' }); // unåeleg
});

ws.on('connection', (socket) => {
    console.log('Ny tilkopling etablert');

    socket.on('message', async (melding) => {
        const data = JSON.parse(melding);
        console.log('Melding mottatt:', data);
        switch (data.type) {
            case 'CONNECTION_START':
                    socketTilkoplingar.set(socket, {
                    brukar: data.avsendarBrukar,
                    talegruppe: null,
                    socketId: counter,
                });
                counter++;
                console.log(socketTilkoplingar);
                console.log('Det er no', socketTilkoplingar.size, 'kopla til:');
                socketTilkoplingar.forEach((tilkopling) => {
                    console.log(
                        `Namn: ${tilkopling.brukar.namn}, Talegruppe: ${tilkopling.talegruppe ? tilkopling.talegruppe.namn : 'Ingen'}, SocketID: ${tilkopling.socketId}`);
                });
                break;
            case 'PTT_START':
            case 'PTT_END':
            case 'TEKSTMELDING_TIL_TALEGRUPPE':
                console.log('TEKSTMELDING_TIL_TALEGRUPPE');
                for (let [socket, socketTilkopling] of socketTilkoplingar.entries()) {
                    console.log('Sender melding ...:', data);
                    console.log(socketTilkopling.talegruppe);
                    if (socketTilkopling.talegruppe && 
                        socketTilkopling.talegruppe.id === data.avsendarTalegruppe.id && 
                        socket.readyState === WebSocket.OPEN) {
                            console.log('Melding sendt til talegruppe:', data);
                            socket.send(JSON.stringify(data));
                    }
                }
                break;
            case 'VEL_TALEGRUPPE':
                //if (socketTilkoplingar.get(socket)) {
                    socketTilkoplingar.get(socket).talegruppe = data.talegruppe;
                //}
                break;
            default:
                console.log('Ukjent meldingstype mottatt:', data.type);
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
    console.log(`Serveren køyrer på port ${PORT}`);
});