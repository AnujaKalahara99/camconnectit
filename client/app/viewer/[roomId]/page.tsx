"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import io from "socket.io-client";
import { FileTransferManager } from "@/lib/fileTransferManager";

export default function ViewerPage() {
  const params = useParams();
  const { roomId } = params as { roomId: string };
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);
  const fileTransferRef = useRef<FileTransferManager | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const photoContainerRef = useRef<HTMLDivElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("Initializing...");
  const [photos, setPhotos] = useState<{ url: string, name: string }[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const socket = io("https://192.168.1.5:3001", { secure: true });
    socketRef.current = socket;

    // Function to create or reset peer connection
    const setupPeerConnection = () => {
      // Close previous connection if exists
      if (pcRef.current) {
        pcRef.current.close();
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ],
      });
      pcRef.current = pc;

      // Setup file transfer manager
      const fileTransfer = new FileTransferManager();
      fileTransferRef.current = fileTransfer;

      // Add transceiver for receiving video
      pc.addTransceiver("video", { direction: "recvonly" });
      console.log("Added video transceiver");

      // Attach ontrack handler for video stream
      pc.ontrack = (event) => {
        console.log("Received remote track", event.track.kind, event.streams);
        // Make sure we handle the track properly
        if (videoRef.current && event.streams && event.streams[0]) {
          // First check if we have a valid stream
          const stream = event.streams[0];
          console.log("Stream tracks:", stream.getTracks().map(t => `${t.kind}: ${t.id} (${t.enabled ? 'enabled' : 'disabled'})`));
          
          // Ensure the video element gets the stream
          videoRef.current.srcObject = stream;
          videoRef.current.play()
            .then(() => console.log("Video playback started"))
            .catch(err => console.error("Video playback error:", err));
            
          setConnectionStatus("Video stream connected");
        } else {
          console.warn("Invalid stream or video element", {
            videoElement: !!videoRef.current,
            streams: event.streams?.length
          });
        }
      };

      // Handle data channel
      pc.ondatachannel = (event) => {
        const receiveChannel = event.channel;
        console.log("Received data channel:", receiveChannel.label);
        
        fileTransfer.setDataChannel(
          receiveChannel,
          (file) => {
            // Handle received file
            const url = URL.createObjectURL(file);
            
            // Add to photos state
            setPhotos(prev => [...prev, { url, name: file.name }]);
            
            // Create downloadable link in container
            if (photoContainerRef.current) {
              const photoDiv = document.createElement("div");
              photoDiv.className = "photo-item";
              
              // Create image preview
              const img = document.createElement("img");
              img.src = url;
              img.className = "w-full h-auto mb-2 rounded";
              img.alt = file.name;
              photoDiv.appendChild(img);
              
              // Create download link
              const link = document.createElement("a");
              link.href = url;
              link.download = file.name;
              link.className = "text-blue-500 text-sm";
              link.textContent = `Download ${file.name}`;
              photoDiv.appendChild(link);
              
              photoContainerRef.current.prepend(photoDiv);
            }
          },
          (progress) => {
            console.log(`File transfer progress: ${progress.toFixed(1)}%`);
            setConnectionStatus(`Receiving file: ${progress.toFixed(1)}%`);
          }
        );
        
        receiveChannel.onopen = () => {
          console.log("Data channel open");
          setConnectionStatus("Connected");
        };
        
        receiveChannel.onclose = () => {
          console.log("Data channel closed");
          setConnectionStatus("Data channel closed");
        };
      };

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log("Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setConnectionStatus("Connected");
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setConnectionStatus("Disconnected");
          // Try to reconnect after a delay
          setTimeout(() => {
            if (socketRef.current) {
              socketRef.current.emit("reconnect-request", roomId, "viewer");
            }
          }, 2000);
        }
      };

      // ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("ice-candidate", roomId, event.candidate, peerIdRef.current);
        }
      };

      return pc;
    };

    // Initialize peer connection
    setupPeerConnection();

    // Socket event handlers
    socket.on("connect", () => {
      console.log("Socket connected, registering as viewer");
      socket.emit("register", roomId, "viewer");
    });

    socket.on("peer-joined", async ({ peerId, role }) => {
      console.log(`Peer joined: ${peerId} as ${role}`);
      peerIdRef.current = peerId;
      setConnectionStatus(`Camera connected, establishing WebRTC...`);
    });

    socket.on("peer-reconnect-requested", () => {
      console.log("Peer reconnection requested");
      setConnectionStatus("Reconnecting...");
      setupPeerConnection();
    });

    socket.on("peer-disconnected", ({ role }) => {
      console.log(`Peer (${role}) disconnected`);
      peerIdRef.current = null;
      setConnectionStatus("Camera disconnected, waiting...");
    });

    // Socket event handlers
    socket.on("offer", async (offer, senderId) => {
      console.log("Received offer from", senderId);
      peerIdRef.current = senderId;
      
      try {
        const pc = pcRef.current;
        if (!pc) return;
        
        // Make sure we have transceivers set up to receive video
        if (pc.getTransceivers().length === 0) {
          console.log("Adding transceiver for video");
          pc.addTransceiver("video", { direction: "recvonly" });
        }
        
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", roomId, answer, senderId);
      } catch (err) {
        console.error("Error processing offer:", err);
      }
    });

    socket.on("ice-candidate", async (candidate, senderId) => {
      try {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(candidate);
        }
      } catch (e) {
        console.error("Error adding received ICE candidate", e);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setConnectionStatus("Server disconnected");
    });

    // Cleanup function
    return () => {
      // Release object URLs to avoid memory leaks
      photos.forEach(photo => {
        URL.revokeObjectURL(photo.url);
      });
      
      if (pcRef.current) {
        pcRef.current.close();
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId]);

  // Effect to clean up URLs when photos state changes
  useEffect(() => {
    return () => {
      // Clean up old URLs
      photos.forEach(photo => {
        URL.revokeObjectURL(photo.url);
      });
    };
  }, [photos]);

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-xl font-bold mb-4">Viewer Page</h1>
      <p className="text-sm text-gray-600 mb-2">Room ID: {roomId}</p>
      <p className="text-sm text-gray-600 mb-4">Status: {connectionStatus}</p>
      
      <div className="relative w-full max-w-md bg-black rounded-lg overflow-hidden mb-4">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          style={{ width: '100%', height: 'auto' }}
          className="bg-gray-900"
        />
      </div>
      
      <h2 className="text-lg font-semibold mt-6 mb-2">Received Photos</h2>
      <div 
        ref={photoContainerRef}
        className="w-full max-w-md grid grid-cols-2 gap-4"
      >
        {photos.map((photo, index) => (
          <div key={index} className="border rounded p-2">
            <img src={photo.url} alt={photo.name} className="w-full h-auto mb-2" />
            <a 
              href={photo.url} 
              download={photo.name}
              className="text-blue-500 text-sm"
            >
              Download {photo.name}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}