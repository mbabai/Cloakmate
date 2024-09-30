const WebSocket = require('ws');

class AIBot {
    constructor(serverUrl, botName) {
        this.serverUrl = serverUrl;
        this.username = botName;
        this.ws = null;
        this.opponentName = null;
        this.currentBoard = null;
        this.connect();
    }

    connect() {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.on('open', () => {
            console.log(`${this.username} connected to the server.`);
        });

        this.ws.on('data', (message) => {
            const data = JSON.parse(message);
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
            setTimeout(() => {
                this.sendMessage({type:'random-setup'})
            }, 1000)
        } else if (this.currentBoard.myTurn){
            let currentAction = this.determineAction()
            setTimeout(() => {
                this.sendMessage({type:'game-action', action:currentAction.type, details:currentAction.moveData})
            }, 1000)
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

    getAllPieces(){
        let validPieces = []
        for (let y = 0; y < this.currentBoard.board.length; y++) {
            for (let x = 0; x < this.currentBoard.board[y].length; x++) {
                const piece = this.currentBoard.board[y][x];
                validPieces.push({type:piece.type,location:{x, y},color:this.currentBoard.color});
           }
        }
        return validPieces
    }
    getMyPieces(){
        return this.getAllPieces().filter(piece => piece.color === this.currentBoard.color)
    }
    getOpponentPieces(){
        return this.getAllPieces().filter(piece => piece.color === 1 - this.currentBoard.color)
    }
    getSacrificeablePieces(){
        return this.getMyPieces().filter(piece => piece.color === this.currentBoard.color && piece.type !== pieces.KING)
    }

    sacrificeRandomPiece(){
        // Find all valid pieces for sacrifice
        let validPieces = this.getSacrificeablePieces();
        // Select a random piece from valid pieces
        let currentAction = {}
        let coords = {}
        if (validPieces.length > 0) {
            const randomIndex = Math.floor(Math.random() * validPieces.length);
            coords = validPieces[randomIndex].location;
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
    isAThreateningB(pieceA,pieceB,allPieces){
        const dx = Math.abs(pieceA.location.x - pieceB.location.x);
        const dy = Math.abs(pieceA.location.y - pieceB.location.y);

        switch (pieceA.type) {
            case pieces.KING:
                return dx <= 1 && dy <= 1 && (dx + dy > 0);
            case pieces.KNIGHT:
                return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
            case pieces.BISHOP:
                if (dx === dy && dx < 4 && dy < 4) {
                    const xStep = Math.sign(pieceB.location.x - pieceA.location.x);
                    const yStep = Math.sign(pieceB.location.y - pieceA.location.y);
                    for (let i = 1; i < dx; i++) {
                        const x = pieceA.location.x + i * xStep;
                        const y = pieceA.location.y + i * yStep;
                        if (allPieces.some(p => p.location.x === x && p.location.y === y)) {
                            return false;
                        }
                    }
                    return true;
                }
                return false;
            case pieces.ROOK:
                if (((dx === 0 && dy > 0) || (dy === 0 && dx > 0)) && dx < 4 && dy < 4) {
                    const xStep = Math.sign(pieceB.location.x - pieceA.location.x);
                    const yStep = Math.sign(pieceB.location.y - pieceA.location.y);
                    for (let i = 1; i < Math.max(dx, dy); i++) {
                        const x = pieceA.location.x + i * xStep;
                        const y = pieceA.location.y + i * yStep;
                        if (allPieces.some(p => p.location.x === x && p.location.y === y)) {
                            return false;
                        }
                    }
                    return true;
                }
                return false;
            default:
                return false;
        }
    }
    getAllMyThreats(){
        let allMyThreats = []
        let allPieces = this.getAllPieces()
        for (let myPiece of this.getMyPieces()){
            for (let opponentPiece of this.getOpponentPieces()){
                if (this.isAThreateningB(myPiece,opponentPiece,allPieces)){
                    allMyThreats.push({
                        from: myPiece.location,
                        to: opponentPiece.location,
                        wouldBeBluff: false
                    })
                } else {
                    for (let bluffType of [pieces.KING,pieces.KNIGHT,pieces.BISHOP,pieces.ROOK]){
                        let bluffPiece = {type:bluffType,location:myPiece.location,color:myPiece.color}
                        if (bluffType !== myPiece.type && this.isAThreateningB(bluffPiece,opponentPiece,allPieces)){
                            allMyThreats.push({
                                from: bluffPiece.location,
                                to: opponentPiece.location,
                                wouldBeBluff: true
                            })
                        }
                    }
                }
            }
        }
        return allMyThreats;
    }
    getRealThreats(){
        return this.getAllMyThreats().filter(threat => !threat.wouldBeBluff);
    }
    getBluffThreats(){
        return this.getAllMyThreats().filter(threat => threat.wouldBeBluff);
    }
    getMoveAction(move){
        return {
            action: actions.MOVE,
            details: {
                x1: move.from.x,
                y1: move.from.y,
                x2: move.to.x,
                y2: move.to.y,
                declaration: move.piece.type
            }
        }
    }

    getRandomBackPiece(){
        let myPieces = this.getMyPieces()
        // Sort pieces based on their position (furthest back first)
        myPieces.sort((a, b) => {
            if (this.currentBoard.color === colors.BLACK) {
                return b.location.y - a.location.y;
            } else {
                return a.location.y - b.location.y;
            }
        });
        return myPieces[0]
    }
    getPieceLegalMoves(piece, allPieces){
        let moves = []
        for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) {
                const targetLocation = { x, y };
                const pieceTypes = [pieces.KING, pieces.KNIGHT, pieces.BISHOP, pieces.ROOK];

                for (const type of pieceTypes) {
                    const bluffPiece = { ...piece, type };
                    if (this.isAThreateningB(bluffPiece, { location: targetLocation },allPieces)) {
                        moves.push({
                            from: piece.location,
                            to: targetLocation,
                            piece: piece,
                            wouldBeBluff: type !== piece.type
                        });
                    }
                }
            }
        }
        return moves
    }
    moveRandomPiece(){
        let currentAction = {}
        let realThreats = this.getRealThreats()
        let bluffThreats = this.getBluffThreats()
        // If there are possible captures, randomly select one
        if (realThreats.length > 0 && bluffThreats.length > 0) {
            // 80% chance of moving a real threat, 20% chance of moving a bluff threat
            const randomThreat = Math.random() < 0.8 ? realThreats[Math.floor(Math.random() * realThreats.length)] : bluffThreats[Math.floor(Math.random() * bluffThreats.length)];
            currentAction = this.getMoveAction(randomThreat)
        } else if (realThreats.length > 0) {
            // If there are only real threats, move a real threat
            const randomThreat = realThreats[Math.floor(Math.random() * realThreats.length)];
            currentAction = this.getMoveAction(randomThreat)
        } else if (bluffThreats.length > 0) {
            // If there are only bluff threats, move a bluff threat
            const randomThreat = bluffThreats[Math.floor(Math.random() * bluffThreats.length)];
            currentAction = this.getMoveAction(randomThreat)
        } else if(this.getMyPieces().length == 1){
            //We only have a king, so we should move it to the throne
            let king = this.getMyPieces()[0];
            let targetThrone = this.currentBoard.color === colors.WHITE ? { x: 2, y: 4 } : { x: 2, y: 0 };
            let possibleMoves = this.getPieceLegalMoves(king, this.getAllPieces());
            
            // Find the move that gets closest to the target throne
            let bestMove = possibleMoves.reduce((best, move) => {
                let distanceToThrone = Math.abs(move.to.x - targetThrone.x) + Math.abs(move.to.y - targetThrone.y);
                if (distanceToThrone < best.distance) {
                    return { move: move, distance: distanceToThrone };
                }
                return best;
            }, { move: null, distance: Infinity });

            if (bestMove.move) {
                currentAction = this.getMoveAction(bestMove.move);
            }
        } else {
                // If no threats are possible, move one of the furthest back pieces forward
            let selectedPiece = this.getRandomBackPiece();
            // Get all possible forward moves for the selected piece
            let desireableMoves = this.getPieceLegalMoves(selectedPiece,this.getAllPieces()).filter(move => {
                if (this.currentBoard.color === colors.BLACK) {
                    return move.to.y <= selectedPiece.location.y;
                } else {
                    return move.to.y >= selectedPiece.location.y;
                }
            });
            // If there are possible moves, randomly select one
            let bluffMoves = desireableMoves.filter(move => move.wouldBeBluff)
            let realMoves = desireableMoves.filter(move => !move.wouldBeBluff)
            if (realMoves.length > 0 && bluffMoves.length > 0){
                let randomMove = Math.random() < 0.8 ? realMoves[Math.floor(Math.random() * realMoves.length)] : bluffMoves[Math.floor(Math.random() * bluffMoves.length)]
                currentAction = this.getMoveAction(randomMove)
            } else if (realMoves.length > 0){
                let randomMove = realMoves[Math.floor(Math.random() * realMoves.length)]
                currentAction = this.getMoveAction(randomMove)
            } else if (bluffMoves.length > 0){
                let randomMove = bluffMoves[Math.floor(Math.random() * bluffMoves.length)]
                currentAction = this.getMoveAction(randomMove)
            }
        }
        return currentAction;
    }
    determineAction() {
        let currentAction;
        if(this.currentBoard.legalActions.includes('onDeck')){
            currentAction = this.onDeckRandomPiece()
            return currentAction;
        } else if (this.currentBoard.legalActions.includes('sacrifice')){
            currentAction = this.sacrificeRandomPiece()
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
        if (this.currentBoard.legalActions.includes('move')){
            currentAction = this.moveRandomPiece()
            return currentAction;
        }
    }
}
// // Initialize the AI bot
// const serverUrl = 'ws://localhost:8080'; // Replace with your server URL
// const botName = 'AI_Bot';
// const aiBot = new AIBot(serverUrl, botName);
module.exports = AIBot;