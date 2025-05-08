//Signaling Server (Node.js)

import  https  from "https";
import { Server } from "socket.io";
import fs from "fs";

const options = {
    key: fs.readFileSync('./certificates/192.168.1.5-key.pem'),
    cert: fs.readFileSync('./certificates/192.168.1.5.pem'),
  };

const httpsServer = https.createServer(options);
const io = new Server(httpsServer, {
  cors: {
    origin: "*",
  }
});

io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);

  socket.on("join", (roomId) => {
    console.log(`Socket ${socket.id} joining room: ${roomId}`);
    socket.join(roomId);
    socket.to(roomId).emit("peer-joined", socket.id);
  });

  socket.on("offer", (roomId, offer) => {
    console.log(`Socket ${socket.id} sending offer to room: ${roomId}`);
    socket.to(roomId).emit("offer", offer);
  });

  socket.on("answer", (roomId, answer) => {
    console.log(`Socket ${socket.id} sending answer to room: ${roomId}`);
    socket.to(roomId).emit("answer", answer);
  });

  socket.on("ice-candidate", (roomId, candidate) => {
    console.log(`Socket ${socket.id} sending ICE candidate to room: ${roomId}`);
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected`);
  });
});

httpsServer.listen(3001, '0.0.0.0', () => {
  console.log("Signaling server running on https://localhost:3001");
});
