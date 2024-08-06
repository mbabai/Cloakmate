class lobbyUser{
    constructor(websocket, username){
        this.username = username;
        this.websocket = websocket;
        this.isInQueue = false;
        this.isInGame = false;
    }
    
}

module.exports = lobbyUser