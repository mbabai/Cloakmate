class WebSocketManager {
    constructor() {
        this.typeListeners = {};
        this.messageQueue = [];
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
        this.sendMessage({type: "Server", message: "Server Open"});
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

    //UI functions
    let myUIManager = new UIManager(myWebSocketManager);
    myWebSocketManager.addTypeListener('welcome', (data) => { myUIManager.welcome(data) });
    myWebSocketManager.addTypeListener('usernameTaken', (data) => { myUIManager.usernameTaken(data) });
    myWebSocketManager.addTypeListener('invite', (data) => { myUIManager.inviteReceived(data) });
    myWebSocketManager.addTypeListener('inviteDeclined', (data) => { myUIManager.inviteDeclined(data) });
    //Game & UI functions
    // let myBoardStateControllerObject = new BoardStateControllerObject(myWebSocketManager);
    myWebSocketManager.addTypeListener('board-state', (data)=>{myUIManager.updateBoardState(data)});
    myWebSocketManager.addTypeListener('opponent-disconnected', (data) => { myUIManager.opponentDisconnected(data) });
});