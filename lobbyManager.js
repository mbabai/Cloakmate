//lobby
class LobbyManager {
    constructor(server) {
        this.server = server
        this.SessionIDtoUsername = new Map() // get a username from a sessionID
        this.users = new Map() // get all player data (including SessionID) from username
        this.quickplayQueue = []
        this.anonID = 0
        this.games = new Map() // Game Numer -> game
        this.playersToGame = new Map() // Player Name -> Game
        this.gameNumber = 0
        this.heartbeat = setInterval(this.pulse,2000,this)
      }   

      pulse(lobbyManager){
        lobbyManager.logState(lobbyManager)
        lobbyManager.matchQuickPlay(lobbyManager)
      }

      receiveUsername(message){
        console.log(message.username)
        let username = message.username
        let sessionID = message.sessionID
        if (!username || username.trim() === '') {
            username = `anon${++this.anonID}`;
        }

        // Check if this sessionID already has a username
        const existingUsername = this.SessionIDtoUsername.get(sessionID);
        if (existingUsername) {
            // Remove the old username from users
            this.users.delete(existingUsername);
        }

        if (!this.users.has(username)) {
            this.users.set(username, {sessionID});
            this.SessionIDtoUsername.set(sessionID, username);
            
            this.server.routeMessage(sessionID, {type: 'welcome', username: username});
        } else {
            this.server.routeMessage(sessionID, {type: 'username-taken', username: username});
        }
      }
      enterQueue(message) {
        const username = message.username;
        const sessionID = message.sessionID;

        // Check if we have the user and a session with them
        if (this.users.has(username) && this.SessionIDtoUsername.get(sessionID) === username) {
          // Add the user to the queue only if they're not already in it
          if (!this.quickplayQueue.includes(username)) {
            this.quickplayQueue.push(username);
            this.server.routeMessage(sessionID, {type: 'queue-entered', username: username});
          } else {
            this.server.routeMessage(sessionID, {type: 'already-in-queue', username: username});
            console.log("Already in queue!!!")
          }
        } else {
          // If the user or session is invalid, send an error message
          this.server.routeMessage(sessionID, {type: 'invalid-session', username: username});
          console.log("Invalid Session!!!")
        }
      }
      exitQueue(message){
        this.quickplayQueue = this.quickplayQueue.filter(player => player !== message.username)
      }
      exitLobby(message){
        this.users.delete(message.username)
        this.SessionIDtoUsername.delete(message.sessionID)
      }
      matchQuickPlay(lobbyManager){
        if(lobbyManager.quickplayQueue.length >= 2){
          const gameCoordinator = new GameCoordinator()
          lobbyManager.games.set(lobbyManager.gameNumber,gameCoordinator)
          lobbyManager.gameNumber++
          //TODO: add players to gameCoordinator
          //TODO: remove players from quickplayQueue
          //TODO: send gameCoordinator to players
          //TODO: have players move to play.html
          //TODO: recover session with tokens
        }
      }
      attemptReconnect(message){
        let sessionID = message.token
        let username = this.SessionIDtoUsername.get(sessionID)
        if(username){
          this.server.routeMessage(sessionID, {type: 'reconnect', username: username})
        }
      }

      logState(lobbyManager){
        console.log(`Users: ${Array.from(lobbyManager.users.keys()).join(', ')}`)
        console.log(`Quickplay Queue: ${lobbyManager.quickplayQueue.join(', ')}`)
        console.log(`Games: ${Array.from(lobbyManager.games.entries()).map(([gameNumber, game]) => {
          const players = Array.from(lobbyManager.playersToGame.entries())
            .filter(([player, gameNum]) => gameNum === gameNumber)
            .map(([player]) => player);
          return `Game ${gameNumber}: ${players[0]} vs ${players[1]}`;
        }).join(', ')}`)
      }
}

module.exports = LobbyManager;