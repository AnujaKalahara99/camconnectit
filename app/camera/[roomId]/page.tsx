"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import io from "socket.io-client";

const CameraPage = () => {
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

    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      });

    socket.emit("join", roomId);

    socket.on("peer-joined", async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", roomId, offer);
    });

    socket.on("answer", async (answer) => {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
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
      <h1>Camera Page</h1>
      <video ref={videoRef} autoPlay playsInline muted />
    </div>
  );
};

export default CameraPage;
