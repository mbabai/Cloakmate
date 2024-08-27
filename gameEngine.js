const precalcs = require('./precalcs');
const utils = require('./utils');
//////////////////////////////////////////////////////////
const colors = { // Color/Player constants
	WHITE: 0, 
	BLACK: 1
}
const pieces = { //Piece constants
    BOMB:0,
    KING:1,
    KNIGHT:2,
    BISHOP:3,
    ROOK:4,
    UNKNOWN:5
}
const pieceSymbols = { //queen is BOMB
    [colors.WHITE]: ['♛', '♚', '♞', '♝', '♜','♟'],
    [colors.BLACK]: ['♕', '♔', '♘', '♗', '♖','♙'] 
};

const actions = {
    MOVE: 0,
    CHALLENGE: 1,
    BOMB: 2,
    SACRIFICE: 3,
    ONDECK: 4
};

const All = precalcs.createAllPiecesLookupTable()


class Action {
    constructor(type, player,  x1 = null, y1 = null, declaration = null, x2 = null, y2 = null) {
        this.type = type;
        this.player = player;
        
        // Set attributes based on the action type
        switch (type) {
            case actions.MOVE:
                this.x1 = x1;
                this.y1 = y1;
                this.declaration = declaration;
                this.x2 = x2;
                this.y2 = y2;
                this.wasBluff = null;
                this.wasCapture = null;
                break;
            case actions.CHALLENGE:
                // Only type and player are needed for CHALLENGE
                this.wasSuccessful = null //We'll see later if the challenge was successful
                break;
            case actions.BOMB:
                this.declaration = pieces.BOMB;
                this.wasBluff = null;
                this.wasCapture = null;
                // x1, y1 not used for BOMB
                break;
            case actions.SACRIFICE:
                this.x1 = x1;
                this.y1 = y1;
                this.piece = null
                // declaration, x2, y2 not used for SACRIFICE
                break;
            case actions.ONDECK:
                this.declaration = declaration; // this is the piece that will go on deck.
                break;
            default:
                console.error("Invalid action type");
                break;
        }
    }
    copy(){
        return new Action(this.type, this.player, this.x1, this.y1, this.declaration, this.x2, this.y2);
    }
    isCapture(){
        //must be called BEFORE the move is complete to be accurate
        if(this.type == actions.BOMB) {return true;} //Bombs are always capturing
        if(this.type != actions.MOVE) {return false;} //Not a move? not a capture
        if(this.board.getPieceAt(this.x2,this.y2)) return true; // there was a piece at the target location before the move was completed
        return false;
    }

    isBluff(){
        // must be called AFTER the move is complete to be accurat
        if(this.type == actions.MOVE){
            return this.board.getPieceAt(this.x2, this.y2).type != this.declaration;
        } else if (this.type == actions.BOMB){
            return this.board.lastCapturedPiece.type == pieces.BOMB; //the last piece taken was a bomb AFTER the move is completed
        } else {
            return; 
        }
    }
    isLegal(){
        if(this.player != this.board.playerTurn) {
            console.error("Illegal action: Wrong player taking action!")
            return false;
        }

        if (this.type != actions.SACRIFICE && this.board.playerToSacrifice == this.board.playerTurn){
            console.error("Illegal action: Player must Sacrifice!")
            return false;
        } else if (this.type != actions.ONDECK && this.board.playerToOnDeck == this.board.playerTurn){
            console.error("Illegal action: Player must On Deck!")
            return false;
        }

        let lastAction = this.board.actions[this.board.actions.length - 1]
        switch (this.type){
            case actions.MOVE:
                let startPosIndex = utils.getBitIndexFromXY(this.x1,this.y1)
                let endPosIndex = utils.getBitIndexFromXY(this.x2,this.y2)
                if(!this.board.generatePieceColorLocationLegalMoves(this.declaration,this.player,startPosIndex).includes(endPosIndex)) {
                    console.error("Illegal move: Piece cannot move to destination!")
                    return false;
                }
                break;
            case actions.CHALLENGE:
                if(lastAction && lastAction.type == actions.CHALLENGE) {
                    console.error("Illegal challenge: Cannot challenge a challenge!")
                    return false;
                } 
                break;
            case actions.BOMB:
                if(lastAction && !lastAction.wasCapture){
                    console.error("Illegal bomb: Cannot declare bomb without a capture!")
                    return false;
                } 
                break;
            case actions.SACRIFICE:
                //todo, check that the opponent to a successful challenge before, and that a real piece was selected to sacrifice. 
                if (this.board.playerToSacrifice != this.player){
                    console.error("Illegal Sacrifice: Player must NOT Sacrifice!")
                    return false;
                } else if (this.board.getPieceAt(this.x1, this.y1) == null) {
                    console.error("Illegal Sacrifice: No piece at location!")
                    return false;
                } else if (this.board.getPieceAt(this.x1, this.y1).player != this.player){
                    console.error("Illegal Sacrifice: Cannot sacrifice an opponent's piece!")
                    return false;
                }
                break;
            case actions.ONDECK:
                if (this.board.playerToOnDeck != this.player){
                    console.error("Illegal On Deck: Player must NOT On Deck!")
                    return false;
                } 
                //Todo: Check if the piece declared is in the stash. 
                break;
        }
        return true;
    }
    print(showBluff=false){
        let bluffMark = ''
        if(showBluff){
            bluffMark = "??"
        } 
        switch (this.type){
            case actions.MOVE:
                console.log(`Move: ${pieceSymbols[this.player][this.declaration]}${bluffMark}: (${this.x1},${this.y1}) => (${this.x2},${this.y2})`)
                break;
            case actions.CHALLENGE:
                console.log("CHALLENGE!")
                break;
            case actions.BOMB:
                console.log(`BOMB!!${bluffMark}`)
                break;
            case actions.SACRIFICE:
                console.log(`Sacrifice  ${pieceSymbols[this.piece.player][this.piece.type]} at (${this.x1},${this.y1})`)
                break;
            case actions.ONDECK:
                console.log(`On Deck  ${pieceSymbols[this.player][this.declaration]}`)
                break;
        }
    }
}


