const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function connectToDatabase() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (err) {
        console.error("Failed to connect to MongoDB", err);
        process.exit(1);
    }
}

connectToDatabase();

let messages = [];
let users = {}; // In-memory user storage

app.use(express.static(__dirname));
app.use(express.json());

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        const db = client.db('chatapp187');
        const usersCollection = db.collection('users');
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = { username, password: hashedPassword };
        await usersCollection.insertOne(user);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Username and password are required' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const db = client.db('chatapp187');
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token });
    } else {
        res.status(400).json({ error: 'Invalid username or password' });
    }
});

// Middleware for socket authentication
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) return next(new Error('Authentication error'));
            socket.username = decoded.username;
            next();
        });
    } else {
        next(new Error('Authentication error'));
    }
});

io.on('connection', socket => {
    socket.on('join', username => {
        if (users[username]) {
            socket.username = username;
            messages.forEach(message => {
                socket.emit('message', message);
            });
        } else {
            socket.disconnect();
        }
    });

    socket.on('leave', () => {
        delete users[socket.username];
    });

    socket.on('message', data => {
        const message = { username: data.username, message: data.message };
        messages.push(message);
        io.emit('message', message);
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
