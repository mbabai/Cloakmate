class LobbyUser{
    constructor(userID, websocket, username=null){
        this.username = username;
        this.isConnected = true;
        this.lastConnected;
        this.isInQueue = false;
        this.isInGame = false;
        this.userID = userID;
        this.websocket = websocket;
    }
}

module.exports = LobbyUser