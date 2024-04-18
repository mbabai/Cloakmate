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
    this.anonID = 0
    this.heartbeat = setInterval(this.pulse,1000,this)
  }   
  pulse(lobby){
    const keysArray = Array.from(lobby.Users.keys());
    const usernameList = keysArray.join(', ')
    console.log(`${lobby.Users.size} users: ${usernameList}`)
  }

  getLobbyUser(username){
    return this.Users.get(username)
  }
  
  getLobbyUsernameFromWS(ws){
    return this.WStoUsername.get(ws)
  }
  
  isUserInLobby(username){
    return this.Users.has(username)
  }
  
  addLobbyUser(ws,username){
    if(username == ""){
      username = "anon"+(++this.anonID)
    }
    this.WStoUsername.set(ws,username)
    this.Users.set(username,{ws})
  }
  
  removeLobbyUser(ws){
    const username = this.WStoUsername.get(ws)
    this.WStoUsername.delete(ws)
    this.Users.delete(username)
  }
}

let lobby = new Lobby()

// Serve static files from the 'public' directory
app.use(express.static('public'));

// WebSocket setup
wss.on('connection', function connection(ws) {
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
  switch(message.type){
    case "check-username":
      if (lobby.isUserInLobby(message.username)){
        ws.send(JSON.stringify({type:"username-status", status:"taken"}));
        console.debug(`Name "${message.username}" already taken.`)
      } else {
        ws.send(JSON.stringify({type:"username-status", status:"accepted",username:message.username}))
        lobby.addLobbyUser(ws,message.username)
        console.log(`Adding player "${message.username}"`)
      }
      break;
    default:
      break;
  }
}

// Global 
var allGames = new Map()
let gameNumber = 0


allGames.set(gameNumber++,new game.Game())
thisBoard = allGames.get(0).board
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