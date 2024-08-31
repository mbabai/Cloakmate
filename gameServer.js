// Import required modules
const express = require('express');
const WebSocket = require('ws');
const https = require('https');
const LobbyManager = require('./lobbyManager');

// Define the gameServer class
class GameServer {
    constructor() {
        this.initializeServer();
        this.initializeWebSocket();
        this.setupMessageHandling();
    }

    initializeServer() {
        this.app = express();
        this.server = https.createServer(this.app);
        this.port = process.env.PORT || 8080;
        this.app.use(express.static('public'));
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });
        
    }

    initializeWebSocket() {
        this.wss = new WebSocket.Server({ server: this.server });
        this.activeConnections = new Set();
        this.setupWebSocketHandlers();
    }

    setupWebSocketHandlers() {
        this.wss.on('connection', (ws, req) => {
            const ip = req.socket.remoteAddress;
            console.log(`New connection from: ${ip}`);
            this.activeConnections.add(ws);

            ws.on('message', (message) => this.handleIncomingMessage(ws, message));
            ws.on('close', () => this.handleConnectionClose(ws));
        });
    }

    handleIncomingMessage(ws,message) {
        console.log('Received: %s', message);
        const json = JSON.parse(message);
        this.handleMessage(ws,json);
    }

    handleConnectionClose(ws) {
        this.activeConnections.delete(ws);
        let json = {type:"disconnect",ws}
        this.handleMessage(ws,json)
    }

    setupMessageHandling() {
        this.typeListeners = {};
    }

    sendMessage({ws, message}) {
        ws.send(JSON.stringify(message));
    }

    routeMessage(ws,message){
        this.sendMessage({ws, message});
    }

    // Method to add a listener for a specific message type
    addTypeListener(type, listener) {
        if (!this.typeListeners[type]) {
            this.typeListeners[type] = [];
        }
        this.typeListeners[type].push(listener);
    }

    // Method to remove a listener for a specific message type
    removeTypeListener(type, listener) {
        this.typeListeners[type] = this.typeListeners[type].filter(l => l !== listener);
    }

    handleMessage(ws,json) {
        // Handle the message based on its content
        if (this.typeListeners[json.type]) {
            this.typeListeners[json.type].forEach(listener => listener(ws,json));
        }
    }

    // Method to get all active connections
    getActiveConnections() {
        return Array.from(this.activeConnections);
    }
}

// STARTUP CODE
// Create an instance of the gameServer and start listening
const myGameServer = new GameServer();
myGameServer.server.listen(myGameServer.port, () => {
    console.log(`GameServer is listening on port ${myGameServer.port}`);
});
const myLobbyManager = new LobbyManager(myGameServer);
myGameServer.addTypeListener('submit-username', (ws,data)=>{myLobbyManager.receiveUsername(ws,data)});
myGameServer.addTypeListener('disconnect', (ws,data)=>{myLobbyManager.disconnect(ws,data)});
myGameServer.addTypeListener('enter-queue', (ws,data)=>{myLobbyManager.enterQueue(ws,data)});
myGameServer.addTypeListener('exit-queue', (ws,data)=>{myLobbyManager.exitQueue(ws,data)});
myGameServer.addTypeListener('invite-opponent', (ws,data)=>{myLobbyManager.inviteOpponent(ws,data)});
myGameServer.addTypeListener('cancel-invite', (ws,data)=>{myLobbyManager.cancelInvite(ws,data)});
myGameServer.addTypeListener('accept-invite', (ws,data)=>{myLobbyManager.acceptInvite(ws,data)});
myGameServer.addTypeListener('decline-invite', (ws,data)=>{myLobbyManager.declineInvite(ws,data)});
myGameServer.addTypeListener('submit-setup', (ws,data)=>{myLobbyManager.submitSetup(ws,data)});
myGameServer.addTypeListener('random-setup', (ws,data)=>{myLobbyManager.randomSetup(ws,data)});
myGameServer.addTypeListener('game-action', (ws,data)=>{myLobbyManager.gameAction(ws,data)});