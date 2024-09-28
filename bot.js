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
        } else if (this.currentBoard.myTurn){
            let currentAction = this.determineAction()
            this.sendMessage({type:'game-action', action:currentAction.type, details:currentAction.moveData})
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

    onDeckRandomPiece(){
        // Select a random piece from the stash
        let currentAction = {}
        const randomIndex = Math.floor(Math.random() * this.currentBoard.stash.length);
        const piece = this.currentBoard.stash[randomIndex].piece;
        currentAction.action = actions.ONDECK
        currentAction.details = {declaration:piece.type}
        return currentAction
    }
    passOrChallengeBomb(){
        let currentAction = {}
        currentAction.action = Math.random() < 0.5 ? actions.PASS : actions.CHALLENGE;
        currentAction.details = {}
        return currentAction
    }
    sacrificeRanomPiece(){
        // Find all valid pieces for sacrifice
        let validPieces = [];
        for (let y = 0; y < this.currentBoard.board.length; y++) {
            for (let x = 0; x < this.currentBoard.board[y].length; x++) {
                const piece = this.currentBoard.board[y][x];
                if (piece && piece.color === this.currentBoard.color && 
                    piece.type !== pieces.UNKNOWN && piece.type !== pieces.KING) {
                    validPieces.push({x, y});
                }
            }
        }

        // Select a random piece from valid pieces
        let currentAction = {}
        let coords = {}
        if (validPieces.length > 0) {
            const randomIndex = Math.floor(Math.random() * validPieces.length);
            coords = validPieces[randomIndex];
            currentAction.action = actions.SACRIFICE;
        } else {
            // Fallback if no valid pieces found (shouldn't happen in a normal game)
            console.error("No valid pieces for sacrifice found");
            coords = {x: -1, y: -1};
        }
        currentAction.details = {x1:coords.x, y1:coords.y}
        return currentAction
    }
    shouldDeclareBomb(){
        if(this.currentBoard.captured[this.currentBoard.captured.length - 1].type == pieces.BOMB){
            //This really is a bomb
            return true;
        } else {
            // Bluff bomb 20% of the time
            return Math.random() < 0.2;
        }
    }
    shouldChallenge(){
        let lastAction = this.currentBoard.actionHistory[this.currentBoard.actionHistory.length -1]
        if (lastAction.wasCapture){
            return Math.random < 0.33
        } else {
            return  Math.random < 0.11
        }
    }

    determineAction() {
        let currentAction;
        if(this.currentBoard.legalActions.includes('onDeck')){
            currentAction = this.onDeckRandomPiece()
            return currentAction;
        } else if (this.currentBoard.legalActions.includes('sacrifice')){
            currentAction = this.sacrificeRanomPiece()
            return currentAction;
        } else if (this.currentBoard.legalActions.includes('pass')){
            currentAction = this.passOrChallengeBomb()
            return currentAction;
        } else if (this.currentBoard.legalActions.includes('bomb')){
            if(this.shouldDeclareBomb()){
                currentAction = {action:actions.BOMB,details:{declaration:piece.BOMB}}
                return currentAction;
            }
        }
        if (this.currentBoard.legalActions.includes('challenge')){
            if (this.shouldChallenge()){
                currentAction = {action:actions.CHALLENGE,details:{}}
                return currentAction;
            }
        }
        
        return currentAction;
    }

}

// Initialize the AI bot
const serverUrl = 'ws://localhost:8080'; // Replace with your server URL
const botName = 'AI_Bot';
const aiBot = new AIBot(serverUrl, botName);