class Board {
	constructor(height, width){
		this.height = height
		this.width = width
		this.game = null
        this.phase = 'setup'

		this.playerTurn = colors.WHITE //0 for white, 1 for black
		this.turnNumber = 0 // First turn as white is turn 0
        this.playerToSacrifice = null;
        this.playerToOnDeck = null
        this.winner = null
        /* 
        format of bitboards:
            [height*width bits - location on board] 
            [2 bits - stash]
            [2 bits - captured]
            [1 bit - on deck]
        */
        this.bitboards = [
            [0b010,0b010,0b100,0b100,0b100], // white pieces: bomb (1), king (1), knight (2), bishop (2), rook (2)
            [0b010,0b010,0b100,0b100,0b100]  // black pieces: bomb (1), king (1), knight (2), bishop (2), rook (2)  
        ]
        this.actions = []
        this.startingBoard = []
        this.lastCapturedPiece = null //{player, type} tracked for bluffs/bombs
        this.lastMoveLocation  = {} // {x,y} tracked for bluffs/bombs
	}

    saveStartingBoard(){
        this.startingBoard = this.bitboards.map(innerArray => innerArray.slice());
    }
    loadStartingBoard(){
        this.bitboards = this.startingBoard.map(innerArray => innerArray.slice());
    }

    countColorPiecesOnBoard(color){
        let onBoardBits = this.getFriendlyPieces(color) >> 5
        let count = 0;
        while (onBoardBits > 0) {
            count += onBoardBits & 1; // Increment count if the LSB is 1
            onBoardBits = onBoardBits >>> 1; // Unsigned right shift operator
        }
        return count
    }

    isGameOver(){
        return this.countColorPiecesOnBoard(1 - this.playerTurn) == 0 && this.countColorPiecesOnBoard(this.playerTurn) > 0 && this.phase != "setup";
    }

    movePiece(x1, y1, x2, y2) {
        // Identify the piece at the source location
        const sourcePieceInfo = this.getPieceAt(x1, y1);
        if (!sourcePieceInfo) {
            console.error("Error: No piece at the source location to move.");
            return;
        }
    
        // Check if the target location is occupied
        const targetPieceInfo = this.getPieceAt(x2, y2);
        if (targetPieceInfo && targetPieceInfo.player === sourcePieceInfo.player) {
            console.error("Error: Cannot move to a location occupied by a friendly piece.");
            return;
        }
    
        // If there is an enemy piece at the target location, capture it
        if (targetPieceInfo && targetPieceInfo.player !== sourcePieceInfo.player) {
            this.captureAtXY(x2, y2);
        }
    
        // Move the piece from the source to the target location
        // Calculate the position index for the source and target locations
        const sourcePosIndex = (utils.getBitIndexFromXY(x1, y1));
        const targetPosIndex = (utils.getBitIndexFromXY(x2, y2));
        
        // Clear the bit at the source position
        this.bitboards[sourcePieceInfo.player][sourcePieceInfo.type] &= ~(1 << sourcePosIndex);
        // Set the bit at the target position
        this.bitboards[sourcePieceInfo.player][sourcePieceInfo.type] |= 1 << targetPosIndex;
    
        this.lastMoveLocation = {"x":x2,"y":y2} // track this for bombs and bluffs
        // console.log(`:::Moving Piece(${pieceSymbols[sourcePieceInfo.player][sourcePieceInfo.type]}) from (${x1},${y1}) to (${x2},${y2})`);
    }
    

