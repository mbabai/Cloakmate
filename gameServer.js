// Import required modules
const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const isProduction = process.env.NODE_ENV === 'production';
const { generateUniqueUserID } = require('./utils');


const LobbyManager = require('./lobbyManager');
const LobbyUser = require('./lobbyUser');

// Define the gameServer class
class GameServer {
    constructor() {
        this.userIDs = new Map() // userID -> user
        this.wsToUser = new Map() // ws -> user
        this.initializeServer();
        this.initializeWebSocket();
        this.setupMessageHandling();
    }

    initializeServer() {
        this.app = express();
        this.server = isProduction ? https.createServer(this.app) : http.createServer(this.app);
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

    sendMessage({websocket, message}) {
        websocket.send(JSON.stringify(message));
    }

    routeMessage(userID,message){
        let user = this.userIDs.get(userID);
        this.sendMessage({websocket: user.websocket, message});
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

    handleMessage(websocket,json) {
        // Handle the message based on its content
        let user = this.wsToUser.get(websocket);
        if (!user){
            this.connect(websocket,json)
            return;
        }
        if (this.typeListeners[json.type]) {
            this.typeListeners[json.type].forEach(listener => listener(user.userID,json));
        }
    }

    // Method to get all active connections
    getActiveConnections() {
        return Array.from(this.activeConnections);
    }

    connect(ws,data){
        let userID = data.userID;
        if(!userID || !this.userIDs.has(userID)){
            userID = generateUniqueUserID();
            this.createUser(userID, ws);
            this.routeMessage(userID, {type: 'userID', userID: userID});
        } 
        this.setUserConnected(userID)
        this.setUserIDWebsocket(userID, ws);
        let json = {type:"user-connect",userID:userID}
        this.handleMessage(ws,json)
    }
    setUserConnected(userID){
        let user = this.userIDs.get(userID)
        user.isConnected = true
        user.lastConnected = null;
    }
    createUser(userID, ws){
        let thisUser = new LobbyUser(userID, ws)
        this.userIDs.set(userID, thisUser);
        this.wsToUser.set(ws, thisUser);
    }
    setUserIDWebsocket(userID, ws){
        let thisUser = this.userIDs.get(userID)
        thisUser.websocket = ws;
        this.wsToUser.set(ws, thisUser);
    }
    setUserIDName(userID,username){
        this.userIDs.get(userID).username = username;
    }
}

// STARTUP CODE
// Create an instance of the gameServer and start listening
const myGameServer = new GameServer();
myGameServer.server.listen(myGameServer.port, () => {
    console.log(`GameServer is listening on port ${myGameServer.port} in ${isProduction ? "Production" : "Development"} mode...`);
});
const myLobbyManager = new LobbyManager(myGameServer);
myGameServer.addTypeListener('user-connect', (userID,data)=>{myLobbyManager.userConnects(userID,data)});
myGameServer.addTypeListener('submit-username', (userID,data)=>{myLobbyManager.receiveUsername(userID,data)});
myGameServer.addTypeListener('disconnect', (userID,data)=>{myLobbyManager.disconnect(userID,data)});
myGameServer.addTypeListener('enter-queue', (userID,data)=>{myLobbyManager.enterQueue(userID,data)});
myGameServer.addTypeListener('exit-queue', (userID,data)=>{myLobbyManager.exitQueue(userID,data)});
myGameServer.addTypeListener('invite-opponent', (userID,data)=>{myLobbyManager.inviteOpponent(userID,data)});
myGameServer.addTypeListener('cancel-invite', (userID,data)=>{myLobbyManager.cancelInvite(userID,data)});
myGameServer.addTypeListener('accept-invite', (userID,data)=>{myLobbyManager.acceptInvite(userID,data)});
myGameServer.addTypeListener('decline-invite', (userID,data)=>{myLobbyManager.declineInvite(userID,data)});
myGameServer.addTypeListener('submit-setup', (userID,data)=>{myLobbyManager.submitSetup(userID,data)});
myGameServer.addTypeListener('random-setup', (userID,data)=>{myLobbyManager.randomSetup(userID,data)});
myGameServer.addTypeListener('game-action', (userID,data)=>{myLobbyManager.gameAction(userID,data)});
myGameServer.addTypeListener('bot-ready', (userID,data)=>{myLobbyManager.botReadyForGame(userID,data)});