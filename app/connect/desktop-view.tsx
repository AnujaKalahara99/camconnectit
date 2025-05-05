"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Copy, Download, RefreshCw, Share2 } from "lucide-react"
import QRCode from "./qr-code"
import { WebRTCConnection } from "@/lib/webrtc"

interface DesktopViewProps {
  sessionId: string
  onRefresh: () => void
}

export default function DesktopView({ sessionId, onRefresh }: DesktopViewProps) {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [mediaItems, setMediaItems] = useState<
    { id: string; type: string; url: string; blob: Blob; timestamp: number }[]
  >([])
  const [selectedItem, setSelectedItem] = useState<number | null>(null)
  const connectionRef = useRef<WebRTCConnection | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize WebRTC connection
  useEffect(() => {
    const initConnection = async () => {
      try {
        setConnecting(true)

        const connection = new WebRTCConnection(
          sessionId,
          true, // Desktop is the initiator
          () => {
            setConnected(true)
            setConnecting(false)
          },
          () => {
            setConnected(false)
            setConnecting(false)
          },
          (media) => {
            // Handle received media
            const url = URL.createObjectURL(media.data)
            setMediaItems((prev) => [
              {
                id: media.id,
                type: media.type,
                url,
                blob: media.data,
                timestamp: Date.now(),
              },
              ...prev,
            ])

            // Select the new item
            setSelectedItem(0)
          },
        )

        const success = await connection.initialize()
        if (!success) {
          setError("Failed to initialize connection")
          setConnecting(false)
        }

        connectionRef.current = connection
      } catch (error) {
        console.error("Error initializing connection:", error)
        setError("Failed to establish connection")
        setConnecting(false)
      }
    }

    initConnection()

    return () => {
      if (connectionRef.current) {
        connectionRef.current.cleanup()
      }
    }
  }, [sessionId])

  const refreshSession = () => {
    if (connectionRef.current) {
      connectionRef.current.cleanup()
    }
    setConnected(false)
    setConnecting(false)
    setMediaItems([])
    setSelectedItem(null)
    setError(null)
    onRefresh()
  }

  const copyToClipboard = async () => {
    if (selectedItem === null) return

    try {
      const item = mediaItems[selectedItem]

      if (item.type === "image" && "clipboard" in navigator) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [item.blob.type]: item.blob,
          }),
        ])
        alert("Image copied to clipboard!")
      } else {
        // Fallback for browsers that don't support clipboard API
        await navigator.clipboard.writeText(`Media URL: ${item.url}`)
        alert("Media URL copied to clipboard!")
      }
    } catch (err) {
      console.error("Failed to copy: ", err)
      setError("Failed to copy to clipboard")
    }
  }

  const downloadMedia = () => {
    if (selectedItem === null) return

    const item = mediaItems[selectedItem]
    const link = document.createElement("a")
    link.href = item.url
    link.download = `cameraconnect-${Date.now()}.${item.type === "image" ? "jpg" : "mp4"}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const shareMedia = async () => {
    if (selectedItem === null) return

    try {
      const item = mediaItems[selectedItem]

      if (navigator.share) {
        const file = new File([item.blob], `cameraconnect-${Date.now()}.${item.type === "image" ? "jpg" : "mp4"}`, {
          type: item.blob.type,
        })

        await navigator.share({
          title: "Shared from CameraConnect",
          files: [file],
        })
      } else {
        setError("Web Share API not supported in this browser")
      }
    } catch (err) {
      console.error("Error sharing:", err)
      setError("Failed to share media")
    }
  }

  const simulateConnection = () => {
    setConnected(true)
  }

  return (
    <div className="min-h-screen relative z-10">
      <div className="container mx-auto p-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-slate-700 to-indigo-600 text-white">
              <Camera className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-indigo-600 bg-clip-text text-transparent">
              CameraConnect
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshSession}
            className="gap-2 border-slate-200 dark:border-slate-800 text-gray-700 dark:text-gray-300"
          >
            <RefreshCw className="h-4 w-4" /> New Session
          </Button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <p>{error}</p>
            <Button
              variant="link"
              className="mt-2 h-auto p-0 text-red-600 dark:text-red-400"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="overflow-hidden border-0 shadow-lg shadow-slate-100 dark:shadow-slate-900/10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="mb-4 text-center">
                <h2 className="text-xl font-semibold">Connect Your Phone</h2>
                <p className="text-sm text-zinc-500">Scan this QR code with your phone camera</p>
              </div>

              <div className="flex justify-center">
                {!connected ? (
                  <div className="relative">
                    <QRCode value={`${window.location.origin}/connect/session/${sessionId}`} size={240} />
                    {connecting && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80">
                        <div className="flex flex-col items-center">
                          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-600"></div>
                          <p className="text-sm">Waiting for connection...</p>
                        </div>
                      </div>
                    )}
                    <Button
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 transform bg-gradient-to-r from-slate-700 to-indigo-600 hover:from-slate-800 hover:to-indigo-700 text-white border-0"
                      onClick={simulateConnection}
                    >
                      Simulate Connection
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-8 w-8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium">Connected!</h3>
                    <p className="text-center text-sm text-zinc-500">
                      Your phone is now connected. Take photos or videos on your phone to see them here.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <h3 className="mb-2 text-sm font-medium">Instructions:</h3>
                <ol className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <li>1. Make sure both devices are on the same WiFi network</li>
                  <li>2. Scan the QR code with your phone camera</li>
                  <li>3. Allow camera access when prompted</li>
                  <li>4. Take photos or videos on your phone</li>
                  <li>5. They'll appear instantly on this screen</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 shadow-lg shadow-slate-100 dark:shadow-slate-900/10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <Tabs defaultValue="gallery" className="w-full">
                <TabsList className="mb-4 grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800/50">
                  <TabsTrigger value="gallery">Gallery</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="gallery">
                  {mediaItems.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 p-4 dark:border-zinc-800">
                      <Camera className="mb-2 h-8 w-8 text-zinc-400" />
                      <p className="text-center text-zinc-500">
                        No media yet. Take photos or videos on your phone to see them here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {mediaItems.map((item, index) => (
                        <div
                          key={item.id}
                          className={`aspect-square cursor-pointer overflow-hidden rounded-lg ${
                            selectedItem === index ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""
                          }`}
                          onClick={() => setSelectedItem(index)}
                        >
                          <img
                            src={item.url || "/placeholder.svg"}
                            alt={`Captured ${item.type}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="preview">
                  {selectedItem === null ? (
                    <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 p-4 dark:border-zinc-800">
                      <p className="text-center text-zinc-500">Select an item from the gallery to preview</p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4 overflow-hidden rounded-lg">
                        <img
                          src={mediaItems[selectedItem].url || "/placeholder.svg"}
                          alt={`Preview of ${mediaItems[selectedItem].type}`}
                          className="w-full object-contain"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={copyToClipboard}
                          className="flex-1 gap-2 bg-gradient-to-r from-slate-700 to-indigo-600 hover:from-slate-800 hover:to-indigo-700 text-white border-0"
                        >
                          <Copy className="h-4 w-4" /> Copy
                        </Button>
                        <Button
                          onClick={downloadMedia}
                          variant="outline"
                          className="flex-1 gap-2 border-slate-200 dark:border-slate-800 text-gray-700 dark:text-gray-300"
                        >
                          <Download className="h-4 w-4" /> Download
                        </Button>
                        <Button
                          onClick={shareMedia}
                          variant="outline"
                          className="flex-1 gap-2 border-slate-200 dark:border-slate-800 text-gray-700 dark:text-gray-300"
                        >
                          <Share2 className="h-4 w-4" /> Share
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
