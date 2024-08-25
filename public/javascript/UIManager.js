class UIManager {
    constructor(webSocketManager) {
        this.webSocketManager = webSocketManager;
        this.username;
        this.color;
        this.opponentName;
        this.board = null;
        this.allVisibles = ['first-row-highlight-gold', 'on-deck-cell-highlight-gold'
            , 'lobby-container','name-entry','game-picker'
            ,'play-button','custom-options','ai-difficulty','cancel-button'
            ,'bomb-button','challenge-button','ready-button'
            ,'left-speech-bubble','right-speech-bubble','left-thought-bubble','right-thought-bubble']
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
                visible: ['first-row-highlight-gold', 'on-deck-cell-highlight-gold'],
                actions: ['swap','select-board-piece', 'select-on-deck-piece', 'select-stash-piece'  
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
            readyable:{
                visible: ['ready-button'],
                actions: ['ready']
            },
            ready:{
                visible: [],
                actions: []
            },
            sacrifice:{
                visible: [],
                actions: ['sacrifice']
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
            rightSpeechBubble:{
                visible: ['right-speech-bubble'],
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
            } else {
                this.setElementHighlights(visName);
            }
        });        
        // console.log(this)
    }
    setupPieceMovement() {
        // Remove all existing event listeners from game pieces
        const gamePieces = document.querySelectorAll('.game-piece');
        gamePieces.forEach(piece => {
            piece.removeEventListener('mousedown', this.handleMouseDown);
            piece.removeEventListener('mousemove', this.movePiece);
            piece.removeEventListener('mouseup', this.releasePiece);
        });
        // Add event listeners to game pieces
        gamePieces.forEach(piece => {
            piece.addEventListener('mousedown', this.handleMouseDown.bind(this));
        });
    }
    handleMouseDown(e) {
        this.draggedPiece = null;
        if (e.target.classList.contains('game-piece')) {
            const parentElement = e.target.parentElement;
            let canSelectPiece = false;

            // Check if the piece is the correct color
            const pieceColor = e.target.src.includes('White') ? 'White' : 'Black';
            const isPlayerPiece = (this.board.color === 0 && pieceColor === 'White') || (this.board.color === 1 && pieceColor === 'Black');

            if (!isPlayerPiece) {
                return; // Don't allow selection of opposite color pieces
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
                this.originalParent = this.draggedPiece.parentElement;
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
            }
        }
    }
    getLegalMovePieceList(startCellId, targetCellId){
        const legalMovePieces = [];
        ['King', 'Knight', 'Bishop', 'Rook'].forEach(pieceType => {
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
    displayLegalMoves(legalMovePieces, type,targetPiece){
        // Remove all elements of class "declaration"
        this.removeState('leftSpeechBubble');
        this.removeState('rightSpeechBubble');
        this.removeState('leftThoughtBubble');
        this.removeState('rightThoughtBubble');
        if (legalMovePieces.length > 2) {
            console.log(`Error: Too many legal moves - ${legalMovePieces}`);
            return;
        }
        legalMovePieces.forEach((pieceType, index) => {
            const facing = index === 0 ? 'left' : 'right';
            const bubbleImage = document.getElementById(`${facing}-${type.toLowerCase()}-bubble`);
            bubbleImage.src = `/images/Bubble${type}${facing.charAt(0).toUpperCase() + facing.slice(1)}${pieceType}.svg`;

            // Position the bubble relative to the dragged piece
            const pieceRect = targetPiece.getBoundingClientRect();
            const offsetTop = 60; // Adjust this value based on your image size
            const offsetSide = 72.5;
            
            if (index === 0) {
                // Left bubble: up and to the left
                bubbleImage.style.left = `${pieceRect.left - offsetSide}px`;
                bubbleImage.style.top = `${pieceRect.top - offsetTop}px`;
            } else {
                // Right bubble: up and to the right
                bubbleImage.style.left = `${pieceRect.right - offsetSide}px`;
                bubbleImage.style.top = `${pieceRect.top - offsetTop}px`;
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
        if (targetPiece) { // cannot move onto your own pieces.
            const targetPieceColor = (targetPiece.includes('White') ? 'White' : 'Black');
            if (targetPiece && targetPieceColor === this.color) {
                return false;
            }
        }
        // Check for piece-specific movement rules
        switch (pieceType) {
            case 'Rook':
                if (startCoords.x !== targetCoords.x && startCoords.y !== targetCoords.y) {
                    return false; // Rook can only move in straight lines
                }
                return this.isPathClear(startCoords, targetCoords);
            case 'Bishop':
                if (Math.abs(targetCoords.x - startCoords.x) !== Math.abs(targetCoords.y - startCoords.y)) {
                    return false; // Bishop can only move diagonally
                }
                return this.isPathClear(startCoords, targetCoords);
            case 'King':
                // King can move one square in any direction
                return Math.abs(targetCoords.x - startCoords.x) <= 1 && Math.abs(targetCoords.y - startCoords.y) <= 1;
            case 'Knight':
                // Knight moves in an L-shape
                return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
            default:
                return false;
        }
    }

    getPieceType(pieceElement) {
        const src = pieceElement.src;
        if (src.includes('Rook')) return 'Rook';
        if (src.includes('Bishop')) return 'Bishop';
        if (src.includes('King')) return 'King';
        if (src.includes('Knight')) return 'Knight';
        return null;
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
        this.removeState('leftSpeechBubble');
        this.removeState('rightSpeechBubble');
        this.removeState('leftThoughtBubble');
        this.removeState('rightThoughtBubble');
        if (!this.draggedPiece) return;

        const target = this.getTargetElement(e);
        const originalLocation = this.getLocationType(this.originalParent);
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
            const moveAction = `move-${originalLocation}-to-${targetLocationType}`;
            if (this.currentActions.includes(moveAction) && isLegalityPassed) {
                this.handleValidPieceDrop(target,legalMovePieces);
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
        const targetPiece = target.querySelector('.game-piece');
        this.targetCell = target;
        if (this.canSwap(target) && targetPiece) {
            this.swapPieces(target, targetPiece);
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
        const leftBubble = document.getElementById('left-speech-bubble');
        leftBubble.src = `/images/BubbleSpeechLeft${declarationType}.svg`;
        console.log(`Displaying: ${leftBubble.src}`);
        this.setState('moveComplete');
        this.addState('leftSpeechBubble');
        this.updateUI();
        // Send move information to the server
        const targetId = this.targetCell.id;
        const originalId = this.originalParent.id;
        const moveData = {
            originalId: originalId,
            targetId: targetId,
            declaration: declarationType
        };
        this.stopClockTick('player');
        this.startClockTick('opponent');
        this.webSocketManager.routeMessage({type:'action', action:'move', data:moveData});
        this.cleanupAfterMove();
    }
    handleValidMove(target,legalMovePieces) {
        this.moveSpeechBubblesToTarget(target);
        if (legalMovePieces.length === 1) {
            this.completeMove(legalMovePieces[0]);
        } else if (legalMovePieces.length > 1) {
            this.setState('movePlaced');
            const leftBubble = document.getElementById('left-thought-bubble');
            const rightBubble = document.getElementById('right-thought-bubble');
            leftBubble.src = `/images/BubbleThoughtLeft${legalMovePieces[0]}.svg`;
            rightBubble.src = `/images/BubbleThoughtRight${legalMovePieces[1]}.svg`;
            this.addState('leftThoughtBubble');
            this.addState('rightThoughtBubble');
            this.updateUI();
        }
    }
    moveSpeechBubblesToTarget(target){
        const targetRect = target.getBoundingClientRect();
        const leftBubble = document.getElementById('left-speech-bubble');
        const rightBubble = document.getElementById('right-speech-bubble');
        leftBubble.style.left = `${targetRect.left - 73}px`;
        leftBubble.style.top = `${targetRect.top - 60}px`;
        rightBubble.style.left = `${targetRect.right - 73}px`;
        rightBubble.style.top = `${targetRect.top - 60}px`;
    }

    canSwap(target) {
        return this.currentActions.includes('swap') && 
               target.querySelector('.game-piece');
    }
    swapPieces(target, targetPiece) {
        let targetPieceColor = targetPiece.src.includes('White') ? 'White' : 'Black';
        let draggedPieceColor = this.draggedPiece.src.includes('White') ? 'White' : 'Black';
        
        if (targetPieceColor === draggedPieceColor) {
            this.originalParent.appendChild(targetPiece);
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
            const piece = cell.querySelector('.game-piece');
            return piece && piece.src.includes('King');
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
        document.getElementById('left-thought-bubble').addEventListener('click', () => {
            this.doAction('declareMove','left-thought-bubble')
        });
        document.getElementById('right-thought-bubble').addEventListener('click', () => {
            this.doAction('declareMove','right-thought-bubble')
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
        const imageSrc = bubbleElement.src;
        const pieceType = imageSrc.split('BubbleThought')[1].split('.')[0].replace(/Left|Right/, '');
        console.log(`Declared Piece Type: ${pieceType}`);
        this.legalActions = [pieceType];
        this.completeMove(pieceType);
    }
    ready(params){
        // Stop the current player's clock
        this.stopClockTick('player');
        this.setState('ready');
        // Generate JSON object with piece positions
        let frontRow = {}
        let onDeck = null

        // Get front row squares
        const frontRowSquares = document.querySelectorAll('.first-row');
        frontRowSquares.forEach(square => {
            const pieceElement = square.querySelector('.game-piece');
            if (pieceElement) {
                frontRow[square.id] = pieceElement.alt.replace('.svg', '').replace('Pawn', '');
            }
        });

        // Get on-deck cell
        const onDeckCell = document.querySelector('.on-deck-cell');
        const onDeckPiece = onDeckCell.querySelector('.game-piece');
        if (onDeckPiece) {
            onDeck = onDeckPiece.alt.replace('.svg', '').replace('Pawn', '');
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
        console.log(`~~~~~~~~~~~~~~~~~my color is ${this.color}`)
        const opponentColor = this.color === 'White' ? 'Black' : 'White';
        
        backRowSquares.forEach(square => {
            const pieceElement = document.createElement('img');
            pieceElement.src = `images/Pawn${opponentColor}Front.svg`;
            pieceElement.alt = `Pawn${opponentColor}Front`;
            pieceElement.classList.add('game-piece');
            
            // Remove any existing piece in the square
            const existingPiece = square.querySelector('.game-piece');
            if (existingPiece) {
                square.removeChild(existingPiece);
            }
            
            square.appendChild(pieceElement);
        });

        console.log(`Opponent setup complete. Back row filled with ${opponentColor} pawns.`);
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
    playAI(){
        alert('Sorry, AI is not implemented yet!');
    }
    //Board State
    updateBoardState(data){
        this.setState('boardState');
        console.log(data.board);
        this.board = data.board;
        this.color = data.board.color === 0 ? 'White' : 'Black';
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
        this.clearBoard();
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
            } else {
                this.startClockTick('opponent');
        }
        }
    }
    updateBoardUI() {
        this.updateNames();
        this.updateClocks();
        this.startCorrectClocks();
        this.setBoardSpaceLabels()
        this.setBoardPieces();
        this.updateLegalGameActions();
    }
    updateLegalGameActions(){
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
    setBoardPieces() {
        this.removeAllPieces();
        const createPieceImage = (piece) => {
            const img = document.createElement('img');
            img.src = `images/Pawn${piece}.svg`;
            img.alt = `Pawn${piece}.svg`;
            img.className = 'game-piece';
            return img;
        };

        // Add pieces to the inventory
        const inventorySlots = document.querySelectorAll('.inventory-slot');
        let slotIndex = 0;
        this.board.stash.forEach(pieceObj => {
            for (let i = 0; i < pieceObj.count; i++) {
                if (slotIndex < inventorySlots.length) {
                    const pieceImage = createPieceImage(pieceObj.piece);
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

        // Add piece to onDeck if present
        if (this.board.onDeck) {
            const onDeckElement = document.querySelector('.on-deck-cell');
            onDeckElement.innerHTML = '';
            const color = this.board.onDeck.color === this.board.color ? 'White' : 'Black';
            onDeckElement.appendChild(createPieceImage(this.board.onDeck)); 
        }

        // Add pieces to the board
        this.board.board.forEach((row, y) => {
            row.forEach((piece, x) => {
                if (piece) {
                    const cellId = this.coordsToCellId({ x, y });
                    const cell = document.getElementById(cellId);
                    if (cell) {
                        const pieceImage = createPieceImage(piece);
                        cell.appendChild(pieceImage);
                    }
                }
            });
        });
    }
    startClockTick(clockToStart) {
        
        const updateClock = (clockElement, isPlayer) => {
            const startTime = performance.now();
            const initialTime = isPlayer ? this.playerTime : this.opponentTime;
            
            const tick = (currentTime) => {
                const elapsedTime = currentTime - startTime;
                const totalTime = initialTime + elapsedTime;
                
                if (isPlayer) {
                    this.playerTime = totalTime;
                } else {
                    this.opponentTime = totalTime;
                }
                
                const remainingTime = Math.max(0, this.board.clocks[isPlayer ? this.board.color : 1 - this.board.color] - totalTime);
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
        this.playerTime = 0;
        this.opponentTime = 0;
        playerClockElement.textContent = this.formatTime(this.board.clocks[this.board.color]);
        opponentClockElement.textContent = this.formatTime(this.board.clocks[1 - this.board.color]);
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