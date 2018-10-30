const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const redisAdapter = require('socket.io-redis');
const socketport = process.env.PORT || 3000;

if(process.env.REDIS_PORT_6379_TCP_ADDR){
  if (process.env.REDIS_PASSWORD) {
    let redis = require('redis').createClient;
    let pub = redis(process.env.REDIS_PORT || 6379, process.env.REDIS_PORT_6379_TCP_ADDR, { auth_pass: process.env.REDIS_PASSWORD });
    let sub = redis(process.env.REDIS_PORT || 6379, process.env.REDIS_PORT_6379_TCP_ADDR, { detect_buffers: true, auth_pass: process.env.REDIS_PASSWORD });
    io.adapter(redisAdapter({ pubClient: pub, subClient: sub }));
  }else{
    io.adapter(redisAdapter({ host: process.env.REDIS_PORT_6379_TCP_ADDR, port: process.env.REDIS_PORT || 6379 }));
  }
  console.log('Redis enabled at ' +  process.env.REDIS_PORT_6379_TCP_ADDR + process.env.REDIS_PORT);
}

server.listen(socketport, function () {
  console.log('Server listening at port %d', socketport);
});

app.use(express.static(__dirname + '/public'));

let usernames = {};
let numUsers = 0;

io.on('connection', function (socket) {
  let addedUser = false;
  socket.on('new message', function (data) {
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  socket.on('add user', function (username) {
    socket.username = username;
    usernames[username] = username;
    console.log("add user " + numUsers + username);
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  socket.on('disconnect', function () {
    if (addedUser) {
      delete usernames[socket.username];
      --numUsers;

      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