    getPieceAt(x, y) {
        const posIndex = utils.getBitIndexFromXY(x,y);
        for (let player of [colors.WHITE, colors.BLACK]) {
            for (let type = 0; type < this.bitboards[player].length; type++) {
                if ((this.bitboards[player][type]) & (1 << (posIndex))) {
                    return { player, type };
                }
            }
        }
        return null; // No piece at this position
    }
    captureAtXY(x, y) {
        // Identify the piece at the specified location
        const targetPieceInfo = this.getPieceAt(x, y);
        if (!targetPieceInfo) {
            console.error("Error: No piece at the specified location to capture.");
            return;
        }
    
        // Calculate the position index for updating the bitboard
        const posIndex = utils.getBitIndexFromXY(x, y);
    
        // Remove the piece from its current position on the board
        this.bitboards[targetPieceInfo.player][targetPieceInfo.type] &= ~(1 << (posIndex));
    
        // Update the bitboard to reflect the captured status of the piece
        // Note: This assumes captured pieces are counted in the first two bits 'ab'
        const capturedCount = Number((this.bitboards[targetPieceInfo.player][targetPieceInfo.type] & (0b11000)) >> 3) + 1;
        this.bitboards[targetPieceInfo.player][targetPieceInfo.type] &= ~(0b11000); // Clear the old captured count
        this.bitboards[targetPieceInfo.player][targetPieceInfo.type] |= ((capturedCount) << 3); // Set the new captured count
        
        this.lastCapturedPiece = targetPieceInfo; // track this for the bomb/bluffs
        // console.log(`:::Capturing Piece(${pieceSymbols[targetPieceInfo.player][targetPieceInfo.type]}) at (${x},${y}) due to...`)
    }
    uncaptureAtXY(x, y) {
        // Check if there is information about the last captured piece
        if (!this.lastCapturedPiece) {
            console.error("Error: No recently captured piece to uncapture.");
            return;
        }
        
        const {player, type} = this.lastCapturedPiece;
        const posIndex = utils.getBitIndexFromXY(x, y);
    
        // Decrease the captured count for the piece's type and player
        let capturedCount = Number((this.bitboards[player][type] & (0b11000)) >> 3);
        if (capturedCount > 0) {
            capturedCount -= 1;
        } else {
            console.error("Error: Captured count inconsistency.");
            return;
        }
        this.bitboards[player][type] &= ~(0b11000); // Clear the old captured count
        this.bitboards[player][type] |= (capturedCount << 3); // Set the new captured count
    
        // Set the piece back to its position on the board
        this.bitboards[player][type] |= (1 << posIndex);
    
        // console.log(`:::Uncapturing Piece(${pieceSymbols[player][type]}) at (${x},${y})`);
    }
    
    

    placePiece(type, player, x, y) {
        const posIndex = utils.getBitIndexFromXY(x,y);

        // Ensure we clear the position across all piece types to prevent duplicates
        for (let i = 0; i < this.bitboards[player].length; i++) {
            this.bitboards[player][i] &= ~(1 << posIndex);
        }

        // Place the piece at the new position
        this.bitboards[player][type] |= (1 << posIndex);
        // console.log(`:::Placing Piece(${pieceSymbols[player][type]}) -> (${x},${y})`)
    }

    getOnDeckPieceforPlayer(player) {
        for (let type = 0; type < this.bitboards[player].length; type++) {
            if ((this.bitboards[player][type] & 1) !== 0) { // Checking the on-deck bit
                return type; //found the piece
            }
        }
        return null; // No piece on deck for the player
    }

    moveStashPieceToOnDeck(player, type) { 
        // Check the stash count for the piece to be moved to on deck
        const stashCountForPiece = Number((this.bitboards[player][type] & (0b11 << 1)) >> 1);
        if (stashCountForPiece <= 0) {
            console.error("Error: The specified piece is not available in the stash.");
            return; // Exit the function as the operation cannot be completed
        }
    
        // Check if there is already a piece on deck
        let currentOnDecktype = this.getOnDeckPieceforPlayer(player)
    
        // If there is a piece on deck, move it back to the stash
        if (currentOnDecktype !== null) {
            // Clear the on-deck status for the current piece
            this.bitboards[player][currentOnDecktype] &= ~1;
    
            // Increment the stash count for the current piece
            const currentStashCount = Number((this.bitboards[player][currentOnDecktype] & (0b11 << 1)) >> 1) + 1;
            this.bitboards[player][currentOnDecktype] &= ~(0b11 << 1); // Clear the old stash count
            this.bitboards[player][currentOnDecktype] |= (currentStashCount) << 1; // Set the new stash count
        } 
    
        // Decrement the stash count for the new piece, now that we've confirmed it's in the stash
        this.bitboards[player][type] &= ~(0b11 << 1); // Clear the old stash count
        this.bitboards[player][type] |= (stashCountForPiece - 1) << 1; // Set the new stash count
    
        // Set the new piece as on deck
        this.bitboards[player][type] |= 1;
        // console.log(`:::Stash(${pieceSymbols[player][type]}) -> On Deck`)
    }

