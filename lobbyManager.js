const LobbyUser = require('./lobbyUser')
const GameCoordinator = require('./gameCoordinator')
const AIBot = require('./AIBot')
//lobby
class LobbyManager {
    constructor(server) {
        this.server = server
        this.lobby = new Map() // ws -> user
        this.activeBots = []
        this.queue = []
        this.anonID = 0
        this.invites = [] // {from:user, to:user}
        this.wsToGame = new Map() // ws-> game
        this.games = []
        this.gameNumber = 0
        this.heartbeat = setInterval(this.pulse.bind(this), 2000)
        this.bots = ["EasyBot"]
      }   

      pulse(){
        this.logState()
        this.quickplayMatch()
        this.cleanUpCompletedGames()
        this.broadcastLobbyState()
      }
      broadcastLobbyState(){
        const lobbyState = {
          lobbyCount: this.lobby.size - this.activeBots.length, //count number of players in lobby, but don't count bots. 
          queueCount: this.queue.length,
          inGameCount: this.games.reduce((count, game) => count + game.users.length, 0)
        };

        this.lobby.forEach((user, ws) => {
          this.server.routeMessage(ws, {
            type: 'lobby-state-update',
            lobbyState: lobbyState
          });
        });
      }
      cleanUpCompletedGames(){
        this.games = this.games.filter(game => {
          if (game.isComplete) {
            console.log(`Cleaning up completed game #${game.gameNumber}`);
            this.wsToGame.delete(game.users[0].websocket);
            this.wsToGame.delete(game.users[1].websocket);
            game.users[0].isInGame = false;
            game.users[1].isInGame = false;
            return false;
          }
          return true;
        });
      }

      addUserToQueue(user){
        if (this.queue.includes(user)) {
            console.log(`User ${user.username} is already in the queue.`);
            return;
        }
        this.queue.push(user);
        user.isInQueue = true;
      }
      removeUserFromQueue(user){
        if (this.queue.includes(user)) {
            this.queue.splice(this.queue.indexOf(user), 1);
            user.isInQueue = false; 
        }
      }
   
      addUser(user){
        this.lobby.set(user.websocket, user);
      }
      getPlayerFromWS(ws){
        return this.lobby.get(ws);
      }
      disconnect(ws){
        let user = this.lobby.get(ws)
        this.removeUserFromQueue(user);
        this.lobby.delete(ws);
        // Check if the user is in any games
        if (this.wsToGame.has(ws)) {
            const game = this.wsToGame.get(ws);
            const opponent = game.users.find(u => u.websocket !== ws);
            
            if (opponent) {
                // Send disconnect message to the opponent
                this.server.routeMessage(opponent.websocket, {
                    type: 'opponent-disconnected',
                    message: `${user.username} has disconnected from the game.`
                });
            }
            this.endGame(game);
            console.log(`Game #${game.gameNumber} ended due to ${user.username}'s disconnection.`);
        }
      }
      receiveUsername(ws, message){
        console.log(`Received username: ${message.username}`);
        let username = this.generateCleanUsername(message.username);
        if(this.checkNameIsTaken(username)){
          this.server.routeMessage(ws, {type: 'usernameTaken', username:username});
          return;
        }
        this.lobby.set(ws, new LobbyUser(ws, username));
        this.server.routeMessage(ws, {type: 'welcome', username});
      }
      checkNameIsTaken(username){
        //check if username is taken
        if (this.bots.some(word => username.includes(word))) {
            return false;
        }
        return Array.from(this.lobby.values()).some(user => user.username === username);
      }
      generateCleanUsername(username){
        if (!username || username.trim() === '') {
          return `anon${++this.anonID}`
        }
        return username.trim();
      }
      enterQueue(ws,data){
        this.addUserToQueue(this.lobby.get(ws));
      }
      exitQueue(ws,data){
        const user = this.lobby.get(ws);
        if (user) {
            this.removeUserFromQueue(user);
            console.log(`User ${user.username} removed from queue.`);
        } else {
            console.log(`User not found in lobby for the given WebSocket connection.`);
        }
      }
      getUserByName(name){
        return Array.from(this.lobby.values()).find(user => user.username === name);
      }
      cancelInvite(ws,data){
        let thisUser = this.lobby.get(ws);
        let invite = this.invites.find(invite => invite.from === thisUser);
        if (invite) {
          console.log(`Cancelling invite from ${thisUser.username} to ${invite.to.username}.`); 
          this.invites.splice(this.invites.indexOf(invite), 1);
        }
      }
      botReadyForGame(ws,data){
        let thisBot = data.bot;
        thisBot.websocket = ws;
        let user = this.getUserByName(data.opponentName);
        this.lobby.set(ws,  thisBot)
        this.activeBots.push(thisBot)
        console.log(`Sending AI-Bot game invite: from ${user.username} to ${thisBot.username}`);
        this.server.routeMessage(thisBot.websocket, {type: 'invite', opponentName: user.username, gameLength: 15});
        this.invites.push({from:user, to:thisBot, gameLength: 15}); //Bot games are always 15.
      }
      createBotForBotGame(user,botName){
        let thisBot = new AIBot('ws://localhost:8080', botName, user.username);
        return thisBot;
      }
      deleteBot(ws){
        let thisBot = this.lobby.get(ws)
        this.lobby.delete(ws)
        if (this.activeBots.includes(thisBot)) {
          this.activeBots.splice(this.queue.indexOf(thisBot), 1);
        }
      }
      inviteOpponent(ws,data){
        let thisUser = this.lobby.get(ws);
        let opponentName = data.opponentName;
        if(this.bots.includes(opponentName)){ //Check if the opponent is a bot.
          this.createBotForBotGame(thisUser,opponentName)
          return;
        }
        let opponent = this.getUserByName(opponentName);
        if (!opponent) {
          console.log(`User ${opponentName} not found in lobby.`);
          this.server.routeMessage(ws, {type: 'inviteFailed', message: `User ${opponentName} not found in lobby.`});
          return;
        }
        console.log(`Sending invite from ${thisUser.username} to ${opponentName}`);
        this.server.routeMessage(opponent.websocket, {type: 'invite', opponentName: thisUser.username, gameLength: data.gameLength});
        this.invites.push({from:thisUser, to:opponent, gameLength: data.gameLength});
      }
      acceptInvite(ws,data){
        let thisUser = this.lobby.get(ws);
        let opponentName = data.opponentName;
        let opponent = this.getUserByName(opponentName);
        let invite = this.invites.find(inv => inv.from === opponent && inv.to === thisUser);
        if (invite) {
            console.log(`Accepting invite from ${opponentName} to ${thisUser.username}`);
            this.invites.splice(this.invites.indexOf(invite), 1);
            this.startGame(thisUser, opponent, invite.gameLength);  // Assuming 5 is the default game length
        } else {
            console.log(`Invite from ${opponentName} to ${thisUser.username} no longer exists`);
            this.server.routeMessage(ws, {type: 'inviteExpired', message: 'The invite no longer exists.'});
        }
      }
      declineInvite(ws,data){
        let thisUser = this.lobby.get(ws);
        let opponentName = data.opponentName;
        let opponent = this.getUserByName(opponentName);
        let invite = this.invites.find(inv => inv.from === opponent && inv.to === thisUser);
        if (invite) {
            console.log(`Declining invite from ${opponentName} to ${thisUser.username}`);
            this.invites.splice(this.invites.indexOf(invite), 1);
            this.server.routeMessage(opponent.websocket, {type: 'inviteDeclined', opponentName: thisUser.username});
        }
      }

