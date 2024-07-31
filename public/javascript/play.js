class WebSocketManager {
    constructor() {
        this.typeListeners = {}
        this.socket = new WebSocket('ws://localhost:3000');
        this.messageQueue = [];
        this.socket.addEventListener('open', function(event) {
            // Called when we connect to the server
            console.log('WebSocket connection opened');
            this.socket.send(JSON.stringify({type: "Server", message: "Server Open"}));
            
            // Send any queued messages
            while (this.messageQueue.length > 0) {
                this.socket.send(this.messageQueue.shift());
            }
        }.bind(this));
        
        this.socket.addEventListener('message', function (event) {
            //When we get a real message from the server.
            const data = JSON.parse(event.data);
            console.log('Message from server:');
            console.log(data)
            let currentListeners = this.typeListeners[data.type] || [];
            currentListeners.forEach( listener=> listener(data));
        }.bind(this));
    
        // Listen for possible errors
        this.socket.addEventListener('error', function (event) {
            //when we get an error from the server
            console.error('WebSocket error: ', event);
        });
    
        // Listen for close
        this.socket.addEventListener('close', function (event) {
            //when we disconnect from the server
            console.log('WebSocket connection closed');
        });
    }
    addTypeListener(type, listener) {
        if (!this.typeListeners[type]) {
            this.typeListeners[type] = [];
        }
        this.typeListeners[type].push(listener);
    }
    removeListener(type, listener) {
        this.typeListeners[type] = this.typeListeners[type].filter(l => l !== listener);
    }
    sendMessage(message) {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            this.messageQueue.push(JSON.stringify(message));
        }
    }
}

function parseURLForPlayer() {
    // Gets the relevant information for the current player
    const urlParams = new URLSearchParams(window.location.search);
    const myColor = urlParams.get('myColor');
    const whitePlayer = urlParams.get('whitePlayer');
    const blackPlayer = urlParams.get('blackPlayer');
    const length = urlParams.get('length');
    const gameNumber = urlParams.get('gameNumber');

    let playerName, opponentName;
    if (myColor === "white") {
        playerName = whitePlayer;
        opponentName = blackPlayer;
    } else {
        playerName = blackPlayer;
        opponentName = whitePlayer;
    }
    return { myColor, playerName, opponentName, length, gameNumber };
}

document.addEventListener('DOMContentLoaded', function() {
    //Main function that actually runs on setup.
    let myWebSocketManager = new WebSocketManager();
    let myBoardStateControllerObject = new BoardStateControllerObject();
    myWebSocketManager.addTypeListener('board-state', (data)=>{myBoardStateControllerObject.updateBoardState(data)});
    let params = parseURLForPlayer();
    let myUIManager = new UIManager(params.myColor, params.playerName, params.opponentName);
    myBoardStateControllerObject.addListener((data)=>{myUIManager.updateBoardUI(data)});
    myWebSocketManager.sendMessage({type:"entered-game",message:{gameNumber:params.gameNumber, myColor:params.myColor,playerName:params.playerName, opponentName:params.opponentName}})
});