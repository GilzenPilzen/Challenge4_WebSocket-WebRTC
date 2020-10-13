require('dotenv').config();
const isDevelopment = (process.env.NODE_ENV === 'development');
const express = require('express');
const app = express();
const fs = require('fs');

let options = {};
if (isDevelopment) {
  options = {
    key: fs.readFileSync('./localhost.key'),
    cert: fs.readFileSync('./localhost.crt')
  };
}

const server = require(isDevelopment ? 'https' : 'http').Server(options, app);
const port = process.env.PORT || 443;

app.use(express.static('public'));

server.listen(port, () => {
 console.log(`App listening on port ${port}!`);
});

const io = require('socket.io')(server);

const clients = {};
io.on('connection', socket => {
  clients[socket.id] = { id: socket.id };

  socket.on('name', name => {
    console.log('name', name);
    // check if the name is valid
    if (!name || !name.trim || name.trim().length === 0) {
      return;
    }
    name = name.trim();
    for (const socketId in clients) {
      if (clients.hasOwnProperty(socketId)) {
        const client = clients[socketId];
        if (client.name === name) {
          // name is already taken
          return;
        }
      }
    }
    clients[socket.id].name = name;
    // send the name back - it is ok!
    socket.emit('name', name);
  });
  

  socket.on('disconnect', () => {
    delete clients[socket.id];
    io.emit('clients', clients);
  });

  socket.on('signal', (peerId, signal, name) => {
    console.log(`Received signal from ${socket.id} to ${peerId}`);
    io.to(peerId).emit('signal', peerId, signal, socket.id, name);
  });

  socket.on('openLink', (url, peerId)  => {
    console.log(url);
    io.to(peerId).emit('openLink', url, peerId, socket.id);
  });

  io.emit('clients', clients);

});