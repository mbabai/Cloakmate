const game = require('./gameEngine');
const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

class Lobby{
  constructor() {
    this.WStoUsername = new Map() // get a username from a web socket
    this.Users = new Map() // get all player data (including WS) from username
    this.quickplayQueue = []
    this.anonID = 0
    this.games = new Map()
    this.gameNumber = 0

    this.heartbeat = setInterval(this.pulse,2000,this)
  }   


  pulse(lobby){
    lobby.logState(lobby)
    lobby.matchQuickPlay(lobby)
  }

  logState(lobby){
    //TODO -------------------------------------------------FIX THIS FUNCTION!
    const keysArray = Array.from(lobby.Users.keys());
    const lobbyNameList = keysArray.join(', ')
    console.log(`Lobby (${lobby.Users.size} users): ${lobbyNameList}`)
    const queueNameList = lobby.quickplayQueue.map(user => user.username).join(', ')
    console.log(`Queue (${lobby.quickplayQueue.length} users): ${queueNameList}`)
    console.log("Games:")
    lobby.games.forEach((value, key) => {
      if(value.winner == null) {console.log(`${value.gameNumber}. ${value.log()}`)};
    });
    // wss.clients.size;
    console.log("-----------------")
  }

  matchQuickPlay(lobby){
    while(lobby.quickplayQueue.length > 1){
      let p1name = lobby.quickplayQueue[0].username
      let p2name = lobby.quickplayQueue[1].username
      lobby.connectMatch(p1name,p2name,5)
      lobby.removeFromQueue(p1name)
      lobby.removeFromQueue(p2name)
    }
  }

  getPlayerList(){
    const userList = [];
    this.Users.forEach((value, key) => {
        userList.push({
            username: key,
            inGame: value.inGame // Assuming 'inGame' is a property of the map's values
        });
    });
    return userList;
  }

  getLobbyUser(username){
    return this.Users.get(username)
  }
  
  getLobbyUsernameFromWS(ws){
    return this.WStoUsername.get(ws)
  }
  
  tryAdduser(ws,username){
    let newName = username.slice(0,18)
    if(this.isUserInLobby(newName)){
      console.debug(`Name "${newName}" already taken.`)
      return null;
    } else {
      console.log(`Adding player "${newName}"`)
      return this.addLobbyUser(ws,newName);
    }
  }

  isUserInLobby(username){
    return this.Users.has(username)
  }
  
  addLobbyUser(ws,username,inGame=false){
    if(username == ""){
      username = "anon"+(++this.anonID)
    }
    this.WStoUsername.set(ws,username)
    this.Users.set(username,{ws,inGame})
    return username
  }
  
  removeLobbyUser(ws) {
    const username = this.WStoUsername.get(ws);
    if (username) {
      if(this.Users.get(username).inGame){ //Give the other player the win.
        try{
          const gameNumber = this.Users.get(username).inGame;
          let thisGame = this.games.get(gameNumber)
          const otherPlayer = thisGame.getOtherPlayer(username)
          thisGame.declareWinner(otherPlayer)
          this.Users.get(username).inGame = false;
          this.Users.get(otherPlayer).ws.send(JSON.stringify({type:"opponent-disconnect"}))
        } catch (error){
          console.log("Cannot give opponent the win.")
        }
      }
      this.removeFromQueue(username); // Also remove from queue
      this.WStoUsername.delete(ws);
      this.Users.delete(username);
      console.log(`Removed ${username} from lobby.`);
    }
  }

  addToQueue(username) {
    if (!this.quickplayQueue.includes(username)) {
      const nowTime = Date.now()
      this.quickplayQueue.push({username:username,timestamp:nowTime});
      console.log(`Added ${username} to quickplay queue.`);
    }
  }

  removeFromQueue(username) {
    this.quickplayQueue = this.quickplayQueue.filter(user => user.username !== username)
    console.log(`Removed ${username} from quickplay queue.`);
  }
  invitePlayer(username){
    if(!this.Users.has(username)) return "not-found";
    const thisPlayer = this.getLobbyUser(username)
    if (thisPlayer.inGame) return "in-game";
    return "found"
  }

