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

// Dummy-database for brukarar og talegrupper

let talegrupper = [
    new Talegruppe(10101, '01-SAR-A1'),
    new Talegruppe(10102, '01-SAR-A2'),
];
/*
console.log('Følgjande talegrupper vart laga:');
for (let talegruppe of talegrupper) {
    console.log(talegruppe.toString());
}
    */

function finnTalegruppe(id) {
    return talegrupper.find(talegruppe => talegruppe.id === id);
}

let brukarar = [
    new Brukar('00000000000', [finnTalegruppe(10101), finnTalegruppe(10102)]),
    new Brukar('00000000001', [finnTalegruppe(10101)]),
];

/*
console.log('Følgjande brukarar vart laga:');
for (let brukar of brukarar) {
    console.log(brukar.toString());
}
    */

// Innlogging (utan passord for no)
app.post('/innlogging', (req, res) => {
    const { fødselsnummer: fødselsnummer } = req.body;

    if (!validator.isNumeric(fødselsnummer)) {
        return res.status(400).json({ melding: 'Ugyldig fødselsnummer' });
    }    
    const brukar = brukarar.find(u => u.id === fødselsnummer);
    if (brukar) {
        console.log('Autentisert brukar:', brukar.fødselsnummer);
        return res.status(200).json({ brukar });
    }
    return res.status(401).json({ melding: 'Uautorisert' });
});

ws.on('connection', (socket) => {
    console.log('Ny tilkopling etablert');
    
    socket.on('message', (melding) => {
        const data = JSON.parse(melding);

        switch (data.type) {
            case 'PTT_START':
            case 'PTT_END':
                // Kringkast PTT-meldinger til alle brukarar i same talegruppe
                ws.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: data.type,
                            avsendarBrukar: data.avsendarBrukar,
                            avsendarTalegruppe: data.avsendarTalegruppe,
                        }));
                    }
                });
                break;

            case 'TEKSTMELDING_TIL_TALEGRUPPE':
                // Kringkast tekstmeldinger til alle brukarar i same talegruppe
                ws.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: data.type,
                            avsendarBrukar: data.avsendarBrukar,
                            tekstmelding: data.tekstmelding,
                            talegrupper: data.talegrupper,
                            avsendarTalegruppe: data.avsendarTalegruppe,
                            id: data.id
                        }));
                    }
                });
                break;

            default:
                console.log('Ukjent meldingstype mottatt:', data.type);
                break;
        }
    });
});

// Serve frontend-filer
app.use(express.static('public'));

const rateLimit = require('express-rate-limit');

// Rate limit middleware
const avgrensing = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutt
    max: 100 // Maks 100 førespurnader per IP per 15 minutt
});

app.use(avgrensing);

// Start server
const port = 3000;

server.listen(port, () => {
    console.log(`Serveren køyrer på http://localhost:${port}`);
});