const express = require('express');
const game = require('./game');

const app = express();

app.get('/', (req, res) => res.send('Hello World!'));

const port = 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
console.log("We are live!")

// Global 
var allGames = new Map()
let gameNumber = 0

allGames.set(gameNumber++,new game.Game())
thisBoard = allGames.get(0).board
thisBoard.printBoard()
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