const utils = require('./utils');

function generateAllPossibleMoves(board) {
    const movesLookup = {};
    const pieceDeclarations = ['bishop', 'rook', 'knight', 'queen', 'king', 'pawn']; // Add all possible piece types    
    for (let player = 0; player < 1; player++) // for both players
        for (let y = 0; y < board.height; y++) { //for all hieghts
            for (let x = 0; x < board.width; x++) {
                const piece = board.getPieceAt(x, y);
                if (piece && piece.player === player) {
                    pieceDeclarations.forEach(declaration => {
                        // Assuming you have a method to calculate moves based on declaration
                        const possibleMoves = this.calculatePossibleMovesForDeclaration(x, y, declaration);
                        possibleMoves.forEach(move => {
                            const moveKey = `${player} from (${x},${y}) as ${declaration}`;
                            if (!movesLookup[moveKey]) {
                                movesLookup[moveKey] = [];
                            }
                            movesLookup[moveKey].push(move);
                        });
                    });
                }
            }
        }
    return movesLookup;
}

function createBishopMovementMask(startPosIndex) {
    // Simplified mask creation for a standard 5x5 board
    // This doesn't account for board size variations or the additional 5 state bits
    let mask = 0;
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]]; // Diagonal directions
    const pos = utils.getXYFromBitIndex(startPosIndex); // Convert index to x,y 

    directions.forEach(([dx, dy]) => {
        for (let distance = 1; distance < 4; distance++) { // Limited to 3 squares
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

function createBishopLegalMoveBitboard(startPosbit,blockerBitboard){
    let mask = 0;
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]]; // Diagonal directions
    const pos = utils.getXYFromBitIndex(startPosbit); // Convert index to x,y 

    directions.forEach(([dx, dy]) => {
        for (let distance = 1; distance < 4; distance++) { // Limited to 3 squares
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
    return mask;
}

function createBishopLookupTable(height=5,width=5){
    // pre-generate all bishop moves.
    let bishopMovesLookup = new Map()
    for(let StartPosIndex = 5; StartPosIndex < (height*width +5); StartPosIndex++ ){
        let movementMask = createBishopMovementMask(StartPosIndex)
        let blockPatterns = createAllBlockerBitboards(movementMask)
        for(let i = 0; i < Object.keys(blockPatterns).length; i++){
            blockerBitboard = blockPatterns[i]
            legalMoveBitboard = createBishopLegalMoveBitboard(StartPosIndex, blockerBitboard)
            bishopMovesLookup.set([StartPosIndex,blockerBitboard],legalMoveBitboard)
        }
    }
    return bishopMovesLookup;
}

function printMask(bigInt) {
    // Extract the first 25 digits by shifting right by 5, ignoring the 5 least significant digits
    let mask = (bigInt) >> 5n;

    // Convert to a binary string, padding with leading zeros to ensure it has at least 25 digits
    let binaryString = mask.toString(2).padStart(25, '0');

    // Print 5 digits every line, starting from the end of the string
    for (let i = 4; i >= 0; i--) {
        // Extract a substring of 5 digits and print
        console.log(binaryString.substring(i * 5, (i + 1) * 5).split("").reverse().join(""));
    }
    console.log("------")
}


module.exports = {
    createBishopLookupTable, 
    createBishopMovementMask, 
    createAllBlockerBitboards,
    createBishopLegalMoveBitboard,
    createBishopLookupTable,
    printMask };