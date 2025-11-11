"use client"

import { Toaster } from "react-hot-toast"

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: "#1a1a1a",
          color: "#fff",
          border: "1px solid #27272a",
          borderRadius: "12px",
          padding: "16px",
          fontSize: "14px",
          fontFamily: "var(--font-mono)",
        },
        // Success toast style
        success: {
          iconTheme: {
            primary: "#a3e635", // lime-400
            secondary: "#1a1a1a",
          },
          style: {
            border: "1px solid #a3e635",
          },
        },
        // Error toast style
        error: {
          iconTheme: {
            primary: "#ef4444", // red-500
            secondary: "#1a1a1a",
          },
          style: {
            border: "1px solid #ef4444",
          },
        },
      }}
    />
  )
}
