"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import io from "socket.io-client";
import { FileTransferManager } from "@/lib/fileTransferManager";

export default function ViewerPage() {
  const params = useParams();
  const { roomId } = params as { roomId: string };
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection>(null);
  const socketRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const fileTransfer = new FileTransferManager();

  useEffect(() => {
    if (!roomId || initializedRef.current) return;
    initializedRef.current = true;

    const socket = io("https://192.168.1.5:3001", { secure: true });
    socketRef.current = socket;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    // 🟢 Attach ontrack handler early
    pc.ontrack = (event) => {
      console.log("Received remote track", event.streams);
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    // Attach ondatachannel
    pc.ondatachannel = (event) => {
      const receiveChannel = event.channel;
      fileTransfer.setDataChannel(
        receiveChannel,
        (file) => {
          const url = URL.createObjectURL(file);
          const link = document.createElement("a");
          link.href = url;
          link.download = file.name;
          link.textContent = `Download ${file.name}`;
          document.body.appendChild(link);
        },
        (progress) => {
          console.log(`Progress: ${progress.toFixed(1)}%`);
        }
      );
    };

    console.log("JOOOIIIINN VIEWER");
    socket.emit("join", roomId);

    // Handle offer after setting ontrack
    socket.on("offer", async (offer) => {
      console.log("Received offer", offer);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", roomId, answer);
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.error("Error adding received ICE candidate", e);
      }
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", roomId, event.candidate);
      }
    };
  }, [roomId]);

  return (
    <div>
      <h1>Viewer Page</h1>
      <video ref={videoRef} autoPlay playsInline muted />
      <div id="photo-container" />
    </div>
  );
}