    moveStashPieceToBoard(player, type, x, y) {
        // Verify if the piece is available in the stash
        const stashCount = Number((this.bitboards[player][type] & (0b11 << 1)) >> 1);
        if (stashCount <= 0) {
            console.error("Error: The specified piece is not available in the stash.");
            return;
        }
    
        // Find if there's a piece at the target location
        const targetPieceInfo = this.getPieceAt(x, y);
        if (targetPieceInfo) {
            // Move the piece at the target location back to its stash
            const capturedStashCount = Number((this.bitboards[targetPieceInfo.player][targetPieceInfo.type] & (0b11 << 1)) >> 1) + 1;
            this.bitboards[targetPieceInfo.player][targetPieceInfo.type] &= ~(0b11 << 1); // Clear the old stash count
            this.bitboards[targetPieceInfo.player][targetPieceInfo.type] |= (capturedStashCount) << 1; // Set the new stash count
        }
    
        // Decrement the stash count for the moving piece
        this.bitboards[player][type] &= ~(0b11 << 1); // Clear the old stash count
        this.bitboards[player][type] |= (stashCount - 1) << 1; // Set the new stash count
    
        // Place the piece at the specified location on the board
        const posIndex = (utils.getBitIndexFromXY(x, y));
        for (let i = 0; i < this.bitboards[player].length; i++) {
            this.bitboards[player][i] &= ~(1 << (posIndex)); // Clear any existing piece at this position
        }
        this.bitboards[player][type] |= 1 << (posIndex);
        // console.log(`:::Stash(${pieceSymbols[player][type]}) -> (${x},${y})`)
    }

    moveOnDeckToStash(player) {
        // Find the piece that's currently on deck for the specified player
        let onDecktype = getOnDeckPieceforPlayer(player)
    
        // If no piece is on deck, log an error and do nothing
        if (onDecktype === null) {
            console.error("Error: There is no piece on deck for the specified player.");
            return; // Exit the function
        }
    
        // Clear the on-deck status for the piece
        this.bitboards[player][onDecktype] &= ~1;
    
        // Increment the stash count for the piece
        const stashCount = Number((this.bitboards[player][onDecktype] & (0b11 << 1)) >> 1) + 1;
        this.bitboards[player][onDecktype] &= ~(0b11 << 1); // Clear the old stash count
        this.bitboards[player][onDecktype] |= (stashCount) << 1; // Set the new stash count
        // console.log(`:::On Deck(${pieceSymbols[player][onDecktype]}) -> Stash`)
    }
    swapDeckToBoard(player, x, y) {
        // Find the on-deck piece for the player
        let onDecktype = null;
        for (let i = 0; i < this.bitboards[player].length; i++) {
            if ((this.bitboards[player][i] & 1) !== 0) { // Checking the 'e' bit for on deck
                onDecktype = i;
                break;
            }
        }
    
        // If no piece is on deck, show an error
        if (onDecktype === null) {
            console.error("Error: There is no piece on deck for the specified player.");
            return;
        }
    
        // Check if there's a piece at the target location owned by the player
        const targetPieceInfo = this.getPieceAt(x, y);
        if (!targetPieceInfo || targetPieceInfo.player !== player) {
            console.error("Error: The target location does not have a piece owned by the player.");
            return;
        }
    
        // Increment the stash count for the piece being replaced
        const stashCount = Number((this.bitboards[player][targetPieceInfo.type] & (0b11 << 1)) >> 1) + 1;
        this.bitboards[player][targetPieceInfo.type] &= ~(0b11 << 1); // Clear the old stash count
        this.bitboards[player][targetPieceInfo.type] |= (stashCount) << 1; // Set the new stash count
    
        // Clear the on-deck status for the on-deck piece
        this.bitboards[player][onDecktype] &= ~1;
    
        // Place the on-deck piece at the specified location on the board
        const posIndex = (utils.getBitIndexFromXY(x, y));
        for (let i = 0; i < this.bitboards[player].length; i++) {
            this.bitboards[player][i] &= ~(1 << posIndex); // Clear any existing piece at this position
        }
        this.bitboards[player][onDecktype] |= 1 << posIndex;
        // console.log(`:::On Deck(${pieceSymbols[player][onDecktype]}) -> (${x},${y})`)
    }

