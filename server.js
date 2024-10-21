const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const ws = new WebSocket.Server({ server });

app.use(bodyParser.json());

// Dummy-database for brukarar og grupper
let brukarar = [{ brukarnamn: 'brukar1' }, { brukarnamn: 'brukar2' }];
let grupper = [{ gruppeId: 'gruppe1', brukarar: [] }];

// Innlogging (utan passord for no)

const validator = require('validator');

app.post('/innlogging', (req, res) => {
    const { brukarnamn } = req.body;

    if (!validator.isAlphanumeric(brukarnamn)) {
        return res.status(400).send('Ugyldig brukarnamn');
    }    
    const brukar = brukarar.find(u => u.brukarnamn === brukarnamn);
    if (brukar) {
        console.log('Autentisert brukar:', brukarnamn);
        return res.status(200).json({ melding: 'Logga inn', brukarnamn });
    }
    return res.status(401).json({ melding: 'Uautorisert' });
});

ws.on('connection', (socket) => {
    console.log('Ny tilkopling etablert');
    
    socket.on('message', (melding) => {
        const data = JSON.parse(melding);

        if (data.type === 'PTT_START') {
            // Kringkast til alle brukarar i same gruppe
            ws.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(`${data.brukarnamn} snakkar i ${data.gruppeId}`);
                }
            });
        }

        if (data.type === 'PTT_END') {
            ws.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(`${data.brukarnamn} slutta å snakke i ${data.gruppeId}`);
                }
            });
        }
    });
});

// Serve frontend-filer
app.use(express.static('public'));

// Start server
const port = 3000;

server.listen(port, () => {
    console.log(`Serveren køyrer på http://localhost:${port}`);
});

const rateLimit = require('express-rate-limit');

// Rate limit middleware
const avgrensing = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutt
    max: 100 // Maks 100 førespurnader per IP per 15 minutt
});

app.use(avgrensing);
