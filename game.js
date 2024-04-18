const game = require('./gameEngine');
const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let allWS = [] //tracking all web sockets
let clientID = 0
const heartbeat = setInterval(function(){
  let usernameList = ""
  allWS.forEach(ws => {
    usernameList += ws.username+", "
  });
  console.log(`${allWS.length} users: ${usernameList}`)

},4000)

// Serve static files from the 'public' directory
app.use(express.static('public'));

// WebSocket setup
wss.on('connection', function connection(ws) {
  ws.clientID = ++clientID
  allWS.push(ws)
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
        const json = JSON.parse(message)
        routeMessage(ws, json)
    });
    ws.on('close', function close(){
      const index = allWS.indexOf(ws);
      if (index > -1) {
          allWS.splice(index, 1); // Remove 1 item at the index
      }
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
      if (message.username == ""){
        const anonymousName = "anonymous"+(ws.clientID)
        ws.username = anonymousName
        ws.send(JSON.stringify({type:"username-status", status:"accepted", username:anonymousName}))
        console.log(`Adding player "${anonymousName}"`)
      }else if (getWSbyUsername(message.username) == null){
        ws.send(JSON.stringify({type:"username-status", status:"accepted",username:message.username}))
        ws.username = message.username
        console.log(`Adding player "${message.username}"`)
      } else {
        ws.send(JSON.stringify({type:"username-status", status:"taken"}));
        console.debug(`Name "${message.username}" already taken.`)
      }
      break;
    default:
      break;
  }
}

function getWSbyUsername(username){
  for(let i = 0;i < allWS.length;i++){
    let thisWebSocket = allWS[i]
    if(thisWebSocket.username == username){
      return thisWebSocket
    }
  }
  return null
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