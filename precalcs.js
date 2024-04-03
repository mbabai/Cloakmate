const utils = require('./utils');

const pieces = { //Piece constants
    BOMB:0,
    KING:1,
    KNIGHT:2,
    BISHOP:3,
    ROOK:4
}

function getPieceDirectionsMaxDistance(piece){
    let directions = []
    let maxDistance = 1 //The maximum distance a piece can move in the direction (all pieces are "sweeping" in this sense.)
    switch(piece){
        case pieces.KING:
            directions = [[0,1], [1, 1] ,[1,0], [1, -1], [0,-1], [-1, -1], [-1,0], [-1, 1]]
            maxDistance = 1
            break;
        case pieces.KNIGHT:
            directions = [[1,2], [2, 1] ,[2,-1], [1, -2], [-1,-2], [-2, -1], [-2,1], [-1, 2]]
            maxDistance = 1
            break;
        case pieces.BISHOP:
            directions = [[1, 1], [1, -1], [-1, -1],[-1, 1]]
            maxDistance = 3
            break;
        case pieces.ROOK:
            directions = [[0, 1], [1, 0], [0, -1],[-1, 0]]
            maxDistance = 3
            break;
    }
    return {directions, maxDistance}
}

function createPieceMovementMask(piece,startPosIndex) {
    // Simplified mask creation for a standard 5x5 board
    // This doesn't account for board size variations or the additional 5 state bits
    let mask = 0;
    const pieceMovement = getPieceDirectionsMaxDistance(piece)
    const pos = utils.getXYFromBitIndex(startPosIndex); // Convert index to x,y 

    pieceMovement.directions.forEach(([dx, dy]) => {
        for (let distance = 1; distance <= pieceMovement.maxDistance; distance++) { 
            const newX = pos.x + dx * distance;
            const newY = pos.y + dy * distance;
            if (newX >= 0 && newX < 5 && newY >= 0 && newY < 5) {
                mask |= 1<<(utils.getBitIndexFromXY(newX,newY));
            } 
        }
    });
    return mask;
}

function createAllBlockerBitboards(movementMask){
    let moveSquareIndices = []
    for (let i = 0; i<(30); i++){ // 30 is height*width + 5
        if(((movementMask >> (i)) & 1) == 1){ 
            moveSquareIndices.push(i)
        }
    }
    let numPatterns = 1<<moveSquareIndices.length
    let blockerBitboards = {}
    for (let patternIndex = 0; patternIndex < numPatterns; patternIndex++){
        for (let bitIndex = 0; bitIndex < moveSquareIndices.length; bitIndex++){
            let bit = (patternIndex >> bitIndex) & 1;
            
            blockerBitboards[patternIndex] |= (bit) << moveSquareIndices[bitIndex]
        }
    }
    return blockerBitboards
}

function createPieceLegalMoveBitboard(piece,startPosIndex,blockerBitboard){
    let mask = 0;
    const pieceMovement = getPieceDirectionsMaxDistance(piece)
    const pos = utils.getXYFromBitIndex(startPosIndex); // Convert index to x,y 

    pieceMovement.directions.forEach(([dx, dy]) => {
        for (let distance = 1; distance <= pieceMovement.maxDistance; distance++) { // Limited to 3 squares
            const newX = pos.x + dx * distance;
            const newY = pos.y + dy * distance;
            if (newX >= 0 && newX < 5 && newY >= 0 && newY < 5) {
                let newIndex = (utils.getBitIndexFromXY(newX,newY));
                let bitLocation = 1<<newIndex
                mask |= bitLocation;
                if (bitLocation & (blockerBitboard)){
                    break; // we've hit a blocker in this sliding direction, and we can break out of this loop. 
                }
            }
            
        }
    });
    // if(piece == pieces.BISHOP){
    //     console.log(`${piece} at location ${startPosIndex}:`)
    //     console.log("blocker bitboard:")
    //     printMask(blockerBitboard)
    //     console.log("Resulting legal moves:")
    //     printMask(mask)
    // }
    return mask;
}

function createAllPiecesLookupTable(height=5,width=5){
    // pre-generate all bishop moves.
    let movementMasks = new Map()
    let legalMovesLookup = new Map()
    for(let piece = 1; piece <=4; piece++){//iterate through all non-bomb pieces
        for(let StartPosIndex = 5; StartPosIndex < (height*width +5); StartPosIndex++ ){
            let movementMask = createPieceMovementMask(piece,StartPosIndex)
            movementMasks.set(JSON.stringify([piece,StartPosIndex]), movementMask)
            let blockPatterns = createAllBlockerBitboards(movementMask)
            for(let i = 0; i < Object.keys(blockPatterns).length; i++){
                blockerBitboard = blockPatterns[i]
                legalMoveBitboard = createPieceLegalMoveBitboard(piece,StartPosIndex, blockerBitboard)
                legalMovesLookup.set(JSON.stringify([piece,StartPosIndex,blockerBitboard]),legalMoveBitboard)
            }
        }
    }
    return {movementMasks, legalMovesLookup};
}

function printMask(rawMask,H=5,W=5) {
    // Extract the first 25 digits by shifting right by 5, ignoring the 5 least significant digits
    let mask = (rawMask) >> 5;

    // Convert to a binary string, padding with leading zeros to ensure it has at least 25 digits
    let binaryString = mask.toString(2).padStart(25, '0');

    const rows = [];
    for (let i = 0; i < H; i++) {
        const start = i * W;
        const end = start + W;
        rows.push(binaryString.substring(start, end));
    }

    // Reverse the array to start from the bottom and log each row
    rows.reverse().forEach(row => console.log(row));
    console.log("------")
}


module.exports = {
    createAllPiecesLookupTable 
    , createPieceMovementMask
    , printMask
};