const { v4: uuidv4 } = require('uuid');

function generateUniqueUserID(){
    return 'user-' + uuidv4();
}

function getBitIndexFromXY(x, y, height = 5, width = 5) {
    // Calculate the linear index of the (x, y) position on a 5x5 board
    // Note: Assumes (0, 0) is the bottom-left of the board
    // Adjust for the 5 reserved bits by adding 5 to the linear index
    // Shift a 1 to the correct position in the bit pattern
    return y * width + x + 5;;
}

function getXYFromBitIndex(bitIndex,height=5,width=5){
    bitIndex = bitIndex - 5; // Subtract the offset
    let linearIndex = bitIndex % width; // Calculate the linear index within the board
    let x = linearIndex;
    let y = Math.floor(bitIndex / width);
    return {x,y}
}

function millisecondsToClock(duration){
    let minutes = Math.floor(duration / 60000);
    let seconds = Math.floor((duration % 60000) / 1000);
    // Format minutes and seconds to always display two digits
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

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
    ONDECK: 4,
    PASS: 5
};
const winReasons = {    
    CAPTURED_KING: 0,
    THRONE: 1,
    STASH: 2,
    FORCED_SACRIFICE: 3,
    KING_BLUFF: 4,
    TIMEOUT: 5,
    DISCONNECT: 6      
}



module.exports = { 
    getBitIndexFromXY, 
    getXYFromBitIndex,
    millisecondsToClock,
    generateUniqueUserID,
    colors,
    pieces,
    pieceSymbols,
    actions,
    winReasons
};