const lobbyUser = require('./lobbyUser')

//lobby
class LobbyManager {
    constructor(server) {
        this.server = server
        this.lobby = new Map() // ws -> user
        this.queue = []
        this.anonID = 0
        this.games = new Map() // Game Numer -> game
        this.gameNumber = 0
        this.heartbeat = setInterval(this.pulse,2000,this)
      }   

      pulse(lobbyManager){
        lobbyManager.logState(lobbyManager)
      }

      addUserToQueue(user){
        if (this.queue.includes(user)) {
            console.log(`User ${user.username} is already in the queue.`);
            return;
        }
        this.queue.push(user);
      }
      removeUserFromQueue(user){
        this.queue.splice(this.queue.indexOf(user), 1);
      }
   
      addUser(user){
        this.lobby.set(user.websocket, user);
      }
      disconnect(ws, message){
        let user = this.lobby.get(ws)
        this.removeUserFromQueue(user);
        this.lobby.delete(ws);
      }
      receiveUsername(ws, message){
        console.log(`Received username: ${message.username}`);
        let username = this.generateCleanUsername(message.username);
        if(this.checkNameIsTaken(username)){
          this.server.routeMessage(ws, {type: 'usernameTaken', username:username});
          return;
        }
        this.lobby.set(ws, new lobbyUser(ws, username));
        this.server.routeMessage(ws, {type: 'welcome', username});
      }
      checkNameIsTaken(username){
        //check if username is taken
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

      logState(){
        console.log("Current Lobby State:");
        console.log(`- Lobby (${this.lobby.size}): ${Array.from(this.lobby.values()).map(user => user.username).join(', ')}`);
        console.log(`- Queue (${this.queue.length}): ${this.queue.map(user => user.username).join(', ')}`);
      }
}

module.exports = LobbyManager;