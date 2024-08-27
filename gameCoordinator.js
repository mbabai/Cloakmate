const { Game } = require('./gameEngine');
const pieces = {
    BOMB: 0,
    KING: 1,
    KNIGHT: 2,
    BISHOP: 3,
    ROOK: 4
};
//Game Arena - coordinates games between players, converts between game engine style variables and frontend style variables
class GameCoordinator {
    constructor(user1,user2,length,gameNumber,server) {
        this.nameToUser = new Map();
        this.nameToUser.set(user1.username,user1);
        this.nameToUser.set(user2.username,user2);
        this.length = length;
        this.gameNumber = gameNumber;
        this.game = new Game(user1.username,user2.username,length);
        this.game.randomizePlayerColor()
        this.users = []
        this.users.push(this.nameToUser.get(this.game.players[0]))
        this.users.push(this.nameToUser.get(this.game.players[1]))
        this.server = server;
        this.broadcastGameState()
    }
    sendColorState(color) {
        this.server.routeMessage(this.users[color].websocket,{type:"board-state",board:this.game.getColorState(color)})
    }
    broadcastGameState() {
        console.log(`Broadcasting game #${this.gameNumber} state...`)
        this.sendColorState(0)
        this.sendColorState(1)
    }
    logGameState() {
        return `#${this.gameNumber} - W:${this.users[0].username} vs B:${this.users[1].username}`
    }
    randomSetup(player){
        const thisPlayerGameState = this.game.randomSetup(this.game.getPlayerColorIndex(player.username));
        this.server.routeMessage(player.websocket,{type:"random-setup-complete", board:thisPlayerGameState})
        this.checkPlayerSetupCompletion(player)
    }

    submitSetup(player, data) {
        console.log("READY-----------") 
        console.log(data.frontRow)
        console.log(data.onDeck)
        console.log(player.username)

        if (!this.game.trySetup(player.username, data.frontRow, data.onDeck)) {
            console.log("Illegal setup");
            this.server.routeMessage(player.websocket, { type: "setup-error", message: "Your setup was invalid. Please try again." });
        } else {
            this.checkPlayerSetupCompletion(player)
        }
    }
    checkPlayerSetupCompletion(player){
        console.log("Setup completed for", player.username);
        const otherPlayer = this.users.find(u => u.username !== player.username);
        
        if (this.game.playersSetupComplete[this.game.getPlayerColorIndex(otherPlayer.username)]) { //the other player has completed their setup
            console.log("Both players have completed their setup")
            const playerBoardState = this.game.getColorState(this.game.getPlayerColorIndex(player.username));
            const otherPlayerBoardState = this.game.getColorState(this.game.getPlayerColorIndex(otherPlayer.username));
            
            this.server.routeMessage(player.websocket, { type: "both-setup-complete", board: playerBoardState });
            this.server.routeMessage(otherPlayer.websocket, { type: "both-setup-complete", board: otherPlayerBoardState });
        } else {
            this.server.routeMessage(otherPlayer.websocket, { type: "opponent-setup-complete", message: "Your opponent has completed their setup." });
        }
    }
}



module.exports = GameCoordinator;