    // MOVE GENERATION
    getAllPiecesBitboard(){
        return  this.getFriendlyPieces(0) | this.getFriendlyPieces(1)
    }
    getFriendlyPieces(color){
        return this.bitboards[color][0] | this.bitboards[color][1] | this.bitboards[color][2] | this.bitboards[color][3] | this.bitboards[color][4]
    }

    generatePieceColorLocationLegalMoves(piece,color,startPosIndex){
        const allPiecesBitboard = this.getAllPiecesBitboard()
        let thisMovementMask = All.movementMasks.get(JSON.stringify([piece,startPosIndex]))
        const blockerBitboard = allPiecesBitboard & thisMovementMask
        let movesBitboard = All.legalMovesLookup.get(JSON.stringify([piece,startPosIndex,blockerBitboard]))
        movesBitboard &= ~this.getFriendlyPieces(color)
        let movesList = []
        let index = 0;
        while (movesBitboard > 0) {
            if ((movesBitboard & 1) === 1) {
                movesList.push(index); 
            }
            movesBitboard >>= 1;
            index++;
        }
        return movesList
    }

    flipTurn(){
        this.playerTurn = 1 - this.playerTurn;
    }

    takeAction(action){
        action.board = this; //Just in case, set the move's board to this board.
        if(!action.isLegal()){return;}
        let lastAction = this.actions[this.actions.length - 1]
        let twoActionsAgo = this.actions[this.actions.length - 2]
        switch (action.type){
            case actions.MOVE: // A regular move. 
                action.wasCapture = action.isCapture()
                if(!action.wasCapture){
                    this.lastCapturedPiece = null;
                }
                this.movePiece(action.x1,action.y1,action.x2,action.y2)
                this.flipTurn()
                action.wasBluff = action.isBluff()
                this.actions.push(action)
                break;
            case actions.CHALLENGE:  
                if(lastAction.wasBluff && lastAction.type == actions.MOVE){ //Kill the bluffing piece, and the turn does NOT flip.
                    // 0 move -> 1 challenge (bluff) -> 1 move...
                    if(lastAction.wasCapture){ //If this was a capture, we undo it with a revive
                        this.reviveLastCapturedPieceAtXY(lastAction.x2,lastAction.y2)
                    }  else { //With no capture, we just have to lose the piece that just moved
                        this.captureAtXY(lastAction.x2,lastAction.y2)
                    }
                } else if (!lastAction.wasBluff && lastAction.type == actions.MOVE) { //if the challenge failed (not a bluff), this same player must sacrifice.
                    // 0 move -> 1 challenge (NOT bluff) -> 1 sacrifices -> 0 on decks -> 1 move...
                    this.playerToSacrifice = action.player; // The Current player will have to make a sacrifice. Nothing else.
                    this.playerToOnDeck = lastAction.player; // the other player will select a new on-deck piece
                    this.swapDeckToBoard(lastAction.player,lastAction.x2,lastAction.y2)
                } else if (lastAction.wasBluff && lastAction.type == actions.BOMB){ // A bomb was declared, and was a bluff
                    // 0 move -> 1 bomb -> 0 challenge (bluff) -> 1 sacrifices -> 1 move...
                    this.reviveLastCapturedPieceAtXY(twoActionsAgo.x2,twoActionsAgo.y2) //This undoes the bomb
                    this.playerToSacrifice = lastAction.player; // The bomb bluffer must still sacrifice yet another piece. 
                    this.flipTurn() // since we're actually  going to flip turns
                } else if (!lastAction.wasBluff && lastAction.type == actions.BOMB){
                    // 0 move -> 1 bomb -> 0 challenge (NOT bluff) -> 1 On Decks -> 0 sacrifices -> 1 move...
                    this.playerToSacrifice = action.player; //The challenger must sac, we don't flip the turn.
                    this.playerToOnDeck = lastAction.player;
                    this.swapDeckToBoard(lastAction.player,twoActionsAgo.x2,twoActionsAgo.y2) // it was the move prior that had the capture move.
                    this.flipTurn() // since we're actually  going to flip turns
                } else {
                    console.error("Challenge error: Challenged a non-existant circumstance.")
                }
                break;
            case actions.BOMB:
                action.wasBluff = (this.lastCapturedPiece.type != pieces.BOMB)
                // Enact as though it is a bomb, reviving the supposed bomb, capturing the attacking piece
                this.reviveLastCapturedPieceAtXY(lastAction.x2,lastAction.y2) 
                this.flipTurn()
                break;
            case actions.SACRIFICE:
                action.piece = this.getPieceAt(action.x1,action.y1)
                this.playerToSacrifice = null;
                this.captureAtXY(action.x1,action.y1)
                if (!(twoActionsAgo.type == actions.BOMB && twoActionsAgo.wasBluff)){
                    // We must NOT be in this line: 0 move -> 1 bomb -> 0 challenge (bluff) -> 1 sacrifices -> 1 move... 
                    this.flipTurn()
                }
                break;
            case actions.ONDECK:
                this.moveStashPieceToOnDeck(action.player, action.declaration)
                this.playerToOnDeck = null;
                this.flipTurn()
                break;
        }        
        this.turnNumber++; //increment the move
        this.actions.push(action) //Add this action to the list
        action.print()
        this.printBoard()
    }
    undoLastAction(){
        let lastMove = this.actions.pop()
        this.loadStartingBoard()
        for(let i = 0; i < this.actions.length;i++){
            this.takeAction(i)
        }
        return lastMove
    }

