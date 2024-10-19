const LobbyUser = require('./lobbyUser')
const GameCoordinator = require('./gameCoordinator')
const AIBot = require('./AIBot')
//lobby
class LobbyManager {
    constructor(server) {
        this.server = server
        this.lobby = new Map() // userID -> user
        this.queue = []
        this.anonID = 0
        this.invites = [] // {from:user, to:user}
        this.userIDToGame = new Map() // userID -> game
        this.games = []
        this.gameNumber = 0
        this.heartbeat = setInterval(this.pulse.bind(this), 2000)
        this.bots = ["EasyBot"]
        this.cullTime = 60000 // 1 minute until we cull disconnected users.
      }   

      pulse(){
        this.logState()
        this.quickplayMatch()
        this.cleanUpCompletedGames()
        this.broadcastLobbyState()
        this.cullDisconnectedUsers()
      }
      cullDisconnectedUsers(){
        this.lobby.forEach((user, userID) => {
          if (!user.isConnected && user.lastConnected < new Date(Date.now() - this.cullTime)) {
            this.removeUserFromLobby(userID);
          }
        });
      }
      removeUserFromLobby(userID){
        this.lobby.delete(userID);
        this.removeUserFromQueue(userID);
        let game = this.userIDToGame.delete(userID);
        if (game){
          const opponent = game.users.find(u => u.userID !== userID); 
          if (opponent) {
              // Send disconnect message to the opponent
              this.server.routeMessage(opponent.userID, {
                  type: 'opponent-disconnected',
                  message: `${user.username} has disconnected from the game.`
              });
          }
          this.endGame(game);
        }
      }
      countActiveBots() {
        let botCount = 0;
        this.lobby.forEach((user, userID) => {
          if (this.bots.includes(user.username)) {
            botCount++;
          }
        });
        return botCount;
      }
      broadcastLobbyState(){
        const lobbyState = {
          lobbyCount: this.lobby.size - this.countActiveBots(), //count number of players in lobby, but don't count bots. 
          queueCount: this.queue.length,
          inGameCount: this.games.reduce((count, game) => count + game.users.length, 0) - this.countActiveBots()
        };

        this.lobby.forEach((user, userID) => {
          this.server.routeMessage(userID, {
            type: 'lobby-state-update',
            lobbyState: lobbyState
          });
        });
      }
      cleanUpCompletedGames(){
        this.games = this.games.filter(game => {
          if (game.isComplete) {
            console.log(`Cleaning up completed game #${game.gameNumber}`);
            this.userIDToGame.delete(game.users[0].userID);
            this.userIDToGame.delete(game.users[1].userID);
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
   
      addUserToLobby(user){
        this.lobby.set(user.userID, user);
      }
      getPlayerFromUserID(userID){
        return this.lobby.get(userID);
      }
      userConnects(userID,data){
        const user = this.lobby.get(userID);
        if (user) {
            user.isConnected = true;
            user.lastConnected = null;
            console.log(`User ${user.username} reconnected.`);
        }
        const game = this.userIDToGame.get(userID);
        if (game){
          this.reconnectUserToGame(userID,game);
        }
      }
      reconnectUserToGame(userID,game){
        console.log(`Reconnecting user ${userID} to game #${game.gameNumber}`);
        const playerIndex = game.users.findIndex(user => user.userID === userID);
        if (playerIndex !== -1) {
          game.sendColorState(playerIndex);
        } else {
          console.error(`User ${userID} not found in game #${game.gameNumber}`);
        }
      }
      disconnect(userID){
        let user = this.lobby.get(userID)
        this.removeUserFromQueue(user);
        user.isConnected = false;
        user.lastConnected = new Date();
        // Check if the user is in any games
        if (this.userIDToGame.has(userID)) {
          const game = this.userIDToGame.get(userID);
          const opponent = game.users.find(u => u.userID !== userID);
          
          if (opponent) {
            // Send disconnect message to the opponent
            this.server.routeMessage(opponent.userID, {
                type: 'opponent-disconnected',
                message: `Waiting for ${user.username} to reconnect.`
            });
          }
        }
      }
      receiveUsername(userID, message){
        console.log(`Received username: ${message.username}`);
        let username = this.generateCleanUsername(message.username);
        if(this.checkNameIsTaken(username)){
          this.server.routeMessage(userID, {type: 'usernameTaken', username:username});
          return;
        }
        this.addUserToLobby(new LobbyUser(userID, username));
        this.server.routeMessage(userID, {type: 'welcome', username});
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
      enterQueue(userID,data){
        this.addUserToQueue(this.lobby.get(userID));
      }
      exitQueue(userID,data){
        const user = this.lobby.get(userID);
        if (user) {
            this.removeUserFromQueue(user);
            console.log(`User ${user.username} removed from queue.`);
        } else {
            console.log(`User not found in lobby for the given userID connection.`);
        }
      }
      getUserByName(name){
        return Array.from(this.lobby.values()).find(user => user.username === name);
      }
      cancelInvite(userID,data){
        let thisUser = this.lobby.get(userID);
        let invite = this.invites.find(invite => invite.from === thisUser);
        if (invite) {
          console.log(`Cancelling invite from ${thisUser.username} to ${invite.to.username}.`); 
          this.invites.splice(this.invites.indexOf(invite), 1);
        }
      }
      botReadyForGame(userID,data){
        let thisBot = data.bot;
        thisBot.userID = userID;
        let user = this.getUserByName(data.opponentName);
        this.lobby.set(userID,  thisBot)
        console.log(`Sending AI-Bot game invite: from ${user.username} to ${thisBot.username}`);
        this.server.routeMessage(thisBot.userID, {type: 'invite', opponentName: user.username, gameLength: 15});
        this.invites.push({from:user, to:thisBot, gameLength: 15}); //Bot games are always 15.
      }
      createBotForBotGame(user,botName){
        let thisBot = new AIBot('ws://localhost:8080', botName, user.username);
        return thisBot;
      }
      inviteOpponent(userID,data){
        let thisUser = this.lobby.get(userID);
        let opponentName = data.opponentName;
        if(this.bots.includes(opponentName)){ //Check if the opponent is a bot.
          this.createBotForBotGame(thisUser,opponentName)
          return;
        }
        let opponent = this.getUserByName(opponentName);
        if (!opponent) {
          console.log(`User ${opponentName} not found in lobby.`);
          this.server.routeMessage(userID, {type: 'inviteFailed', message: `User ${opponentName} not found in lobby.`});
          return;
        }
        console.log(`Sending invite from ${thisUser.username} to ${opponentName}`);
        this.server.routeMessage(opponent.userID, {type: 'invite', opponentName: thisUser.username, gameLength: data.gameLength});
        this.invites.push({from:thisUser, to:opponent, gameLength: data.gameLength});
      }
      acceptInvite(userID,data){
        let thisUser = this.lobby.get(userID);
        let opponentName = data.opponentName;
        let opponent = this.getUserByName(opponentName);
        let invite = this.invites.find(inv => inv.from === opponent && inv.to === thisUser);
        if (invite) {
            console.log(`Accepting invite from ${opponentName} to ${thisUser.username}`);
            this.invites.splice(this.invites.indexOf(invite), 1);
            this.startGame(thisUser, opponent, invite.gameLength);  // Assuming 5 is the default game length
        } else {
            console.log(`Invite from ${opponentName} to ${thisUser.username} no longer exists`);
            this.server.routeMessage(userID, {type: 'inviteExpired', message: 'The invite no longer exists.'});
        }
      }
      declineInvite(userID,data){
        let thisUser = this.lobby.get(userID);
        let opponentName = data.opponentName;
        let opponent = this.getUserByName(opponentName);
        let invite = this.invites.find(inv => inv.from === opponent && inv.to === thisUser);
        if (invite) {
            console.log(`Declining invite from ${opponentName} to ${thisUser.username}`);
            this.invites.splice(this.invites.indexOf(invite), 1);
            this.server.routeMessage(opponent.userID, {type: 'inviteDeclined', opponentName: thisUser.username});
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
        this.userIDToGame.set(user1.userID, game);
        this.userIDToGame.set(user2.userID, game);
        user1.isInGame = true;
        user2.isInGame = true;
        this.games.push(game);
      }
      gameAction(userID,data){
        let game = this.userIDToGame.get(userID);
        let player = this.getPlayerFromUserID(userID);
        game.gameAction(player,data);
      }
      submitSetup(userID,data){
        let game = this.userIDToGame.get(userID);
        let player = this.getPlayerFromUserID(userID);
        game.submitSetup(player,data);
      }
      randomSetup(userID,data){
        let game = this.userIDToGame.get(userID);
        let player = this.getPlayerFromUserID(userID);
        game.randomSetup(player);
      }
      endGame(game){
        game.endGame()
        this.games.splice(this.games.indexOf(game), 1);
        game.users[0].isInGame = false;
        game.users[1].isInGame = false;
        this.userIDToGame.delete(game.users[0].userID);
        this.userIDToGame.delete(game.users[1].userID);
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