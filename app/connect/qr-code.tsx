"use client"

import { useEffect, useRef } from "react"

interface QRCodeProps {
  value: string
  size?: number
  bgColor?: string
  fgColor?: string
}

export default function QRCode({ value, size = 200, bgColor = "#FFFFFF", fgColor = "#000000" }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // This is a simplified QR code generator
    // In a real implementation, you would use a library like qrcode.js
    const drawQRCode = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Clear canvas
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, size, size)

      // Draw a fake QR code pattern
      ctx.fillStyle = fgColor

      // Draw position detection patterns (corners)
      // Top-left
      ctx.fillRect(10, 10, 30, 30)
      ctx.fillStyle = bgColor
      ctx.fillRect(15, 15, 20, 20)
      ctx.fillStyle = fgColor
      ctx.fillRect(20, 20, 10, 10)

      // Top-right
      ctx.fillRect(size - 40, 10, 30, 30)
      ctx.fillStyle = bgColor
      ctx.fillRect(size - 35, 15, 20, 20)
      ctx.fillStyle = fgColor
      ctx.fillRect(size - 30, 20, 10, 10)

      // Bottom-left
      ctx.fillRect(10, size - 40, 30, 30)
      ctx.fillStyle = bgColor
      ctx.fillRect(15, size - 35, 20, 20)
      ctx.fillStyle = fgColor
      ctx.fillRect(20, size - 30, 10, 10)

      // Draw random dots to simulate QR code data
      const blockSize = 5
      for (let y = 0; y < size; y += blockSize) {
        for (let x = 0; x < size; x += blockSize) {
          // Skip the corner areas
          if ((x < 50 && y < 50) || (x > size - 50 && y < 50) || (x < 50 && y > size - 50)) {
            continue
          }

          // Random pattern
          if (Math.random() > 0.7) {
            ctx.fillRect(x, y, blockSize, blockSize)
          }
        }
      }

      // Draw the session value at the bottom
      ctx.fillStyle = bgColor
      ctx.fillRect(size / 4, size - 25, size / 2, 20)
      ctx.fillStyle = fgColor
      ctx.font = "10px Arial"
      ctx.textAlign = "center"
      ctx.fillText("Scan to connect", size / 2, size - 10)
    }

    drawQRCode()
  }, [value, size, bgColor, fgColor])

  return (
    <div className="p-2 bg-gradient-to-br from-pink-100 to-violet-100 dark:from-pink-900/20 dark:to-violet-900/20 rounded-lg shadow-lg">
      <canvas ref={canvasRef} width={size} height={size} className="rounded-md bg-white dark:bg-gray-800" />
    </div>
  )
}
