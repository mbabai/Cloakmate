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

const AllMoves = precalcs.createAllPiecesLookupTable()


class Move {
    constructor(board,type,player,declaration,x1=null,y1=null,x2=null,y2=null){
        this.board = board;
        this.type = type; // "move", "challenge", "bomb"
        this.player = player;
        this.declaration = declaration;
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.wasBluff = null;
    }
    isBluff(){
        if(this.type == "move"){
            return this.board.getPieceAt(this.x1, this.y1).pieceType != this.declaration;
        } else if (this.type == "bomb"){
            return this.board.lastCapturedPieceType == pieces.BOMB
        } else {
            return; 
        }
    }
    isLegal(){
        if(this.player != this.board.playerTurn) return false;
        if(this.type == "move"){
            let startPosIndex = utils.getBitIndexFromXY(this.x1,this.y1)
            let endPosIndex = utils.getBitIndexFromXY(this.x2,this.y2)
            if(!this.board.generatePieceColorLocationLegalMoves(this.declaration,this.player,startPosIndex).contains(endPosIndex)) return false;
        } else if (this.type == "challenge"){
            if(this.board.moves[this.board.moves.length - 1].type == "challenge") return false
        }
        return true;
    }
    print(showBluff=false){
        let bluffMark = ''
        if(showBluff){
            bluffMark = "!"
        } 
        console.log(`${pieceSymbols[this.player][this.declaration]}${bluffMark}: (${this.x1},${this.y1}) => (${this.x2},${this.y2})`)
    }
}


class Board {
	constructor(height, width){
		this.height = height
		this.width = width
		this.game = null

		this.playerTurn = colors.WHITE //0 for white, 1 for black
		this.turnNumber = 0 // First turn as white is turn 0
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
        this.moves = []
        this.startingBoard = []
        this.lastCapturedPieceType = null
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
        this.bitboards[sourcePieceInfo.player][sourcePieceInfo.pieceType] &= ~(1 << sourcePosIndex);
        // Set the bit at the target position
        this.bitboards[sourcePieceInfo.player][sourcePieceInfo.pieceType] |= 1 << targetPosIndex;
    
        // console.log(`:::Moving Piece(${pieceSymbols[sourcePieceInfo.player][sourcePieceInfo.pieceType]}) from (${x1},${y1}) to (${x2},${y2})`);
    }
    

