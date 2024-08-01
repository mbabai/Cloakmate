//lobby
class lobbyManager {
    constructor(server) {
        this.server = server
        this.WStoUsername = new Map() // get a username from a web socket
        this.Users = new Map() // get all player data (including WS) from username
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

      addPlayer(playerData){
        this.Users.set(playerData.username,playerData)
        this.WStoUsername.set(playerData.ws,playerData.username)
      }
      enterQueue(playerData){
        this.quickplayQueue.push(playerData.username)
      }
      exitQueue(playerData){
        this.quickplayQueue = this.quickplayQueue.filter(player => player !== playerData.username)
      }
      exitLobby(playerData){
        this.Users.delete(playerData.username)
        this.WStoUsername.delete(playerData.ws)
      }
      matchQuickPlay(lobbyManager){
        if(lobbyManager.quickplayQueue.length >= 2){
          const gameCoordinator = new gameCoordinator()
          lobbyManager.games.set(lobbyManager.gameNumber,gameCoordinator)
          lobbyManager.gameNumber++
          //TODO: add players to gameCoordinator
          //TODO: remove players from quickplayQueue
          //TODO: send gameCoordinator to players
          //TODO: have players move to play.html
          //TODO: recover session with tokens
        }
      }
}