var theWebSocketManager;
class WebSocketManager {
    constructor() {
        // Add new properties for reconnection
        this.maxReconnectAttempts = 3; // 1 minute worth of attempts
        this.reconnectAttempts = 0;
        this.reconnectInterval = null;
        
        this.userID = this.getUserIDFromCookie();
        this.typeListeners = {};
        this.messageQueue = [];
        this.initializeWebSocket();
    }

    getUserIDFromCookie() {
        const cookies = document.cookie.split('; ');
        const userIDCookie = cookies.find(cookie => cookie.startsWith('userID='));
        return userIDCookie ? userIDCookie.split('=')[1] : null;
    }
    setUserID(userID){
        this.userID = userID;
        document.cookie = `userID=${userID}; path=/; max-age=31536000`; // Set cookie to expire in 1 year
    }

    initializeWebSocket() {
        const isLocalhost = window.location.hostname === 'localhost';
        const wsProtocol = isLocalhost ? 'ws' : 'wss';
        const wsHost = isLocalhost ? 'localhost:8080' : window.location.host;
        this.socket = new WebSocket(`${wsProtocol}://${wsHost}`);
        this.socket.addEventListener('open', this.handleOpen.bind(this));
        this.socket.addEventListener('message', this.handleMessage.bind(this));
        this.socket.addEventListener('error', this.handleError.bind(this));
        this.socket.addEventListener('close', this.handleClose.bind(this));
    }
    checkConnection() {
        if (this.socket.readyState === WebSocket.CLOSED) {
            console.log('WebSocket connection is closed. Attempting to reconnect...');
        }
    }
    handleOpen(event) {
        document.getElementById('loading-gif').style.display = 'none';
        console.log('WebSocket connection opened');
        // Clear reconnection state if connection is successful
        this.reconnectAttempts = 0;
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        this.sendInitialMessage();
        this.processPendingMessages();
    }

    sendInitialMessage() {
        this.sendMessage({type: "connect", userID: this.userID});
    }

    processPendingMessages() {
        while (this.messageQueue.length > 0) {
            this.sendMessage(this.messageQueue.shift());
        }
    }

    handleMessage(event) {
        const data = JSON.parse(event.data);
        console.log('Message from server:', data);
        this.notifyListeners(data);
    }

    notifyListeners(data) {
        const listeners = this.typeListeners[data.type] || [];
        listeners.forEach(listener => listener(data));
    }

    handleError(event) {
        console.error('WebSocket error:', event);
    }

    handleClose(event) {
        console.log('WebSocket connection closed');
        document.getElementById('loading-gif').style.display = 'block';
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
        } else {
            alert("Lost Connection!\nSorry, we must refresh now...");
            window.location.reload();
        }
    }

    attemptReconnect() {
        if (!this.reconnectInterval) {
            this.reconnectInterval = setInterval(() => {
                console.log(`Reconnection attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
                this.reconnectAttempts++;
                this.initializeWebSocket();
                
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    clearInterval(this.reconnectInterval);
                    this.reconnectInterval = null;
                    // alert("Lost Connection!\nSorry, we must refresh now...");
                    window.location.reload();
                }
            }, 1000);
        }
    }

    routeMessage(message) {
        //abstraction on top of send message to be used by other classes
        console.log(`Sending message: ${JSON.stringify(message)}`);
        this.sendMessage(message)
    }
    sendMessage(message) {      
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            this.messageQueue.push(message);
        }
    }

    addTypeListener(type, listener) {
        if (!this.typeListeners[type]) {
            this.typeListeners[type] = [];
        }
        this.typeListeners[type].push(listener);
    }

    removeTypeListener(type, listener) {
        if (this.typeListeners[type]) {
            this.typeListeners[type] = this.typeListeners[type].filter(l => l !== listener);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    //Main function that actually runs on setup.
    let myWebSocketManager = new WebSocketManager();
    theWebSocketManager = myWebSocketManager;
    myWebSocketManager.addTypeListener('userID', (data) => { myWebSocketManager.setUserID(data.userID) });
    //UI functions
    let myUIManager = new UIManager(myWebSocketManager);
    myWebSocketManager.addTypeListener('welcome', (data) => { myUIManager.welcome(data) });
    myWebSocketManager.addTypeListener('usernameTaken', (data) => { myUIManager.usernameTaken(data) });
    myWebSocketManager.addTypeListener('invite', (data) => { myUIManager.inviteReceived(data) });
    myWebSocketManager.addTypeListener('inviteDeclined', (data) => { myUIManager.inviteDeclined(data) });
    //Game & UI functions
    myWebSocketManager.addTypeListener('board-state', (data)=>{myUIManager.updateBoardState(data)});
    myWebSocketManager.addTypeListener('opponent-disconnected', (data) => { myUIManager.opponentDisconnected(data) });
    myWebSocketManager.addTypeListener('setup-error', (data) => { myUIManager.setupError(data) });
    myWebSocketManager.addTypeListener('opponent-setup-complete', (data) => { myUIManager.opponentSetupComplete(data) });
    myWebSocketManager.addTypeListener('both-setup-complete', (data) => { myUIManager.bothSetupComplete(data) });
    myWebSocketManager.addTypeListener('random-setup-complete', (data) => { myUIManager.randomSetupComplete(data) });
    myWebSocketManager.addTypeListener('illegal-action', (data) => { myUIManager.illegalAction(data) });
    myWebSocketManager.addTypeListener('lobby-state-update', (data) => { myUIManager.postLobbyState(data) });
});
