const socket = io();
let username = '';

function showRegister() {
    document.getElementById('login').style.display = 'none';
    document.getElementById('register').style.display = 'block';
    document.getElementById('registerError').style.display = 'none';
    document.getElementById('registerSuccess').style.display = 'none';
}

function showLogin() {
    document.getElementById('register').style.display = 'none';
    document.getElementById('login').style.display = 'block';
    document.getElementById('loginError').style.display = 'none';
}

function login() {
    username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (username && password) {
        fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem('token', data.token);
                document.getElementById('login').style.display = 'none';
                document.getElementById('chat').style.display = 'block';
                document.getElementById('welcomeMessage').textContent = `Welcome, ${username}`;
                socket.auth = { token: data.token };
                socket.connect();
            } else {
                document.getElementById('loginError').style.display = 'block';
            }
        });
    }
}

function register() {
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    if (username && password) {
        fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('registerSuccess').style.display = 'block';
                document.getElementById('registerError').style.display = 'none';
            } else {
                document.getElementById('registerError').style.display = 'block';
            }
        });
    }
}

function sendMessage() {
    const message = document.getElementById('message').value;
    if (message) {
        socket.emit('message', { username, message });
        document.getElementById('message').value = '';
    }
}

function logout() {
    localStorage.removeItem('token');
    username = '';
    document.getElementById('chat').style.display = 'none';
    document.getElementById('login').style.display = 'block';
    socket.disconnect();
}

socket.on('message', data => {
    const chatWindow = document.getElementById('chatWindow');
    const messageElement = document.createElement('div');
    messageElement.textContent = `${data.username}: ${data.message}`;
    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
});

// Connect socket with token
socket.auth = { token: localStorage.getItem('token') };
socket.connect();
