const express = require('express');
const precalcs = require('./precalcs');
const utils = require('./utils');
const app = express();

app.get('/', (req, res) => res.send('Hello World!'));

const port = 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
console.log("We are live!")


//////////////////////////////////////////////////////////
let Games ={}
let gameNumber = 0
const colors = { // Color/Player constants
	WHITE: 0, 
	BLACK: 1
}
const pieces = { //Piece constants
    BOMB:0,
    KING:1,
    KNIGHT:2,
    BISHOP:3,
    ROOK:4
}
const pieceSymbols = { //queen is BOMB
    [colors.WHITE]: ['♛', '♚', '♞', '♝', '♜'],
    [colors.BLACK]: ['♕', '♔', '♘', '♗', '♖'] 
};

const actions = {
    MOVE: 0,
    CHALLENGE: 1,
    BOMB: 2,
    SACRIFICE: 3
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
                // declaration, x2, y2 not used for SACRIFICE
                break;
            default:
                console.error("Invalid action type");
        }
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
        let lastAction = this.board.actions[this.board.actions.length - 1]
        switch (this.type){
            case actions.MOVE:
                if(lastAction && lastAction.type == actions.CHALLENGE){
                    console.error("Illegal move: Player was just challenged!")
                    return false;
                } else if (this.mustSacrifice){
                    console.error("Illegal move: Player must Sacrifice!")
                    return false;
                }
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
                } else if (this.mustSacrifice){
                    console.error("Illegal move: Player must Sacrifice!")
                    return false;
                }
                break;
            case actions.BOMB:
                if(lastAction && !lastAction.wasCapture){
                    console.error("Illegal bomb: Cannot declare bomb without a capture!")
                    return false;
                } else if (this.mustSacrifice){
                    console.error("Illegal move: Player must Sacrifice!")
                    return false;
                }
                break;
            case actions.SACRIFICE:
                //todo, check that the opponent to a successful challenge before, and that a real piece was selected to sacrifice. 
                if(lastAction && lastAction.type != actions.CHALLENGE){
                    console.error("Illegal sacrifice: Cannot sacrifice if the prior action wasn't a challenge!")
                    return false;
                } else if (!this.mustSacrifice){
                    console.error("Illegal move: Player must NOT Sacrifice!")
                    return false;
                }
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
                let piece = this.board.getPieceAt(this.x1, this.y1)
                console.log(`Sacrifice  ${pieceSymbols[piece.player][piece.type]} at (${this.x1},${this.y1}) => `)
                break;
        }
    }
}


class Board {
	constructor(height, width){
		this.height = height
		this.width = width
		this.game = null

		this.playerTurn = colors.WHITE //0 for white, 1 for black
		this.turnNumber = 0 // First turn as white is turn 0
        this.mustSacrifice = false;
        //bitboards!!
        /* 
        format of bitboards:
            [height*width bits - location on board] 
            [2 bits - stash]
            [2 bits - captured]
            [1 bit - on deck]
            
        */
        this.bitboards = [
            [0b010,0b100,0b100,0b100,0b100], // white pieces: bomb, king, knight, bishop, rook
            [0b010,0b100,0b100,0b100,0b100]  // black pieces: bomb, king, knight, bishop, rook
        ]
        this.actions = []
        this.startingBoard = []
        this.lastCapturedPiece = {} //{player, type} tracked for bluffs/bombs
        this.lastMoveLocation  = {} // {x,y} tracked for bluffs/bombs
	}

    saveStartingBoard(){
        this.startingBoard = this.bitboards.map(innerArray => innerArray.slice());
    }
    loadStartingBoard(){
        this.bitboards = this.startingBoard.map(innerArray => innerArray.slice());

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
        console.log(movesList)
        return movesList
    }

