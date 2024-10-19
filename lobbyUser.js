class LobbyUser{
    constructor(username, userID, websocket){
        this.username = username;
        this.websocket = websocket;
        this.isInQueue = false;
        this.isInGame = false;
        this.userID = userID;
    }
    setWebsocket(websocket){
        this.websocket = websocket;
    }
    
}

module.exports = LobbyUser