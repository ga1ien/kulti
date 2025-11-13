"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { SettingsSection } from "@/components/settings/settings-section"
import { Save } from "lucide-react"

type ProfileVisibility = "public" | "friends" | "private"
type SessionVisibility = "public" | "invite" | "private"

export default function PrivacySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileVisibility, setProfileVisibility] =
    useState<ProfileVisibility>("public")
  const [showOnlineStatus, setShowOnlineStatus] = useState(true)
  const [matchmakingAvailable, setMatchmakingAvailable] = useState(true)
  const [sessionVisibility, setSessionVisibility] =
    useState<SessionVisibility>("public")
  const [showCreditBalance, setShowCreditBalance] = useState(true)

  useEffect(() => {
    const fetchSettings = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select(
            "profile_visibility, show_online_status, session_visibility, show_credit_balance"
          )
          .eq("id", user.id)
          .single()

        if (data) {
          setProfileVisibility(
            (data.profile_visibility as ProfileVisibility) || "public"
          )
          setShowOnlineStatus(data.show_online_status ?? true)
          setSessionVisibility(
            (data.session_visibility as SessionVisibility) || "public"
          )
          setShowCreditBalance(data.show_credit_balance ?? true)
        }

        // Get matchmaking availability from user_presence
        const { data: presenceData } = await supabase
          .from("user_presence")
          .select("available_for_matching")
          .eq("user_id", user.id)
          .single()

        if (presenceData) {
          setMatchmakingAvailable(presenceData.available_for_matching ?? true)
        }
      }

      setLoading(false)
    }

    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)

    try {
      const response = await fetch("/api/settings/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_visibility: profileVisibility,
          show_online_status: showOnlineStatus,
          matchmaking_available: matchmakingAvailable,
          session_visibility: sessionVisibility,
          show_credit_balance: showCreditBalance,
        }),
      })

      if (!response.ok) {
        alert("Failed to save privacy settings")
      }
    } catch (error) {
      console.error("Save error:", error)
      alert("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-lime-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Visibility */}
      <SettingsSection
        title="Profile Visibility"
        description="Control who can view your profile"
      >
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-4 bg-[#2a2a2a] border-2 border-[#27272a] rounded-lg cursor-pointer hover:border-lime-400/50 transition-colors">
            <input
              type="radio"
              name="profile_visibility"
              value="public"
              checked={profileVisibility === "public"}
              onChange={(e) =>
                setProfileVisibility(e.target.value as ProfileVisibility)
              }
              className="mt-1 w-4 h-4 accent-lime-400"
            />
            <div>
              <div className="font-bold mb-1">Public</div>
              <div className="text-sm text-[#a1a1aa]">
                Anyone can view your profile and stats
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 bg-[#2a2a2a] border-2 border-[#27272a] rounded-lg cursor-pointer hover:border-lime-400/50 transition-colors">
            <input
              type="radio"
              name="profile_visibility"
              value="friends"
              checked={profileVisibility === "friends"}
              onChange={(e) =>
                setProfileVisibility(e.target.value as ProfileVisibility)
              }
              className="mt-1 w-4 h-4 accent-lime-400"
            />
            <div>
              <div className="font-bold mb-1">Friends Only</div>
              <div className="text-sm text-[#a1a1aa]">
                Only friends can view your profile
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 bg-[#2a2a2a] border-2 border-[#27272a] rounded-lg cursor-pointer hover:border-lime-400/50 transition-colors">
            <input
              type="radio"
              name="profile_visibility"
              value="private"
              checked={profileVisibility === "private"}
              onChange={(e) =>
                setProfileVisibility(e.target.value as ProfileVisibility)
              }
              className="mt-1 w-4 h-4 accent-lime-400"
            />
            <div>
              <div className="font-bold mb-1">Private</div>
              <div className="text-sm text-[#a1a1aa]">
                Only you can view your profile
              </div>
            </div>
          </label>
        </div>
      </SettingsSection>

      {/* Online Status & Availability */}
      <SettingsSection
        title="Online Status & Availability"
        description="Control your online presence and matchmaking"
      >
        <label className="flex items-center justify-between p-4 bg-[#2a2a2a] border border-[#27272a] rounded-lg cursor-pointer hover:border-lime-400/50 transition-colors">
          <div>
            <div className="font-bold mb-1">Show Online Status</div>
            <div className="text-sm text-[#a1a1aa]">
              Allow others to see when you're online
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showOnlineStatus}
            onClick={() => setShowOnlineStatus(!showOnlineStatus)}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              showOnlineStatus ? "bg-lime-400" : "bg-[#27272a]"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 bg-black rounded-full transition-transform ${
                showOnlineStatus ? "translate-x-6" : ""
              }`}
            />
          </button>
        </label>

        <label className="flex items-center justify-between p-4 bg-[#2a2a2a] border border-[#27272a] rounded-lg cursor-pointer hover:border-lime-400/50 transition-colors">
          <div>
            <div className="font-bold mb-1">Matchmaking Availability</div>
            <div className="text-sm text-[#a1a1aa]">
              Allow matchmaking to pair you with other developers
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={matchmakingAvailable}
            onClick={() => setMatchmakingAvailable(!matchmakingAvailable)}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              matchmakingAvailable ? "bg-lime-400" : "bg-[#27272a]"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 bg-black rounded-full transition-transform ${
                matchmakingAvailable ? "translate-x-6" : ""
              }`}
            />
          </button>
        </label>
      </SettingsSection>

      {/* Session Settings */}
      <SettingsSection
        title="Session Settings"
        description="Control default session visibility and credit display"
      >
        <div>
          <label className="block text-sm font-medium text-[#a1a1aa] mb-3">
            Default Session Visibility
          </label>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 bg-[#2a2a2a] border-2 border-[#27272a] rounded-lg cursor-pointer hover:border-lime-400/50 transition-colors">
              <input
                type="radio"
                name="session_visibility"
                value="public"
                checked={sessionVisibility === "public"}
                onChange={(e) =>
                  setSessionVisibility(e.target.value as SessionVisibility)
                }
                className="mt-1 w-4 h-4 accent-lime-400"
              />
              <div>
                <div className="font-bold mb-1">Public</div>
                <div className="text-sm text-[#a1a1aa]">
                  Anyone can discover and join your sessions
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 bg-[#2a2a2a] border-2 border-[#27272a] rounded-lg cursor-pointer hover:border-lime-400/50 transition-colors">
              <input
                type="radio"
                name="session_visibility"
                value="invite"
                checked={sessionVisibility === "invite"}
                onChange={(e) =>
                  setSessionVisibility(e.target.value as SessionVisibility)
                }
                className="mt-1 w-4 h-4 accent-lime-400"
              />
              <div>
                <div className="font-bold mb-1">Invite Only</div>
                <div className="text-sm text-[#a1a1aa]">
                  Only people with an invite link can join
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 bg-[#2a2a2a] border-2 border-[#27272a] rounded-lg cursor-pointer hover:border-lime-400/50 transition-colors">
              <input
                type="radio"
                name="session_visibility"
                value="private"
                checked={sessionVisibility === "private"}
                onChange={(e) =>
                  setSessionVisibility(e.target.value as SessionVisibility)
                }
                className="mt-1 w-4 h-4 accent-lime-400"
              />
              <div>
                <div className="font-bold mb-1">Private</div>
                <div className="text-sm text-[#a1a1aa]">
                  Sessions are hidden from public discovery
                </div>
              </div>
            </label>
          </div>
        </div>

        <label className="flex items-center justify-between p-4 bg-[#2a2a2a] border border-[#27272a] rounded-lg cursor-pointer hover:border-lime-400/50 transition-colors">
          <div>
            <div className="font-bold mb-1">Show Credit Balance</div>
            <div className="text-sm text-[#a1a1aa]">
              Display your credit balance on your public profile
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showCreditBalance}
            onClick={() => setShowCreditBalance(!showCreditBalance)}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              showCreditBalance ? "bg-lime-400" : "bg-[#27272a]"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 bg-black rounded-full transition-transform ${
                showCreditBalance ? "translate-x-6" : ""
              }`}
            />
          </button>
        </label>
      </SettingsSection>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full px-6 py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
          !saving
            ? "bg-lime-400 hover:bg-lime-500 text-black"
            : "bg-[#2a2a2a] text-[#71717a] cursor-not-allowed"
        }`}
      >
        {saving ? (
          <>
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Save Privacy Settings
          </>
        )}
      </button>
    </div>
  )
}
