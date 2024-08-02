// Import required modules
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const cookie = require('cookie'); 
const LobbyManager = require('./lobbyManager');

// Define the gameServer class
class GameServer {
    constructor() {
        this.initializeServer();
        this.initializeWebSocket();
        this.setupMessageHandling();
        this.setupMiddleware();
    }

    initializeServer() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.port = process.env.PORT || 3000;
        this.app.use(express.static('public'));
    }

    initializeWebSocket() {
        this.wss = new WebSocket.Server({ server: this.server });
        this.activeConnections = new Set();
        this.sessions = new Map(); //sessionID, {ws, ip}
        this.setupWebSocketHandlers();
    }

    setupWebSocketHandlers() {
        this.wss.on('connection', (ws, req) => {
            const ip = req.socket.remoteAddress;
            console.log(`New connection from: ${ip}`);
            
            const sessionID = this.handleSessionSetup(ws, req);
            this.activeConnections.add(ws);

            ws.on('message', (message) => this.handleIncomingMessage(sessionID, message));
            ws.on('close', () => this.handleConnectionClose(sessionID,ws));
        });
    }

    handleSessionSetup(ws, req) {
        const cookies = cookie.parse(req.headers.cookie || '');
        const sessionID = cookies.sessionID || this.generateNewsessionID();
        this.updateSession(sessionID, ws, req.socket.remoteAddress);
        const response = { type: 'session', sessionID: sessionID };
        ws.send(JSON.stringify(response));
        return sessionID;
    }

    updateSession(sessionID, ws, ip) {
        if (this.sessions.has(sessionID)) {
            const session = this.sessions.get(sessionID);
            session.ws = ws;
            session.ip = ip;
        } else {
            this.sessions.set(sessionID, { ip, ws });
        }
    }

    handleIncomingMessage(sessionID, message) {
        console.log('received: %s', message);
        const json = JSON.parse(message);
        // Get the session ID based on the WebSocket connection
        if (sessionID) {
            console.log(`Received message from session: ${sessionID}`);
            // Add the sessionID to the json object for use in listeners
            json.sessionID = sessionID;
        } else {
            console.log('Received message from unknown session!!!');
            return;
        }
        this.handleMessage(json);
    }

    handleConnectionClose(sessionID,ws) {
        console.log(`Connection closed for session: ${sessionID}`);
        this.activeConnections.delete(ws);
        let json = {type:"disconnect", sessionID}
        this.handleMessage(json)
    }

    setupMessageHandling() {
        this.typeListeners = {};
    }

    setupMiddleware() {
        this.app.use(cookieParser());
        this.app.use(this.sessionMiddleware.bind(this));
    }

    sessionMiddleware(req, res, next) {
        const sessionID = req.cookies.sessionID || this.generateNewsessionID();
        res.cookie('sessionID', sessionID, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 24 * 3600000
        });
        next();
    }

    generateNewsessionID() {
        return crypto.randomBytes(16).toString('hex');
    }
    sendMessage({ws, message}) {
        ws.send(JSON.stringify(message));
    }

    routeMessage(sessionID, message){
        let ws = this.sessions.get(sessionID).ws
        if(ws) {
            this.sendMessage({ws, message});
        } else {
            console.log(`No WebSocket connection found for session: ${sessionID}`);
            this.handleMessage({type: 'disconnect', sessionID})
        }
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

    handleMessage(json) {
        // Handle the message based on its content
        if (this.typeListeners[json.type]) {
            this.typeListeners[json.type].forEach(listener => listener(json));
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
myGameServer.addTypeListener('submit-name', (data)=>{myLobbyManager.receiveUsername(data)});
myGameServer.addTypeListener('session', (data)=>{myLobbyManager.attemptReconnect(data)});
myGameServer.addTypeListener('disconnect', (data)=>{myLobbyManager.disconnect(data)});
// myGameServer.addTypeListener('enter-queue', (data)=>{myLobbyManager.enterQueue(data)});
// myGameServer.addTypeListener('exit-queue', (data)=>{myLobbyManager.exitQueue(data)});
