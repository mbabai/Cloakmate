class LobbyUI {
    constructor(webSocketManager) {
        this.username = null;
        this.webSocketManager = webSocketManager;
        this.usernameInput = document.getElementById('username-input');
        this.enterLobbyButton = document.getElementById('enter-lobby');
        this.initEventListeners();
    }

    initEventListeners() {
        this.enterLobbyButton.addEventListener('click', () => this.handleEnterLobby());
    }

    handleEnterLobby() {
        console.log("Entering lobby");
        const username = this.usernameInput.value.trim();
        if (this.isValidUsername(username)) {
            this.submitUsername(username);
        }
    }

    isValidUsername(username) {
        if (username.length > 18) {
            this.showAlert("Name must be 18 characters or fewer!");
            return false;
        }
        return true;
    }

    welcome(data) {
        console.log(`Welcome ${data.username}!`);
        this.username = data.username;
        document.getElementById('name-entry').style.display = 'none';
        const usernameTopBar = document.getElementById('username-display');
        const usernameInline = document.querySelector('.username-inline');
        const userDisplay = document.getElementById('user-display');
        usernameTopBar.textContent = data.username;
        usernameInline.textContent = data.username;
        usernameTopBar.style.display = 'block';
        userDisplay.style.display = 'block';
    }

    reconnect(data){
        console.log(`Reconnecting ${data.username}!`);
        this.welcome(data);
    }



    submitUsername(username) {
        this.webSocketManager.routeMessage({ type: "submit-name",  username });
    }

    usernameTaken(data) {
        this.showAlert(`${data.username} is already taken!`);
    }

    showAlert(message) {
        alert(message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
});