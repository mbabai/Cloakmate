class BoardStateControllerObject {
    constructor() {
        this.board = null;
        this.listeners = []
    }
    updateBoardState(data){
        this.board = {...data.board};
        this.listeners.forEach( listener=> listener(data.boardState));
    }
    addListener(listener){
        this.listeners.push(listener);
    }
    removeListener(type, listener){
        this.listeners[type] = this.listeners[type].filter(l => l !== listener);
    }
}