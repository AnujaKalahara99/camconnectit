"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import io from "socket.io-client";
import { FileTransferManager } from "@/lib/fileTransferManager";

const CameraPage = () => {
  const params = useParams();
  const { roomId } = params as { roomId: string };
  const videoRef = useRef<HTMLVideoElement>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [connectionStatus, setConnectionStatus] = useState<string>("Initializing...");
  const fileTransferRef = useRef<FileTransferManager | null>(null);
  const peerIdRef = useRef<string | null>(null);

  // Initialize WebRTC and Socket connection
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

      // Setup data channel for file transfer
      const dataChannel = pc.createDataChannel("file-transfer");
      dataChannelRef.current = dataChannel;
      
      const fileTransfer = new FileTransferManager();
      fileTransferRef.current = fileTransfer;
      fileTransfer.setDataChannel(dataChannel, (progress) => {
        console.log(`File transfer progress: ${progress}%`);
      });

      dataChannel.onopen = () => {
        console.log("DataChannel open!");
        setConnectionStatus("Connected");
      };

      dataChannel.onclose = () => {
        console.log("DataChannel closed");
        setConnectionStatus("Disconnected");
      };

      dataChannel.onerror = (error) => {
        console.error("DataChannel error:", error);
        setConnectionStatus("Connection Error");
      };

      // Add current tracks to peer connection if available
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          console.log(`Adding existing ${track.kind} track to new peer connection`);
          pc.addTrack(track, streamRef.current!);
        });
      }

      // Handle incoming data channels
      pc.ondatachannel = (event) => {
        console.log("Received data channel:", event.channel.label);
        // Handle control messages from viewer if needed
      };

      // ICE connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log("Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setConnectionStatus("Connected");
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setConnectionStatus("Disconnected");
          // Try to reconnect after a delay
          setTimeout(() => {
            if (socketRef.current) {
              socketRef.current.emit("reconnect-request", roomId, "camera");
            }
          }, 2000);
        }
      };

      // ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          console.log("Sending ICE candidate to peer", peerIdRef.current);
          socketRef.current.emit("ice-candidate", roomId, event.candidate, peerIdRef.current);
        }
      };

      return pc;
    };

    // Initialize peer connection
    const pc = setupPeerConnection();


    // Socket event handlers
    socket.on("connect", () => {
      console.log("Socket connected, registering as camera");
      socket.emit("register", roomId, "camera");
    });

    socket.on("peer-joined", async ({ peerId, role }) => {
      console.log(`Peer joined: ${peerId} as ${role}`);
      peerIdRef.current = peerId;
      setConnectionStatus("Peer joined, connecting...");
      
      // Create and send offer
      try {
        console.log("Creating offer for peer");
        const offer = await pc.createOffer({
          offerToReceiveVideo: false,  // We're only sending video, not receiving
          offerToReceiveAudio: false
        });
        await pc.setLocalDescription(offer);
        socket.emit("offer", roomId, offer);
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    });

    socket.on("peer-reconnect-requested", async ({ peerId }) => {
      console.log("Peer reconnection requested");
      peerIdRef.current = peerId;
      setConnectionStatus("Reconnecting...");
      
      // Create new connection and send offer
      const pc = setupPeerConnection();
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", roomId, offer);
      } catch (err) {
        console.error("Error creating reconnect offer:", err);
      }
    });

    socket.on("peer-disconnected", ({ role }) => {
      console.log(`Peer (${role}) disconnected`);
      peerIdRef.current = null;
      setConnectionStatus("Peer disconnected, waiting...");
    });

    socket.on("answer", async (answer, senderId) => {
      console.log("Received answer from", senderId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Error setting remote description:", err);
      }
    });

    socket.on("ice-candidate", async (candidate, senderId) => {
      try {
        await pc.addIceCandidate(candidate);
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
      setConnectionStatus("Disconnected");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (dataChannelRef.current) {
        dataChannelRef.current.close();
      }

      if (pcRef.current) {
        pcRef.current.close();
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId]);

  // Handle camera setup and track management
  useEffect(() => {
    if (!roomId || !pcRef.current) return;

    // Stop previous stream tracks if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode },
        audio: false,
      })
      .then((stream) => {
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const pc = pcRef.current;
        if (!pc) return;

        // Always create a new MediaStream that we'll use for the peer connection
        // This fixes some transceiver and track issues in WebRTC
        const newStream = new MediaStream();
        
        // Get the video track and add it to our new stream
        const videoTrack = stream.getVideoTracks()[0];
        newStream.addTrack(videoTrack);
        
        // Remove all existing senders
        const senders = pc.getSenders();
        senders.forEach(sender => {
          if (sender.track && sender.track.kind === "video") {
            try {
              pc.removeTrack(sender);
            } catch (err) {
              console.warn("Error removing track:", err);
            }
          }
        });

        // Add the new track using the new stream
        console.log("Adding video track to peer connection");
        pc.addTrack(videoTrack, newStream);

        // If we already have a peer, renegotiate the connection
        if (peerIdRef.current && pc.signalingState !== "closed") {
          console.log("Renegotiating after camera switch");
          pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              if (socketRef.current) {
                socketRef.current.emit("offer", roomId, pc.localDescription);
              }
            })
            .catch(err => console.error("Error during camera switch renegotiation:", err));
        }
      })
      .catch((err) => {
        console.error("Error accessing camera:", err);
        setConnectionStatus("Camera error");
      });
  }, [facingMode, roomId]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const captureAndSend = () => {
    console.log("Capture and send photo");

    if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
      console.error("Data channel not ready");
      return;
    }

    const canvas = document.createElement("canvas");
    if (!videoRef.current) return;

    canvas.width = videoRef.current.videoWidth || 0;
    canvas.height = videoRef.current.videoHeight || 0;

    const context = canvas.getContext("2d");
    if (context && videoRef.current) {
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }

    canvas.toBlob(
      (blob) => {
        if (blob && fileTransferRef.current) {
          console.log("Sending captured image, size:", blob.size);
          const file = new File([blob], `frame-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          fileTransferRef.current.sendFile(file);
        } else {
          console.error("Failed to create blob or file transfer not initialized");
        }
      },
      "image/jpeg",
      0.8
    );
  };

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-xl font-bold mb-4">Camera Page</h1>
      <p className="text-sm text-gray-600 mb-2">Room ID: {roomId}</p>
      <p className="text-sm text-gray-600 mb-4">Status: {connectionStatus}</p>
      
      <div className="relative w-full max-w-md bg-black rounded-lg overflow-hidden mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto"
        />
      </div>

      <div className="flex flex-col w-full max-w-md gap-4">
        <button
          className="px-5 py-2 bg-blue-500 text-white rounded-md flex-1 disabled:bg-gray-300"
          onClick={captureAndSend}
          disabled={!dataChannelRef.current || dataChannelRef.current.readyState !== "open"}
        >
          {dataChannelRef.current && dataChannelRef.current.readyState === "open" 
            ? "Capture & Send" 
            : "Waiting for connection..."}
        </button>

        <button
          className="px-5 py-2 bg-gray-500 text-white rounded-md flex-1"
          onClick={toggleCamera}
        >
          Switch Camera ({facingMode === "user" ? "Front" : "Back"})
        </button>

        <div className="mt-4">
          <p className="text-sm mb-2">Or select a photo to send:</p>
          <input
            type="file"
            accept="image/*"
            className="w-full"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (
                file &&
                fileTransferRef.current &&
                dataChannelRef.current?.readyState === "open"
              ) {
                console.log("Sending selected file:", file.name, file.size);
                fileTransferRef.current.sendFile(file);
              } else if (dataChannelRef.current?.readyState !== "open") {
                console.error("Data channel not open");
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CameraPage;