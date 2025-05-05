"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Camera, X } from "lucide-react"
import { WebRTCConnection } from "@/lib/webrtc"

interface MobileViewProps {
  sessionId: string
}

export default function MobileView({ sessionId }: MobileViewProps) {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(true)
  const [cameraActive, setCameraActive] = useState(false)
  const [recentMedia, setRecentMedia] = useState<{ id: string; url: string; type: string }[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const connectionRef = useRef<WebRTCConnection | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize WebRTC connection
  useEffect(() => {
    const initConnection = async () => {
      try {
        setConnecting(true)

        const connection = new WebRTCConnection(
          sessionId,
          false, // Mobile is not the initiator
          () => {
            setConnected(true)
            setConnecting(false)
          },
          () => {
            setConnected(false)
            setConnecting(false)
            stopCamera()
          },
          () => {}, // Mobile doesn't receive media
        )

        const success = await connection.initialize()
        if (!success) {
          setError("Failed to initialize connection")
          setConnecting(false)
        }

        connectionRef.current = connection
      } catch (error) {
        console.error("Error initializing connection:", error)
        setError("Failed to connect. Please try again.")
        setConnecting(false)
      }
    }

    initConnection()

    return () => {
      if (connectionRef.current) {
        connectionRef.current.cleanup()
      }
      stopCamera()
    }
  }, [sessionId])

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setCameraActive(true)
    } catch (error) {
      console.error("Error accessing camera:", error)
      setError("Failed to access camera. Please check permissions.")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraActive(false)
  }

  const capturePhoto = async () => {
    if (!cameraActive || !videoRef.current || !canvasRef.current || !connectionRef.current) return

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      if (!ctx) return

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else setError("Failed to capture image")
          },
          "image/jpeg",
          0.9,
        )
      })

      // Send blob via WebRTC
      const success = await connectionRef.current.sendMedia(blob, "image/jpeg")

      if (success) {
        // Add to recent media
        const url = URL.createObjectURL(blob)
        setRecentMedia((prev) => [
          {
            id: `photo_${Date.now()}`,
            url,
            type: "image",
          },
          ...prev.slice(0, 7),
        ])
      } else {
        setError("Failed to send image. Check connection.")
      }
    } catch (error) {
      console.error("Error capturing photo:", error)
      setError("Failed to capture photo")
    }
  }

  const startRecording = () => {
    // Video recording would be implemented here
    // This is a more complex feature that would require additional state management
    // and handling of MediaRecorder API
    setError("Video recording not implemented in this demo")
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-900">
        <div className="mb-4 rounded-full bg-red-100 p-3 text-red-500 dark:bg-red-900 dark:text-red-300">
          <X className="h-6 w-6" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Connection Error</h2>
        <p className="mb-6 text-center text-zinc-600 dark:text-zinc-400">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  if (connecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-900">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-600"></div>
        <h2 className="text-xl font-semibold">Connecting...</h2>
        <p className="text-center text-zinc-600 dark:text-zinc-400">Establishing secure connection to your laptop</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col relative z-10">
      <header className="border-b border-slate-100 bg-white/90 p-4 dark:border-slate-800 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-slate-700 to-indigo-600 text-white">
            <Camera className="h-4 w-4" />
          </div>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-slate-700 to-indigo-600 bg-clip-text text-transparent">
            CameraConnect
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-teal-500" : "bg-red-500"}`}></span>
          <p className="text-sm text-zinc-500">{connected ? "Connected to Laptop" : "Disconnected"}</p>
        </div>
      </header>

      <main className="flex flex-1 flex-col p-4">
        <div
          className="relative mb-4 overflow-hidden rounded-lg bg-gray-900 shadow-lg shadow-slate-100 dark:shadow-slate-900/10"
          style={{ height: "60vh" }}
        >
          {!cameraActive ? (
            <div className="flex h-full flex-col items-center justify-center">
              <p className="mb-4 text-center text-zinc-400">Camera is off</p>
              <Button
                onClick={startCamera}
                disabled={!connected}
                className="bg-gradient-to-r from-slate-700 to-indigo-600 hover:from-slate-800 hover:to-indigo-700 text-white border-0"
              >
                Start Camera
              </Button>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            size="lg"
            className="h-16 bg-gradient-to-r from-slate-700 to-indigo-600 hover:from-slate-800 hover:to-indigo-700 text-white border-0 shadow-lg shadow-slate-100 dark:shadow-slate-900/20"
            onClick={capturePhoto}
            disabled={!cameraActive || !connected}
          >
            Take Photo
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-16 bg-white dark:bg-gray-800 border-2 border-slate-200 dark:border-slate-800 text-gray-700 dark:text-gray-300"
            onClick={startRecording}
            disabled={!cameraActive || !connected}
          >
            Record Video
          </Button>
        </div>

        {cameraActive && (
          <Button
            variant="outline"
            className="mt-4 border-2 border-slate-200 dark:border-slate-800 text-gray-700 dark:text-gray-300"
            onClick={stopCamera}
          >
            Stop Camera
          </Button>
        )}

        {recentMedia.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-lg font-medium">Recently Captured</h2>
            <div className="grid grid-cols-4 gap-2">
              {recentMedia.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="aspect-square overflow-hidden rounded-md bg-white dark:bg-gray-800 shadow-md"
                >
                  <img
                    src={item.url || "/placeholder.svg"}
                    alt="Captured media"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
