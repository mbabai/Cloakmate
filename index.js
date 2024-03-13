const express = require('express');
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


class Board {
	constructor(height, width){
		this.height = height
		this.width = width
		this.game = null

		this.playerTurn = colors.WHITE //0 for white, 1 for black
		this.turnNumber = 0 //0 for white, 1 for black
        //bitboards!!
        /* 
        format of bitboards:
            [height*width bits - location on board] 
            [2 bits - stash]
            [2 bits - captured]
            [1 bit - on deck]
            
        */
        this.bitboards = [
            [0b010n,0b100n,0b100n,0b100n,0b100n], // white pieces: bomb, king, knight, bishop,rook
            [0b010n,0b100n,0b100n,0b100n,0b100n]  // black pieces: bomb, king, knight, bishop,rook
        ]
	}

    getBitLocationFromXY(x,y){
        return BigInt((this.height - y - 1) * this.width + x + 5);
    }

    movePiece(pieceType,player,x1,y1,x2,y2){
        // Calculate index positions
        const startPos = this.getBitLocationFromXY(x1,y1);
        const endPos =  this.getBitLocationFromXY(x2,y2);

        // Remove piece from start position
        this.bitboards[player][pieceType] &= ~(1n << startPos);

        // Add piece to end position
        this.bitboards[player][pieceType] |= (1n << endPos);
    }

    getPieceAt(x, y) {
        const posIndex = this.getBitLocationFromXY(x,y);
        for (let player of [colors.WHITE, colors.BLACK]) {
            for (let pieceType = 0; pieceType < this.bitboards[player].length; pieceType++) {
                if (BigInt(this.bitboards[player][pieceType]) & (1n << posIndex)) {
                    return { player, pieceType };
                }
            }
        }
        return null; // No piece at this position
    }
    placePiece(pieceType, player, x, y) {
        const posIndex = this.getBitLocationFromXY(x,y);

        // Ensure we clear the position across all piece types to prevent duplicates
        for (let i = 0; i < this.bitboards[player].length; i++) {
            this.bitboards[player][i] &= ~(1n << posIndex);
        }

        // Place the piece at the new position
        this.bitboards[player][pieceType] |= (1n << posIndex);
    }

    moveStashPieceToOnDeck(player, pieceType) {
        // Check the stash count for the piece to be moved to on deck
        const stashCountForPiece = Number((this.bitboards[player][pieceType] & (0b11n << 1n)) >> 1n);
        if (stashCountForPiece <= 0) {
            console.error("Error: The specified piece is not available in the stash.");
            return; // Exit the function as the operation cannot be completed
        }
    
        // Check if there is already a piece on deck
        let currentOnDeckPieceType = null;
        for (let i = 0; i < this.bitboards[player].length; i++) {
            if ((this.bitboards[player][i] & 1n) !== 0n) { // Checking the 'e' bit for on deck
                currentOnDeckPieceType = i;
                break;
            }
        }
    
        // If there is a piece on deck, move it back to the stash
        if (currentOnDeckPieceType !== null) {
            // Clear the on-deck status for the current piece
            this.bitboards[player][currentOnDeckPieceType] &= ~1n;
    
            // Increment the stash count for the current piece
            const currentStashCount = Number((this.bitboards[player][currentOnDeckPieceType] & (0b11n << 1n)) >> 1n) + 1;
            this.bitboards[player][currentOnDeckPieceType] &= ~(0b11n << 1n); // Clear the old stash count
            this.bitboards[player][currentOnDeckPieceType] |= BigInt(currentStashCount) << 1n; // Set the new stash count
        }
    
        // Decrement the stash count for the new piece, now that we've confirmed it's in the stash
        this.bitboards[player][pieceType] &= ~(0b11n << 1n); // Clear the old stash count
        this.bitboards[player][pieceType] |= BigInt(stashCountForPiece - 1) << 1n; // Set the new stash count
    
        // Set the new piece as on deck
        this.bitboards[player][pieceType] |= 1n;
    }
    moveOnDeckToStash(player) {
        // Find the piece that's currently on deck for the specified player
        let onDeckPieceType = null;
        for (let i = 0; i < this.bitboards[player].length; i++) {
            if ((this.bitboards[player][i] & 1n) !== 0n) { // Checking the 'e' bit for on deck
                onDeckPieceType = i;
                break;
            }
        }
    
        // If no piece is on deck, log an error and do nothing
        if (onDeckPieceType === null) {
            console.error("Error: There is no piece on deck for the specified player.");
            return; // Exit the function
        }
    
        // Clear the on-deck status for the piece
        this.bitboards[player][onDeckPieceType] &= ~1n;
    
        // Increment the stash count for the piece
        const stashCount = Number((this.bitboards[player][onDeckPieceType] & (0b11n << 1n)) >> 1n) + 1;
        this.bitboards[player][onDeckPieceType] &= ~(0b11n << 1n); // Clear the old stash count
        this.bitboards[player][onDeckPieceType] |= BigInt(stashCount) << 1n; // Set the new stash count
    }
    
    
    
    printBoard() {
        const pieceSymbols = { //queen is BOMB
            [colors.WHITE]: ['♛', '♚', '♞', '♝', '♜'],
            [colors.BLACK]: ['♕', '♔', '♘', '♗', '♖'] 
        };
        
        console.log("__________")
        
        // Initialize variables to hold stashes, on-deck, and captured pieces
        let stashes = [[], []]; // [whiteStash, blackStash]
        let onDeck = ["", ""]; // [whiteOnDeck, blackOnDeck]
        let captured = []; // combined captured pieces

        // Iterate through bitboards to populate above variables
        for (let player of [colors.WHITE, colors.BLACK]) {
            for (let pieceType = 0; pieceType < this.bitboards[player].length; pieceType++) {
                const bitboard = this.bitboards[player][pieceType];
                const capturedCount = Number((bitboard & (0b11n << 3n)) >> 3n);
                const stashCount = Number((bitboard & (0b11n << 1n)) >> 1n);
                const onDeckStatus = (bitboard & 1n) !== 0n;

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
        console.log("___________")
    }
}

thisBoard = new Board(5,5)
thisBoard.printBoard()
// thisBoard.placePiece(pieces.BOMB, colors.WHITE, 0, 0)
thisBoard.moveStashPieceToOnDeck(colors.WHITE, pieces.BOMB)
thisBoard.printBoard()
thisBoard.moveOnDeckToStash(colors.WHITE)
thisBoard.printBoard()


