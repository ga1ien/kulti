"use client"

import { useState } from "react"
import { X, Save } from "lucide-react"
import { Profile } from "@/types/database"
import { createClient } from "@/lib/supabase/client"
import { logger } from '@/lib/logger'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: Profile
}

export function EditProfileModal({
  isOpen,
  onClose,
  profile,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [bio, setBio] = useState(profile.bio || "")
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          bio: bio || null,
        })
        .eq("id", profile.id)

      if (error) {
        logger.error("Update error:", { error })
        alert("Failed to update profile")
      } else {
        // Refresh the page to show updated data
        window.location.reload()
      }
    } catch (error) {
      logger.error("Save error:", { error })
      alert("Failed to save changes")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
      <div className="relative w-full max-w-2xl mx-4 bg-[#1a1a1a] border border-[#27272a] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="border-b border-[#27272a] p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            aria-label="Close edit profile modal"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 id="edit-profile-title" className="font-mono text-2xl font-bold">Edit Profile</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#27272a] rounded-lg text-white focus:border-lime-400 focus:outline-none transition-colors"
              placeholder="Your display name"
              maxLength={50}
            />
            <p className="text-xs text-[#71717a] mt-1">
              {displayName.length}/50 characters
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#27272a] rounded-lg text-white focus:border-lime-400 focus:outline-none transition-colors resize-none"
              placeholder="Tell us about yourself..."
              rows={4}
              maxLength={200}
            />
            <p className="text-xs text-[#71717a] mt-1">
              {bio.length}/200 characters
            </p>
          </div>

          {/* Username (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
              Username
            </label>
            <div className="px-4 py-3 bg-[#2a2a2a]/50 border border-[#27272a] rounded-lg text-[#71717a]">
              @{profile.username}
            </div>
            <p className="text-xs text-[#71717a] mt-1">
              Username cannot be changed
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-[#27272a] p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-[#2a2a2a] hover:bg-[#333333] text-white font-bold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !displayName.trim()}
            className={`flex-1 px-6 py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
              !loading && displayName.trim()
                ? "bg-lime-400 hover:bg-lime-500 text-black"
                : "bg-[#2a2a2a] text-[#71717a] cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
