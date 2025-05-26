import http from "http";
import https from "https";
import fs from "fs";
import { Server } from "socket.io";

const isDev = process.env.NODE_ENV !== "production";

let server;

if (isDev) {
  // Use HTTPS with certs in development
  const options = {
    key: fs.readFileSync("./certificates/192.168.1.5-key.pem"),
    cert: fs.readFileSync("./certificates/192.168.1.5.pem"),
  };
  server = https.createServer(options);
} else {
  server = http.createServer();
}

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Track room state
const rooms = new Map(); // roomId -> {camera: socketId, viewer: socketId}

io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);
  
  let currentRoom = null;
  let userRole = null;

  // Register as camera or viewer in a room
  socket.on("register", (roomId, role) => {
    console.log(`Socket ${socket.id} registering as ${role} in room: ${roomId}`);
    
    currentRoom = roomId;
    userRole = role;
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { camera: null, viewer: null });
    }
    
    const roomData = rooms.get(roomId);
    
    // Update role in room
    if (role === "camera") {
      roomData.camera = socket.id;
    } else if (role === "viewer") {
      roomData.viewer = socket.id;
    }
    
    // Notify peers about new connection
    if (role === "camera" && roomData.viewer) {
      socket.to(roomId).emit("peer-joined", { peerId: socket.id, role });
      socket.emit("peer-joined", { peerId: roomData.viewer, role: "viewer" });
    } else if (role === "viewer" && roomData.camera) {
      socket.to(roomId).emit("peer-joined", { peerId: socket.id, role });
      socket.emit("peer-joined", { peerId: roomData.camera, role: "camera" });
    }
  });

  socket.on("offer", (roomId, offer) => {
    console.log(`Socket ${socket.id} sending offer to room: ${roomId}`);
    socket.to(roomId).emit("offer", offer, socket.id);
  });

  socket.on("answer", (roomId, answer, targetId) => {
    console.log(`Socket ${socket.id} sending answer to ${targetId} in room: ${roomId}`);
    // Send to specific target if provided, otherwise to the room
    if (targetId) {
      io.to(targetId).emit("answer", answer, socket.id);
    } else {
      socket.to(roomId).emit("answer", answer, socket.id);
    }
  });

  socket.on("ice-candidate", (roomId, candidate, targetId) => {
    console.log(`Socket ${socket.id} sending ICE candidate to room: ${roomId}`);
    // Send to specific target if provided, otherwise to the room
    if (targetId) {
      io.to(targetId).emit("ice-candidate", candidate, socket.id);
    } else {
      socket.to(roomId).emit("ice-candidate", candidate, socket.id);
    }
  });

  socket.on("reconnect-request", (roomId, role) => {
    console.log(`Socket ${socket.id} requesting reconnection as ${role} in room: ${roomId}`);
    const roomData = rooms.get(roomId);
    
    if (!roomData) return;
    
    if (role === "camera" && roomData.viewer) {
      io.to(roomData.viewer).emit("peer-reconnect-requested", { peerId: socket.id, role });
    } else if (role === "viewer" && roomData.camera) {
      io.to(roomData.camera).emit("peer-reconnect-requested", { peerId: socket.id, role });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected`);
    
    if (currentRoom && rooms.has(currentRoom)) {
      const roomData = rooms.get(currentRoom);
      
      // Update room data
      if (userRole === "camera" && roomData.camera === socket.id) {
        roomData.camera = null;
        // Notify viewer that camera disconnected
        if (roomData.viewer) {
          io.to(roomData.viewer).emit("peer-disconnected", { role: "camera" });
        }
      } else if (userRole === "viewer" && roomData.viewer === socket.id) {
        roomData.viewer = null;
        // Notify camera that viewer disconnected
        if (roomData.camera) {
          io.to(roomData.camera).emit("peer-disconnected", { role: "viewer" });
        }
      }
      
      // Clean up empty rooms
      if (!roomData.camera && !roomData.viewer) {
        rooms.delete(currentRoom);
        console.log(`Room ${currentRoom} deleted - no participants left`);
      }
    }
  });
});

server.listen(3001, "0.0.0.0", () => {
  console.log("Signaling server running on https://localhost:3001");
});