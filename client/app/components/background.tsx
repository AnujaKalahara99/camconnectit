"use client"

import { useEffect, useState } from "react"

interface BackgroundProps {
  className?: string
}

export default function Background({ className = "" }: BackgroundProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check for dark mode preference
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setIsDarkMode(darkModeQuery.matches)

    // Listen for changes in color scheme preference
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches)
    }

    darkModeQuery.addEventListener("change", handleChange)
    return () => darkModeQuery.removeEventListener("change", handleChange)
  }, [])

  return (
    <div className={`fixed inset-0 -z-10 overflow-hidden ${className}`} aria-hidden="true">
      {/* Base gradient background */}
      <div
        className={`absolute inset-0 ${
          isDarkMode
            ? "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950"
            : "bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50"
        }`}
      />

      {/* Abstract shapes */}
      <div className="absolute inset-0">
        {/* Large circle - representing laptop */}
        <div
          className={`absolute h-64 w-64 rounded-full blur-3xl opacity-20 ${
            isDarkMode ? "bg-indigo-500" : "bg-indigo-300"
          }`}
          style={{
            top: "60%",
            right: "20%",
            animation: "float 20s ease-in-out infinite",
          }}
        />

        {/* Medium circle - representing phone */}
        <div
          className={`absolute h-40 w-40 rounded-full blur-3xl opacity-20 ${
            isDarkMode ? "bg-teal-500" : "bg-teal-300"
          }`}
          style={{
            top: "30%",
            left: "20%",
            animation: "float 15s ease-in-out infinite reverse",
          }}
        />

        {/* Connection line */}
        <div
          className={`absolute h-1 opacity-10 ${isDarkMode ? "bg-slate-300" : "bg-slate-600"}`}
          style={{
            top: "45%",
            left: "25%",
            width: "50%",
            transform: "rotate(15deg)",
            transformOrigin: "left center",
          }}
        />

        {/* Data transfer pulse */}
        <div
          className={`absolute h-3 w-3 rounded-full ${isDarkMode ? "bg-teal-400" : "bg-teal-500"}`}
          style={{
            top: "calc(45% - 6px)",
            left: "25%",
            animation: "pulse 8s linear infinite",
          }}
        />

        {/* Small decorative elements */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`absolute h-${2 + (i % 3)} w-${2 + (i % 3)} rounded-full opacity-${5 + (i % 15)} ${
              isDarkMode
                ? i % 2 === 0
                  ? "bg-slate-400"
                  : "bg-indigo-400"
                : i % 2 === 0
                  ? "bg-slate-500"
                  : "bg-indigo-500"
            }`}
            style={{
              top: `${15 + i * 10}%`,
              left: `${10 + i * 10}%`,
              animation: `float ${10 + (i % 10)}s ease-in-out infinite ${i % 5}s`,
            }}
          />
        ))}

        {/* Additional decorative elements on the right side */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i + 8}
            className={`absolute h-${1 + (i % 4)} w-${1 + (i % 4)} ${
              i % 2 === 0 ? "rounded-full" : "rounded-md"
            } opacity-${5 + (i % 15)} ${
              isDarkMode ? (i % 2 === 0 ? "bg-teal-400" : "bg-slate-400") : i % 2 === 0 ? "bg-teal-500" : "bg-slate-500"
            }`}
            style={{
              top: `${20 + i * 12}%`,
              right: `${15 + i * 8}%`,
              animation: `float ${12 + (i % 8)}s ease-in-out infinite ${i % 4}s`,
            }}
          />
        ))}
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-10px) translateX(5px);
          }
          50% {
            transform: translateY(5px) translateX(-5px);
          }
          75% {
            transform: translateY(-5px) translateX(-10px);
          }
        }
        
        @keyframes pulse {
          0% {
            transform: translateX(0);
            opacity: 0.8;
          }
          80% {
            transform: translateX(50vw);
            opacity: 0.8;
          }
          100% {
            transform: translateX(50vw);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
