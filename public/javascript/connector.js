class WebSocketManager {
    constructor() {
        this.typeListeners = {};
        this.messageQueue = [];
        this.sessionToken = this.getCookie('sessionID');
        this.initializeWebSocket();
    }

    initializeWebSocket() {
        this.socket = new WebSocket('ws://localhost:3000');
        this.socket.addEventListener('open', this.handleOpen.bind(this));
        this.socket.addEventListener('message', this.handleMessage.bind(this));
        this.socket.addEventListener('error', this.handleError.bind(this));
        this.socket.addEventListener('close', this.handleClose.bind(this));
    }

    handleOpen(event) {
        console.log('WebSocket connection opened');
        this.sendInitialMessage();
        this.processPendingMessages();
    }

    sendInitialMessage() {
        console.log(this.sessionToken)
        if (this.sessionToken) {
            this.sendMessage({type: "session", token: this.sessionToken});
        } else {
            this.sendMessage({type: "Server", message: "Server Open"});
        }
    }

    processPendingMessages() {
        while (this.messageQueue.length > 0) {
            this.sendMessage(this.messageQueue.shift());
        }
    }

    handleMessage(event) {
        const data = JSON.parse(event.data);
        console.log('Message from server:', data);

        if (data.type === 'session') {
            this.handleSessionMessage(data);
        } else {
            this.notifyListeners(data);
        }
    }

    handleSessionMessage(data) {
        this.sessionToken = data.token;
        console.log('Received session token:', this.sessionToken);
        // Set the session token as a cookie
        document.cookie = `sessionID=${this.sessionToken}; path=/; max-age=86400`; // Set cookie to expire in 24 hours
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
    }

    routeMessage(message) {
        //abstraction on top of send message to be used by other classes
        console.log(`Sending message: ${JSON.stringify(message)}`);
        this.sendMessage(message)
    }
    sendMessage(message) {
        if (this.sessionToken) {
            message.sessionToken = this.sessionToken;
        }        
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

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            const cookieValue = parts.pop().split(';').shift();
            return cookieValue !== undefined ? cookieValue : null;
        }
        return null;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    //Main function that actually runs on setup.
    let myWebSocketManager = new WebSocketManager();

    // Check if we are on the lobby page
    if (window.location.pathname.includes('lobby.html')) {
        let myLobbyUI = new LobbyUI(myWebSocketManager);
        myWebSocketManager.addTypeListener('welcome', (data) => { myLobbyUI.welcome(data) });
        myWebSocketManager.addTypeListener('reconnect', (data) => { myLobbyUI.reconnect(data) });
        myWebSocketManager.addTypeListener('username-taken', (data) => { myLobbyUI.usernameTaken(data) });
    }

    //Game & UI functions
    if (window.location.pathname.includes('play.html')) {
        let myBoardStateControllerObject = new BoardStateControllerObject(myWebSocketManager);
        let myUIManager = new UIManager(myWebSocketManager);
        myWebSocketManager.addTypeListener('board-state', (data)=>{myBoardStateControllerObject.updateBoardState(data)});
        myBoardStateControllerObject.addListener((data)=>{myUIManager.updateBoardUI(data)});
    }
});