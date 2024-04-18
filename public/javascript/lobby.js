document.addEventListener('DOMContentLoaded', function() {
    const enterLobbyButton = document.getElementById('enter-lobby');
    const usernameInput = document.getElementById('username-input');
    const userDisplay = document.getElementById('user-display');
    const usernameDisplay = document.getElementById('username-display');
    const gameOptions = document.querySelectorAll('.game-option');
    const opponentNameInput = document.getElementById('opponent-name');
    let anonymousNumber = 0

    enterLobbyButton.addEventListener('click', function() {
        let username = usernameInput.value.trim();
        if (!username) {
            username = "anonymous" + anonymousNumber++;
        }
        usernameDisplay.textContent = username;
        userDisplay.style.display = 'block';
        usernameInput.style.display = 'none';
        enterLobbyButton.style.display = 'none';
    });

    gameOptions.forEach(option => {
        option.addEventListener('click', function() {
            const selection = this.getAttribute('data-selection');
            let message = {
                type: "Enter Game",
                username: usernameDisplay.textContent,
                selection: selection
            };

            if (selection === "player") {
                opponentNameInput.style.display = 'block';
                opponentNameInput.addEventListener('change', function() {
                    message.opponentName = this.value.trim();
                    connectWebSocket(message);
                });
            } else {
                connectWebSocket(message);
            }
        });
    });

    function connectWebSocket(message) {
        const socket = new WebSocket('ws://localhost:3000');
        socket.onopen = function() {
            socket.send(JSON.stringify(message));
        };
        socket.onmessage = function(event) {
            console.log('Message from server ', event.data);
        };
    }
});
