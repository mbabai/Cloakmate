document.addEventListener('DOMContentLoaded', function() {

    // Create a new WebSocket.
    const socket = new WebSocket('ws://localhost:3000');

    // Connection opened
    socket.addEventListener('open', function (event) {
        socket.send('Hello Server!'); // Send a message to the server
    });

    // Listen for messages
    socket.addEventListener('message', function (event) {
        console.log('Message from server ', event.data);
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

    const gamePhase = 'setup'; // This will later be dynamic based on game state
    const gamePieces = document.querySelectorAll('.game-piece');
    const dropTargets = document.querySelectorAll('.cell, .inventory-slot, .on-deck-cell');
    const bottomRowCells = document.querySelectorAll('.board .cell:nth-last-child(-n+5)'); // Correctly selecting the bottom row
    const onDeckCell = document.querySelector('.on-deck-cell');

    gamePieces.forEach(piece => {
        piece.addEventListener('dragstart', handleDragStart);
    });

    dropTargets.forEach(target => {
        target.addEventListener('dragover', handleDragOver);
        target.addEventListener('drop', handleDrop);
    });

    function handleDragStart(event) {
        event.dataTransfer.setData('text', event.target.id);
    }

    function handleDragOver(event) {
        event.preventDefault();
    }

    function handleDrop(event) {
        event.preventDefault();
        if (gamePhase !== 'setup') {
            return; // If not in setup phase, don't allow any drops (optional, based on your phase management)
        }
    
        const data = event.dataTransfer.getData('text');
        const draggedElement = document.getElementById(data);
    
        // Check if dropping into allowed cells or the on-deck cell or back into inventory slots
        const isDroppingToBottomRow = Array.from(bottomRowCells).includes(event.target) || Array.from(bottomRowCells).some(cell => cell.contains(event.target));
        const isDroppingToOnDeck = event.target === onDeckCell || onDeckCell.contains(event.target);
        const isDroppingToInventory = event.target.className.includes('inventory-slot') || (event.target.parentNode && event.target.parentNode.className.includes('inventory-slot'));
    
        // Ensure the drop is allowed in the current context
        if ((isDroppingToBottomRow || isDroppingToOnDeck || isDroppingToInventory) && (event.target.className.includes('cell') || event.target.className.includes('inventory-slot') || event.target.className.includes('on-deck-cell'))) {
            if (event.target.tagName.toLowerCase() === 'img') {
                event.target.parentNode.appendChild(draggedElement);
            } else {
                event.target.appendChild(draggedElement);
            }
        }
    
        shiftInventory();
        updateBottomRowHighlight();
        updateOnDeckHighlight();
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

    // Initialize the board state
    updateBottomRowHighlight();
    updateOnDeckHighlight();

    readyButton.addEventListener('click', function() {
        const pieces = Array.from(bottomRowCells).map(cell => {
            return cell.children.length > 0 ? extractPieceName(cell.children[0].getAttribute('src')) : '';
        });
        const onDeckPiece = onDeckCell.children.length > 0 ? extractPieceName(onDeckCell.children[0].getAttribute('src')) : '';

        const message = {
            type: "ready",
            pieces: pieces,
            "on-deck": onDeckPiece
        };

        socket.send(JSON.stringify(message));
    });

    document.querySelectorAll('.cell, .inventory-slot, .on-deck-cell').forEach(target => {
        target.addEventListener('drop', checkReadiness);
        target.addEventListener('dragstart', checkReadiness);
    });

    function extractPieceName(src) {
        const lastSlashIndex = src.lastIndexOf('/') + 1;
        const lastPeriodIndex = src.lastIndexOf('.');
        return src.substring(lastSlashIndex, lastPeriodIndex).replace(/PawnWhite|PawnBlack/g, '').toLowerCase();
    }


    checkReadiness();


});