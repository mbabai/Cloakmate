document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username-input');
    const enterLobbyButton = document.getElementById('enter-lobby');
    const userDisplay = document.getElementById('user-display');
    const usernameDisplay = document.getElementById('username-display');
    const gameSelection = document.getElementById('game-selection');
    const aiDifficulty = document.getElementById('ai-difficulty');
    const customOptions = document.getElementById('custom-options');
    const playButton = document.getElementById('play-button');
    const socket = new WebSocket('ws://localhost:3000'); // Adjust the WebSocket server URL

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
        console.log(event.data)
        const data = JSON.parse(event.data);
        if (data.type === "username-status") {
            if (data.status === "accepted") {
                document.getElementById('name-entry').style.display = 'none';
                document.getElementById('username-display').textContent = data.username; // Top center display
                document.getElementById('username-display').style.display = 'block'; // Show top username
                document.querySelector('.username-inline').textContent = data.username; // Inline username display
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
    });

    playButton.addEventListener('click', function() {
        const selection = gameSelection.value;
        let message = { type: "Enter Game", username: usernameDisplay.textContent, selection: selection };

        if (selection === "AI") {
            message.difficulty = aiDifficulty.value;
        } else if (selection === "custom") {
            message.opponentName = document.getElementById('opponent-name').value;
            message.gameLength = document.getElementById('game-length').value;
        }
        socket.send(JSON.stringify(message));
    });
});
