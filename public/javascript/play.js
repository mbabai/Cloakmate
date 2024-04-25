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
        console.log('Message from server ', event.data);
        const data = JSON.parse(event.data);
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
    let gameLength; // Will use this globally later
    let playerStatus = 'setup';
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
        target.addEventListener('drop', handleDrop);
    });

    function returnToLobby(){
        const baseUrl = 'lobby.html';

        // Construct query parameters
        const params = new URLSearchParams({
            username: myName
        });
        // Create the full URL with parameters
        const fullUrl = `${baseUrl}?${params.toString()}`;
        // Redirect to the constructed URL
        window.location.href = fullUrl;
    }

    function handleDragStart(event) {
        if (event.target.classList.contains('front')) {
            event.preventDefault(); // Prevent drag for front pieces
        } else {
            event.dataTransfer.setData('text', event.target.id);
        }
    }

    function handleDragOver(event) {
        event.preventDefault();
    }

    function handleDrop(event) {
        event.preventDefault();
        if (!(playerStatus == 'setup' || playerStatus == 'turn')) {
            return; // Do not allow any actions if not in the appropriate phase.
        }
    
        const data = event.dataTransfer.getData('text');
        const draggedElement = document.getElementById(data);
        const targetCell = event.target.closest('.cell, .on-deck-cell, .inventory-slot');
    
        // Determine if the drop is allowed based on the target cell type
        if (targetCell && targetCell.classList.contains('inventory-slot')) {
            // Always allow dropping back into any inventory slot
            placeElementInTarget(event.target, draggedElement);
        } else if (canPlacePiece(targetCell, draggedElement)) {
            placeElementInTarget(event.target, draggedElement);
        }
    }
    
    function placeElementInTarget(target, element) {
        // This helper function handles the actual placement of elements.
        if (target.tagName.toLowerCase() === 'img') {
            target.parentNode.appendChild(element);
        } else {
            target.appendChild(element);
        }
        updateBoardState();
    }
    
    function canPlacePiece(target, piece) {
        const targetCell = target.closest('.cell, .on-deck-cell');
        if (!targetCell) return false; // Ensure we're dropping into a cell or on-deck area
    
        const existingPiece = targetCell.querySelector('img');
        if (existingPiece && existingPiece.src.includes(extractColor(piece.src))) {
            return false; // There's already a piece of the same color in this cell
        }
    
        return true; // Valid move
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

    function updateBoardState(){
        if(playerStatus == "setup"){
            updateBottomRowHighlight();
            updateOnDeckHighlight();
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
    
        updateBoardState();
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

        readyButton.style.display = (isBottomRowFilled && isOnDeckFilled) ? 'block' : 'none';
    }

    function disableAllMoving(){
        // Disable moving pieces
        gamePieces.forEach(piece => {
            piece.removeEventListener('dragstart', handleDragStart);
            piece.removeEventListener('click', selectPiece);
        });
    }

    readyButton.addEventListener('click', function() {
        console.log("Setup Ready!")
        stopClock(rightClockTimer);  // Stop the right clock
        document.getElementById('right-clock-time').classList.remove('clock-highlight');
        this.style.display = 'none'; // Hide the ready button

        disableAllMoving()

        // Send the game state to the server
        const pieces = Array.from(document.querySelectorAll('.cell img')).map(img => ({
            type: extractPieceName(img.src),
            position: img.parentElement.getAttribute('data-position')
        }));
        const onDeckPiece = document.querySelector('.on-deck-cell img');
        const message = {
            type: "ready-to-play",
            pieces: pieces,
            onDeck: onDeckPiece ? extractPieceName(onDeckPiece.src) : null
        };

        socket.send(JSON.stringify(message));
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
        const myColor = params.get('myColor');
        const length = parseInt(params.get('length'));
        gameLength = length;
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
    updateBoardState()
});