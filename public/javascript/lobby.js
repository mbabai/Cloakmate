document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username-input');
    const enterLobbyButton = document.getElementById('enter-lobby');
    const userDisplay = document.getElementById('user-display');
    const usernameDisplay = document.getElementById('username-display');
    const gameSelection = document.getElementById('game-selection');
    const aiDifficulty = document.getElementById('ai-difficulty');
    const customOptions = document.getElementById('custom-options');
    const playButton = document.getElementById('play-button');
    const opponentNameInput = document.getElementById('opponent-name');
    const gameLengthInput = document.getElementById('game-length');
    const statusText = document.getElementById('status-text');
    const socket = new WebSocket('ws://localhost:3000');
    let stopAnimation = null //use this to start/stop animation of ellipses

    socket.onopen = function() {
        console.log('WebSocket connection established');
    };

    socket.onmessage = function(event) {
        console.log('Message from server:', event.data);
    };

    enterLobbyButton.addEventListener('click', function() {
        const username = usernameInput.value.trim();
        if(username.length > 18){
            alert("Name must be 18 characters or fewer!")
        } else {
            socket.send(JSON.stringify({ type: "check-username", username: username }));
        }
    });

    socket.addEventListener('message', function(event) {
        const data = JSON.parse(event.data);
        switch (data.type){
            case "username-status":
                if (data.status === "accepted") {
                    document.getElementById('name-entry').style.display = 'none';
                    const usernameTopBar = document.getElementById('username-display');
                    const usernameInline = document.querySelector('.username-inline');
                    usernameTopBar.textContent = data.username;
                    usernameInline.textContent = data.username;
                    usernameTopBar.style.display = 'block';
                    userDisplay.style.display = 'block';
                } else {
                    alert('Username is taken, please choose another.');
                    usernameInput.value = '';
                    usernameInput.focus();
                }
                break;
            case "game-invite":
                receivedInvite(data.username,data.length)
                break;
            case "cancel-game-invite":
                closeInviteDialog();
                break;
            case "decline":
                inviteDeclined(data.reason);
                break;
            case "match":
                startGame(data.myColor,data.whitePlayer,data.blackPlayer,data.length,data.gameNumber)
            default:
                break;
        }

    });

    gameSelection.addEventListener('change', function() {
        aiDifficulty.style.display = this.value === 'AI' ? 'block' : 'none';
        customOptions.style.display = this.value === 'custom' ? 'block' : 'none';
        playButton.style.display = this.value ? 'block' : 'none';
        playButton.textContent = 'Go!';
        playButton.style.backgroundColor = '#007BFF'; // Default blue color
        // if (statusText.parentNode) statusText.parentNode.removeChild(statusText); // Remove any existing status text
    });


    playButton.addEventListener('click', function() {
        const selection = gameSelection.value;
        let message = { type: "Enter Game", username: usernameDisplay.textContent, selection: selection };
    
        switch (selection) {
            case "AI":
                alert("Sorry, AI play is not yet available. Please stay tuned!");
                break;
            case "custom":
                const opponentName = opponentNameInput.value.trim();
                const gameLength = parseInt(gameLengthInput.value.trim())
                console.log(gameLength)
                if (playButton.textContent === "Go!" && opponentName !== "") {
                    playButton.textContent = "Cancel";
                    playButton.style.backgroundColor = '#FF4136'; // Red color for cancel
                    stopAnimation = animateEllipsis("Waiting for response from {opponent-name}<br>", opponentName);  // Start the time tracking with customized message
                    message.type = "find-opponent";
                    message.opponentName = opponentName;
                    message.length = gameLength;
                    socket.send(JSON.stringify(message));
                } else {
                    stopAnimation();  // Stop the time tracking and reset
                    message.type = "cancel-opponent-search";
                    message.opponentName = opponentName;
                    socket.send(JSON.stringify(message));
                }
                break;
            case "quickplay":
                if (playButton.textContent === "Go!") {
                    playButton.textContent = "Cancel";
                    playButton.style.backgroundColor = '#FF4136'; // Red color for cancel
                    stopAnimation = animateEllipsis("Searching for opponent<br>");  // Start the time tracking
                    message.type = "quickplay-queue";
                    socket.send(JSON.stringify(message));
                } else {
                    stopAnimation();  // Stop the time tracking and reset
                    message.type = "quickplay-cancel";
                    socket.send(JSON.stringify(message));
                }
                break;
            default:
                break;
        }
    });

    function animateEllipsis(baseMessage, opponentName = '') {
        const element = document.getElementById('status-text');
        element.style.display = 'block';
        let count = 0;
        let milliseconds = 0;  // Track time waiting
        const deltaTime = 300;
        let displayMessage = baseMessage.replace('{opponent-name}', opponentName);

        element.innerHTML = `${displayMessage}<br>(0s)`; // Using innerHTML to include line break

        const interval = setInterval(() => {
            element.innerHTML = `${displayMessage}${".".repeat(count % 6)}<br>(${Math.floor(milliseconds / 1000)}s)`;
            count++;
            milliseconds += deltaTime;  // Increment the milliseconds every delta time
        }, deltaTime);

        return () => {
            clearInterval(interval);
            element.style.display = 'none';
            revertMainDialogue()
        };
    }

    function receivedInvite(username, length) {
        console.log(`Got an invite from ${username} for a ${length} minute game.`)
        const message = `You have gotten an invite from ${username} for a game of length ${length} minute(s)`;
        document.getElementById('invite-message').textContent = message;
        document.getElementById('invite-dialog').style.display = 'block';

        const acceptButton = document.getElementById('accept-invite');
        const declineButton = document.getElementById('decline-invite');

        acceptButton.onclick = () => acceptInvite(username,length);
        declineButton.onclick = () => declineInvite(username);
    }

    function acceptInvite(opponentUsername,length) {
        const socketMessage = {
            type: 'accept',
            opponentUsername: opponentUsername,
            length:length
        };
        socket.send(JSON.stringify(socketMessage));
        closeInviteDialog();
    }

    function declineInvite(opponentUsername) {
        const socketMessage = {
            type: 'decline',
            opponentUsername: opponentUsername,
        };
        socket.send(JSON.stringify(socketMessage));
        closeInviteDialog();
    }

    function closeInviteDialog() {
        document.getElementById('invite-dialog').style.display = 'none';
    }

    function inviteDeclined(reason) {
        let displayText;
        switch(reason) {
            case "not-found":
                displayText = "Error: Player not found.";
                break;
            case "in-game":
                displayText = "Player is in another match.";
                break;
            case "decline":
                displayText = "Invitation Declined.";
                break;
            default:
                displayText = "Error: Unknown reason";
        }
        stopAnimation();
        alert(displayText);
    }

    function revertMainDialogue() {
        const statusText = document.getElementById('status-text');
        const inviteDialog = document.getElementById('invite-dialog');
        playButton.textContent = "Go!";
        playButton.style.backgroundColor = '#007BFF'; // Default blue color
        // Assume there is an element that needs to be hidden when reverting the dialogue state
        if (inviteDialog) {
            inviteDialog.style.display = 'none';
        }

        // Resetting status text if used
        if (statusText) {
            statusText.textContent = '';
        }

        // Additional UI components that need to be reset can be handled here
        // For example, resetting input fields, buttons, etc.
    }

    function startGame(myColor,whitePlayer,blackPlayer,length,gameNumber){
        // console.log(`MyColor: ${myColor}, whitePlayer:${whitePlayer}, blackPlayer:${blackPlayer}, length:${length}, gameNumber:${gameNumber}`)
        let clock = length == 1 ? "Blitz" : length == 5 ? "Standard" : "Classic";
        if(stopAnimation) stopAnimation();
        alert(`${whitePlayer} vs. ${blackPlayer} \n${clock} (${length}min) match starting!`)
        const baseUrl = 'play.html';

        // Construct query parameters
        const params = new URLSearchParams({
            myColor: myColor,
            whitePlayer: whitePlayer,
            blackPlayer: blackPlayer,
            length: length,
            gameNumber: gameNumber
        });

        // Create the full URL with parameters
        const fullUrl = `${baseUrl}?${params.toString()}`;
        // Redirect to the constructed URL
        window.location.href = fullUrl;
    }

});