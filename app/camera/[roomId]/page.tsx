"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import io from "socket.io-client";

const CameraPage = () => {
  const params = useParams();
  const { roomId } = params as { roomId: string };
  const videoRef = useRef<HTMLVideoElement>(null);
  const dataChannelRef = useRef<RTCDataChannel>(null);
  const pcRef = useRef<RTCPeerConnection>(null);
  const socketRef = useRef<any>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );

  useEffect(() => {
    if (!roomId) return;

    let currentStream: MediaStream;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode },
        audio: false,
      })
      .then((stream) => {
        currentStream = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const pc = pcRef.current;
        if (pc) {
          const newVideoTrack = stream.getVideoTracks()[0];

          // Replace track if already sent
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          } else {
            // Fallback if not connected yet (first time or renegotiation)
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          }
        }
      })
      .catch((err) => {
        console.error("Error accessing camera:", err);
      });

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, roomId]);

  useEffect(() => {
    if (!roomId) return;

    // Create a socket connection to the server and WebRTC peer connection
    const socket = io("https://192.168.1.5:3001", { secure: true });
    socketRef.current = socket;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    // Create a data channel for sending photos
    const dataChannel = pc.createDataChannel("photo");
    dataChannelRef.current = dataChannel;
    dataChannel.onopen = () => {
      console.log("DataChannel open!");
    };

    const sendPhoto = (blob: Blob) => {
      if (dataChannel.readyState === "open") {
        dataChannel.send(blob);
      }
    };

    // Set up the video stream from the camera

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

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const captureAndSend = () => {
    const canvas = document.createElement("canvas");
    // const video = document.getElementById("video") as HTMLVideoElement;
    canvas.width = videoRef.current?.videoWidth || 0;
    canvas.height = videoRef.current?.videoHeight || 0;
    const context = canvas.getContext("2d");
    if (context && videoRef.current) {
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }

    canvas.toBlob((blob) => {
      if (blob && dataChannelRef.current?.readyState === "open") {
        blob.arrayBuffer().then((buffer) => {
          dataChannelRef.current?.send(buffer); // Send as ArrayBuffer
        });
      }
    }, "image/jpeg");
  };

  return (
    <div>
      <h1>Camera Page</h1>
      <video ref={videoRef} autoPlay playsInline muted />
      <button className="px-5" onClick={captureAndSend}>
        Capture
      </button>
      <button className="px-5" onClick={toggleCamera}>
        Switch Camera
      </button>
    </div>
  );
};

export default CameraPage;
