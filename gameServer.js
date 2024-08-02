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
        this.startPulse();
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
            
            const sessionId = this.handleSessionSetup(ws, req);
            this.activeConnections.add(ws);

            ws.on('message', (message) => this.handleIncomingMessage(sessionId, message));
            ws.on('close', () => this.handleConnectionClose(sessionId,ws));
        });
    }

    handleSessionSetup(ws, req) {
        const cookies = cookie.parse(req.headers.cookie || '');
        const sessionId = cookies.sessionId || this.generateNewSessionID();
        
        this.updateSession(sessionId, ws, req.socket.remoteAddress);
        
        const response = { type: 'session', token: sessionId };
        
        ws.send(JSON.stringify(response));
        
        return sessionId;
    }

    updateSession(sessionId, ws, ip) {
        if (this.sessions.has(sessionId)) {
            const session = this.sessions.get(sessionId);
            session.ws = ws;
            session.ip = ip;
        } else {
            this.sessions.set(sessionId, { ip, ws });
        }
    }



    handleIncomingMessage(sessionID, message) {
        console.log('received: %s', message);
        const json = JSON.parse(message);
        // Get the session ID based on the WebSocket connection
        if (sessionID) {
            console.log(`Received message from session: ${sessionID}`);
            // Add the sessionId to the json object for use in listeners
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
    }

    setupMessageHandling() {
        this.typeListeners = {};
        this.messageQueue = [];
        this.messageQueueTimeout = 2000;
        this.pulseInterval = 500;
    }

    setupMiddleware() {
        this.app.use(cookieParser());
        this.app.use(this.sessionMiddleware.bind(this));
    }

    sessionMiddleware(req, res, next) {
        const sessionId = req.cookies.sessionId || this.generateNewSessionID();
        res.cookie('sessionId', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 24 * 3600000
        });
        next();
    }

    generateNewSessionID() {
        return crypto.randomBytes(16).toString('hex');
    }

    // Method to start the pulse
    startPulse() {
        setInterval(() => this.pulse(), this.pulseInterval);
    }

    // Method to pulse and retry sending queued messages
    pulse() {
        const currentTime = Date.now();
        const remainingMessages = [];
        // debug display info:
        // console.log(`Remaining Messages: ${remainingMessages}`)
        // console.log(`# sessions: ${this.sessions.size}`);
        // console.log(`# active connections: ${this.activeConnections.size}`);
        // Process all messages in the queue
        while (this.messageQueue.length > 0) {
            // Remove and get the first message from the queue
            const messageData = this.messageQueue.shift();
            // Check if the message is still within the timeout period
            if (currentTime - messageData.originTime <= this.messageQueueTimeout) {
                this.sendMessage(messageData);
                // If the message is still in the queue (send failed), add it to remainingMessages
                if (this.messageQueue.includes(messageData)) {
                    remainingMessages.push(messageData);
                }
            }
        }

        // Update the message queue with only the messages that need to be retried
        this.messageQueue = remainingMessages;
    }

    sendMessage({ws, message, originTime}) {
        // When trying to send a message, we put a timestamp on the first attempt
        if(!originTime) originTime = Date.now();
        // If the connection is active, we send the message
        if (this.activeConnections.has(ws)) {
            ws.send(JSON.stringify(message));
        } else if (Date.now() - originTime <= this.messageQueueTimeout) {
            this.messageQueue.push({ws, message, originTime});
        }
    }

    routeMessage(sessionID, message){
        let ws = this.sessions.get(sessionID).ws
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
myGameServer.addTypeListener('enter-queue', (data)=>{myLobbyManager.enterQueue(data)});
myGameServer.addTypeListener('exit-queue', (data)=>{myLobbyManager.exitQueue(data)});