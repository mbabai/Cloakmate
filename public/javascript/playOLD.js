document.addEventListener('DOMContentLoaded', function() {

    // Create a new WebSocket.
    const socket = new WebSocket('ws://localhost:3000');

    // Connection opened
    socket.addEventListener('open', function (event) {
        socket.send(JSON.stringify({type:"Server",message:"Server Open"})); // Send a message to the server
        setupGameFromUrl();
    });

    // Listen for messages
    socket.addEventListener('message', function (event) {
        const data = JSON.parse(event.data);
        console.log('Message from server:');
        console.log(data)
        switch (data.type){
            case "opponent-disconnect":
                alert("Opponent Disconnected. \nYou win!")
                returnToLobby()
                break;
            case "game-not-exist":
                alert("Game does not exist or is over!")
                returnToLobby()
                break;
            case "opponent-ready":
                setupOpponentPieces(data.opponentColor);
                stopClock(leftClockTimer);
                document.getElementById('left-clock-time').classList.remove('clock-highlight');
                enableSetupPhase(); // Add this line to enable setup phase
                break;
            case "game-state":
                updateBoardWithState(data.gameState);
                playBoard(data.gameState)
                break;
            default:
                break;
        }
    });

    // Listen for possible errors
    socket.addEventListener('error', function (event) {
        console.error('WebSocket error: ', event);
    });

    // Listen for close
    socket.addEventListener('close', function (event) {
        console.log('WebSocket connection closed');
    });

    window.toggleButtons = function() { //Hide and show the buttons
        var bombButton = document.getElementById('bomb-button');
        var challengeButton = document.getElementById('challenge-button');

        // Toggle the display style
        bombButton.style.display = bombButton.style.display === 'none' ? 'block' : 'none';
        challengeButton.style.display = challengeButton.style.display === 'none' ? 'block' : 'none';
    };
    toggleButtons();    

    let myName; //Will use this globally later
    let myGameLength; // Will use this globally later
    let myColor;
    let myGameStart;
    let myStatus = 'setup';
    const gamePieces = document.querySelectorAll('.game-piece');
    const dropTargets = document.querySelectorAll('.cell, .inventory-slot, .on-deck-cell');
    const bottomRowCells = document.querySelectorAll('.board .cell:nth-last-child(-n+5)'); // Correctly selecting the bottom row
    const onDeckCell = document.querySelector('.on-deck-cell');
    const inventorySlots = document.querySelectorAll('.inventory-slot'); // Ensure this selects all inventory slots
    let selectedPiece = null; // To keep track of the currently selected piece
    
    let leftClockTimer = startClock('left-clock-time', 30);
    let rightClockTimer = startClock('right-clock-time', 30);

    gamePieces.forEach(piece => {
        piece.addEventListener('dragstart', handleDragStart);
    });

    dropTargets.forEach(target => {
        target.addEventListener('dragover', handleDragOver);
        target.addEventListener('drop', handleSetupDrop);
    });

    const nameToCoordinate = {
        'A-1': {x: 0, y: 0}, 'B-1': {x: 1, y: 0}, 'C-1': {x: 2, y: 0}, 'D-1': {x: 3, y: 0}, 'E-1': {x: 4, y: 0},
        'A-2': {x: 0, y: 1}, 'B-2': {x: 1, y: 1}, 'C-2': {x: 2, y: 1}, 'D-2': {x: 3, y: 1}, 'E-2': {x: 4, y: 1},
        'A-3': {x: 0, y: 2}, 'B-3': {x: 1, y: 2}, 'C-3': {x: 2, y: 2}, 'D-3': {x: 3, y: 2}, 'E-3': {x: 4, y: 2},
        'A-4': {x: 0, y: 3}, 'B-4': {x: 1, y: 3}, 'C-4': {x: 2, y: 3}, 'D-4': {x: 3, y: 3}, 'E-4': {x: 4, y: 3},
        'A-5': {x: 0, y: 4}, 'B-5': {x: 1, y: 4}, 'C-5': {x: 2, y: 4}, 'D-5': {x: 3, y: 4}, 'E-5': {x: 4, y: 4}
    };
    
    const coordinateToName = {
        '00': 'A-1', '10': 'B-1', '20': 'C-1', '30': 'D-1', '40': 'E-1',
        '01': 'A-2', '11': 'B-2', '21': 'C-2', '31': 'D-2', '41': 'E-2',
        '02': 'A-3', '12': 'B-3', '22': 'C-3', '32': 'D-3', '42': 'E-3',
        '03': 'A-4', '13': 'B-4', '23': 'C-4', '33': 'D-4', '43': 'E-4',
        '04': 'A-5', '14': 'B-5', '24': 'C-5', '34': 'D-5', '44': 'E-5'
    };
    

    function updateBoardWithState(gameState) {
        console.log("updating board with state")
        const boardCells = document.querySelectorAll('.board .cell');
        const onDeckCell = document.querySelector('.on-deck-cell');
        const stashSlots = document.querySelectorAll('.inventory-slot'); // Assuming there are designated slots in the HTML for stash
    
        // Clear existing pieces from the board, on-deck, and stash
        boardCells.forEach(cell => cell.innerHTML = '');
        onDeckCell.innerHTML = '';
        stashSlots.forEach(slot => slot.innerHTML = ''); // Clear all stash slots
    
        // Place new pieces on the board based on the state
        //TODO--------------------------------
        gameState.board.forEach((row, rowIndex) => {
            row.forEach((piece, colIndex) => {
                if (piece) {
                    const cell = document.querySelector(`[data-position="${coordinateToName[colIndex.toString()+rowIndex.toString()]}"]`);
                    const img = document.createElement('img');
                    img.src = `/images/Pawn${piece}.svg`; // Adjust the path if your images are named differently
                    img.className = 'game-piece';
                    cell.appendChild(img);
                }
            });
        });
    
        // Handle on-deck piece
        if (gameState.onDeck) {
            const img = document.createElement('img');
            img.src = `/images/Pawn${gameState.onDeck}.svg`;
            img.className = 'game-piece';
            onDeckCell.appendChild(img);
        }
    
        // Populate stash based on gameState.stash
        let stashIndex = 0; // Start at the first slot
        gameState.stash.forEach(item => {
            for (let i = 0; i < item.count; i++) {
                if (stashIndex < stashSlots.length) { // Ensure there's a corresponding slot
                    const img = document.createElement('img');
                    img.src = `/images/Pawn${item.piece}.svg`;
                    img.className = 'game-piece';
                    stashSlots[stashIndex].appendChild(img);
                    stashIndex++; // Move to the next slot for the next piece
                }
            }
        });
    
        // UI handling based on turn
        if (gameState.myTurn) {
            takeTurn(gameState.legalActions);
        } else {
            disableUI();
        }
    }
    

    function disableUI(){
        // Disable all interactions initially
        gamePieces.forEach(piece => {
            piece.removeEventListener('dragstart', handleDragStart);
            piece.removeEventListener('click', selectPiece);
            piece.classList.remove('glow-red', 'movable');
        });

        // Disable buttons
        document.getElementById('bomb-button').style.display = 'none';
        document.getElementById('challenge-button').style.display = 'none';

        // Reset on-deck and inventory interactions
        onDeckCell.classList.remove('highlight-gold');
        inventorySlots.forEach(slot => {
            slot.removeEventListener('dragover', handleDragOver);
            slot.removeEventListener('drop', handleSetupDrop); // Changed handleDrop to handleSetupDrop
        });
    }
    
    function takeTurn(legalActions) {
        // Disable all UI interactions initially
        disableUI();
        
        // Check if it's the player's turn, setup phase, or neither
        if (myStatus === 'setup') {
            enableSetupPhase();
        } else if (myStatus === 'turn') {
            enableTurnActions(legalActions);
        } else {
            console.log("Not player's turn or setup phase");
            console.log(myStatus);
            return;
        }
        
        // Start player's clock and stop opponent's if it's the player's turn
        if (myStatus === 'turn') {
            try {
                const clockId = myColor === 'white' ? 'right-clock-time' : 'left-clock-time';
                startClock(clockId, myGameLength * 60);
                stopClock(myColor === 'white' ? rightClockTimer : leftClockTimer);
            } catch (error) {
                console.error("Error managing clocks:", error);
            }
        }
    }
    
    function enableSetupPhase() {
        console.log("Enabling setup phase");
        try {
            const setupTargets = [
                ...inventorySlots,
                ...Array.from(document.querySelectorAll('.cell')).filter(cell => {
                    const position = nameToCoordinate[cell.dataset.position];
                    return position && ((myColor === 'white' && position.y === 0) || (myColor === 'black' && position.y === 4));
                }),
                onDeckCell
            ];
            
            setupTargets.forEach(target => {
                target.addEventListener('dragover', handleDragOver);
                target.addEventListener('drop', handleSetupDrop);
            });
            
            const setupPieces = document.querySelectorAll('.game-piece');
            setupPieces.forEach(piece => {
                piece.addEventListener('dragstart', handleDragStart);
            });
        } catch (error) {
            console.error("Error enabling setup phase:", error);
        }
    }
    
    function enableTurnActions(legalActions) {
        legalActions.forEach(action => {
            try {
                switch (action) {
                    case "sacrifice":
                        enableSacrifice();
                        break;
                    case "on-deck":
                        enableOnDeck();
                        break;
                    case "challenge":
                        enableChallenge();
                        break;
                    case "bomb":
                        enableBomb();
                        break;
                    case "move":
                        enableMove();
                        break;
                    default:
                        console.warn(`Unknown action: ${action}`);
                }
            } catch (error) {
                console.error(`Error enabling action ${action}:`, error);
            }
        });
    }
    
    function enableSacrifice() {
        gamePieces.forEach(piece => {
            if (piece.src.includes(myColor)) {
                piece.classList.add('glow-red');
                piece.addEventListener('click', handleSacrifice);
            }
        });
    }
    
    function enableOnDeck() {
        onDeckCell.classList.add('highlight-gold');
        inventorySlots.forEach(slot => {
            slot.addEventListener('dragover', handleDragOver);
            slot.addEventListener('drop', handleOnDeckDrop);
        });
        onDeckCell.addEventListener('dragover', handleDragOver);
        onDeckCell.addEventListener('drop', handleOnDeckDrop);
    }
    
    function enableChallenge() {
        const challengeButton = document.getElementById('challenge-button');
        if (challengeButton) {
            challengeButton.style.display = 'block';
            challengeButton.onclick = declareChallenge;
        } else {
            console.error("Challenge button not found");
        }
    }
    
    function enableBomb() {
        const bombButton = document.getElementById('bomb-button');
        if (bombButton) {
            bombButton.style.display = 'block';
            bombButton.onclick = declareBomb;
        } else {
            console.error("Bomb button not found");
        }
    }
    
    function enableMove() {
        gamePieces.forEach(piece => {
            if (piece.src.includes(myColor) && !piece.classList.contains('front')) {
                piece.addEventListener('dragstart', handleDragStart);
                piece.addEventListener('click', selectPiece);
                piece.classList.add('movable');
            }
        });
        dropTargets.forEach(target => {
            target.addEventListener('dragover', handleDragOver);
            target.addEventListener('drop', handleMoveDrop);
        });
    }
    
    function handleDragStart(event) {
        if (event.target.classList.contains('front')) {
            event.preventDefault();
            return;
        }
        
        event.dataTransfer.setData('text', event.target.id);
        dragStartInfo = {
            element: event.target,
            startParent: event.target.parentNode
        };
    }
    
    function handleDragOver(event) {
        event.preventDefault();
    }
    
    function handleSetupDrop(event) {
        event.preventDefault();
        try {
            const data = event.dataTransfer.getData('text');
            const draggedElement = document.getElementById(data);
            const targetCell = event.target.closest('.cell, .inventory-slot, .on-deck-cell');
    
            if (!targetCell) return;
    
            const existingPiece = targetCell.querySelector('img');
            if (existingPiece) {
                // Swap pieces
                const originalParent = draggedElement.parentNode;
                targetCell.replaceChild(draggedElement, existingPiece);
                originalParent.appendChild(existingPiece);
            } else {
                targetCell.appendChild(draggedElement);
            }
            
            updategameUIState();
        } catch (error) {
            console.error("Error handling setup drop:", error);
        }
    }
    
    function handleOnDeckDrop(event) {
        event.preventDefault();
        try {
            const data = event.dataTransfer.getData('text');
            const draggedElement = document.getElementById(data);
            const targetCell = event.target.closest('.on-deck-cell');
    
            if (!targetCell) return;
    
            if (draggedElement.closest('.inventory-slot')) {
                targetCell.appendChild(draggedElement);
                sendTurnResult('on-deck', { piece: draggedElement.id });
            } else {
                console.warn("Attempted to move non-inventory piece to on-deck");
            }
        } catch (error) {
            console.error("Error handling on-deck drop:", error);
        }
    }
    
    function handleMoveDrop(event) {
        event.preventDefault();
        try {
            const data = event.dataTransfer.getData('text');
            const draggedElement = document.getElementById(data);
            const targetCell = event.target.closest('.cell');
    
            if (!targetCell) return;
    
            if (dragStartInfo.element.closest('.cell')) {
                const existingPiece = targetCell.querySelector('img');
                if (existingPiece && existingPiece.src.includes(myColor)) {
                    // Snap back to original position
                    return;
                } else if (existingPiece) {
                    // Capture enemy piece
                    existingPiece.remove();
                }
                targetCell.appendChild(draggedElement);
                sendTurnResult('move', { 
                    from: dragStartInfo.startParent.dataset.position, 
                    to: targetCell.dataset.position 
                });
            } else {
                console.warn("Attempted to move piece from invalid location");
            }
        } catch (error) {
            console.error("Error handling move drop:", error);
        }
    }
    
    function handleSacrifice(event) {
        try {
            const sacrificedPiece = event.target;
            if (!sacrificedPiece.src.includes(myColor)) {
                console.warn("Attempted to sacrifice opponent's piece");
                return;
            }
            sacrificedPiece.remove();
            sendTurnResult('sacrifice', { piece: sacrificedPiece.id });
        } catch (error) {
            console.error("Error handling sacrifice:", error);
        }
    }
    
    function declareChallenge() {
        try {
            console.log("Challenge declared!");
            sendTurnResult('challenge');
        } catch (error) {
            console.error("Error declaring challenge:", error);
        }
    }
    
    function declareBomb() {
        try {
            console.log("Bomb declared!");
            sendTurnResult('bomb');
        } catch (error) {
            console.error("Error declaring bomb:", error);
        }
    }
    
    function sendTurnResult(action, details = {}) {
        try {
            const turnResult = {
                type: 'turn-result',
                action: action,
                details: details
            };
            socket.send(JSON.stringify(turnResult));
        } catch (error) {
            console.error("Error sending turn result:", error);
        }
    }
    
    function returnToLobby() {
        try {
            const baseUrl = 'lobby.html';
            const params = new URLSearchParams({
                username: myName
            });
            const fullUrl = `${baseUrl}?${params.toString()}`;
            window.location.href = fullUrl;
        } catch (error) {
            console.error("Error returning to lobby:", error);
        }
    }
    
    function extractColor(src) {
        return src.includes('Black') ? 'Black' : 'White';
    }

    gamePieces.forEach(piece => {
        piece.addEventListener('click', selectPiece);
    });

    dropTargets.forEach(target => {
        target.addEventListener('click', placePiece);
    });

    function selectPiece(event) {
        if (event.target.classList.contains('front')) {
            event.preventDefault(); // Prevent selection of front pieces
        } else {
            // Clear any previously selected piece
            if (selectedPiece) {
                selectedPiece.classList.remove('selected'); // Optional: Visual cue
            }
            selectedPiece = event.target;
            selectedPiece.classList.add('selected'); // Optional: Visual cue
            event.stopPropagation(); // Prevent this click from triggering placePiece
        }
    }

    function nameCellsForColor(color) {
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
    
    
    

    function setupOpponentPieces(opponentColor) {
        const topRowCells = document.querySelectorAll('.board .cell:nth-child(-n+5)'); // Assuming a 5x5 board for the top row
        const pieceFilename = opponentColor === 1 ? 'PawnBlackFront.svg' : 'PawnWhiteFront.svg';
    
        topRowCells.forEach(cell => {
            const img = document.createElement('img');
            img.src = `/images/${pieceFilename}`;
            img.className = 'game-piece front'; // 'front' class to identify non-movable pieces
            cell.appendChild(img);
        });
    }

    function updategameUIState(){
        if(myStatus == "setup"){
            updateBottomRowHighlight();
            updateOnDeckHighlight();
            checkReadiness()
        }
        shiftInventory();
    }

    function placePiece(event) {
        if (!selectedPiece) return; // Exit if no piece selected
    
        const target = event.target.closest('.cell, .inventory-slot, .on-deck-cell');
        if (target.classList.contains('inventory-slot')) {
            // Always allow placing back into inventory slots
            placeSelectedPieceInTarget(target);
        } else if (canPlacePiece(target, selectedPiece)) {
            placeSelectedPieceInTarget(target);
        } else {
            console.log("Cannot place piece here: another piece of the same color exists or invalid move.");
        }
    }
    
    function placeSelectedPieceInTarget(target) {
        // Generalize placement handling by pulling it into its own function
        if (target.tagName.toLowerCase() === 'img') {
            target.parentNode.appendChild(selectedPiece);
        } else {
            target.appendChild(selectedPiece);
        }
        selectedPiece.classList.remove('selected');
        selectedPiece = null;
    
        updategameUIState();
    }
    

    function shiftInventory() {
        const slots = document.querySelectorAll('.inventory-slot');
        const pieces = Array.from(document.querySelectorAll('.inventory-slot img'));

        slots.forEach(slot => slot.innerHTML = '');
        pieces.forEach((piece, index) => {
            slots[index].appendChild(piece);
        });
    }

    function updateBottomRowHighlight() {
        const piecesCount = document.querySelectorAll('.inventory-slot img').length;
        bottomRowCells.forEach(cell => {
            if (cell.children.length === 0 && piecesCount > 3) {
                cell.classList.add('highlighted');
            } else {
                cell.classList.remove('highlighted');
            }
        });
    }

    function updateOnDeckHighlight() {
        if (onDeckCell.children.length === 0) {
            onDeckCell.classList.add('empty');
        } else {
            onDeckCell.classList.remove('empty');
        }
    }

    function checkReadiness() {
        const isBottomRowFilled = Array.from(bottomRowCells).every(cell => cell.children.length > 0);
        const isOnDeckFilled = onDeckCell.children.length > 0;

        readyButton.style.display = (isBottomRowFilled && isOnDeckFilled && myStatus == "setup") ? 'block' : 'none';
    }
    function playBoard(gameState) {
        console.log("playing the board")
        myStatus = gameState.myTurn ? "turn" : "waiting";
        myGameStart = Date.now();

        const leftClock = document.getElementById('left-clock-time');
        const rightClock = document.getElementById('right-clock-time');

        // Set the clock times
        rightClock.textContent = myColor === 'white' ? formatTime(gameState.clocks[0]) : formatTime(gameState.clocks[1]);
        leftClock.textContent = myColor === 'white' ? formatTime(gameState.clocks[1]) : formatTime(gameState.clocks[0]);
        
        function updateClock(clock, startTime, remainingTime) {
            let elapsedTime = Date.now() - startTime;
            let currentTime = Math.max(0, remainingTime - elapsedTime);
            clock.textContent = formatTime(currentTime);
            clock.classList.add('clock-highlight');
            
            if (currentTime > 0) {
                requestAnimationFrame(() => updateClock(clock, startTime, remainingTime));
            } else {
                // Handle time running out
                console.log("Time's up!");
                clock.classList.remove('clock-highlight');
            }
        }

        // Start the appropriate clock based on whose turn it is
        if (myStatus === "turn") {
            let startTime = Date.now();
            let remainingTime = gameState.clocks[myColor === 'white' ? 0 : 1];
            updateClock(rightClock, startTime, remainingTime);
            leftClock.classList.remove('clock-highlight');
        } else {
            // Start opponent's clock
            let startTime = Date.now();
            let remainingTime = gameState.clocks[myColor === 'white' ? 1 : 0];
            updateClock(leftClock, startTime, remainingTime);
            rightClock.classList.remove('clock-highlight');
        }
    }

    function formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }


    readyButton.addEventListener('click', function() {
        console.log("Setup Ready!");
        stopClock(rightClockTimer);  // Stop the right clock
        document.getElementById('right-clock-time').classList.remove('clock-highlight');
        this.style.display = 'none'; // Hide the ready button
    
        myStatus = "ready"; // Just to prevent movement of pieces after being ready.
    
        // Filter and send the game state to the server excluding pieces with 'front' in their image source
        const pieces = Array.from(document.querySelectorAll('.cell img')).filter(img => !img.src.includes('Front')).map(img => ({
            type: extractPieceName(img.src),
            position: img.parentElement.getAttribute('data-position')
        }));
    
        const onDeckPiece = document.querySelector('.on-deck-cell img');
        if (onDeckPiece && !onDeckPiece.src.includes('Front')) {
            const message = {
                type: "ready-to-play",
                pieces: pieces,
                onDeckPiece: extractPieceName(onDeckPiece.src)
            };
            socket.send(JSON.stringify(message));
        } else {
            const message = {
                type: "ready-to-play",
                pieces: pieces,
                onDeckPiece: null
            };
            socket.send(JSON.stringify(message));
        }
    });
    

    // Start the game timers when the game phase changes to 'play'

    document.querySelectorAll('.cell, .inventory-slot, .on-deck-cell').forEach(target => {
        target.addEventListener('drop', checkReadiness);
        target.addEventListener('dragstart', checkReadiness);
    });

    function extractPieceName(src) {
        const lastSlashIndex = src.lastIndexOf('/') + 1;
        const lastPeriodIndex = src.lastIndexOf('.');
        return src.substring(lastSlashIndex, lastPeriodIndex).replace(/PawnWhite|PawnBlack/g, '').toUpperCase();
    }

    function setupGameFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const blackPlayer = params.get('blackPlayer');
        const whitePlayer = params.get('whitePlayer');
        myColor = params.get('myColor');
        nameCellsForColor(myColor)
        const length = parseInt(params.get('length'));
        myGameLength = length;
        const gameNumber = parseInt(params.get('gameNumber'));
        //check if this game is still live
        socket.send(JSON.stringify({type:"check-game-exists",gameNumber:gameNumber}))
        // Set player names and times
        const leftName = document.getElementById('left-player-name');
        const rightName = document.getElementById('right-player-name');
        const leftClock = document.getElementById('left-clock-time');
        const rightClock = document.getElementById('right-clock-time');
        const clockName = document.getElementById('clock-name');
    
        // Decide the clock label
        const clockLabel = length === 1 ? "Blitz" : length === 5 ? "Standard" : "Classic";
        clockName.textContent = clockLabel;
    
        // Assign names and times based on player color
        if (myColor === 'black') {
            leftName.textContent = whitePlayer;
            rightName.textContent = blackPlayer;
            rightClock.classList.add("black-clock");
            leftClock.classList.add("white-clock");
        } else {
            leftName.textContent = blackPlayer;
            rightName.textContent = whitePlayer;
            rightClock.classList.add("white-clock");
            leftClock.classList.add("black-clock");

        }
        leftClock.textContent = `${length}:00`;
        rightClock.textContent = `${length}:00`;
    
        myName = myColor == "white" ? whitePlayer : blackPlayer;
         // Send WebSocket message
         const message = {
            type: "entered-game",
            username: myName,
            gameNumber: params.get('gameNumber') // Ensure this parameter is used if required
        };
        updatePieceImages(myColor);
        socket.send(JSON.stringify(message));
    }

    function updatePieceImages(myColor) {
        const gamePieces = document.querySelectorAll('.game-piece');
        gamePieces.forEach(piece => {
            if (myColor === 'black') {
                piece.src = piece.src.replace('White', 'Black');
            } else {
                piece.src = piece.src.replace('Black', 'White');
            }
        });
    }

    

    function startClock(clockId, duration) {
        let remainingTime = duration;
        const clockElement = document.getElementById(clockId);
        clockElement.classList.add('clock-highlight');

        function updateClock() {
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            clockElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            if (remainingTime <= 0) {
                clearInterval(clockElement.timer);
                clockElement.classList.remove('clock-highlight');
            }
            remainingTime--;
        }

        updateClock(); // Initialize clock display
        clockElement.timer = setInterval(updateClock, 1000);
        return clockElement.timer;
    }

    function stopClock(timer) {
        clearInterval(timer);
    }

    // Initialize the board state 
    updategameUIState()
});