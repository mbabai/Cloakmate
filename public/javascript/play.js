document.addEventListener('DOMContentLoaded', function() {
    window.toggleButtons = function() {
        var bombButton = document.getElementById('bomb-button');
        var challengeButton = document.getElementById('challenge-button');

        // Toggle the display style
        bombButton.style.display = bombButton.style.display === 'none' ? 'block' : 'none';
        challengeButton.style.display = challengeButton.style.display === 'none' ? 'block' : 'none';
    };

    // Create a new WebSocket.
    const socket = new WebSocket('ws://localhost:3000');

    // Connection opened
    socket.addEventListener('open', function (event) {
        socket.send('Hello Server!'); // Send a message to the server
    });

    // Listen for messages
    socket.addEventListener('message', function (event) {
        console.log('Message from server ', event.data);
    });

    // Listen for possible errors
    socket.addEventListener('error', function (event) {
        console.error('WebSocket error: ', event);
    });

    // Listen for close
    socket.addEventListener('close', function (event) {
        console.log('WebSocket connection closed');
    });
});