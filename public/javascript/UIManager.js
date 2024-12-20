
const colors = { // Color/Player constants
	WHITE: 0, 
	BLACK: 1
}
const colorNames = {
    [colors.WHITE]: 'White',
    [colors.BLACK]: 'Black'
}
const pieceStringNames = {
    [colors.WHITE]: ['WhiteBomb', 'WhiteKing', 'WhiteKnight', 'WhiteBishop', 'WhiteRook','WhiteUnknown'],
    [colors.BLACK]: ['BlackBomb', 'BlackKing', 'BlackKnight', 'BlackBishop', 'BlackRook','BlackUnknown']   
};
const pieces = { //Piece constants
    BOMB:0,
    KING:1,
    KNIGHT:2,
    BISHOP:3,
    ROOK:4,
    UNKNOWN:5
}
const pieceTypeNames = {
    [pieces.BOMB]: 'Bomb',
    [pieces.KING]: 'King',
    [pieces.KNIGHT]: 'Knight',
    [pieces.BISHOP]: 'Bishop',
    [pieces.ROOK]: 'Rook',
    [pieces.UNKNOWN]: 'Unknown'
};
const actions = {
    MOVE: 0,
    CHALLENGE: 1,
    BOMB: 2,
    SACRIFICE: 3,
    ONDECK: 4,
    PASS: 5
};
const highlightColors = {
    BLUE: 'rgba(13, 47, 202, 0.450)',
    RED: 'rgba(184, 1, 1, 0.418)',
    GREEN:'rgba(1, 148, 67, 0.205)'
}
const winReasons = {    
    CAPTURED_KING: 0,
    THRONE: 1,
    STASH: 2,
    FORCED_SACRIFICE: 3,
    KING_BLUFF: 4,
    TIMEOUT: 5,
    DISCONNECT: 6      
}