    getPieceAt(x, y) {
        const posIndex = utils.getBitIndexFromXY(x,y);
        for (let player of [colors.WHITE, colors.BLACK]) {
            for (let pieceType = 0; pieceType < this.bitboards[player].length; pieceType++) {
                if ((this.bitboards[player][pieceType]) & (1 << (posIndex))) {
                    return { player, pieceType };
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
        this.bitboards[targetPieceInfo.player][targetPieceInfo.pieceType] &= ~(1 << (posIndex));
    
        // Update the bitboard to reflect the captured status of the piece
        // Note: This assumes captured pieces are counted in the first two bits 'ab'
        const capturedCount = Number((this.bitboards[targetPieceInfo.player][targetPieceInfo.pieceType] & (0b11000)) >> 3) + 1;
        this.bitboards[targetPieceInfo.player][targetPieceInfo.pieceType] &= ~(0b11000); // Clear the old captured count
        this.bitboards[targetPieceInfo.player][targetPieceInfo.pieceType] |= ((capturedCount) << 3); // Set the new captured count
        
        this.lastCapturedPieceType = targetPieceInfo.pieceType; // track this for the bomb
        // console.log(`:::Capturing Piece(${pieceSymbols[targetPieceInfo.player][targetPieceInfo.pieceType]}) at (${x},${y}) due to...`)
    }
    

    placePiece(pieceType, player, x, y) {
        const posIndex = utils.getBitIndexFromXY(x,y);

        // Ensure we clear the position across all piece types to prevent duplicates
        for (let i = 0; i < this.bitboards[player].length; i++) {
            this.bitboards[player][i] &= ~(1 << posIndex);
        }

        // Place the piece at the new position
        this.bitboards[player][pieceType] |= (1 << posIndex);
        // console.log(`:::Placing Piece(${pieceSymbols[player][pieceType]}) -> (${x},${y})`)
    }

    getOnDeckPieceforPlayer(player) {
        for (let pieceType = 0; pieceType < this.bitboards[player].length; pieceType++) {
            if ((this.bitboards[player][pieceType] & 1) !== 0) { // Checking the on-deck bit
                return pieceType; //found the piece
            }
        }
        return null; // No piece on deck for the player
    }

    moveStashPieceToOnDeck(player, pieceType) {
        // Check the stash count for the piece to be moved to on deck
        const stashCountForPiece = Number((this.bitboards[player][pieceType] & (0b11 << 1)) >> 1);
        if (stashCountForPiece <= 0) {
            console.error("Error: The specified piece is not available in the stash.");
            return; // Exit the function as the operation cannot be completed
        }
    
        // Check if there is already a piece on deck
        let currentOnDeckPieceType = this.getOnDeckPieceforPlayer(player)
    
        // If there is a piece on deck, move it back to the stash
        if (currentOnDeckPieceType !== null) {
            // Clear the on-deck status for the current piece
            this.bitboards[player][currentOnDeckPieceType] &= ~1;
    
            // Increment the stash count for the current piece
            const currentStashCount = Number((this.bitboards[player][currentOnDeckPieceType] & (0b11 << 1)) >> 1) + 1;
            this.bitboards[player][currentOnDeckPieceType] &= ~(0b11 << 1); // Clear the old stash count
            this.bitboards[player][currentOnDeckPieceType] |= (currentStashCount) << 1; // Set the new stash count
        } 
    
        // Decrement the stash count for the new piece, now that we've confirmed it's in the stash
        this.bitboards[player][pieceType] &= ~(0b11 << 1); // Clear the old stash count
        this.bitboards[player][pieceType] |= (stashCountForPiece - 1) << 1; // Set the new stash count
    
        // Set the new piece as on deck
        this.bitboards[player][pieceType] |= 1;
        // console.log(`:::Stash(${pieceSymbols[player][pieceType]}) -> On Deck`)
    }

    moveStashPieceToBoard(player, pieceType, x, y) {
        // Verify if the piece is available in the stash
        const stashCount = Number((this.bitboards[player][pieceType] & (0b11 << 1)) >> 1);
        if (stashCount <= 0) {
            console.error("Error: The specified piece is not available in the stash.");
            return;
        }
    
        // Find if there's a piece at the target location
        const targetPieceInfo = this.getPieceAt(x, y);
        if (targetPieceInfo) {
            // Move the piece at the target location back to its stash
            const capturedStashCount = Number((this.bitboards[targetPieceInfo.player][targetPieceInfo.pieceType] & (0b11 << 1)) >> 1) + 1;
            this.bitboards[targetPieceInfo.player][targetPieceInfo.pieceType] &= ~(0b11 << 1); // Clear the old stash count
            this.bitboards[targetPieceInfo.player][targetPieceInfo.pieceType] |= (capturedStashCount) << 1; // Set the new stash count
        }
    
        // Decrement the stash count for the moving piece
        this.bitboards[player][pieceType] &= ~(0b11 << 1); // Clear the old stash count
        this.bitboards[player][pieceType] |= (stashCount - 1) << 1; // Set the new stash count
    
        // Place the piece at the specified location on the board
        const posIndex = (utils.getBitIndexFromXY(x, y));
        for (let i = 0; i < this.bitboards[player].length; i++) {
            this.bitboards[player][i] &= ~(1 << (posIndex)); // Clear any existing piece at this position
        }
        this.bitboards[player][pieceType] |= 1 << (posIndex);
        // console.log(`:::Stash(${pieceSymbols[player][pieceType]}) -> (${x},${y})`)
    }

    moveOnDeckToStash(player) {
        // Find the piece that's currently on deck for the specified player
        let onDeckPieceType = getOnDeckPieceforPlayer(player)
    
        // If no piece is on deck, log an error and do nothing
        if (onDeckPieceType === null) {
            console.error("Error: There is no piece on deck for the specified player.");
            return; // Exit the function
        }
    
        // Clear the on-deck status for the piece
        this.bitboards[player][onDeckPieceType] &= ~1;
    
        // Increment the stash count for the piece
        const stashCount = Number((this.bitboards[player][onDeckPieceType] & (0b11 << 1)) >> 1) + 1;
        this.bitboards[player][onDeckPieceType] &= ~(0b11 << 1); // Clear the old stash count
        this.bitboards[player][onDeckPieceType] |= (stashCount) << 1; // Set the new stash count
        // console.log(`:::On Deck(${pieceSymbols[player][onDeckPieceType]}) -> Stash`)
    }
    swapDeckToBoard(player, x, y) {
        // Find the on-deck piece for the player
        let onDeckPieceType = null;
        for (let i = 0; i < this.bitboards[player].length; i++) {
            if ((this.bitboards[player][i] & 1) !== 0) { // Checking the 'e' bit for on deck
                onDeckPieceType = i;
                break;
            }
        }
    
        // If no piece is on deck, show an error
        if (onDeckPieceType === null) {
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
        const stashCount = Number((this.bitboards[player][targetPieceInfo.pieceType] & (0b11 << 1)) >> 1) + 1;
        this.bitboards[player][targetPieceInfo.pieceType] &= ~(0b11 << 1); // Clear the old stash count
        this.bitboards[player][targetPieceInfo.pieceType] |= (stashCount) << 1; // Set the new stash count
    
        // Clear the on-deck status for the on-deck piece
        this.bitboards[player][onDeckPieceType] &= ~1;
    
        // Place the on-deck piece at the specified location on the board
        const posIndex = (utils.getBitIndexFromXY(x, y));
        for (let i = 0; i < this.bitboards[player].length; i++) {
            this.bitboards[player][i] &= ~(1 << posIndex); // Clear any existing piece at this position
        }
        this.bitboards[player][onDeckPieceType] |= 1 << posIndex;
        // console.log(`:::On Deck(${pieceSymbols[player][onDeckPieceType]}) -> (${x},${y})`)
    }

    // MOVE GENERATION
    getAllPiecesBitboard(){
        return  getFriendlyPieces(0) | getFriendlyPieces(1)
    }
    getFriendlyPieces(color){
        return this.bitboards[color][0] | this.bitboards[color][1] | this.bitboards[color][2] | this.bitboards[color][3] | this.bitboards[color][4]
    }

    generatePieceColorLocationLegalMoves(piece,color,startPosIndex){
        const allPiecesBitboard = getAllPiecesBitboard()
        const blockerBitboard = allPiecesBitboard & createPieceMovementMask(piece,startPosIndex)
        let movesBitboard = AllMoves([piece,startPosIndex,blockerBitboard])
        movesBitboard &= ~this.getFriendlyPieces(color)
        let movesList = []
        while (movesBitboard > 0) {
            if ((movesBitboard & 1) === 1) {
                movesList.push(index);
            }
            movesBitboard >>= 1;
            index++;
        }
        return movesList
    }
    explodeBomb(){
        let lastMove = this.moves[this.moves.length -1]
        
        this.captureAtXY(lastMove.x2,lastMove.y2)
    }

    makeMove(move){
        move.board = this; //Just in case, set the move's board to this board.
        if(!move.isLegal){
            console.log("Illegal Move!")
            return;
        }
        if(move.type == "move"){
            move.wasBluff = move.isBluff()
            this.movePiece(move.x1,move.y1,move.x2,move.y2)
            this.playerTurn = 1 - this.playerTurn; //flip who's turn it is.
            this.moves.push(move)
        } else if (move.type == "bomb"){
            explodeBomb()

        } else if (move.type == "challenge"){
            let lastMove = this.moves[this.moves.length -1]
            if (lastMove.type == "move"){
                if(lastMove.wasBluff){
                    this.undoLastMove()
                    this.captureAtXY(lastMove.x1,lastMove.y1)
                    this.moves.push(lastMove)
                    this.moves.push(move)
                } else {
                    this.moves.push(move)
                    //TODO - losing a piece
                }
            } else if (lastMove.type == "bomb"){

            }
        }
        
        this.turnNumber++; //increment the move
        move.print()
        this.printBoard()
    }
    undoLastMove(){
        let lastMove = this.moves.pop()
        this.loadStartingBoard()
        for(let i = 0; i < this.moves.length;i++){
            this.makeMove(i)
        }
        return lastMove
    }
    
    printBoard() {
        console.log("__________")    
        // Initialize variables to hold stashes, on-deck, and captured pieces
        let stashes = [[], []]; // [whiteStash, blackStash]
        let onDeck = ["", ""]; // [whiteOnDeck, blackOnDeck]
        let captured = []; // combined captured pieces

        // Iterate through bitboards to populate above variables
        for (let player of [colors.WHITE, colors.BLACK]) {
            for (let pieceType = 0; pieceType < this.bitboards[player].length; pieceType++) {
                const bitboard = this.bitboards[player][pieceType];
                const capturedCount = Number((bitboard & (0b11 << 3)) >> 3);
                const stashCount = Number((bitboard & (0b11 << 1)) >> 1);
                const onDeckStatus = (bitboard & 1) !== 0;

                // Populate stashes and on-deck
                stashes[player].push(...Array(stashCount).fill(pieceSymbols[player][pieceType]));
                if (onDeckStatus) onDeck[player] = pieceSymbols[player][pieceType];
                
                // Populate captured pieces list
                if (capturedCount > 0) captured.push(...Array(capturedCount).fill(pieceSymbols[player][pieceType]));
                
            }
        }
        // Print stashes, on-deck, and captured pieces information
        console.log(`B-Stash: (${onDeck[colors.BLACK]}) ${stashes[colors.BLACK].join(' ')}`);

        // Draw the board itself:
        for (let y = this.height - 1; y >= 0; y--) {
            let row = '';
            for (let x = 0; x < this.width; x++) {
                const piece = this.getPieceAt(x, y);
                row += piece ? pieceSymbols[piece.player][piece.pieceType] : '□';
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
let move1 = new Move(thisBoard,"move",color.WHITE,pieces.BISHOP,0,0,2,2)
thisBoard.makeMove(move1)
thisBoard.challengeMove()
