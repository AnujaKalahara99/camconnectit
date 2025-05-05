"use client"

import { useState, useEffect } from "react"
import { useMobile } from "@/hooks/use-mobile"
import { generateSessionId } from "./utils"
import MobileView from "./mobile-view"
import DesktopView from "./desktop-view"
import Background from "../components/background"

export default function ConnectPage() {
  const [sessionId, setSessionId] = useState("")
  const isMobile = useMobile()

  useEffect(() => {
    // Generate a unique session ID when the component mounts
    setSessionId(generateSessionId())
  }, [])

  const refreshSession = () => {
    setSessionId(generateSessionId())
  }

  // Render the appropriate view based on device type
  return (
    <div className="overflow-hidden">
      <Background />
      {isMobile ? (
        <MobileView sessionId={sessionId} />
      ) : (
        <DesktopView sessionId={sessionId} onRefresh={refreshSession} />
      )}
    </div>
  )
}
