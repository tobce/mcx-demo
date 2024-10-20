const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());

// Dummy-database for brukarar og grupper
let users = [{ username: 'brukar1' }, { username: 'brukar2' }];
let groups = [{ groupId: 'group1', users: [] }];

// Innlogging (utan passord for no)
app.post('/login', (req, res) => {
    const { username } = req.body;
    const user = users.find(u => u.username === username);
    if (user) {
        return res.status(200).json({ message: 'Logged in', username });
    }
    return res.status(401).json({ message: 'Unauthorized' });
});

// Tilkopling og PTT-logikk
wss.on('connection', (ws) => {
    console.log('User connected to WebSocket');

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'PTT_START') {
            // Broadcast til alle brukarar i same gruppe
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(`${data.username} is talking in ${data.groupId}`);
                }
            });
        }

        if (data.type === 'PTT_END') {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(`${data.username} stopped talking in ${data.groupId}`);
                }
            });
        }
    });
});

// Serve frontend-filer
app.use(express.static('public'));

// Start server
server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
