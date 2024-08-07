class UIManager {
    constructor(webSocketManager) {
        this.webSocketManager = webSocketManager;
        this.username;
        this.color;
        this.opponentName;
        this.board = null;
        this.allElements = ['lobby-container','name-entry','game-picker'
            ,'play-button','custom-options','ai-difficulty','cancel-button'
            ,'bomb-button','challenge-button']
        this.currentState = [];
        this.currentActions = [];
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
            }
        }
        this.setupButtons();
        this.setupGameSelection();  // Add this line
        this.setState('pageLoad');
    }
    addState(state){
        this.currentState.push(state);
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
        });
        //show elements that are in the current state
        this.currentState.forEach(state => {
            this.states[state].visible.forEach(element => {
                document.getElementById(element).style.display = 'block';
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
            console.warn(`Action '${action}' is not in the current set of allowed actions.`);
        }
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
    }

    updateBoardUI() {
        this.updateNames();
        this.updateClocks();
        this.startClockTick();
        this.setBoardSpaceLabels()
        // Add more UI update methods as needed
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
            const cellId = `${letter}${number}`;
            cell.id = cellId;

            // Clear any existing content
            cell.innerHTML = '';

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

    endGame() {
        // Reset game selection to default empty value
        document.getElementById('game-selection').value = "";
        this.stopClockTick();
        this.resetClocks();
        this.board = null;
        this.opponentName = null;
    }

    startClockTick() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        let lastTime = performance.now();
        const tick = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            const playerClockElement = document.getElementById('player-clock-time');
            const opponentClockElement = document.getElementById('opponent-clock-time');
            
            if (this.board.phase === "setup") {
                this.board.clocks[0] -= deltaTime;
                this.board.clocks[1] -= deltaTime;
            } else if (this.board.myTurn) {
                this.board.clocks[this.board.color] -= deltaTime;
            } else {
                this.board.clocks[1 - this.board.color] -= deltaTime;
            }

            // Check if any clock has reached 0
            if (this.board.clocks[0] <= 0 || this.board.clocks[1] <= 0) {
                this.stopClockTick();
                this.board.clocks[0] = Math.max(0, this.board.clocks[0]);
                this.board.clocks[1] = Math.max(0, this.board.clocks[1]);
            }

            playerClockElement.textContent = this.formatTime(Math.max(0, this.board.clocks[this.board.color]));
            opponentClockElement.textContent = this.formatTime(Math.max(0, this.board.clocks[1 - this.board.color]));

            playerClockElement.classList.toggle('clock-highlight', this.board.myTurn && this.board.phase !== "setup");
            opponentClockElement.classList.toggle('clock-highlight', !this.board.myTurn && this.board.phase !== "setup");

            if (this.board.clocks[0] > 0 && this.board.clocks[1] > 0) {
                this.animationFrameId = requestAnimationFrame(tick);
            }
        };

        this.animationFrameId = requestAnimationFrame(tick);
    }

    stopClockTick() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
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
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}