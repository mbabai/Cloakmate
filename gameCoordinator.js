const { Game , Action , Board } = require('./gameEngine');
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
        this.lastActionTime = Date.now(); //Use this to track the clock.
        this.server = server;
        this.broadcastGameState()
        this.gameLoopInterval = null; // Add this line
        this.startGameLoop(); // Add this line
    }
    startGameLoop() {
        const gameLoop = () => {
            if (this.game.board.phase === 'setup') {
                this.checkSetupTimeout();
            }
            if (this.game.board.phase === 'playing') {
                this.checkTurnTimeout();
            }
        };
        this.gameLoopInterval = setInterval(gameLoop, 100); // Run the game loop 10x/second
    }
    checkSetupTimeout() {
        if (Date.now() - this.lastActionTime >= 30100) {
            this.checkAndCompleteSetups();
        }
    }
    checkTurnTimeout() {
        const currentPlayerIndex = this.game.getPlayerColorIndex(this.users[this.game.playerTurn].username);
        const playerRemainingTime = this.game.playersTimeAvailable[currentPlayerIndex];
        if (Date.now() - this.lastActionTime >= playerRemainingTime) {
            console.log('Turn timeout reached. Ending game.');
            this.game.declareWinner(this.game.getOtherPlayer(this.users[this.game.playerTurn].username))    
            this.endGame();
        }
    }
    stopGameLoop() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    endGame() {
        this.stopGameLoop();
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
    gameAction(player,data){
        const playerColorIndex = this.game.getPlayerColorIndex(player.username)
        const details = data.details
        const thisAction = new Action(data.action,playerColorIndex,details.x1,details.y1,details.declaration,details.x2,details.y2)
        const isActionSuccessful = this.game.board.takeAction(thisAction)
        if (isActionSuccessful) {
            this.updatePlayerTime(playerColorIndex)
            this.broadcastGameState()
        } else {
            this.server.routeMessage(player.websocket, { type: "illegal-action", message: "Your action was illegal. Please try again." });
        }
    }
    updatePlayerTime(playerColorIndex){
        const turnTime = Date.now() - this.lastActionTime;
        this.game.playersTimeAvailable[playerColorIndex] -= turnTime;
        this.lastActionTime = Date.now();
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
    checkAndCompleteSetups() {
        for (let i = 0; i < 2; i++) {
            if (!this.game.playersSetupComplete[i]) {
                console.log(`Player ${this.users[i].username} has not completed setup. Submitting random setup.`);
                this.randomSetup(this.users[i]);
            }
        }
        this.lastActionTime = Date.now();
    }
    checkPlayerSetupCompletion(player){
        console.log("Setup completed for", player.username);
        const otherPlayer = this.users.find(u => u.username !== player.username);
        
        if (this.game.playersSetupComplete[this.game.getPlayerColorIndex(otherPlayer.username)]) { //the other player has completed their setup
            console.log("Both players have completed their setup")
            const playerBoardState = this.game.getColorState(this.game.getPlayerColorIndex(player.username));
            const otherPlayerBoardState = this.game.getColorState(this.game.getPlayerColorIndex(otherPlayer.username));
            this.game.playStartTime = Date.now();
            this.lastActionTime = Date.now();
            this.server.routeMessage(player.websocket, { type: "both-setup-complete", board: playerBoardState });
            this.server.routeMessage(otherPlayer.websocket, { type: "both-setup-complete", board: otherPlayerBoardState });
        } else {
            this.server.routeMessage(otherPlayer.websocket, { type: "opponent-setup-complete", message: "Your opponent has completed their setup." });
        }
    }
   
}



module.exports = GameCoordinator;