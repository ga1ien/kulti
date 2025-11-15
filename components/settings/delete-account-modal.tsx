"use client"

import { useState } from "react"
import { X, Trash2, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { logger } from '@/lib/logger'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

export const DeleteAccountModal = ({
  isOpen,
  onClose,
}: DeleteAccountModalProps) => {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (confirmation !== "DELETE") {
      setError('You must type "DELETE" to confirm')
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/settings/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      })

      const data = await response.json()

      if (response.ok) {
        // Sign out and redirect to home
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push("/")
      } else {
        setError(data.error || "Failed to delete account")
      }
    } catch (error) {
      logger.error("Account deletion error:", { error })
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
    >
      <div
        className="relative w-full max-w-lg mx-4 bg-[#1a1a1a] border-2 border-red-500/50 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-red-500/20 bg-red-500/5 p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            aria-label="Close delete account modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h2 id="delete-account-title" className="font-mono text-2xl font-bold text-red-400">
              Delete Account
            </h2>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <h3 className="font-bold text-red-400 mb-2">Warning</h3>
            <p className="text-sm text-[#a1a1aa] mb-2">
              This action cannot be undone. This will permanently delete your
              account and remove all of your data from our servers, including:
            </p>
            <ul className="text-sm text-[#a1a1aa] list-disc list-inside space-y-1 ml-2">
              <li>Your profile and personal information</li>
              <li>All sessions you've hosted</li>
              <li>Your credit balance and transaction history</li>
              <li>Earned badges and achievements</li>
              <li>Messages and interactions</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
              Type <span className="text-red-400 font-bold">DELETE</span> to
              confirm
            </label>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#27272a] rounded-lg text-white focus:border-red-400 focus:outline-none transition-colors"
              placeholder="DELETE"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#27272a] rounded-lg text-white focus:border-red-400 focus:outline-none transition-colors"
              placeholder="Enter your password"
              required
            />
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
              disabled={loading || confirmation !== "DELETE"}
              className={`flex-1 px-6 py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                !loading && confirmation === "DELETE"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-[#2a2a2a] text-[#71717a] cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Delete Account
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
