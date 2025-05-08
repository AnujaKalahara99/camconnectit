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
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );
  const [connectionReady, setConnectionReady] = useState(false);
  const fileTransferRef = useRef<FileTransferManager | null>(null);

  // Initialize WebRTC and Socket connection
  useEffect(() => {
    if (!roomId) return;

    const socket = io("https://192.168.1.5:3001", { secure: true });
    socketRef.current = socket;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    const fileTransfer = new FileTransferManager();
    fileTransferRef.current = fileTransfer;

    const dataChannel = pc.createDataChannel("photo");
    dataChannelRef.current = dataChannel;
    fileTransfer.setDataChannel(dataChannel, (progress) => {
      console.log(`File transfer progress: ${progress}%`);
    });

    dataChannel.onopen = () => {
      console.log("DataChannel open!");
      setConnectionReady(true);
    };

    dataChannel.onclose = () => {
      console.log("DataChannel closed");
      setConnectionReady(false);
    };

    dataChannel.onerror = (error) => {
      console.error("DataChannel error:", error);
    };

    // Handle socket events
    socket.emit("join", roomId);

    socket.on("peer-joined", async () => {
      console.log("Peer joined, creating offer");
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", roomId, offer);
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    });

    socket.on("answer", async (answer) => {
      console.log("Received answer");
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Error setting remote description:", err);
      }
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

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
    };

    pc.ondatachannel = (event) => {
      const receivedChannel = event.channel;
      console.log("Received data channel:", receivedChannel.label);
      // This is for recieving commands or messages from the other peer like take photo or switch camera
    };

    // Cleanup function
    return () => {
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

        const videoTrack = stream.getVideoTracks()[0];

        // Replace track if already sent, otherwise add the track
        const senders = pc.getSenders();
        const videoSender = senders.find(
          (sender) => sender.track && sender.track.kind === "video"
        );

        if (videoSender) {
          console.log("Replacing video track");
          videoSender
            .replaceTrack(videoTrack)
            .then(() => {
              console.log("Track replaced successfully");
              // Optionally renegotiate if needed
              if (pc.signalingState !== "stable") {
                pc.createOffer()
                  .then((offer) => pc.setLocalDescription(offer))
                  .then(() => {
                    if (socketRef.current) {
                      socketRef.current.emit(
                        "offer",
                        roomId,
                        pc.localDescription
                      );
                    }
                  })
                  .catch((err) =>
                    console.error("Error during renegotiation:", err)
                  );
              }
            })
            .catch((err) => console.error("Error replacing track:", err));
        } else {
          console.log("Adding new video track");
          pc.addTrack(videoTrack, stream);
        }
      })
      .catch((err) => {
        console.error("Error accessing camera:", err);
      });
  }, [facingMode, roomId]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const captureAndSend = () => {
    console.log("Capture and send photo");

    if (
      !dataChannelRef.current ||
      dataChannelRef.current.readyState !== "open"
    ) {
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
          console.error(
            "Failed to create blob or file transfer not initialized"
          );
        }
      },
      "image/jpeg",
      0.8
    ); // Adjust quality if needed
  };

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-xl font-bold mb-4">Camera Page</h1>
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
          disabled={!connectionReady}
        >
          {connectionReady ? "Capture & Send" : "Waiting for connection..."}
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
