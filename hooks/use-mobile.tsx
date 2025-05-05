"use client"

import { useState, useEffect } from "react"

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if we're on the client side
    if (typeof window !== "undefined") {
      // Initial check
      setIsMobile(window.innerWidth < 768)

      // Add resize listener
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768)
      }

      window.addEventListener("resize", handleResize)

      // Clean up
      return () => {
        window.removeEventListener("resize", handleResize)
      }
    }
  }, [])

  return isMobile
}
