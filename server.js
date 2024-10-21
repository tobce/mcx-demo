const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const validator = require('validator');


const app = express();
const server = http.createServer(app);
const ws = new WebSocket.Server({ server });

app.use(bodyParser.json());

// Dummy-database for brukarar og grupper
let brukarar = [
    { id: 0, brukarnamn: 'brukar1', grupper: [1, 2] },
    { id: 1, brukarnamn: 'brukar2', grupper: [1] }
];

let grupper = [
    { id: 0, gruppenamn: 'gruppe1'},
    { id: 1, gruppenamn: 'gruppe2'}
];

// Innlogging (utan passord for no)


app.post('/innlogging', (req, res) => {
    const { brukarnamn } = req.body;

    if (!validator.isAlphanumeric(brukarnamn)) {
        return res.status(400).send('Ugyldig brukarnamn');
    }    
    const brukar = brukarar.find(u => u.brukarnamn === brukarnamn);
    if (brukar) {
        console.log('Autentisert brukar:', brukarnamn);
        return res.status(200).json({ melding: 'Logga inn', brukarnamn, grupper: brukar.grupper });
    }
    return res.status(401).json({ melding: 'Uautorisert' });
});

ws.on('connection', (socket) => {
    console.log('Ny tilkopling etablert');
    
    socket.on('message', (melding) => {
        const data = JSON.parse(melding);

        // Kringkast til alle brukarar i same gruppe
        ws.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    brukarnamn: data.brukarnamn,
                    type: data.type, // PPT_IN eller PPT_OUT
                    gruppeId: data.gruppeId,
                    pttMelding: data.pttMelding,
                    grupper,
                }));
            }
        });
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