class UIManager {
    constructor(webSocketManager) {
        this.webSocketManager = webSocketManager;
        this.audio = new AudioController()
        this.username;
        this.opponentName;
        this.board = null;
        this.allVisibles = ['first-row-highlight-gold', 'on-deck-cell-highlight-gold', 'origin-highlight'
            , 'opponent-challenge-image','player-challenge-image','challenge-highlight','sacrifice-icon'
            , 'lobby-container','name-entry','game-picker'
            ,'play-button','custom-options','ai-difficulty','cancel-button'
            ,'bomb-button','challenge-button','ready-button', 'random-setup-button','pass-button'
            ,'left-speech-bubble','right-speech-bubble','left-thought-bubble','right-thought-bubble'
            , 'floating-game-piece','on-deck-indicator']
        this.currentState = [];
        this.currentVisibles = [];
        this.currentActions = [];
        this.draggedPiece = null;
        this.originalParent = null;
        this.targetCell = null;
        this.playerTime=0;
        this.opponentTime=0;
        this.playerClockTicking = false;
        this.opponentClockTicking = false;
        this.offsetX = 0;
        this.offsetY = 0;
        this.states = {
            pageLoad: {
                visible: ['lobby-container','name-entry'],
                actions: ['submitUsername']
            },
            lobby :{
                visible: ['lobby-container','game-picker'],
                actions: []
            },
            quickplay:{
                visible: ['lobby-container','game-picker','play-button'],
                actions: ['enterQueue']
            },
            custom:{
                visible: ['lobby-container','game-picker','custom-options','play-button'],
                actions: ['inviteOpponent']
            },
            AI:{
                visible: ['lobby-container','game-picker','ai-difficulty','play-button'],
                actions: ['playAI']
            },
            quickplayCancel:{
                visible: ['lobby-container','game-picker','cancel-button'],
                actions: ['cancelQueue']
            },
            customCancel:{
                visible: ['lobby-container','game-picker','custom-options','cancel-button'],
                actions: ['cancelCustom']
            },
            boardState:{
                visible: [],
                actions: []
            },
            setup:{
                visible: ['first-row-highlight-gold', 'on-deck-cell-highlight-gold', 'random-setup-button'],
                actions: ['randomSetup'
                    , 'swap','select-board-piece', 'select-on-deck-piece', 'select-stash-piece'
                    , 'move-board-to-on-deck', 'move-stash-to-on-deck', 'move-on-deck-to-on-deck'
                    , 'move-board-to-board', 'move-stash-to-board', 'move-on-deck-to-board'
                    , 'move-on-deck-to-stash', 'move-stash-to-stash', 'move-board-to-stash']
            },
            otherPlayerTurn:{
                visible: [],
                actions: []
            },
            move:{
                visible: [],
                actions: ['legal-board-move','select-board-piece', 'move-board-to-board']
            },
            bomb:{
                visible: ['bomb-button'],
                actions: ['bomb']
            },
            challenge:{
                visible: ['challenge-button'],
                actions: ['challenge']
            },
            floatingGamePiece:{
                visible: ['floating-game-piece'],
                actions: []
            },
            readyable:{
                visible: ['ready-button'],
                actions: ['ready']
            },
            ready:{
                visible: [],
                actions: []
            },
            sacrifice:{
                visible: ['sacrifice-icon'],
                actions: ['sacrifice']
            },
            onDeck:{    
                visible: ['on-deck-cell-highlight-gold','on-deck-indicator'],
                actions: ['onDeck', 'move-stash-to-on-deck', 'select-stash-piece']
            },
            leftThoughtBubble:{
                visible: ['left-thought-bubble'],
                actions: []
            },
            rightThoughtBubble:{
                visible: ['right-thought-bubble'],
                actions: []
            },
            leftSpeechBubble:{
                visible: ['left-speech-bubble'],
                actions: []
            },
            playerChallenge:{
                visible: ['player-challenge-image','challenge-highlight'],
                actions: []
            },
            opponentChallenge:{
                visible: ['opponent-challenge-image','challenge-highlight'],
                actions: []
            },
            playerBomb:{
                visible: ['left-speech-bubble'],
                actions: []
            },
            opponentBomb:{
                visible: ['left-speech-bubble'],
                actions: []
            },
            pass:{
                visible: ['pass-button'],
                actions: ['pass']
            },
            originHighlight:{
                visible: ['origin-highlight'],
                actions: []
            },
            movePlaced:{
                visible: [],
                actions: ['declareMove']
            },
            moveComplete:{
                visible: [],
                actions: []
            }
        }
        this.setupButtons();
        this.setupGameSelection();  // Add this line
        this.setState('pageLoad');
        this.playerTimerId = null;
        this.opponentTimerId = null;
    }
    addState(state){
        console.log(`Adding state: ${state}`);
        this.currentState.push(state);
    }
    hasState(state){
        return this.currentState.includes(state);
    }
    removeState(state){
        this.currentState = this.currentState.filter(s => s !== state);
    }
    setState(state){
        this.currentState = [state];
        console.log(`Setting state to: ${state}`);
        this.updateUI();
    }
    addVisible(visible){
        if (!this.currentVisibles.includes(visible)) {
            this.currentVisibles.push(visible);
        }
    }
    addAction(action){
        if (!this.currentActions.includes(action)) {
            this.currentActions.push(action);
        }
    }
    addActionsAndVisisbles(){
        this.currentVisibles = [];
        this.currentActions = [];
        //add actions that are in the current state
        this.currentState.forEach(state => {
            this.states[state].visible.forEach(state => {
                this.addVisible(state);
            });
            this.states[state].actions.forEach(action => {
                this.addAction(action);
            });
        });
    }
    hasVisible(visible){
        return this.currentVisibles.includes(visible);
    }
    hasAction(action){
        return this.currentActions.includes(action);
    }
    setClassDisplays(visName){
        const elements = document.querySelectorAll(`.${visName}`);
        if(this.hasVisible(visName)){
            elements.forEach(element => {
                element.style.display = 'block';
            });
        } else {
            elements.forEach(element => {
                element.style.display = 'none';
            });
        }
    }
    setElementDisplays(visName){
        if(this.hasVisible(visName)){
            document.getElementById(visName).style.display = 'block';        
        } else {
            document.getElementById(visName).style.display = 'none';
        }
    }
    setElementHighlights(visName){
        if (visName.includes('highlight')) {
            const [elementClass, highlightType] = visName.split('-highlight-');
            const elements = document.querySelectorAll(`.${elementClass}`);
            elements.forEach(element => {
                if (this.hasVisible(visName)){  
                    if (highlightType === 'gold') {
                        element.classList.add('highlighted-cell-gold');
                    } else if (highlightType === 'red') {
                        element.classList.add('highlighted-cell-red');
                    } 
                } else {
                    element.classList.remove('highlighted-cell-gold');
                    element.classList.remove('highlighted-cell-red');
                }
            });
        }       
    }
    unhighlightAllCells(){
        document.querySelectorAll('.cell, .on-deck-cell, .inventory-slot').forEach(element => {
            const classesToRemove = Array.from(element.classList).filter(className => className.startsWith('highlight'));
            element.classList.remove(...classesToRemove);
        });
    }
    updateUI(){
        this.addActionsAndVisisbles();
        this.unhighlightAllCells();
        this.allVisibles.forEach(visName => {
            if(document.getElementById(visName)){
                this.setElementDisplays(visName);
            } else if (document.getElementsByClassName(visName).length > 0){
                this.setClassDisplays(visName);
            } else {
                this.setElementHighlights(visName);
            }
        });        
        console.log(this)
    }
    setupPieceMovement() {
        // Remove all existing event listeners from game pieces
        const gamePieces = document.querySelectorAll('.game-piece');
        gamePieces.forEach(piece => {
            piece.removeEventListener('mousedown', this.handleMouseDown);
            piece.removeEventListener('touchstart', this.handleTouchStart);
        });
        // Add event listeners to game pieces
        gamePieces.forEach(piece => {
            piece.addEventListener('mousedown', this.handleMouseDown.bind(this));
            piece.addEventListener('touchstart', this.handleTouchStart.bind(this));
        });
    }
    handleMouseDown(e) {
        this.handleStart(e);
    }
    handleTouchStart(e) {
        e.preventDefault(); // Prevent scrolling when touching elements
        this.handleStart(e.touches[0]);
    }
    handleStart(e) {
        if(this.draggedPiece){
            this.releasePiece().bind(this)
        }
        this.draggedPiece = null;
        if (e.target.classList.contains('game-piece')) {
            const parentElement = e.target.parentElement;
            let canSelectPiece = false;

            // Check if the piece is the correct color
            const piece = this.convertPieceImageNameToEngineFormat(e.target.style.backgroundImage);
            if (this.board.color !== piece.color){
                return;// Don't allow selection of opposite color pieces
            }

            if (parentElement.classList.contains('cell') && this.currentActions.includes('select-board-piece')) {
                canSelectPiece = true;
            } else if (parentElement.classList.contains('on-deck-cell') && this.currentActions.includes('select-on-deck-piece')) {
                canSelectPiece = true;
            } else if (parentElement.classList.contains('inventory-slot') && this.currentActions.includes('select-stash-piece')) {
                canSelectPiece = true;
            }
            if (canSelectPiece) {
                this.draggedPiece = e.target;
                this.originalParent = parentElement;
                this.draggedPiece.classList.add('selected');

                const rect = this.draggedPiece.getBoundingClientRect();
                this.offsetX = rect.width / 2;
                this.offsetY = rect.height / 2;

                this.originalWidth = rect.width;
                this.originalHeight = rect.height;

                document.body.appendChild(this.draggedPiece);
                this.draggedPiece.style.position = 'fixed';
                this.draggedPiece.style.width = `${this.originalWidth}px`;
                this.draggedPiece.style.height = `${this.originalHeight}px`;
                this.draggedPiece.style.zIndex = '1000';
                this.movePiece(e);

                document.addEventListener('mousemove', this.movePiece.bind(this), {passive: true});
                document.addEventListener('mouseup', this.releasePiece.bind(this));
                document.addEventListener('touchmove', this.handleTouchMove.bind(this), {passive: false});
                document.addEventListener('touchend', this.handleTouchEnd.bind(this));
            }
        }
    }
    getLegalMovePieceList(startCellId, targetCellId){
        const legalMovePieces = [];
        [pieces.KING, pieces.KNIGHT, pieces.BISHOP, pieces.ROOK].forEach(pieceType => {
            if (this.isLegalMove(startCellId, targetCellId, pieceType)) {
                legalMovePieces.push(pieceType);
            }
        });
        return legalMovePieces;
    }
    movePiece(e) {
        if (this.draggedPiece) {
            const newLeft = e.clientX;
            const newTop = e.clientY;
            this.draggedPiece.style.left = `${newLeft}px`;
            this.draggedPiece.style.top = `${newTop}px`;

            if (this.currentActions.includes('legal-board-move')) {
                let target = this.getTargetElement(e);
                if (target && target.id) {
                    const startCellId = this.originalParent.id;
                    const targetCellId = target.id;

                    const legalMovePieces = this.getLegalMovePieceList(startCellId, targetCellId);
                    requestAnimationFrame(() => {
                        this.displayLegalMoves(legalMovePieces,'Thought',this.draggedPiece);
                    });
                }
            }
        }
    }
    handleTouchMove(e) {
        e.preventDefault(); // Prevent scrolling when moving pieces
        if (e.touches.length > 0) {
            this.movePiece(e.touches[0]);
        }
    }
    displayLegalMoves(legalMovePieces, type,targetPiece){
        // Remove all elements of class "declaration"
        this.removeState('leftSpeechBubble');
        this.removeState('leftThoughtBubble');
        this.removeState('rightThoughtBubble');
        if (legalMovePieces.length > 2) {
            console.log(`Error: Too many legal moves - ${legalMovePieces}`);
            return;
        }
        legalMovePieces.forEach((pieceType, index) => {
            const facing = index === 0 ? 'left' : 'right';
            const bubbleImage = document.getElementById(`${facing}-${type.toLowerCase()}-bubble`);
            bubbleImage.src = `/images/Bubble${type}${facing.charAt(0).toUpperCase() + facing.slice(1)}${pieceTypeNames[pieceType]}.svg`;

            // Position the bubble relative to the dragged piece
            const pieceRect = targetPiece.getBoundingClientRect();

            if (index === 0) {
                // Left bubble
                bubbleImage.style.left = `${pieceRect.left}px`;
                bubbleImage.style.top = `${pieceRect.top}px`;
                bubbleImage.style.transform = 'translate(-55%, -60%)';
            } else {
                // Right bubble
                bubbleImage.style.left = `${pieceRect.right}px`;
                bubbleImage.style.top = `${pieceRect.top}px`;
                bubbleImage.style.transform = 'translate(-45%, -60%)';
            }
            this.addState(`${facing}${type}Bubble`);
        });
        this.updateUI();
    }
    isLegalMove(startCellId, targetCellId, pieceType) {
        const startCoords = this.cellIdToCoords(startCellId);
        const targetCoords = this.cellIdToCoords(targetCellId);
        // Check if target is the same as start , or if the distance is too great
        const dx = Math.abs(targetCoords.x - startCoords.x);
        const dy = Math.abs(targetCoords.y - startCoords.y);
        if (startCellId === targetCellId || dx > 3 || dy > 3) {
            return false;
        }
        // Check if target has a friendly piece
        const targetPiece = this.board.board[targetCoords.y][targetCoords.x];
        if (targetPiece && targetPiece.color === this.board.color) {
            return false;
        }
        // Check for piece-specific movement rules
        switch (pieceType) {
            case pieces.ROOK:
                if (startCoords.x !== targetCoords.x && startCoords.y !== targetCoords.y) {
                    return false; // Rook can only move in straight lines
                }
                return this.isPathClear(startCoords, targetCoords);
            case pieces.BISHOP:
                if (Math.abs(targetCoords.x - startCoords.x) !== Math.abs(targetCoords.y - startCoords.y)) {
                    return false; // Bishop can only move diagonally
                }
                return this.isPathClear(startCoords, targetCoords);
            case pieces.KING:
                // King can move one square in any direction
                return Math.abs(targetCoords.x - startCoords.x) <= 1 && Math.abs(targetCoords.y - startCoords.y) <= 1;
            case pieces.KNIGHT:
                // Knight moves in an L-shape
                return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
            default:
                return false;
        }
    }
    convertPieceImageNameToEngineFormat(imageURL) {
        const pieceName = imageURL.slice(5, -2).replace(/\.svg$/, '').split('Pawn')[1];
        const color = pieceName.startsWith('White') ? colors.WHITE : colors.BLACK; // Default to Black
        const type = pieces[pieceName.slice(5).toUpperCase()]; // Remove 'White' or 'Black' prefix
        return { color, type };
    };
    getPieceImageNameFromEngineFormat(piece) {
        return `images/Pawn${pieceStringNames[piece.color][piece.type]}.svg`;
    }
    cellIdToCoords(cellId) {
        const [letter, number] = cellId.split('-');
        const x = letter.charCodeAt(0) - 'A'.charCodeAt(0);
        const y =  parseInt(number) - 1;
        return { x, y };
    }
    coordsToCellId(coords) {
        const { x, y } = coords;
        const letter = String.fromCharCode('A'.charCodeAt(0) + x);
        const number = y + 1;
        return `${letter}-${number}`;
    }
    isPathClear(start, target) {
        const dx = Math.sign(target.x - start.x);
        const dy = Math.sign(target.y - start.y);

        let x = start.x + dx;
        let y = start.y + dy;

        while (x !== target.x || y !== target.y) {
            if (this.board.board[y][x] != null) {
                return false;  
            }
            x += dx;
            y += dy;
        }

        return true;
    }
    releasePiece(e) {
        this.handleRelease(e);
    }
    handleTouchEnd(e) {
        // Use the last known touch position
        const lastTouch = e.changedTouches[0];
        this.handleRelease(lastTouch);
    }
    handleRelease(e) {
        this.removeState('leftSpeechBubble');
        this.removeState('leftThoughtBubble');
        this.removeState('rightThoughtBubble');
        if (!this.draggedPiece) return;

        const target = this.getTargetElement(e);
        const originalLocationType = this.getLocationType(this.originalParent);
        const targetLocationType = this.getLocationType(target);
        // Check if the target is a cell on the board
        const isBoardCell = target && target.classList.contains('cell') && target.id.match(/^[A-E]-[1-5]$/);
        let isLegalityPassed = true;
        let legalMovePieces = [];
        if (this.currentActions.includes('legal-board-move')){
            //Need to check if we have a legal move, but only if we're in the legal-board-move state
            if (isBoardCell) {
                const startCellId = this.originalParent.id;
                const targetCellId = target.id;
                legalMovePieces = this.getLegalMovePieceList(startCellId, targetCellId);
                if (legalMovePieces.length === 0) {
                    isLegalityPassed = false;
                }
            }
        } 
        if (this.isValidTarget(target)) {
            this.audio.doSFX('knock');
            const moveAction = `move-${originalLocationType}-to-${targetLocationType}`;
            if (this.currentActions.includes(moveAction)){
                if (this.currentActions.includes('onDeck')){
                    this.onDeck(this.draggedPiece);
                } else if (isLegalityPassed) {
                    this.handleValidPieceDrop(target,legalMovePieces);
                } else {
                    this.returnToOriginalParent();
                }
            } else {
                this.returnToOriginalParent();
            }
        } else {
            this.returnToOriginalParent();
        }

        this.cleanupAfterDrag();
    }
    setPointerEventsElementsInTheWay(pointerEvents){
        document.querySelectorAll('.bubble').forEach(bubble => {
            bubble.style.pointerEvents = pointerEvents;
        });    
        this.draggedPiece.style.pointerEvents = pointerEvents;
    }
    getTargetElement(e) {
        this.setPointerEventsElementsInTheWay('none');
        let target = document.elementFromPoint(e.clientX, e.clientY);
        this.setPointerEventsElementsInTheWay('auto');

        // If the target is a game piece, get its parent (the cell)
        if (target.classList.contains('game-piece')) {
            target = target.parentElement;
        }
        
        return target;
    }
    isValidTarget(target) {
        return target && (
            target.classList.contains('cell') || 
            target.classList.contains('on-deck-cell') || 
            target.classList.contains('inventory-slot')
        );
    }
    handleValidPieceDrop(target,legalMovePieces) {
        const targetPieceElement = target.querySelector('.game-piece');
        if (targetPieceElement){
            this.audio.doSFX('capture')
        }
        this.targetCell = target;
        if (this.canSwap(target) && targetPieceElement) {
            this.swapPieces(target, targetPieceElement);
        } else {
            target.appendChild(this.draggedPiece);
            // Display legal moves after a valid move
            if (legalMovePieces.length > 0) {
                console.log(`Dropped a legal move pieces: ${legalMovePieces}`);
                this.handleValidMove(target,legalMovePieces);
            } 
        }
        this.resetPieceStyle();

    }
    completeMove(declarationType){
        this.setSpeechBubbleImageType(declarationType);
        this.setState('moveComplete');
        this.addState('leftSpeechBubble');
        this.addState('originHighlight');
        this.moveTypeHighlight('origin',this.originalParent);
        this.moveSpeechBubbleToTarget(this.targetCell);
        this.audio.doSFX('declare')
        this.updateUI();
        // Send move information to the server
        
        const originalxy = this.cellIdToCoords(this.originalParent.id);
        const targetxy = this.cellIdToCoords(this.targetCell.id);
        const moveData = {
            x1: originalxy.x,
            y1: originalxy.y,
            x2: targetxy.x,
            y2: targetxy.y,
            declaration: declarationType
        };
        this.stopClockTick('player');
        this.startClockTick('opponent');
        this.webSocketManager.routeMessage({type:'game-action', action:actions.MOVE, details:moveData});
        this.cleanupAfterMove();
    }
    handleValidMove(target,legalMovePieces) {
        if (legalMovePieces.length === 1) {
            this.completeMove(legalMovePieces[0]);
        } else if (legalMovePieces.length > 1) {
            this.setState('movePlaced');
            const leftBubble = document.getElementById('left-thought-bubble');
            const rightBubble = document.getElementById('right-thought-bubble');
            leftBubble.src = `/images/BubbleThoughtLeft${pieceTypeNames[legalMovePieces[0]]}.svg`;
            rightBubble.src = `/images/BubbleThoughtRight${pieceTypeNames[legalMovePieces[1]]}.svg`;
            this.addState('leftThoughtBubble');
            this.addState('rightThoughtBubble');
            this.displayLegalMoves(legalMovePieces,'Thought',target);
            this.updateUI();
        }
    }
    moveSpeechBubbleToTarget(target){
        const bubbleImage = document.getElementById('left-speech-bubble');
        const pieceRect = target.getBoundingClientRect();
        bubbleImage.style.left = `${pieceRect.left}px`;
        bubbleImage.style.top = `${pieceRect.top}px`;
        bubbleImage.style.transform = 'translate(-55%, -60%)';
    }
    canSwap(target) {
        return this.currentActions.includes('swap') && 
               target.querySelector('.game-piece');
    }
    swapPieces(target, targetPieceElement) {
        let targetPiece = this.convertPieceImageNameToEngineFormat(targetPieceElement.style.backgroundImage);
        let draggedPiece = this.convertPieceImageNameToEngineFormat(this.draggedPiece.style.backgroundImage);
        
        if (targetPiece.color === draggedPiece.color) {
            this.originalParent.appendChild(targetPieceElement);
            target.appendChild(this.draggedPiece);
        } else {
            this.returnToOriginalParent();
        }
    }
    returnToOriginalParent() {
        this.originalParent.appendChild(this.draggedPiece);
        this.resetPieceStyle();
    }
    cleanupAfterDrag() {
        document.removeEventListener('mousemove', this.movePiece);
        document.removeEventListener('mouseup', this.releasePiece);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        this.draggedPiece.classList.remove('selected');
        this.draggedPiece = null;
        this.startLocation = null;
        this.postMoveState();
    }
    cleanupAfterMove(){
        this.targetCell = null;
        this.originalParent = null;
    }
    getLocationType(element) {
        if (element.classList.contains('cell')) {
            return 'board';
        } else if (element.classList.contains('on-deck-cell')) {
            return 'on-deck';
        } else if (element.classList.contains('inventory-slot')) {
            return 'stash';
        } else if (element.classList.contains('game-piece')) {
            return this.getLocationType(element.parentElement);
        }
        return 'unknown';
    }
    postMoveState(){
        if(this.currentState.includes('setup')){
            this.checkReadyState();
        }
        this.updateUI();
    }
    checkReadyState(){
        // Check if on-deck-cell and first row cells have game pieces
        const onDeckCell = document.querySelector('.on-deck-cell');
        const firstRowCells = document.querySelectorAll('.cell.first-row');
        const allCellsFilled = onDeckCell.querySelector('.game-piece') && 
            Array.from(firstRowCells).every(cell => cell.querySelector('.game-piece'));

        // Check if one of the first-row pieces is a king
        const hasKingInFirstRow = Array.from(firstRowCells).some(cell => {
            const pieceElement = cell.querySelector('.game-piece');
            if (!pieceElement) return false;
            const pieceImage = pieceElement.style.backgroundImage;
            const piece = this.convertPieceImageNameToEngineFormat(pieceImage);
            return piece && piece.type === pieces.KING;
        });

        // Update state based on cell occupancy and king presence
        if (allCellsFilled && hasKingInFirstRow) {
            if (!this.hasState('readyable')) {
                this.addState('readyable');
            }
        } else {
            this.removeState('readyable');
        }
    }
    resetPieceStyle() {
        this.draggedPiece.style.position = 'absolute';
        this.draggedPiece.style.left = '50%';
        this.draggedPiece.style.top = '50%';
        this.draggedPiece.style.transform = 'translate(-50%, -50%)';
        this.draggedPiece.style.width = '90%';
        this.draggedPiece.style.height = '90%';
        this.draggedPiece.style.zIndex = '';
    }