    takeAction(action){
        action.board = this; //Just in case, set the move's board to this board.
        if(!action.isLegal()){return;}
        let lastAction = this.actions[this.actions.length - 1]
        switch (action.type){
            case actions.MOVE: // A regular move. 
                action.wasCapture = action.isCapture()
                this.movePiece(action.x1,action.y1,action.x2,action.y2)
                this.playerTurn = 1 - this.playerTurn; //flip who's turn it is.
                action.wasBluff = action.isBluff()
                this.actions.push(action)
                break;
            case actions.CHALLENGE:  
            /*
                The following scenarios must be taken into account:
                1a. The move/capture was NOT a bluff -> challenger sacrifices
                1b. The move/capture WAS a bluff -> the mover/capturer loses the moving piece - revive the captured piece
                2a. The bomb declaration was NOT a bluff -> challenger sacrifices a piece.
                2b. The bomb declaration WAS a bluff -> the bomb player sacrifices a pices
            */
                this.mustSacrifice = true; 
                if(lastAction.wasBluff && lastAction.type == actions.MOVE){
                    this.playerTurn = 1 - this.playerTurn; //flip who's turn it is
                    this.captureAtXY(lastAction.x2,lastAction.y2)
                    if(lastAction.wasCapture){
                        this.reviveLastCapturedPiece(lastAction.x2,lastAction.y2)
                    }  
                    //bring back the last captured piece
                } else { //if the challenge failed (not a bluff), this same player must sacrifice.
                    //bring back the bomb (if there was one)
                    
                }
                break;
            case actions.BOMB:
                action.wasBluff = (this.lastCapturedPiece.type != pieces.BOMB)
                
                this.playerTurn = 1 - this.playerTurn; //flip who's turn it is.
                break;
            case actions.SACRIFICE:
                this.captureAtXY(action.x1,action.y1)
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
    
        // Revive the piece at the specified position on the board
        this.bitboards[player][type] |= (1 << posIndex);
    
        // Optionally, reset or update lastCapturedPiece after revival
        this.lastCapturedPiece = null;
    
        console.log(`:::Reviving Piece(${pieceSymbols[player][type]}) at (${x},${y})`);
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
        console.log(`Captured: ${captured.join(' ')}`);
        console.log("__________")
    }
}

thisBoard = new Board(5,5)
console.log("GAME START!!!")
//place pieces - white
thisBoard.moveStashPieceToBoard(colors.WHITE,pieces.KING,0,0)
thisBoard.moveStashPieceToBoard(colors.WHITE,pieces.BOMB,1,0)
thisBoard.moveStashPieceToBoard(colors.WHITE,pieces.BISHOP,2,0)
thisBoard.moveStashPieceToBoard(colors.WHITE,pieces.KNIGHT,3,0)
thisBoard.moveStashPieceToBoard(colors.WHITE,pieces.KNIGHT,4,0)
thisBoard.moveStashPieceToOnDeck(colors.WHITE,pieces.ROOK)

//place pieces - black
thisBoard.moveStashPieceToBoard(colors.BLACK,pieces.KING,0,4)
thisBoard.moveStashPieceToBoard(colors.BLACK,pieces.BOMB,1,4)
thisBoard.moveStashPieceToBoard(colors.BLACK,pieces.BISHOP,2,4)
thisBoard.moveStashPieceToBoard(colors.BLACK,pieces.KNIGHT,3,4)
thisBoard.moveStashPieceToBoard(colors.BLACK,pieces.KNIGHT,4,4)
thisBoard.moveStashPieceToOnDeck(colors.BLACK,pieces.ROOK)
thisBoard.printBoard()
thisBoard.saveStartingBoard()
console.log("Move 1")
let move1 = new Action(actions.MOVE,colors.WHITE,0,0,pieces.BISHOP,2,2)
thisBoard.takeAction(move1)
console.log("Move 2")
let move2 = new Action(actions.MOVE,colors.BLACK,4,4,pieces.BISHOP,2,2)
thisBoard.takeAction(move2)