      quickplayMatch(){
        if (this.queue.length >= 2) {
          let user1 = this.queue.shift();
          let user2 = this.queue.shift();
          this.startGame(user1,user2,5);
        }
      }

      startGame(user1,user2,length){
        this.removeUserFromQueue(user1);
        this.removeUserFromQueue(user2);
        console.log(`Starting game between ${user1.username} and ${user2.username}`);
        let game = new GameCoordinator(user1,user2,length, ++this.gameNumber, this.server);
        this.wsToGame.set(user1.websocket, game);
        this.wsToGame.set(user2.websocket, game);
        user1.isInGame = true;
        user2.isInGame = true;
        this.games.push(game);
      }
      gameAction(ws,data){
        let game = this.wsToGame.get(ws);
        let player = this.getPlayerFromWS(ws);
        game.gameAction(player,data);
      }
      submitSetup(ws,data){
        let game = this.wsToGame.get(ws);
        let player = this.getPlayerFromWS(ws);
        game.submitSetup(player,data);
      }
      randomSetup(ws,data){
        let game = this.wsToGame.get(ws);
        let player = this.getPlayerFromWS(ws);
        game.randomSetup(player);
      }
      endGame(game){
        game.endGame()
        this.games.splice(this.games.indexOf(game), 1);
        game.users[0].isInGame = false;
        game.users[1].isInGame = false;
        this.wsToGame.delete(game.users[0].websocket);
        this.wsToGame.delete(game.users[1].websocket);
      }

      logState(){
        // console.clear();
        console.log(`Current Lobby State (${new Date().toLocaleString()}):`)
        console.log(`- Lobby (${this.lobby.size}): ${Array.from(this.lobby.values()).map(user => `${user.username}${user.isInGame ? "*": ""}`).join(', ')}`);
        console.log(`- Queue (${this.queue.length}): ${this.queue.map(user => user.username).join(', ')}`);
        console.log(`- Games (${this.games.length}): ${this.games.map(game => `${game.logGameState()}`).join('\n\t')}`)
        // this.games.forEach((game, index) => {
        //   console.log(game.logGameState())
        //   game.game.board.printBoard()
        // });
      }
}

module.exports = LobbyManager;