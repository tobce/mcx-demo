const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const validator = require('validator');
// const wrtc = require('@roamhq/wrtc');

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
    new Brukar('00000000000', [finnTalegruppe(10101), finnTalegruppe(10102)]),
    new Brukar('00000000001', [finnTalegruppe(10101)]),
];

// Innlogging (utan passord for no)
app.post('/innlogging', (req, res) => {
    const { fødselsnummer } = req.body;
    if (!validator.isNumeric(fødselsnummer) || fødselsnummer.length !== 11) {
        return res.status(400).json({ melding: 'Fødselsnummer må vere 11 siffer' });
    }
    const brukar = brukarar.find(u => u.fødselsnummer === fødselsnummer);
    if (brukar) {
        console.log('Autentisert brukar:', brukar.hentNamn());
        return res.status(200).json({ brukar });
    }
    return res.status(401).json({ melding: 'Fann ikkje brukaren' });
});

ws.on('connection', (socket) => {
    console.log('Ny tilkopling etablert');
    let peerConnection;
    let pendingCandidates = [];

    socket.on('message', async (melding) => {
        const data = JSON.parse(melding);

        switch (data.type) {
            case 'PTT_START':
                // Initialize WebRTC connection
                /*
                peerConnection = new wrtc.RTCPeerConnection();
                peerConnection.onicecandidate = ({ candidate }) => {
                    if (candidate) {
                        socket.send(JSON.stringify({ type: 'candidate', candidate }));
                    }
                };

                const audioTransceiver = peerConnection.addTransceiver('audio');
                await audioTransceiver.sender.replaceTrack(audioTransceiver.receiver.track);

                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);

                socket.send(JSON.stringify({ type: 'offer', offer }));
                */

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

            case 'PTT_END':
                // Close WebRTC connection
                /*
                if (peerConnection) {
                    peerConnection.close();
                    peerConnection = null;
                }
                    */

                // Kringkast PPT_end til alle
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
            /*
            case 'offer':
                if (peerConnection) {
                    if (peerConnection.signalingState === 'stable' || peerConnection.signalingState === 'have-remote-offer') {
                        await peerConnection.setRemoteDescription(new wrtc.RTCSessionDescription({
                            type: data.offer.type,
                            sdp: data.offer.sdp
                        }))
                        .then(() => {
                            console.log('Remote description set with offer');
                            // Add any pending ICE candidates
                            pendingCandidates.forEach(candidate => {
                                peerConnection.addIceCandidate(candidate)
                                    .then(() => {
                                        console.log('Added ICE candidate from pending list');
                                    })
                                    .catch(error => {
                                        if (error.message.includes('RTCPeerConnection is closed')) {
                                            console.warn('Ignoring error: ', error.message);
                                        } else {
                                            console.error('Error adding ICE candidate from pending list:', error);
                                        }
                                    });
                            });
                            pendingCandidates = [];
                        })
                        .catch(error => {
                            console.error('Error setting remote description with offer:', error);
                        });
                    } else {
                        console.error('Cannot set remote description in the current signaling state:', peerConnection.signalingState);
                    }
                }
                break;

            case 'candidate':
                if (peerConnection) {
                    const candidate = new wrtc.RTCIceCandidate(data.candidate);
                    if (peerConnection.remoteDescription) {
                        peerConnection.addIceCandidate(candidate)
                            .then(() => {
                                console.log('Added ICE candidate');
                            })
                            .catch(error => {
                                if (error.message.includes('RTCPeerConnection is closed')) {
                                    console.warn('Ignoring error: ', error.message);
                                } else {
                                    console.error('Error adding ICE candidate:', error);
                                }
                            });
                    } else {
                        console.log('Remote description not set yet, storing ICE candidate');
                        pendingCandidates.push(candidate);
                    }
                }
                break;

            case 'answer':
                if (peerConnection) {
                    peerConnection.setRemoteDescription(new wrtc.RTCSessionDescription(data.answer))
                        .then(() => {
                            console.log('Remote description set with answer');
                        })
                        .catch(error => {
                            console.error('Error setting remote description with answer:', error);
                        });
                }
                break;
            */

            case 'TEKSTMELDING_TIL_TALEGRUPPE':
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

// Avgrense førespurnader til serveren
const avgrensing = rateLimit({
    windowMs: RATE_MINUTT * 60 * 1000,
    max: RATE_FØRESPURNADER
});

app.use(avgrensing);

// Start serveren
server.listen(PORT, () => {
    console.log(`Serveren køyrer på http://localhost:${PORT}`);
});