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
const rooms = new Map(); // roomId -> {camera: socketId, viewer: socketId, homePage: socketId}

io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);
  
  let currentRoom = null;
  let userRole = null;

  // Register as camera, viewer, or home page in a room
  socket.on("register", (roomId, role) => {
    console.log(`Socket ${socket.id} registering as ${role} in room: ${roomId}`);
    
    currentRoom = roomId;
    userRole = role;
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { camera: null, viewer: null, homePage: null });
    }
    
    const roomData = rooms.get(roomId);
    
    // Update role in room
    if (role === "camera") {
      roomData.camera = socket.id;
      
      // If there's a home page waiting, tell it to route to viewer
      if (roomData.homePage) {
        io.to(roomData.homePage).emit("route-to-viewer", { roomId });
        console.log(`Telling home page to route to viewer for room: ${roomId}`);
      }
      
    } else if (role === "viewer") {
      roomData.viewer = socket.id;
    } else if (role === "homePage") {
      roomData.homePage = socket.id;
      
      // If camera is already connected, immediately route to viewer
      if (roomData.camera) {
        socket.emit("route-to-viewer", { roomId });
        console.log(`Camera already connected, routing home page to viewer for room: ${roomId}`);
      }
    }
    
    // Notify peers about new connection (existing logic)
    if (role === "camera" && roomData.viewer) {
      socket.to(roomId).emit("peer-joined", { peerId: socket.id, role });
      socket.emit("peer-joined", { peerId: roomData.viewer, role: "viewer" });
    } else if (role === "viewer" && roomData.camera) {
      socket.to(roomId).emit("peer-joined", { peerId: socket.id, role });
      socket.emit("peer-joined", { peerId: roomData.camera, role: "camera" });
    }
  });

  // Handle home page transitioning to viewer
  socket.on("transition-to-viewer", (roomId) => {
    console.log(`Socket ${socket.id} transitioning from home to viewer in room: ${roomId}`);
    
    if (currentRoom === roomId && userRole === "homePage") {
      const roomData = rooms.get(roomId);
      if (roomData) {
        // Remove from home page role and set as viewer
        roomData.homePage = null;
        roomData.viewer = socket.id;
        userRole = "viewer";
        
        // Notify camera if it exists
        if (roomData.camera) {
          socket.emit("peer-joined", { peerId: roomData.camera, role: "camera" });
          io.to(roomData.camera).emit("peer-joined", { peerId: socket.id, role: "viewer" });
        }
      }
    }
  });

  socket.on("offer", (roomId, offer) => {
    console.log(`Socket ${socket.id} sending offer to room: ${roomId}`);
    socket.to(roomId).emit("offer", offer, socket.id);
  });

  socket.on("answer", (roomId, answer, targetId) => {
    console.log(`Socket ${socket.id} sending answer to ${targetId} in room: ${roomId}`);
    if (targetId) {
      io.to(targetId).emit("answer", answer, socket.id);
    } else {
      socket.to(roomId).emit("answer", answer, socket.id);
    }
  });

  socket.on("ice-candidate", (roomId, candidate, targetId) => {
    console.log(`Socket ${socket.id} sending ICE candidate to room: ${roomId}`);
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
      
      // Update room data based on role
      if (userRole === "camera" && roomData.camera === socket.id) {
        roomData.camera = null;
        if (roomData.viewer) {
          io.to(roomData.viewer).emit("peer-disconnected", { role: "camera" });
        }
      } else if (userRole === "viewer" && roomData.viewer === socket.id) {
        roomData.viewer = null;
        if (roomData.camera) {
          io.to(roomData.camera).emit("peer-disconnected", { role: "viewer" });
        }
      } else if (userRole === "homePage" && roomData.homePage === socket.id) {
        roomData.homePage = null;
      }
      
      // Clean up empty rooms
      if (!roomData.camera && !roomData.viewer && !roomData.homePage) {
        rooms.delete(currentRoom);
        console.log(`Room ${currentRoom} deleted - no participants left`);
      }
    }
  });
});

server.listen(3001, "0.0.0.0", () => {
  console.log("Signaling server running on https://localhost:3001");
});