  startMatch(p1username,p2username,length){
    this.gameNumber++
    this.games.set(this.gameNumber,new game.Game(p1username,p2username,length,this.gameNumber))
    this.games.get(this.gameNumber).randomizePlayerColor()
    return {gameNumber:this.gameNumber,white:this.games.get(this.gameNumber).players[0],black:this.games.get(this.gameNumber).players[1]}
  }

  connectMatch(p1name,p2name,length){
    let game = lobby.startMatch(p1name,p2name,length)
    let p1 = lobby.getLobbyUser(game.white)
    let p2 = lobby.getLobbyUser(game.black)
    p1.ws.send(JSON.stringify({type:"match",myColor:"white",whitePlayer:game.white, blackPlayer:game.black, length:length,gameNumber:game.gameNumber}))
    p2.ws.send(JSON.stringify({type:"match",myColor:"black",whitePlayer:game.white, blackPlayer:game.black, length:length,gameNumber:game.gameNumber}))
  }
}

let lobby = new Lobby()

// Serve static files from the 'public' directory
app.use(express.static('public'));

// WebSocket setup
wss.on('connection', function connection(ws,req) {
  // const ip = req.socket.remoteAddress;
  // console.log(`New connection from ${ip}`);
  ws.on('message', function incoming(message) {
      console.log('received: %s', message);
      const json = JSON.parse(message)
      routeMessage(ws, json)
  });
  ws.on('close', function close(){
    lobby.removeLobbyUser(ws)
  })
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

const socket = new WebSocket(`ws://localhost:${port}`);

socket.onmessage = (event) => {
  console.log('Message from server ', event.data);
};

socket.onopen = () => {
  // socket.send({type:"message", message:'Web Sockets Live!'});
};

socket.on('close', function close() {
  console.log('Connection closed');
  // Optionally handle reconnections or clean up resources
});


function routeMessage(ws, message){ //TODO --------------------------------
  let p1 = null;
  let p2 = null;
  switch(message.type){
    case "check-username":
      let newName = lobby.tryAdduser(ws, message.username)
      if(newName){
        ws.send(JSON.stringify({type:"username-status", status:"accepted",username:newName}))
      } else {
        ws.send(JSON.stringify({type:"username-status", status:"taken"}));
      }
      break;
    case "request-players":
      const playerList = lobby.getPlayerList()
      ws.send(JSON.stringify({type:"players-list", players:playerList}))
      break;
    case "quickplay-queue":
      lobby.addToQueue(message.username)
      break;
    case "quickplay-cancel":
      lobby.removeFromQueue(message.username)
      break;
    case "find-opponent":
      let playerStatus = lobby.invitePlayer(message.opponentName,message.length)
      if(playerStatus == "not-found"){
        ws.send(JSON.stringify({type:"decline", reason:"not-found", username:message.opponentName}))
      } else if(playerStatus == "in-game") {
        ws.send(JSON.stringify({type:"decline", reason:"in-game", username:message.opponentName}))
      }else if(playerStatus == "found") {
        p2 = lobby.getLobbyUser(message.opponentName)
        p2.ws.send(JSON.stringify({type:"game-invite", length:message.length, username:message.username}))
      }
      break;
    case "decline":
      if (!lobby.isUserInLobby(message.opponentUsername)) break;
      p1 = lobby.getLobbyUser(message.opponentUsername)
      p1.ws.send(JSON.stringify({type:"decline", reason:"decline"}))
      break;
    case "accept":
      if (!lobby.isUserInLobby(message.opponentUsername)){ // in case somehow that user is not found.
        ws.send(JSON.stringify({type:"decline", reason:"not-found", username:message.opponentName}))
        break;
      } 
      p2username = lobby.getLobbyUsernameFromWS(ws)
      lobby.connectMatch(message.opponentUsername,p2username,message.length)
      break;
    case "entered-game":
      lobby.addLobbyUser(ws,message.username,parseInt(message.gameNumber)) // this will overwrite others with the same name, but no one else should have it. 
      console.log(`${message.username} has entered a game!`)
      break;
    case "check-game-exists":
      const gameNumber = message.gameNumber;
      if(!lobby.games.has(gameNumber) || lobby.games.get(gameNumber).winner !== null){
        ws.send(JSON.stringify({type:"game-not-exist"}))
      }
      break;
    case "ready-to-play":
      let playerName = lobby.getLobbyUsernameFromWS(ws)
      let thisGame = lobby.games.get(lobby.getLobbyUser(playerName).inGame)
      let otherPlayer = thisGame.getOtherPlayer(playerName)
      let playerColorIndex = thisGame.getPlayerColorIndex(playerName)
      lobby.getLobbyUser(otherPlayer).ws.send(JSON.stringify({type:"opponent-ready",opponentColor:playerColorIndex}))
      break;
    default:
      break;
  }
}


// Global 

// thisBoard.printBoard()
// console.log("GAME START!!!")
// //place pieces - white
// thisBoard.moveStashPieceToBoard(game.colors.WHITE,game.pieces.KING,0,0)
// thisBoard.moveStashPieceToBoard(game.colors.WHITE,game.pieces.BOMB,1,0)
// thisBoard.moveStashPieceToBoard(game.colors.WHITE,game.pieces.BISHOP,2,0)
// thisBoard.moveStashPieceToBoard(game.colors.WHITE,game.pieces.KNIGHT,3,0)
// thisBoard.moveStashPieceToBoard(game.colors.WHITE,game.pieces.KNIGHT,4,0)
// thisBoard.moveStashPieceToOnDeck(game.colors.WHITE,game.pieces.ROOK)

// //place pieces - black
// thisBoard.moveStashPieceToBoard(game.colors.BLACK,game.pieces.KING,0,4)
// thisBoard.moveStashPieceToBoard(game.colors.BLACK,game.pieces.BOMB,1,4)
// thisBoard.moveStashPieceToBoard(game.colors.BLACK,game.pieces.BISHOP,2,4)
// thisBoard.moveStashPieceToBoard(game.colors.BLACK,game.pieces.KNIGHT,3,4)
// thisBoard.moveStashPieceToBoard(game.colors.BLACK,game.pieces.KNIGHT,4,4)
// thisBoard.moveStashPieceToOnDeck(game.colors.BLACK,game.pieces.ROOK)
// thisBoard.printBoard()
// thisBoard.saveStartingBoard()
// console.log("Move 1")
// thisBoard.takeAction(new game.Action(game.actions.MOVE,game.colors.WHITE,0,0,game.pieces.BISHOP,2,2)) //real move
// console.log("Move 2")
// thisBoard.takeAction(new game.Action(game.actions.MOVE,game.colors.BLACK,4,4,game.pieces.KNIGHT,3,2)) // real move
// console.log("Move 3")
// thisBoard.takeAction(new game.Action(game.actions.CHALLENGE,game.colors.WHITE))
// console.log("Move 4")
// thisBoard.takeAction(new game.Action(game.actions.SACRIFICE,game.colors.WHITE,4,0))
// console.log("Move 5")
// thisBoard.takeAction(new game.Action(game.actions.ONDECK,game.colors.BLACK,null,null,game.pieces.BISHOP))
// console.log("Move 6")
// thisBoard.takeAction(new game.Action(game.actions.MOVE,game.colors.WHITE,2,2,game.pieces.ROOK,3,2)) // real move
// console.log("Move 7")
// thisBoard.takeAction(new game.Action(game.actions.CHALLENGE,game.colors.BLACK))
// console.log("Move 8")
// thisBoard.takeAction(new game.Action(game.actions.MOVE,game.colors.BLACK,3,2,game.pieces.ROOK,3,0)) // real move
// console.log("Move 9")
// thisBoard.takeAction(new game.Action(game.actions.BOMB,game.colors.WHITE))
// console.log("Move 10")
// thisBoard.takeAction(new game.Action(game.actions.CHALLENGE,game.colors.BLACK))
// console.log("Move 11")
// thisBoard.takeAction(new game.Action(game.actions.SACRIFICE,game.colors.WHITE,1,0))
// console.log("Move 12")
// thisBoard.takeAction(new game.Action(game.actions.MOVE,game.colors.WHITE,2,0,game.pieces.KING,3,0))
// console.log("Move 13")
// thisBoard.takeAction(new game.Action(game.actions.CHALLENGE,game.colors.BLACK))


