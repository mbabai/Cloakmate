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
    let y = height - 1 - Math.floor(bitIndex / width);
    return {x,y}
}

module.exports = { 
    getBitIndexFromXY, 
    getXYFromBitIndex 
};