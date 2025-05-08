"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { io } from "socket.io-client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const QRCodeComponent: React.FC = () => {
  const roomId = "123"; // Replace with your actual room ID
  const qrUrl = `https://192.168.1.5:3000/camera/${roomId}`;

  const router = useRouter();

  useEffect(() => {
    const socket = io("https://192.168.1.5:3001", { secure: true });

    socket.on("connect", () => {
      console.log("Socket connected", socket.id);
    });

    socket.emit("waiting", roomId);

    socket.on("waiting-joined", (camRoomId: string) => {
      console.log("Socket join event received", camRoomId);

      if (camRoomId !== roomId) return;
      router.push(`/viewer/${roomId}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <h2>Scan with mobile</h2>
      <QRCodeSVG value={qrUrl} size={256} />
      <a
        href={qrUrl}
        className="text-blue-700"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", marginTop: "1rem" }}
      >
        {qrUrl}
      </a>
    </div>
  );
};

export default QRCodeComponent;
