const WebSocket = require('ws');

class AIBot {
    constructor(serverUrl, botName) {
        this.serverUrl = serverUrl;
        this.username = botName;
        this.ws = null;
        this.color = null;
        this.opponentName = null;
        this.currentBoard = null;
        this.connect();
    }

    connect() {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.on('open', () => {
            console.log(`${this.username} connected to the server.`);
        });

        this.ws.on('data', (data) => {
            const data = JSON.parse(data);
            this.handledata(data);
        });

        this.ws.on('close', () => {
            console.log(`${this.botName} disconnected from the server.`);
        });

        this.ws.on('error', (error) => {
            console.error(`WebSocket error: ${error}`);
        });
    }

    handledata(data) {
        switch (data.type) {
            case 'invite-opponent':
                this.acceptInvite(data.opponentName)
                break;
            case 'board-state':
                this.updateBoardState(data);
                break;
            case 'opponent-disconnected':
                this.handleOpponentDisconnected(data);
                break;
            case 'both-setup-complete':
                this.updateBoardState(data);
                break;
            default:
                break;
        }
    }
    sendMessage(data) {      
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            this.dataQueue.push(data);
        }
    }
    updateBoardState(data){
        this.currentBoard = data.board
        this.board = data.board;
        this.opponentName = this.board.opponentName;
        if(!this.board.myTurn){
            return;
        } else {
            this.doAction()
        }
    }
    doAction(){
        if(this.board.legalActions.includes('setup')){
            this.sendMessage({type:'random-setup'})
        }
    }
    handleOpponentDisconnected(data){
        //Placeholder if anything needs to be done.
    }

    acceptInvite(opponentName) {
        this.sendMessage({
            type: 'accept-invite',
            opponentName: opponentName
        });
    }

    processBoardState(boardState) {
        if (boardState.myTurn) {
            const action = this.decideAction(boardState);
            this.sendMessage(action);
        }
    }

}

// Initialize the AI bot
const serverUrl = 'ws://localhost:8080'; // Replace with your server URL
const botName = 'AI_Bot';
const aiBot = new AIBot(serverUrl, botName);