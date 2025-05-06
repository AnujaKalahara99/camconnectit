"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import io from "socket.io-client";

export default function ViewerPage () {
  const params = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection>(null);
  const socketRef = useRef<any>(null);
  const { roomId } = params as { roomId: string };

  useEffect(() => {
    if (!roomId) return;

    const socket = io("https://192.168.1.5:3001", {secure: true});
    socketRef.current = socket;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ]
    });    
    pcRef.current = pc;

    socket.emit("join", roomId);

    socket.on("offer", async (offer) => {
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

    pc.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

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
    </div>
  );
};