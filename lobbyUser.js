class LobbyUser{
    constructor(username, userID){
        this.username = username;
        this.isConnected = true;
        this.lastConnected;
        this.isInQueue = false;
        this.isInGame = false;
        this.userID = userID;
    }
}

module.exports = LobbyUser