    reviveLastCapturedPieceAtXY(x, y) {
        // Check if there is a last captured piece to revive
        if (!this.lastCapturedPiece) {
            console.error("Error: No captured piece available to revive.");
            return;
        }
    
        const { player, type } = this.lastCapturedPiece;
        const posIndex = utils.getBitIndexFromXY(x, y); // Assumes utils.getBitIndexFromXY(x, y) is defined
    
        // Decrease the captured count for the piece's type and player, if necessary
        let capturedCount = Number((this.bitboards[player][type] & (0b11000)) >> 3);
        if (capturedCount > 0) {
            capturedCount -= 1;
            this.bitboards[player][type] &= ~(0b11000); // Clear the old captured count
            this.bitboards[player][type] |= (capturedCount << 3); // Set the new captured count
        }
        // At this point we've removed the piece from the grave, but haven't placed it on the board yet. 
        // Let's now capture what is there (if there is somethign there)
        const targetPieceInfo = this.getPieceAt(x, y);
        if (!targetPieceInfo) {
            console.error("Error: No piece at the specified location to capture.");
            // Optionally, reset or update lastCapturedPiece after revival
            this.lastCapturedPiece = null;
        } else {
            this.captureAtXY(x,y);
        }
        

        // Revive the piece at the specified position on the board
        this.bitboards[player][type] |= (1 << posIndex);
    
        // console.log(`:::Reviving Piece(${pieceSymbols[player][type]}) at (${x},${y})`);
    }
    
    
    printBoard() {
        console.log("__________")    
        // Initialize variables to hold stashes, on-deck, and captured pieces
        let stashes = [[], []]; // [whiteStash, blackStash]
        let onDeck = ["", ""]; // [whiteOnDeck, blackOnDeck]
        let captured = []; // combined captured pieces

        // Iterate through bitboards to populate above variables
        for (let player of [colors.WHITE, colors.BLACK]) {
            for (let type = 0; type < this.bitboards[player].length; type++) {
                const bitboard = this.bitboards[player][type];
                const capturedCount = Number((bitboard & (0b11 << 3)) >> 3);
                const stashCount = Number((bitboard & (0b11 << 1)) >> 1);
                const onDeckStatus = (bitboard & 1) !== 0;

                // Populate stashes and on-deck
                stashes[player].push(...Array(stashCount).fill(pieceSymbols[player][type]));
                if (onDeckStatus) onDeck[player] = pieceSymbols[player][type];
                
                // Populate captured pieces list
                if (capturedCount > 0) captured.push(...Array(capturedCount).fill(pieceSymbols[player][type]));
                
            }
        }
        // Print stashes, on-deck, and captured pieces information
        console.log(`B-Stash: (${onDeck[colors.BLACK]}) ${stashes[colors.BLACK].join(' ')}`);

        // Draw the board itself:
        for (let y = this.height - 1; y >= 0; y--) {
            let row = '';
            for (let x = 0; x < this.width; x++) {
                const piece = this.getPieceAt(x, y);
                row += piece ? pieceSymbols[piece.player][piece.type] : '□';
                row += ' ';
            }
            console.log(row);
        }
        console.log(`W-Stash: (${onDeck[colors.WHITE]}) ${stashes[colors.WHITE].join(' ')} `);
        console.log("...........")
        console.log(`Captured: last:${this.lastCapturedPiece != null ? `(${pieceSymbols[this.lastCapturedPiece.player][this.lastCapturedPiece.type]})`:`()`} ${captured.join(' ')}`); 
        if(this.isGameOver()){
            this.winner = this.playerTurn
            console.log(`Game Over - Winner is ${this.playerTurn == colors.WHITE ? "White" : "Black"}!`)
        }
        console.log("__________")
    }
}


