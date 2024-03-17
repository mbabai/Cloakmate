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

function getBitLocationFromXY(x,y,height=5,width=5){
    return BigInt((height - y - 1) * width + x + 5);
}

function getXYFromBitLocation(bitIndex,height=5,width=5){
    bitIndex = Number(bitIndex) - 5; // Subtract the offset
    let linearIndex = bitIndex % width; // Calculate the linear index within the board
    let x = linearIndex;
    let y = height - 1 - Math.floor(bitIndex / width);
    return {x,y}
}

function createBishopMovementMask(startPosIndex) {
    // Simplified mask creation for a standard 5x5 board
    // This doesn't account for board size variations or the additional 5 state bits
    let mask = 0n;
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]]; // Diagonal directions
    const pos = getXYFromBitLocation(startPosIndex); // Convert index to x,y 

    directions.forEach(([dx, dy]) => {
        for (let distance = 1; distance < 3; distance++) { // Limited to 3 squares
            const newX = pos.x + dx * distance;
            const newY = pos.y + dy * distance;
            if (newX >= 0 && newX < 5 && newY >= 0 && newY < 5) {
                mask |= getBitLocationFromXY(newX,newY);
            }
        }
    });
    return mask;
}

function createAllBlockerBitboards(movementMask){
    let moveSquareIndices = []
    for (let i = 0; i<(30); i++){ // 30 is height*width + 5
        if(((movementMask >> i) & 1) == 1){ 
            moveSquareIndices.push(i)
        }
    }
    let numPatterns = 1<<moveSquareIndices.length
    let blockerBitboards = {}
    for (let patternIndex = 0; patternIndex < numPatterns; patternIndex++){
        for (let bitIndex = 0; bitIndex < moveSquareIndices.length; bitIndex++){
            let bit = (patternIndex >> bitIndex) & 1;
            blockerBitboards[patternIndex] |= BigInt(bit) << moveSquareIndices[bitIndex]
        }
    }
}

function createBishopLegalMoveBitboard(startPosIndex,blockerBitboard){
    let mask = 0n;
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]]; // Diagonal directions
    const pos = getXYFromBitLocation(startPosIndex); // Convert index to x,y 

    directions.forEach(([dx, dy]) => {
        for (let distance = 1; distance < 3; distance++) { // Limited to 3 squares
            const newX = pos.x + dx * distance;
            const newY = pos.y + dy * distance;
            if (newX >= 0 && newX < 5 && newY >= 0 && newY < 5) {
                let newIndex = getBitLocationFromXY(newX,newY);
                mask |= newIndex;
                if (newIndex & blockerBitboard){
                    break; // we've hit a blocker in this sliding direction, and we can break out of this loop. 
                }
            }
            
        }
    });
    return mask;
}

function createBishopLookupTable(height,width){
    // pre-generate all bishop moves.
    let bishopMovesLookup = new Map()
    for(let StartPosIndex = 0b100000n; StartPosIndex < 1n<<BigInt(height*width +5); StartPosIndex++ ){
        let movementMask = createBishopMovementMask(StartPosIndex)
        let blockPatterns = createAllBlockerBitboards(movementMask)
        for(let i = 0; i < blockPatterns.length; i++){
            blockerBitboard = blockPatterns[i]
            legalMoveBitboard = createBishopLegalMoveBitboard(StartPosIndex, blockerBitboard)
            bishopMovesLookup.set([StartPosIndex,blockerBitboard],legalMoveBitboard)
        }
    }
    return bishopMovesLookup;
}


module.exports = { createBishopLookupTable };