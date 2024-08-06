class UIManager {
    constructor(webSocketManager) {
        this.webSocketManager = webSocketManager;
        this.username;
        this.color;
        this.opponentName;
        this.allElements = ['lobby-container','name-entry','game-picker'
            ,'play-button','custom-options','ai-difficulty','cancel-button'
            ,'bomb-button','challenge-button','game-clock-container'];
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
                visible: ["game-clock-container"],
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
            this.showAlert("Name must be 18 characters or fewer!");
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
        const confirmMessage = `${opponentName} has invited you to play. Do you accept?`;
        
        if (confirm(confirmMessage)) {
            this.acceptInvite(opponentName);
        } else {
            this.declineInvite(opponentName);
        }
    }
    inviteDeclined(data){
        alert(`${data.opponentName} has declined your invite.`);
        this.setState('lobby');
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
    }

}