class Game {
    constructor(p1,p2,length) {
        this.players = [p1,p2] //0-index white, 1-index black
        this.winner = null
        this.board = new Board(5,5) //default to 5x5 board.
        this.length = length;
        this.gameStartTime = Date.now();
        this.playStartTime;
        this.gameEndTime;
        this.playersTimeAvailable = [30*1000+500,30*1000+500] // Setup time, plus half a second to account for lag time. 
        this.playersSetupComplete = [false,false]
    };
    log(){
        let clock = this.length == 1 ? "Blitz" : this.length == 5 ? "Standard" : "Classic";
        let duration = utils.millisecondsToClock(Date.now() - this.gameStartTime);
        return (`White: ${this.players[0]} VS. Black: ${this.players[1]}, Style: ${clock}, Phase: ${this.board.phase}, Duration: ${duration}`)
    }
    getColorState(color) {
        // returns a version of the board state that obfuscates the other side's information.
        const otherColor = 1 - color; 
        const boardState = {
            color: color,
            opponentName: this.players[1-color],
            phase: this.board.phase,
            board: Array.from(Array(this.board.height), () => Array(this.board.width).fill(null)),
            onDeck: null,
            captured: [],
            stash: [],
            myTurn: (this.board.playerTurn === color),
            legalActions: [],
            clocks:[this.playersTimeAvailable[0]-500,this.playersTimeAvailable[1]-500], // Not showing the extra half second.
            actionHistory: this.board.actions.map(action => action.copy()) //Copying the action history to avoid showing if it was a bluff or not
        };

        // Iterate over each cell on the board
        for (let y = 0; y < this.board.height; y++) {
            for (let x = 0; x < this.board.width; x++) {
                const pieceInfo = this.board.getPieceAt(x, y);
                if (pieceInfo) {
                    if (pieceInfo.player === color) {
                        boardState.board[y][x] = {color: color, type: pieceInfo.type};
                    } else {
                        boardState.board[y][x] = {color: otherColor, type: pieces.UNKNOWN} ;
                    }
                }
            }
        }
        // Check available actions
        if (boardState.myTurn || this.board.phase === "setup") {//Only matters if it is our turn.
            if (this.board.phase === "setup"){
                boardState.legalActions.push("setup");
            } else if (this.board.playerToSacrifice === color) { //If we must sacrifice, nothing else matters
                boardState.legalActions.push("sacrifice");
            } else if (this.board.playerToOnDeck === color) { //If we have to on-deck, nothing else matters.
                boardState.legalActions.push("on-deck");
            } else { //If it's neither of those two, we can move and perhaps challenge and/or bomb
                boardState.legalActions.push("move");
                 // Check if challenge or bomb can be declared based on last action
                const lastAction = this.board.actions[this.board.actions.length - 1];
                if (lastAction && lastAction.type === actions.MOVE && lastAction.player !== color) {
                    boardState.legalActions.push("challenge");
                }
                if (lastAction && lastAction.wasCapture && lastAction.player !== color) {
                    boardState.legalActions.push("bomb");
                }
            } 
        }
        // Handle on-deck piece for the current player
        const onDeckType = this.board.getOnDeckPieceforPlayer(color);
        if (onDeckType !== null) {
            boardState.onDeck = {color: color, type: onDeckType} ;
        }

        // Handle captured pieces
        for (let player of [colors.WHITE, colors.BLACK]) {
            for (let type = 0; type < this.board.bitboards[player].length; type++) {
                const capturedCount = Number((this.board.bitboards[player][type] & (0b11000)) >> 3);
                if (capturedCount > 0) {
                    const thisPiece = {color: player, type: type} ;
                    for (let i = 0; i < capturedCount; i++) {
                        if (this.board.lastCapturedPiece && this.board.lastCapturedPiece.player === player && this.board.lastCapturedPiece.type === type && i === 0) {
                            boardState.captured.push({color: otherColor, type: pieces.UNKNOWN} ); // Last captured piece shown as 'unknown'
                        } else {
                            boardState.captured.push(thisPiece);
                        }
                    }
                }
            }
        }

        // Handle stash for the current player
        for (let type = 0; type < this.board.bitboards[color].length; type++) {
            const stashCount = Number((this.board.bitboards[color][type] & (0b11 << 1)) >> 1);
            if (stashCount > 0) {
                boardState.stash.push({
                    piece: {color: color, type: type},
                    count: stashCount
                });
            }
        }

        return boardState;
    }
    selectRandomSetup() {
        let selection = [pieces.KING, pieces.BISHOP, pieces.BISHOP, pieces.ROOK, pieces.ROOK, pieces.KNIGHT, pieces.KNIGHT, pieces.BOMB];
        for (let i = selection.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [selection[i], selection[j]] = [selection[j], selection[i]]; // Swap elements
        }
        // Select the first 6 elements from the shuffled array
        return selection.slice(0, 6);
    }

