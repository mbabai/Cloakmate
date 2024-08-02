class BoardStateControllerObject {
    constructor(webSocketManager) {
        this.board = null;
        this.listeners = []
        this.webSocketManager = webSocketManager;
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