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
        socket.send(JSON.stringify({ type: "check-username", username: username }));
    });

    socket.addEventListener('message', function(event) {
        const data = JSON.parse(event.data);
        if (data.type === "username-status") {
            if (data.status === "accepted") {
                document.getElementById('name-entry').style.display = 'none';
                usernameDisplay.textContent = data.username;
                userDisplay.style.display = 'block';
            } else {
                alert('Username is taken, please choose another.');
                usernameInput.value = '';
                usernameInput.focus();
            }
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
                if (opponentNameInput.value.trim() !== "") {
                    message.type = "find-opponent";
                    message.opponentName = opponentNameInput.value.trim();
                    socket.send(JSON.stringify(message));
                }
                break;
            case "quickplay":
                if (playButton.textContent === "Go!") {
                    playButton.textContent = "Cancel";
                    playButton.style.backgroundColor = '#FF4136'; // Red color for cancel
                    statusText.textContent = "Searching for opponent...";
                    document.body.appendChild(statusText);
                    stopAnimation = animateEllipsis();
                    message.type = "quickplay-queue";
                    socket.send(JSON.stringify(message));
                } else {
                    stopAnimation();
                    playButton.textContent = "Go!";
                    playButton.style.backgroundColor = '#007BFF'; // Default blue color
                    if (statusText.parentNode) statusText.parentNode.removeChild(statusText);
                    message.type = "quickplay-cancel";
                    socket.send(JSON.stringify(message));
                }
                break;
        }
    });

    function animateEllipsis() {
        const element = document.getElementById('status-text');
        element.style.display = 'block';
        let count = 0;
        const interval = setInterval(() => {
            element.textContent = "Searching for opponent" + ".".repeat(count % 4);
            count++;
        }, 500);
    
        return () => {
            clearInterval(interval);
            element.style.display = 'none';
        };
    }
});
