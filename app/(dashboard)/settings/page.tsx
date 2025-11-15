"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { SettingsSection } from "@/components/settings/settings-section"
import { ChangeEmailModal } from "@/components/settings/change-email-modal"
import { ChangePasswordModal } from "@/components/settings/change-password-modal"
import { DeleteAccountModal } from "@/components/settings/delete-account-modal"
import { Save, Mail, Lock, Download, Trash2, Loader2 } from "lucide-react"
import { logger } from '@/lib/logger'

export default function AccountSettingsPage() {
  const [profile, setProfile] = useState<{ id: string; username: string; display_name: string; bio: string | null } | null>(null)
  const [email, setEmail] = useState<string>("")
  const [displayName, setDisplayName] = useState<string>("")
  const [bio, setBio] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [exportingData, setExportingData] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setEmail(user.email || "")

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (data) {
          setProfile(data)
          setDisplayName(data.display_name)
          setBio(data.bio || "")
        }
      }

      setLoading(false)
    }

    fetchProfile()
  }, [])

  const handleSaveProfile = async () => {
    if (!profile) return

    setSaving(true)

    try {
      const response = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio || null,
        }),
      })

      if (response.ok) {
        const supabase = createClient()
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", profile.id)
          .single()

        if (data) {
          setProfile(data)
        }
      } else {
        alert("Failed to update profile")
      }
    } catch (error) {
      logger.error("Save error:", { error })
      alert("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    setExportingData(true)

    try {
      const response = await fetch("/api/settings/export", {
        method: "POST",
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `kulti-data-export-${Date.now()}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert("Failed to export data")
      }
    } catch (error) {
      logger.error("Export error:", { error })
      alert("Failed to export data")
    } finally {
      setExportingData(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-lime-400" />
        <p className="text-[#a1a1aa]">Loading settings...</p>
      </div>
    )
  }

  return (
    <>
      {showEmailModal && (
        <ChangeEmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          currentEmail={email}
        />
      )}
      {showPasswordModal && (
        <ChangePasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
      {showDeleteModal && (
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

      <div className="space-y-6">
        {/* Profile Information */}
        <SettingsSection
          title="Profile Information"
          description="Manage your public profile information"
        >
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

          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
              Username
            </label>
            <div className="px-4 py-3 bg-[#2a2a2a]/50 border border-[#27272a] rounded-lg text-[#71717a]">
              @{profile?.username}
            </div>
            <p className="text-xs text-[#71717a] mt-1">
              Username cannot be changed
            </p>
          </div>

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

          <button
            onClick={handleSaveProfile}
            disabled={saving || !displayName.trim()}
            className={`w-full px-6 py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
              !saving && displayName.trim()
                ? "bg-lime-400 hover:bg-lime-500 text-black"
                : "bg-[#2a2a2a] text-[#71717a] cursor-not-allowed"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </SettingsSection>

        {/* Email & Password */}
        <SettingsSection
          title="Email & Password"
          description="Manage your login credentials"
        >
          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
              Email Address
            </label>
            <div className="px-4 py-3 bg-[#2a2a2a]/50 border border-[#27272a] rounded-lg text-white">
              {email}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex-1 px-6 py-3 bg-[#2a2a2a] hover:bg-[#333333] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Change Email
            </button>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex-1 px-6 py-3 bg-[#2a2a2a] hover:bg-[#333333] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-5 h-5" />
              Change Password
            </button>
          </div>
        </SettingsSection>

        {/* Account Actions */}
        <SettingsSection
          title="Account Actions"
          description="Export your data or delete your account"
        >
          <button
            onClick={handleExportData}
            disabled={exportingData}
            className="w-full px-6 py-3 bg-[#2a2a2a] hover:bg-[#333333] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportingData ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Export My Data
              </>
            )}
          </button>

          <div className="pt-4 border-t border-[#27272a]">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-3">
              <h4 className="font-bold text-red-400 mb-1">Danger Zone</h4>
              <p className="text-sm text-[#a1a1aa]">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete Account
            </button>
          </div>
        </SettingsSection>
      </div>
    </>
  )
}