    randomSetup(playerNumber) {
        console.log(`Random Setup for player #${playerNumber}`);
        let isLegal = false;
        let pick;
        let frontRow;
        let onDeckPiece;

        while (!isLegal) {
            pick = this.selectRandomSetup();
            console.log(`Pick: ${pick}`);
            frontRow = [];
            onDeckPiece = null;

            for (let x = 0; x < pick.length; x++) {
                if (x === 5) {
                    onDeckPiece = {color: playerNumber, type: pick[x]};
                } else {
                    let y = playerNumber === colors.WHITE ? 0 : 4;
                    frontRow.push({ x, y, color: playerNumber, type: pick[x] });
                }
            }

            isLegal = this.isSetupLegal(frontRow, onDeckPiece, playerNumber);
        }

        // Now that we have a legal setup, place the pieces
        this.placeSetupPieces(playerNumber, frontRow, onDeckPiece);
        return this.getColorState(playerNumber);
    }

    trySetup(playerName, frontRow, onDeck) {
        const playerColor = this.getPlayerColorIndex(playerName);
    
        if (!frontRow || onDeck === undefined) {
            console.error("Illegal setup: frontRow or onDeck are null or undefined");
            return false;
        }
    
        // Check legality of the setup
        if (!this.isSetupLegal(frontRow, onDeck, playerColor)) {
            console.log("Illegal setup");
            return false;
        }
    
        // Ensure all pieces are accounted for
        if (frontRow.length !== 5 || onDeck === undefined) {
            console.error("Invalid setup: Incorrect number of pieces");
            return false;
        }
    
        // Call placeSetupPieces with the formatted data
        this.placeSetupPieces(playerColor, frontRow, onDeck);
        return true;
    }
    
    isSetupLegal(frontRow, onDeck, playerColor) {
        const pieceCounts = {
            [pieces.KING]: 0,
            [pieces.BOMB]: 0,
            [pieces.KNIGHT]: 0,
            [pieces.BISHOP]: 0,
            [pieces.ROOK]: 0
        };
    
        // Check front row
        let frontRowHasKing = false;
        const expectedRow = playerColor === colors.WHITE ? 0 : 4;
        for (const piece of frontRow) {
            if (piece.y !== expectedRow) {
                console.error(`Illegal setup: Pieces must be on row ${expectedRow}`);
                return false;
            }
            if (!Object.values(pieces).includes(piece.type) || piece.type === pieces.UNKNOWN) {
                console.error("Illegal setup: Unknown piece");
                return false;
            }
            if (piece.color !== playerColor){
                console.error("Illegal setup: Piece color mismatch");
                return false;
            }
            pieceCounts[piece.type]++;
            if (piece.type === pieces.KING) frontRowHasKing = true;
        }
        // Check on deck piece
        pieceCounts[onDeck.type]++;
    
        if (!frontRowHasKing) {
            console.error("Illegal setup: exactly 1 King must be on the front row");
            return false;
        }
        // Validate piece counts
        if (pieceCounts[pieces.KING] !== 1) {
            console.error("Illegal setup: exactly 1 King must be in play");
            return false;
        }
        if (pieceCounts[pieces.KNIGHT] > 2 || pieceCounts[pieces.BISHOP] > 2 || 
            pieceCounts[pieces.ROOK] > 2 || pieceCounts[pieces.BOMB] > 1) {
            console.error("Illegal setup: Too many Bombs, Knights, Bishops, or Rooks");
            return false;
        }
    
        return true;
    }
    placeSetupPieces(playerColor, pieceList, onDeck) {
        this.board.moveStashPieceToOnDeck(playerColor, onDeck.type);
        for (let piece of pieceList) {
            this.board.moveStashPieceToBoard(playerColor, piece.type, piece.x, piece.y);
        }
        this.completePlayerSetup(this.players[playerColor]);
    }
    completePlayerSetup(playerName){
        this.playersSetupComplete[this.players.indexOf(playerName)] = true
        if (this.isSetupComplete()){
            this.board.phase = "play"
            this.board.playerTurn = colors.WHITE
            this.playersTimeAvailable = [this.length*60*1000+500,this.length*60*1000+500] // Setup time, plus half a second to account for lag time.
        }
    }
    isSetupComplete(){
        return this.playersSetupComplete[0] == true && this.playersSetupComplete[1] == true
    }
    getPlayerColorIndex(playerName){
        return this.players.indexOf(playerName)
    }
    getOtherPlayer(playerName){
        if((this.players.indexOf(playerName) === -1)){
            return false
        }
        return this.players[1 - this.players.indexOf(playerName)] // gets the other index player name.
    }
    declareWinner(playerName){
        this.winner = playerName;
    }
    randomizePlayerColor(){
        let i = 2;
        while (i !=0){
            let r = Math.floor(Math.random() * i);
            i--;
            [this.players[i], this.players[r]] = [this.players[r], this.players[i]];
        }
    }
}

        

module.exports = { 
    Game,
    Board, 
    Action,
    colors,
    pieces,
    pieceSymbols,
    actions
};