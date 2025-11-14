"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { SettingsSection } from "@/components/settings/settings-section"
import { Save } from "lucide-react"
import { logger } from '@/lib/logger'

interface NotificationPreferences {
  tips_received: boolean
  badges_earned: boolean
  match_found: boolean
  topic_streamed: boolean
  session_invites: boolean
  message_replies: boolean
  system_announcements: boolean
}

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    tips_received: true,
    badges_earned: true,
    match_found: true,
    topic_streamed: true,
    session_invites: true,
    message_replies: true,
    system_announcements: true,
  })

  useEffect(() => {
    const fetchPreferences = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("notification_preferences")
          .eq("id", user.id)
          .single()

        if (data?.notification_preferences) {
          setPreferences(data.notification_preferences as NotificationPreferences)
        }
      }

      setLoading(false)
    }

    fetchPreferences()
  }, [])

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        alert("Failed to save notification preferences")
      }
    } catch (error) {
      logger.error("Save error:", error)
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

  const notificationOptions: {
    key: keyof NotificationPreferences
    title: string
    description: string
  }[] = [
    {
      key: "tips_received",
      title: "Tips Received",
      description: "Notify when someone tips you during a session",
    },
    {
      key: "badges_earned",
      title: "Badges Earned",
      description: "Notify when you earn a new badge or achievement",
    },
    {
      key: "match_found",
      title: "Match Found",
      description: "Notify when matchmaking finds a compatible developer",
    },
    {
      key: "topic_streamed",
      title: "Topic Streamed",
      description: "Notify when a topic you voted on is being streamed",
    },
    {
      key: "session_invites",
      title: "Session Invites",
      description: "Notify when you're invited to join a session as a presenter",
    },
    {
      key: "message_replies",
      title: "Message Replies",
      description: "Notify when someone replies to your message",
    },
    {
      key: "system_announcements",
      title: "System Announcements",
      description: "Notify about platform updates and important announcements",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Notification Preferences */}
      <SettingsSection
        title="Notification Preferences"
        description="Choose which notifications you want to receive"
      >
        <div className="space-y-3">
          {notificationOptions.map((option) => (
            <label
              key={option.key}
              className="flex items-center justify-between p-4 bg-[#2a2a2a] border border-[#27272a] rounded-lg cursor-pointer hover:border-lime-400/50 transition-colors"
            >
              <div>
                <div className="font-bold mb-1">{option.title}</div>
                <div className="text-sm text-[#a1a1aa]">
                  {option.description}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences[option.key]}
                onClick={() => handleToggle(option.key)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  preferences[option.key] ? "bg-lime-400" : "bg-[#27272a]"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-6 h-6 bg-black rounded-full transition-transform ${
                    preferences[option.key] ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
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
            Save Notification Preferences
          </>
        )}
      </button>
    </div>
  )
}
