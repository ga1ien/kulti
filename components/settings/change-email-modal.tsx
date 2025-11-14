"use client"

import { useState } from "react"
import { X, Mail } from "lucide-react"
import { logger } from '@/lib/logger'

interface ChangeEmailModalProps {
  isOpen: boolean
  onClose: () => void
  currentEmail: string
}

export const ChangeEmailModal = ({
  isOpen,
  onClose,
  currentEmail,
}: ChangeEmailModalProps) => {
  const [newEmail, setNewEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newEmail !== confirmEmail) {
      setError("Email addresses do not match")
      return
    }

    if (newEmail === currentEmail) {
      setError("New email must be different from current email")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_email: newEmail, password }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(
          "A verification email has been sent to your new email address. Please check your inbox and click the link to confirm the change."
        )
        onClose()
      } else {
        setError(data.error || "Failed to change email")
      }
    } catch (error) {
      logger.error("Email change error:", error)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 bg-[#1a1a1a] border border-[#27272a] rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-[#27272a] p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-lime-400/10 rounded-lg">
              <Mail className="w-6 h-6 text-lime-400" />
            </div>
            <h2 className="font-mono text-2xl font-bold">Change Email</h2>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
              Current Email
            </label>
            <div className="px-4 py-3 bg-[#2a2a2a]/50 border border-[#27272a] rounded-lg text-[#71717a]">
              {currentEmail}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
              New Email
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#27272a] rounded-lg text-white focus:border-lime-400 focus:outline-none transition-colors"
              placeholder="your.new@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
              Confirm New Email
            </label>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#27272a] rounded-lg text-white focus:border-lime-400 focus:outline-none transition-colors"
              placeholder="your.new@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#27272a] rounded-lg text-white focus:border-lime-400 focus:outline-none transition-colors"
              placeholder="Enter your password"
              required
            />
            <p className="text-xs text-[#71717a] mt-1">
              Required to verify your identity
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[#2a2a2a] hover:bg-[#333333] text-white font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-6 py-3 font-bold rounded-lg transition-colors ${
                !loading
                  ? "bg-lime-400 hover:bg-lime-500 text-black"
                  : "bg-[#2a2a2a] text-[#71717a] cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                </>
              ) : (
                "Change Email"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
