class lobbyUser{
    constructor(username, sessionID){
        this.username = username;
        this.sessionID = sessionID;
        this.createdTime = new Date();
        this.updatedTime = new Date();
        this.isConnected = false;
        this.isInQueue = false;
        this.isInGame = false;
    }
    
    setUsername(username){
        this.username = username;
        this.updatedTime = new Date();
    }
}

module.exports = lobbyUser