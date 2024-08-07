const { Game } = require('./gameEngine');

//Game Arena - coordinates games between players
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

}

module.exports = GameCoordinator;