    setupButtons(){
        //Add event listeners to all buttons
        document.getElementById('submit-username').addEventListener('click', () => {
            this.doAction('submitUsername');
        });
        document.getElementById('play-button').addEventListener('click', () => {
            this.doAction('enterQueue');
            this.doAction('inviteOpponent');
            this.doAction('playAI');
        });
        document.getElementById('cancel-button').addEventListener('click', () => {
            this.doAction('cancelQueue');
            this.doAction('cancelCustom');
        });
        document.getElementById('ready-button').addEventListener('click', () => {
            this.doAction('ready');
        });
        document.getElementById('random-setup-button').addEventListener('click', () => {
            this.doAction('randomSetup');
        });
        document.getElementById('left-thought-bubble').addEventListener('click', () => {
            this.doAction('declareMove','left-thought-bubble')
        });
        document.getElementById('right-thought-bubble').addEventListener('click', () => {
            this.doAction('declareMove','right-thought-bubble')
        });
        document.getElementById('challenge-button').addEventListener('click', () => {
            this.doAction('challenge')
        });
        document.getElementById('bomb-button').addEventListener('click', () => {
            this.doAction('bomb')
        });
        document.getElementById('pass-button').addEventListener('click', () => {
            this.doAction('pass')
        });

    }
    setupSacrificeFunction(){
        const gamePieces = document.querySelectorAll('.game-piece');
        gamePieces.forEach(piece => {
            const enginePiece = this.convertPieceImageNameToEngineFormat(piece.style.backgroundImage);
            if (enginePiece.type !== pieces.KING && enginePiece.color === this.board.color){
                const handleSacrifice = (event) => {
                    this.doAction('sacrifice', {piece});
                    event.stopPropagation(); // Prevent event from bubbling up to the cell
                };
                piece.addEventListener('click', handleSacrifice);
                piece.addEventListener('touchstart', handleSacrifice);
            }
        });
    }
    setupGameSelection() {
        const gameSelection = document.getElementById('game-selection');
        gameSelection.addEventListener('change', () => {
            const selectedValue = gameSelection.value ? gameSelection.value : 'lobby';
            this.setState(selectedValue);
        });
    }
    welcome(data){
        console.log(`Welcome to the lobby: ${data.username}`);
        this.username = data.username;
        const usernameElements = document.getElementsByClassName('username-inline');
        for (let element of usernameElements) {
            element.innerHTML = this.username;
        }
        this.setState('lobby');
    }
    usernameTaken(data) {
        alert(`${data.username} is already taken!`);
    }
    illegalAction(data){
        alert(data.message);
        this.updateUI();
    }
    doAction(action,params={}){
        console.log(`Attempting action: ${action}`);
        if (this.currentActions.includes(action)) {
            if (typeof this[action] === 'function') {
                console.log(`Doing Action: ${action}`);
                this[action](params);
            } else {
                console.warn(`Action '${action}' is in currentActions but no corresponding method exists.`);
            }
        } else {
            // console.log(`Action '${action}' is not in the current set of allowed actions.`);
        }
    }
    declareMove(params){
        console.log(`Declaring: ${params}`);
        const bubbleElement = document.getElementById(params);
        const pieceType = this.bubbleImageToEngineFormat(bubbleElement.src);
        console.log(`Declared Piece Type: ${pieceTypeNames[pieceType]}`);
        this.legalActions = [pieceType];
        this.completeMove(pieceType);
    }
    bubbleImageToEngineFormat(imageSrc){
        const pieceTypeName = imageSrc.split('BubbleThought')[1].split('.')[0].replace(/Left|Right/, '');
        return pieces[pieceTypeName.toUpperCase()];
    }
    randomSetup(params){
        // Stop the current player's clock
        this.stopClockTick('player');
        this.setState('ready');
        this.webSocketManager.routeMessage({type:'random-setup'});
    }
    randomSetupComplete(params){
        const tempBoardState = params.board;
        this.setBoardPieces(tempBoardState);
        this.setState('ready');
    }
    challenge(params){
       this.webSocketManager.routeMessage({type:'game-action', action:actions.CHALLENGE, details:{}});
    }
    pass(params){
        this.webSocketManager.routeMessage({type:'game-action', action:actions.PASS, details:{}});
    }
    sacrifice(params){
        console.log(`Sacrificing!`);
        const parentCell = params.piece.parentElement;
        if (!parentCell.classList.contains('cell')) {
            return false;
        }
        const coords = this.cellIdToCoords(parentCell.id);
        this.audio.doSFX('sacrifice')
        this.webSocketManager.routeMessage({type:'game-action', action:actions.SACRIFICE, details:{x1:coords.x, y1:coords.y}});
    }
    onDeck(pieceElement){
        const piece = this.convertPieceImageNameToEngineFormat(pieceElement.style.backgroundImage)
        console.log(`OnDeck: ${piece}`);
        this.webSocketManager.routeMessage({type:'game-action', action:actions.ONDECK, details:{declaration:piece.type}});
    }
    bomb(params){
        this.webSocketManager.routeMessage({type:'game-action', action:actions.BOMB, details:{}});
    }
    ready(params){
        // Stop the current player's clock
        this.stopClockTick('player');
        this.setState('ready');
        // Generate JSON object with piece positions
        let frontRow = []
        let onDeck = null

        // Get front row squares
        const frontRowSquares = document.querySelectorAll('.first-row');
        frontRowSquares.forEach(square => {
            const piece = this.convertPieceImageNameToEngineFormat(square.querySelector('.game-piece').style.backgroundImage);
            if (piece) {
                const coords = this.cellIdToCoords(square.id);
                frontRow.push({x:coords.x, y:coords.y, color:piece.color, type:piece.type});
            }
        });

        // Get on-deck cell
        const onDeckCell = document.querySelector('.on-deck-cell');
        const onDeckPiece = onDeckCell.querySelector('.game-piece');
        if (onDeckPiece) {
            onDeck = this.convertPieceImageNameToEngineFormat(onDeckPiece.style.backgroundImage);
        }
        console.log(frontRow);
        console.log(onDeck);
        // Route message with type "ready" and the piece positions
        this.webSocketManager.routeMessage({
            type: 'submit-setup',
            frontRow: frontRow,
            onDeck: onDeck
        });
    }
    setupError(data){
        alert(data.message);
        this.setState('readyable');
    }
    opponentSetupComplete(data){
        // Stop the opponent's clock
        this.stopClockTick('opponent');

        // Fill the back row with opponent's pawns
        const backRowSquares = document.querySelectorAll('.last-row');
        const piece = {color:(1 - this.board.color), type:pieces.UNKNOWN};
        backRowSquares.forEach(square => {
            const pieceElement = document.createElement('div');
            pieceElement.style.backgroundImage = `url(${this.getPieceImageNameFromEngineFormat(piece)})`; 
            pieceElement.classList.add('game-piece');
            square.appendChild(pieceElement);
        });

    }
    bothSetupComplete(data){
        this.updateBoardState(data);
    }
    submitUsername(params){
        const username = document.getElementById('username-input').value.trim();
        console.log(`Submitting username: ${username}`);
        if (this.isValidUsername(username)) {
            this.webSocketManager.routeMessage({type:'submit-username', username:username});
        }
    }
    isValidUsername(username) {
        if (username.length > 18) {
            alert("Name must be 18 characters or fewer!");
            return false;
        }
        return true;
    }
    enterQueue(){
        this.setState('quickplayCancel');
        this.webSocketManager.routeMessage({type:'enter-queue'});
    }
    cancelQueue(){
        this.setState('quickplay');
        this.webSocketManager.routeMessage({type:'exit-queue'});

    }
    inviteOpponent(){
        this.setState('customCancel');
        const opponentName = document.getElementById('opponent-name-input').value.trim();
        const gameLength = document.getElementById('game-length').value;
        this.webSocketManager.routeMessage({type:'invite-opponent',opponentName:opponentName,gameLength:gameLength });
    }
    inviteReceived(data){
        const opponentName = data.opponentName;
        const gameLength = data.gameLength;
        const confirmMessage = `${opponentName} has invited you to play a ${gameLength} minute game. \nDo you accept?`;
        
        if (confirm(confirmMessage)) {
            this.acceptInvite(opponentName);
        } else {
            this.declineInvite(opponentName);
        }
    }
    opponentDisconnected(data){
        this.setState('lobby');
        this.endGame();
        alert(`${data.message} `);

    }
    inviteDeclined(data){
        this.setState('lobby');
        this.endGame();
        alert(`${data.opponentName} has declined your invite.`);
    }
    acceptInvite(opponentName) {
        console.log(`Accepting invite from ${opponentName}`);
        this.webSocketManager.routeMessage({type: 'accept-invite', opponentName: opponentName});
    }
    declineInvite(opponentName) {
        console.log(`Declining invite from ${opponentName}`);
        this.webSocketManager.routeMessage({type: 'decline-invite', opponentName: opponentName});
    }
    cancelCustom(){
        this.setState('custom');
        this.webSocketManager.routeMessage({type:'cancel-invite'});
    }
    postLobbyState(data){
        const lobbyState = data.lobbyState
        document.getElementById('in-lobby').innerHTML = `${lobbyState.lobbyCount}`
        document.getElementById('in-queue').innerHTML = `${lobbyState.queueCount}`
        document.getElementById('in-games').innerHTML = `${lobbyState.inGameCount}`
    }
    playAI(){
        let botName = document.getElementById('ai-difficulty').value;
        this.webSocketManager.routeMessage({type:'invite-opponent',opponentName:botName,gameLength:15 });
    }
    determineSound(){
        let sound = null;
        const lastAction = this.board.actionHistory[this.board.actionHistory.length - 1]
        if (lastAction){
            if (lastAction.type === actions.BOMB){
                this.audio.doSFX('bomb')
            } else if (this.board.myTurn && lastAction.type === actions.MOVE){
                // Opponent just moved:
                this.audio.doSFX('knock');
                if(lastAction.wasCapture){
                    this.audio.doSFX('capture')
                }
            }
        }
    }
    handleSetupReconnect(){
        //Reconnecting player to the game. 
        if (this.board.phase === 'setup') {
            if (this.board.mySetupComplete) {
                this.stopClockTick('player');
                this.setState('ready');
            }
            if (this.board.opponentSetupComplete) {
                this.opponentSetupComplete();
            }
            document.getElementById('player-clock-time').textContent = this.formatTime(this.board.mySetupTimeRemaining);
            document.getElementById('opponent-clock-time').textContent = this.formatTime(this.board.opponentSetupTimeRemaining);
        }
    }
    //Board State
    updateBoardState(data){
        this.setState('boardState');
        this.board = data.board;
        this.determineSound()
        this.opponentName = this.board.opponentName;
        if(!this.board.myTurn){
            this.setState('otherPlayerTurn');
        } else {
            // Add every state in the legalActions property of the board
            if (this.board.legalActions && Array.isArray(this.board.legalActions)) {
                this.board.legalActions.forEach(action => {
                    this.addState(action);
                });
            }
            this.updateUI();
        }
        this.updateBoardUI();
        this.setupPieceMovement();
    }
    endGame() {
        // Reset game selection to default empty value
        document.getElementById('game-selection').value = "";
        this.stopClockTick('both');
    }
    clearBoard(){
        this.resetClocks();
        this.board = null;
        this.opponentName = null;
        this.removeAllPieces()
    }
    startCorrectClocks(){
        if (this.board.phase === 'setup') {
            this.startClockTick('both');
        } else if (this.board.phase === 'play'){
            if (this.board.myTurn) {
                this.startClockTick('player');
                this.stopClockTick('opponent');
            } else {
                this.startClockTick('opponent');
                this.stopClockTick('player');
            }
        }
    }
    updateBoardUI() {
        this.updateNames();
        this.updateClocks();
        this.startCorrectClocks();
        this.setBoardSpaceLabels()
        this.setBoardPieces(this.board);
        if (this.gameIsOver()){
            this.endGame()
            setTimeout(() => {
                this.setState('lobby');
            },200)
            return;
        }
        this.updateLegalGameActions();
        this.handleSetupReconnect()
    }
    gameIsOver(){
        let gameOver = false;
        if(this.board.winner != null){
            gameOver = true
            const isPlayerWinner = this.board.winner === this.board.color;
            const winnerName = this.board.winner === this.board.color ? this.username : this.opponentName;
            const loserName = this.board.winner === this.board.color ? this.opponentName : this.username;
            const winnerColor = colorNames[this.board.winner]
            const loserColor = colorNames[1 - this.board.winner]
            let winReason;
            let loseReason;
            switch(this.board.winReason) {
                case winReasons.CAPTURED_KING:
                    winReason = `You captured your opponent's, king!`;
                    loseReason = `${winnerName} (${winnerColor}) captured your (${loserColor}) king...`
                    break;
                case winReasons.THRONE:
                    winReason = `You moved your king to the opponent's (${loserColor}) throne!`;
                    loseReason = `${winnerName} (${winnerColor}) moved their king into your (${loserColor}) throne...`;
                    break;
                case winReasons.STASH:
                    winReason = `${loserName} (${loserColor}) unsuccessfully challenged your (${winnerColor}) king move!`;
                    loseReason = `You (${loserColor}) unsuccessfully challenged ${winnerName}'s (${winnerColor}) king move...`;
                    break;
                case winReasons.FORCED_SACRIFICE:
                    winReason = `You forced ${loserName} (${loserColor}) to sacrifice all their pieces!`;
                    loseReason = `${winnerName} (${winnerColor}) forced you (${loserColor}) to sacrifice all your pieces...`;
                    break;
                case winReasons.TIMEOUT:
                    winReason = `${loserName} (${loserColor}) ran out of time!`;
                    loseReason = `You ran out of time...`;
                    break;
                case winReasons.KING_BLUFF:
                    winReason = `You captured ${loserName}'s (${loserColor}) king with a challenge!`;
                    loseReason = `${winnerName} (${winnerColor}) captured your king with a challenge...`;
                    break;
                default:
                    winReason = `You won the game!`;
                    loseReason = `You lost the game...`;
                    break;
            }
            if(isPlayerWinner){
                this.audio.doSFX('victory');
                setTimeout(() => {
                    alert(`YOU WIN!! \n ${winReason}`);
                }, 100);
            } else {
                this.audio.doSFX('defeat');
                setTimeout(() => {
                    alert(`YOU LOSE! \n ${loseReason}`);
                }, 100);
            }
            
        }
        return gameOver
    }
    updateLegalGameActions(){
        this.setupSacrificeFunction();
        this.board.legalActions.forEach(action => {
            this.addState(action);
        });
        this.updateUI();
    }
    removeAllPieces(){
        const pieces = document.querySelectorAll('.game-piece');
        pieces.forEach(piece => {
            piece.remove();
        });
    }
    setBoardSpaceLabels() {
        const cells = document.querySelectorAll('.board .cell');
        const isWhite = this.board.color === 0;
        // Set throne images based on player color
        const topThroneImage = document.getElementById('topThroneImage');
        const bottomThroneImage = document.getElementById('bottomThroneImage');

        if (isWhite) {
            topThroneImage.src = '/images/BlackThrone.svg';
            bottomThroneImage.src = '/images/WhiteThrone.svg';
        } else {
            topThroneImage.src = '/images/WhiteThrone.svg';
            bottomThroneImage.src = '/images/BlackThrone.svg';
        }

        // Rotate the top throne image
        topThroneImage.style.transform = 'rotate(180deg)';

        cells.forEach((cell, index) => {
            const row = Math.floor(index / 5);
            const col = index % 5;
            
            let coords = isWhite ? { x: col, y: 4 - row } : { x: 4 - col, y: row };
            let cellId = this.coordsToCellId(coords);
            cell.id = cellId;

            // Remove any existing cell-number or cell-letter spans
            const existingNumberSpan = cell.querySelector('.cell-number');
            const existingLetterSpan = cell.querySelector('.cell-letter');
            if (existingNumberSpan) existingNumberSpan.remove();
            if (existingLetterSpan) existingLetterSpan.remove();

            // Add number label to the upper left corner of leftmost column
            if (col === 0) { 
                const numberSpan = document.createElement('span');
                numberSpan.className = 'cell-number';
                numberSpan.textContent = cellId.split('-')[1];
                numberSpan.style.position = 'absolute';
                numberSpan.style.top = '2px';
                numberSpan.style.left = '2px';
                cell.appendChild(numberSpan);
            }

            // Add letter label to the lower right corner of bottom row
            if (row === 4) { 
                const letterSpan = document.createElement('span');
                letterSpan.className = 'cell-letter';
                letterSpan.textContent = cellId.split('-')[0];
                letterSpan.style.position = 'absolute';
                letterSpan.style.bottom = '2px';
                letterSpan.style.right = '2px';
                cell.appendChild(letterSpan);
            }

            // Ensure the cell has position: relative for absolute positioning of spans
            cell.style.position = 'relative';
        });
    }
    placeSacrificeIcon(pieceImage){
        const sacrificeIcon = document.createElement('img');
        sacrificeIcon.src = '/images/SacrificePieceIcon.svg';
        sacrificeIcon.className = 'sacrifice-icon';

        pieceImage.appendChild(sacrificeIcon);
    }
    createPieceImage(piece) {
        const div = document.createElement('div');
        div.style.backgroundImage = `url(${this.getPieceImageNameFromEngineFormat(piece)})`;
        div.className = 'game-piece';
        return div;
    }
    placeStashPieces(currentBoard){
        const inventorySlots = document.querySelectorAll('.inventory-slot');
        let slotIndex = 0;
        currentBoard.stash.forEach(pieceObj => {
            for (let i = 0; i < pieceObj.count; i++) {
                if (slotIndex < inventorySlots.length) {
                    const pieceImage = this.createPieceImage(pieceObj.piece);
                    inventorySlots[slotIndex].innerHTML = '';
                    inventorySlots[slotIndex].appendChild(pieceImage);
                    slotIndex++;
                }
            }
        });
        // Clear any remaining slots
        while (slotIndex < inventorySlots.length) {
            inventorySlots[slotIndex].innerHTML = '';
            slotIndex++;
        }
    }
    placeOnDeckPiece(currentBoard){
        if (currentBoard.onDeck) {
            const onDeckElement = document.querySelector('.on-deck-cell');
            // onDeckElement.innerHTML = '';
            onDeckElement.appendChild(this.createPieceImage(currentBoard.onDeck)); 
        }
    }
    placePiecesOnBoard(currentBoard){
        currentBoard.board.forEach((row, y) => {
            row.forEach((piece, x) => {
                if (piece) {
                    const cellId = this.coordsToCellId({ x, y });
                    const cell = document.getElementById(cellId);
                    if (cell) {
                        const pieceImage = this.createPieceImage(piece);
                        if (piece.type !== pieces.UNKNOWN && piece.type !== pieces.KING){
                            this.placeSacrificeIcon(pieceImage)
                        }
                        cell.appendChild(pieceImage);
                    }
                }
            });
        });
    }
    showLastMove(){
        let lastMove;
        let wasLastMoveLastAction = false;
        for (let i = this.board.actionHistory.length - 1; i >= 0; i--) {
            if (this.board.actionHistory[i].type === actions.MOVE) {
                lastMove = this.board.actionHistory[i];
                if(i>=this.board.actionHistory.length-2){wasLastMoveLastAction = true;}
                break;
            }
        }
        if (lastMove) {
            const startCellId = this.coordsToCellId({ x: lastMove.x1, y: lastMove.y1 });
            const startCell = document.getElementById(startCellId);
            const targetCellId = this.coordsToCellId({ x: lastMove.x2, y: lastMove.y2 });
            const targetCell = document.getElementById(targetCellId);
            if (startCell) {
                this.moveTypeHighlight('origin', startCell);
                this.addState('originHighlight');
            }
            if (targetCell){
                this.setSpeechBubbleImageType(lastMove.declaration);
                this.moveSpeechBubbleToTarget(targetCell);
                if(wasLastMoveLastAction){
                    this.addState('leftSpeechBubble');
                } 
                // else {
                //     this.removeState('leftSpeechBubble');
                // }
            }
        }
        return lastMove;
    }
    showLastAction(lastMove){
        let lastAction = this.board.actionHistory[this.board.actionHistory.length - 1];
        if (!lastAction){return;}
        const wasMyAction = lastAction.player === this.board.color;
        if (lastAction.type === actions.MOVE){return;}
        const priorAction = this.board.actionHistory[this.board.actionHistory.length - 2];
        if (lastAction.type === actions.CHALLENGE){
            this.showChallenge(wasMyAction,lastMove,priorAction,lastAction)
        } else if (lastAction.type === actions.BOMB){
            this.showBomb(wasMyAction,priorAction,lastAction)
        }
        return lastAction;
    }
    showBomb(wasMyAction,lastMove,lastAction){
        const targetCell = document.getElementById(this.coordsToCellId({x: lastMove.x2, y: lastMove.y2}))
        if(wasMyAction){
            this.setSpeechBubbleImageType(lastAction.declaration);
            this.moveSpeechBubbleToTarget(targetCell);
            this.setState('playerBomb');
        } else {
            this.setSpeechBubbleImageType(lastAction.declaration);
            this.moveSpeechBubbleToTarget(targetCell);
            this.setState('opponentBomb');
        }
        this.addState('originHighlight');
    }
    showChallenge(wasMyAction,lastMove,challengedAction,lastAction){
        if(wasMyAction){
            this.addState('playerChallenge');
        } else {
            this.addState('opponentChallenge');
        }
        const coords = {x: lastMove.x2, y: lastMove.y2} ;
        const targetCell = document.getElementById(this.coordsToCellId(coords));
        this.moveTypeHighlight('challenge',targetCell);
        this.removeState('leftSpeechBubble');
        if (!lastAction.wasSuccessful){
            const floatingGamePiece = document.getElementById('floating-game-piece');
                floatingGamePiece.src = this.getPieceImageNameFromEngineFormat({color: challengedAction.player, type: challengedAction.declaration});
                targetCell.appendChild(floatingGamePiece);
                this.setSpeechBubbleImageType(challengedAction.declaration);
                if (wasMyAction){
                    this.addState('floatingGamePiece');
                }
            if(lastAction.player === this.board.color){//we failed the challenge, and it's our turn to sacrifice
                this.audio.doSFX('challengeFail')
                this.changeTypeHighlightColor('challenge',highlightColors.RED);
            } else {
                this.audio.doSFX('challengeSuccess')
                this.changeTypeHighlightColor('challenge',highlightColors.BLUE);
            }
        } else { //Challenge was successful, and the piece is removed.
            if(lastAction.player === this.board.color){ //the challenge was successful, and it's our turn to move
                this.audio.doSFX('challengeSuccess')
                this.changeTypeHighlightColor('challenge',highlightColors.BLUE);
            } else { //the challenge was successful, but it's not our turn to move
                this.audio.doSFX('challengeFail')
                this.changeTypeHighlightColor('challenge',highlightColors.RED);
            }
        }
    }
    setBoardPieces(currentBoard) {
        this.removeAllPieces();
        this.placeStashPieces(currentBoard);
        this.placeOnDeckPiece(currentBoard);
        this.placePiecesOnBoard(currentBoard);
        const lastMove = this.showLastMove();
        this.showLastAction(lastMove);
        this.showCapturedPieces();
        this.updateUI();
    }
    showCapturedPieces(){
        const capturedPieces = this.board.captured;

        const lostPieces = document.querySelectorAll('.lost-piece');
        lostPieces.forEach(piece => {
            piece.style.backgroundImage = 'none';
            piece.style.border = 'none'; // Remove any border
        });

        let opponentLostPiecesCount = 0;
        let playerLostPiecesCount = 0;
        capturedPieces.forEach((piece) => { 
            const pieceImageURL = this.getPieceImageNameFromEngineFormat(piece)
            if (piece.color === this.board.color) {
                playerLostPiecesCount++;
                const lostPieceSlot = document.getElementById(`player-lost-piece-${playerLostPiecesCount}`);
                lostPieceSlot.style.backgroundImage = `url(${pieceImageURL})`;
            } else {
                opponentLostPiecesCount++;
                const lostPieceSlot = document.getElementById(`opponent-lost-piece-${opponentLostPiecesCount}`);
                lostPieceSlot.style.backgroundImage = `url(${pieceImageURL})`;
            }
        });
    }
    setSpeechBubbleImageType(declaration){
        const leftBubble = document.getElementById('left-speech-bubble');
        leftBubble.src = `/images/BubbleSpeechLeft${pieceTypeNames[declaration]}.svg`;
    }
    moveTypeHighlight(type,cell){
        const highlight = document.getElementById(`${type}-highlight`);
        cell.appendChild(highlight); 
    }   
    changeTypeHighlightColor(type,color){
        const highlight = document.getElementById(`${type}-highlight`);
        highlight.style.backgroundColor = color;
    }
    startClockTick(clockToStart) {
        
        const updateClock = (clockElement, isPlayer) => {
            const startTime = performance.now();
            let initialTime;
            
            if (this.board.phase === 'setup') {
                initialTime = isPlayer ? this.board.mySetupTimeRemaining : this.board.opponentSetupTimeRemaining;
            } else {
                initialTime = isPlayer ? this.playerTime : this.opponentTime;
            }
            
            const tick = (currentTime) => {
                const elapsedTime = currentTime - startTime;
                const totalTime = initialTime + elapsedTime;
                
                if (isPlayer) {
                    this.playerTime = totalTime;
                } else {
                    this.opponentTime = totalTime;
                }
                
                let remainingTime;
                if (this.board.phase === 'setup') {
                    remainingTime = Math.max(0, (isPlayer ? this.board.mySetupTimeRemaining : this.board.opponentSetupTimeRemaining) - elapsedTime);
                } else {
                    remainingTime = Math.max(0, this.board.clocks[isPlayer ? this.board.color : 1 - this.board.color] - totalTime);
                }
                
                clockElement.textContent = this.formatTime(remainingTime);
                
                if (remainingTime > 0) {
                    this[isPlayer ? 'playerAnimationId' : 'opponentAnimationId'] = requestAnimationFrame(tick);
                } else {
                    this.stopClockTick(isPlayer ? 'player' : 'opponent');
                }
            };
            
            return requestAnimationFrame(tick);
        };

        const playerClockElement = document.getElementById('player-clock-time');
        const opponentClockElement = document.getElementById('opponent-clock-time');

        if ((clockToStart === 'player' || clockToStart === 'both') && !this.playerClockTicking) {
            this.playerClockTicking = true;
            this.playerAnimationId = updateClock(playerClockElement, true);
            playerClockElement.classList.add('clock-highlight');
        }
        if ((clockToStart === 'opponent' || clockToStart === 'both') && !this.opponentClockTicking) {
            this.opponentClockTicking = true;
            this.opponentAnimationId = updateClock(opponentClockElement, false);
            opponentClockElement.classList.add('clock-highlight');
        }
        // if (clockToStart !== 'both') {
        //     const otherClock = clockToStart === 'player' ? opponentClockElement : playerClockElement;
        //     otherClock.classList.remove('clock-highlight');
        // }
    }
    stopClockTick(clockToStop) {
        const playerClockElement = document.getElementById('player-clock-time');
        const opponentClockElement = document.getElementById('opponent-clock-time');

        if (clockToStop === 'player' || clockToStop === 'both') {
            this.playerClockTicking = false;
            cancelAnimationFrame(this.playerAnimationId);
            this.playerAnimationId = null;
            playerClockElement.classList.remove('clock-highlight');
        }
        if (clockToStop === 'opponent' || clockToStop === 'both') {
            this.opponentClockTicking = false;
            cancelAnimationFrame(this.opponentAnimationId);
            this.opponentAnimationId = null;
            opponentClockElement.classList.remove('clock-highlight');
        }
    }
    updateNames() {
        document.getElementById('player-name').textContent = this.username;
        document.getElementById('opponent-name').textContent = this.opponentName;
    }
    updateClocks() {
        const playerClockElement = document.getElementById('player-clock-time');
        const opponentClockElement = document.getElementById('opponent-clock-time');

        playerClockElement.classList.remove('white-clock', 'black-clock');
        opponentClockElement.classList.remove('white-clock', 'black-clock');

        const playerColor = this.board.color === 0 ? 'white' : 'black';
        const opponentColor = this.board.color === 0 ? 'black' : 'white';

        playerClockElement.classList.add(`${playerColor}-clock`);
        opponentClockElement.classList.add(`${opponentColor}-clock`);

        this.playerTime = 0;
        this.opponentTime = 0;

        playerClockElement.textContent = this.formatTime(this.board.clocks[this.board.color]);
        opponentClockElement.textContent = this.formatTime(this.board.clocks[1 - this.board.color]);
    }
    resetClocks() {
        const playerClockElement = document.getElementById('player-clock-time');
        const opponentClockElement = document.getElementById('opponent-clock-time');
        playerClockElement.textContent = this.formatTime(0);
        opponentClockElement.textContent = this.formatTime(0);
        
    }
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (seconds < 10) {
            const hundredths = Math.floor((milliseconds % 1000) / 10);
            return `${seconds}.${hundredths.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
    }
}

function toggleOptionsMenu(event) {
    var optionsMenu = document.getElementById('options-menu');
    optionsMenu.style.display = (optionsMenu.style.display === 'none' || optionsMenu.style.display === '') ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', function() {
    var menuButton = document.getElementById('menu-button-image');
    menuButton.addEventListener('click', toggleOptionsMenu);

});