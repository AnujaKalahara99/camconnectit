"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { io } from "socket.io-client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const QRCodeComponent: React.FC = () => {
  const roomId = React.useMemo(() => crypto.randomUUID(), []);
  const qrUrl = `https://camconnectit.vercel.app/camera/${roomId}`;

  const router = useRouter();

  useEffect(() => {
    const socket = io("https://camconnectit-production.up.railway.app/", { secure: true });

    socket.on("connect", () => {
      console.log("Socket connected", socket.id);
      socket.emit("register", roomId, "homePage");
    });

    socket.on("route-to-viewer", (data) => {
      console.log("Camera connected! Routing to viewer page...");
      socket.emit("transition-to-viewer", roomId);
      routeToViewer(data.roomId);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const routeToViewer = (roomId: string) => {
   router.push(`/viewer/${roomId}`);
  }

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
