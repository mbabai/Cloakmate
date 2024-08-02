const lobbyUser = require('./lobbyUser')

//lobby
class LobbyManager {
    constructor(server) {
        this.server = server
        this.allUsers = [] // get all player data (including SessionID) from username
        this.connectedUsers = [] // get all player data (including SessionID) from username
        this.quickplayQueue = []
        this.anonID = 0
        this.games = new Map() // Game Numer -> game
        this.gameNumber = 0
        this.heartbeat = setInterval(this.pulse,2000,this)
      }   

      pulse(lobbyManager){
        lobbyManager.checkForDisconnectedUsers()
        lobbyManager.purgeDisconnectedUsers()
        lobbyManager.logState(lobbyManager)
      }
      checkForDisconnectedUsers(){
        this.allUsers.forEach(user => {
          // this.server.routeMessage(user.sessionID, {type: 'ping', sendTime: new Date()})
        })
      }
      purgeDisconnectedUsers(){
      const currentTime = new Date();
      const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      this.allUsers = this.allUsers.filter(user => {
        const timeSinceLastUpdate = currentTime - user.updatedTime;
        if (timeSinceLastUpdate > twentyFourHours && !user.isConnected) {
          return false;
        }
        return true;
      });
      }
      getUser(searchValue){
        //Find a user by username or sessionID, update them to know about their current status
        let user = null;
        for (let i = 0; i < this.allUsers.length; i++) {
          if (this.allUsers[i].username === searchValue || this.allUsers[i].sessionID === searchValue) {
            user = this.allUsers[i];
          } else {
            return null;
          }
        }
        return user;
      }

      addUserToQuickplayQueue(user){
        if(user.isInQueue) return;;
        this.quickplayQueue.push(user);
        user.isInQueue = true;
        user.updatedTime = new Date();
      }
      removePlayerFromQuickplayQueue(user){
        this.quickplayQueue = this.quickplayQueue.filter(player => player !== user);
        user.isInQueue = false;
        user.updatedTime = new Date();
      }
      addUserToConnectedUsers(user){
        if(user.isConnected) return;
        this.connectedUsers.push(user);
        user.isConnected = true;
        user.updatedTime = new Date();
      }
      removeUserFromConnectedUsers(user){
        this.connectedUsers = this.connectedUsers.filter(player => player !== user);
        user.isConnected = false;
        this.removePlayerFromQuickplayQueue(user)
      }  
      addUserToAllUsers(user){
        this.allUsers.push(user);
        user.updatedTime = new Date();
      }
      disconnect(message){
        let sessionID = message.sessionID
        console.log(`Disconnecting user # ${sessionID}`)
        let user = this.getUser(sessionID)
        console.log(user)
        if (!user) return;
        console.log(`Disconnecting user: ${user.username}` )
        this.removeUserFromConnectedUsers(user)
      }
      attemptReconnect(message){
        let sessionID = message.sessionID
        let user = this.getUser(sessionID)
        if (!user) return;
        console.log(`Reconnecting user: ${user.username}`)
        this.addUserToConnectedUsers(user)
        this.server.routeMessage(sessionID, {type: 'reconnect', username: user.username})
      }
      receiveUsername(message){
        let username = this.generateCleanUsername(message.username) 
        let isNameTaken = this.checkNameIsTaken(username)
        let sessionID = message.sessionID
        let user = this.getUser(sessionID)
        if(!user){
          if(isNameTaken){
            this.server.routeMessage(sessionID, {type: 'username-taken', username})
            return;
          } else {
            let user = new lobbyUser(username,sessionID)
            this.addUserToAllUsers(user)
            this.addUserToConnectedUsers(user)
            this.server.routeMessage(sessionID, {type: 'welcome', username})
            return;
          }
        } else {
          if(isNameTaken){
            this.server.routeMessage(sessionID, {type: 'username-taken', username})
            return;
          } else {
            user.setUsername(username)
            this.server.routeMessage(sessionID, {type: 'welcome', username})
          }
        }
       
      }
      checkNameIsTaken(username){
        return this.allUsers.some(user => user.username === username);
      }
      generateCleanUsername(username){
        if (!username || username.trim() === '') {
          return `anon${++this.anonID}`
        }
        return username.trim();
      }

      logState(){
        console.log(`...All Users (${this.allUsers.length}): ${this.allUsers.map(user => user.username).join(', ')}`);
        console.log(`...Connected Users (${this.connectedUsers.length}): ${this.connectedUsers.map(user => user.username).join(', ')}`);
        console.log(`...Quickplay Queue (${this.quickplayQueue.length}): ${this.quickplayQueue.map(user => user.username).join(', ')}`);
      }
}

module.exports = LobbyManager;