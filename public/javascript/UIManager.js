class UIManager {
    constructor(webSocketManager) {
        this.webSocketManager = webSocketManager;
        this.username;
        this.color;
        this.opponentName;
        this.board = null;
        this.allElements = ['lobby-container','name-entry','game-picker'
            ,'play-button','custom-options','ai-difficulty','cancel-button'
            ,'bomb-button','challenge-button','ready-button']
        this.currentState = [];
        this.currentActions = [];
        this.draggedPiece = null;
        this.originalParent = null;
        this.playerTime=0;
        this.opponentTime=0;
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
    updateUI(){
        //hide all elements
        this.allElements.forEach(element => {
            document.getElementById(element).style.display = 'none';
            // Remove all highlight classes from cell, on-deck, and inventory elements
            document.querySelectorAll('.cell, .on-deck-cell, .inventory-slot').forEach(element => {
                const classesToRemove = Array.from(element.classList).filter(className => className.startsWith('highlight'));
                element.classList.remove(...classesToRemove);
        });
        });
        //show elements that are in the current state
        this.currentState.forEach(state => {
            this.states[state].visible.forEach(indicatorString => {
                const visibbleElement = document.getElementById(indicatorString)
                if(visibbleElement){
                    visibbleElement.style.display = 'block';
                } else {
                    console.log(`${indicatorString} for highlighting`);
                    // Apply appropriate highlight CSS for states containing "highlight"
                    if (indicatorString.includes('highlight')) {
                        const [elementClass, highlightType] = indicatorString.split('-highlight-');
                        const elements = document.querySelectorAll(`.${elementClass}`);
                        elements.forEach(element => {
                            if (highlightType === 'gold') {
                                element.classList.add('highlighted-cell-gold');
                            } else if (highlightType === 'red') {
                                element.classList.add('highlighted-cell-red');
                            }
                        });
                    }   
                } 
            });
        });


        //remove actions that are in the current state
        this.currentActions = [];
        //add actions that are in the current state
        this.currentState.forEach(state => {
            this.states[state].actions.forEach(action => {
                this.currentActions.push(action);
            });
        });
        console.log(this)
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

                document.addEventListener('mousemove', this.movePiece.bind(this));
                document.addEventListener('mouseup', this.releasePiece.bind(this));
            }
        }
    }

    movePiece(e) {
        if (this.draggedPiece) {
            const newLeft = e.clientX;
            const newTop = e.clientY;
            this.draggedPiece.style.left = `${newLeft}px`;
            this.draggedPiece.style.top = `${newTop}px`;
        }
    }

    releasePiece(e) {
        if (this.draggedPiece) {
            // Temporarily hide the dragged piece to see what's behind it
            this.draggedPiece.style.display = 'none';
            
            let target = document.elementFromPoint(e.clientX, e.clientY);
            // Make the dragged piece visible again
            this.draggedPiece.style.display = 'block';

            const originalLocation = this.getLocation(this.originalParent);
            const targetLocation = this.getLocation(target);

            if (target && (target.classList.contains('cell') || 
                target.classList.contains('on-deck-cell')    || 
                target.classList.contains('inventory-slot')  || 
                target.classList.contains('game-piece'))) {
                
                const moveAction = `move-${originalLocation}-to-${targetLocation}`;
                
                if (this.currentActions.includes(moveAction)) {
                    if (this.currentActions.includes('swap') && target.classList.contains('game-piece')) {
                        let targetPiece = target;
                        target = targetPiece.parentElement;
                        this.originalParent.appendChild(targetPiece);
                        target.appendChild(this.draggedPiece);
                    } else if (target.classList.contains('game-piece')) {
                        //don't append to another piece
                        this.originalParent.appendChild(this.draggedPiece);
                    } else {
                        target.appendChild(this.draggedPiece);
                    }
                    this.resetPieceStyle();
                } else {
                    // Return to original parent if move is not allowed
                    this.originalParent.appendChild(this.draggedPiece);
                    this.resetPieceStyle();
                }
            } else {
                // Return to original parent
                this.originalParent.appendChild(this.draggedPiece);
                this.resetPieceStyle();
            }

            // Clean up
            document.removeEventListener('mousemove', this.movePiece);
            document.removeEventListener('mouseup', this.releasePiece);
            this.draggedPiece.classList.remove('selected');
            this.draggedPiece = null;
            this.originalParent = null;
            this.postMoveState();
        }
    }

    getLocation(element) {
        if (element.classList.contains('cell')) {
            return 'board';
        } else if (element.classList.contains('on-deck-cell')) {
            return 'on-deck';
        } else if (element.classList.contains('inventory-slot')) {
            return 'stash';
        } else if (element.classList.contains('game-piece')) {
            return this.getLocation(element.parentElement);
        }
        return 'unknown';
    }
    postMoveState(){
        this.checkReadyState();
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
    ready(params){
        // Stop the current player's clock
        this.stopClockTick('player');
        this.setState('ready');
        // Generate JSON object with piece positions
        const piecePositions = {
            frontRow: {},
            onDeck: null
        };
        // Get front row squares
        const frontRowSquares = document.querySelectorAll('.first-row');
        frontRowSquares.forEach(square => {
            const pieceElement = square.querySelector('.game-piece');
            if (pieceElement) {
                piecePositions.frontRow[square.id] = pieceElement.alt.replace('.svg', '').replace('Pawn', '');
            }
        });

        // Get on-deck cell
        const onDeckCell = document.querySelector('.on-deck-cell');
        const onDeckPiece = onDeckCell.querySelector('.game-piece');
        if (onDeckPiece) {
            piecePositions.onDeck = onDeckPiece.alt.replace('.svg', '').replace('Pawn', '');
        }
        console.log(piecePositions);
        // Route message with type "ready" and the piece positions
        this.webSocketManager.routeMessage({
            type: 'submit-setup',
            piecePositions: piecePositions
        });
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
        this.opponentName = this.board.opponentName;
        this.updateBoardUI();
        this.setupPieceMovement();
    }
    endGame() {
        // Reset game selection to default empty value
        document.getElementById('game-selection').value = "";
        this.stopClockTick('both');
        this.resetClocks();
        this.board = null;
        this.opponentName = null;
    }

    updateBoardUI() {
        this.updateNames();
        this.updateClocks();
        this.startClockTick();
        this.setBoardSpaceLabels()
        this.setBoardPieces();
        this.updateLegalGameActions();
        // Add more UI update methods as needed
    }
    updateLegalGameActions(){
        this.board.legalActions.forEach(action => {
            this.addState(action);
        });
        this.updateUI();
    }
    setBoardPieces(){
        // Clear the board of any existing pieces, except for crown images
        const cells = document.querySelectorAll('.board .cell');
        ////////////////////////////////////
        cells.forEach(cell => {
            const pieceImage = cell.querySelector('.piece-image');
            if (pieceImage) {
                cell.removeChild(pieceImage);
            }
        });

        // Function to create and append piece image
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
            onDeckElement.appendChild(createPieceImage(`${color}${this.board.onDeck.type}`));
        }

        // Add pieces to the board
        this.board.board.forEach((row, y) => {
            row.forEach((piece, x) => {
                if (piece) {
                    const cell = document.getElementById(`${String.fromCharCode(65 + x)}${5 - y}`);
                    if (cell) {
                        const pieceImage = createPieceImage(piece);
                        cell.appendChild(pieceImage);
                    }
                }
            });
        });
    }

    setBoardSpaceLabels() {
        const cells = document.querySelectorAll('.board .cell');
        const isWhite = this.board.color === 0;
        const letters = ['A', 'B', 'C', 'D', 'E'];
        const numbers = ['5', '4', '3', '2', '1'];

        cells.forEach((cell, index) => {
            const row = Math.floor(index / 5);
            const col = index % 5;
            
            let letter, number;
            if (isWhite) {
                letter = letters[col];
                number = numbers[row];
            } else {
                letter = letters[4 - col];
                number = numbers[4 - row];
            }
            cell.id = `${letter}-${number}`;
            // Remove any existing cell-number or cell-letter spans
            const existingNumberSpan = cell.querySelector('.cell-number');
            const existingLetterSpan = cell.querySelector('.cell-letter');
            if (existingNumberSpan) existingNumberSpan.remove();
            if (existingLetterSpan) existingLetterSpan.remove();

            // Add number label to the upper left corner of leftmost column
            if (col === 0 ) { 
                const numberSpan = document.createElement('span');
                numberSpan.className = 'cell-number';
                numberSpan.textContent = number;
                numberSpan.style.position = 'absolute';
                numberSpan.style.top = '2px';
                numberSpan.style.left = '2px';
                cell.appendChild(numberSpan);
            }

            // Add letter label to the lower right corner of bottom row
            if (row === 4) { 
                const letterSpan = document.createElement('span');
                letterSpan.className = 'cell-letter';
                letterSpan.textContent = letter;
                letterSpan.style.position = 'absolute';
                letterSpan.style.bottom = '2px';
                letterSpan.style.right = '2px';
                cell.appendChild(letterSpan);
            }

            // Ensure the cell has position: relative for absolute positioning of spans
            cell.style.position = 'relative';
        });
    }

    startClockTick() {
        this.stopClockTick('both');
        
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

        if (this.board.phase === "setup") {
            this.playerAnimationId = updateClock(playerClockElement, true);
            this.opponentAnimationId = updateClock(opponentClockElement, false);
            playerClockElement.classList.add('clock-highlight');
            opponentClockElement.classList.add('clock-highlight');
        } else if (this.board.myTurn) {
            this.playerAnimationId = updateClock(playerClockElement, true);
            playerClockElement.classList.add('clock-highlight');
            opponentClockElement.classList.remove('clock-highlight');
        } else {
            this.opponentAnimationId = updateClock(opponentClockElement, false);
            playerClockElement.classList.remove('clock-highlight');
            opponentClockElement.classList.add('clock-highlight');
        }
    }

    stopClockTick(clockToStop) {
        const playerClockElement = document.getElementById('player-clock-time');
        const opponentClockElement = document.getElementById('opponent-clock-time');

        if (clockToStop === 'player' || clockToStop === 'both') {
            cancelAnimationFrame(this.playerAnimationId);
            this.playerAnimationId = null;
            playerClockElement.classList.remove('clock-highlight');
        }
        if (clockToStop === 'opponent' || clockToStop === 'both') {
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

        this.startClockTick(); // Start the clocks after updating
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
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}