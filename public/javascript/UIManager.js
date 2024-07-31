class UIManager {
    constructor(playerColor, playerName,opponentName) {
        this.playerColor = playerColor;
        this.nameCellsForColor(this.playerColor);
        this.playerName = playerName;
        this.opponentName = opponentName;
        this.legalActions = ['setup'];
        
        this.nameToCoordinate = {
            'A-1': {x: 0, y: 0}, 'B-1': {x: 1, y: 0}, 'C-1': {x: 2, y: 0}, 'D-1': {x: 3, y: 0}, 'E-1': {x: 4, y: 0},
            'A-2': {x: 0, y: 1}, 'B-2': {x: 1, y: 1}, 'C-2': {x: 2, y: 1}, 'D-2': {x: 3, y: 1}, 'E-2': {x: 4, y: 1},
            'A-3': {x: 0, y: 2}, 'B-3': {x: 1, y: 2}, 'C-3': {x: 2, y: 2}, 'D-3': {x: 3, y: 2}, 'E-3': {x: 4, y: 2},
            'A-4': {x: 0, y: 3}, 'B-4': {x: 1, y: 3}, 'C-4': {x: 2, y: 3}, 'D-4': {x: 3, y: 3}, 'E-4': {x: 4, y: 3},
            'A-5': {x: 0, y: 4}, 'B-5': {x: 1, y: 4}, 'C-5': {x: 2, y: 4}, 'D-5': {x: 3, y: 4}, 'E-5': {x: 4, y: 4}
        };
        
        this.coordinateToName = {
            '00': 'A-1', '10': 'B-1', '20': 'C-1', '30': 'D-1', '40': 'E-1',
            '01': 'A-2', '11': 'B-2', '21': 'C-2', '31': 'D-2', '41': 'E-2',
            '02': 'A-3', '12': 'B-3', '22': 'C-3', '32': 'D-3', '42': 'E-3',
            '03': 'A-4', '13': 'B-4', '23': 'C-4', '33': 'D-4', '43': 'E-4',
            '04': 'A-5', '14': 'B-5', '24': 'C-5', '34': 'D-5', '44': 'E-5'
        };
        this.nameCellsForColor(this.playerColor);
    }
    updateBoardUI(boardState){
        console.log("Updating board UI");
        console.log(boardState);
        //Update parts of the board that are relevant to the player.
        //This includes the legal actions, the board state, and the player's pieces.
        this.updateBoardVisual(boardState)
        this.updateBoardControls(boardState)  
    }
    updateBoardVisual(boardState){
        //Places all of the correct pieces in the right place.
        // 1. Remove all pieces from the board
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.innerHTML = '';
            cell.classList.remove('white-piece', 'black-piece', 'enemy-piece');
        });

        // 2. Place all the correct pieces based on boardState into the inventory for the current player
        const inventory = document.querySelector('.inventory');
        inventory.innerHTML = '';
        boardState.stash.forEach(piece => {
            const pieceElement = document.createElement('div');
            pieceElement.classList.add('piece', `${this.playerColor}-piece`);
            pieceElement.textContent = piece;
            inventory.appendChild(pieceElement);
        });

        // 3. Place the correct piece (or lack thereof) of this player to the on-deck square
        const onDeckSquare = document.querySelector('.on-deck');
        onDeckSquare.innerHTML = '';
        if (boardState.onDeck) {
            const onDeckPiece = document.createElement('div');
            onDeckPiece.classList.add('piece', `${this.playerColor}-piece`);
            onDeckPiece.textContent = boardState.onDeck;
            onDeckSquare.appendChild(onDeckPiece);
        }

        // 4. Place all of this players pieces on the board in the correct cells
        // 5. Place all of the enemy pieces on the board
        boardState.board.forEach((row, y) => {
            row.forEach((piece, x) => {
                if (piece) {
                    const cellName = this.coordinateToName[`${x}${y}`];
                    const cell = document.querySelector(`[data-position="${cellName}"]`);
                    const pieceElement = document.createElement('div');
                    
                    if (piece.startsWith(this.playerColor)) {
                        pieceElement.classList.add('piece', `${this.playerColor}-piece`);
                        pieceElement.textContent = piece.replace(this.playerColor, '');
                    } else {
                        pieceElement.classList.add('piece', 'enemy-piece');
                        pieceElement.textContent = '?';
                    }
                    
                    cell.appendChild(pieceElement);
                }
            });
        });

    }
    
    nameCellsForColor(color) {
        const rows = 5;
        const columns = color == "white" ? ['A', 'B', 'C', 'D', 'E'] : ['E', 'D', 'C', 'B', 'A'];

        const board = document.querySelector('.board');
        const cells = board.querySelectorAll('.cell');
    
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns.length; col++) {
                // Calculate position index based on color
                const rowIndex = color === 'white' ? rows - row : row + 1; // Fix the row index for proper order
                const position = `${columns[col]}-${rowIndex}`;
    
                // Find the cell's index in the NodeList (row-major order)
                const cellIndex = row * columns.length + col;
                cells[cellIndex].setAttribute('data-position', position);
            }
        }
    }
}