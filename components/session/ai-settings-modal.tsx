"use client"

import { useState, useEffect } from "react"
import { X, Bot, Users, User, Check } from "lucide-react"
import {
  type AIPermissions,
  type AIAccessMode,
  getAccessModeLabel,
  getAccessModeDescription,
} from "@/lib/session"
import { UserSelector } from "./user-selector"

interface AISettingsModalProps {
  isOpen: boolean
  onClose: () => void
  permissions: AIPermissions
  sessionId: string
  hostId: string
  onUpdate: () => void
}

export function AISettingsModal({
  isOpen,
  onClose,
  permissions,
  sessionId,
  hostId,
  onUpdate,
}: AISettingsModalProps) {
  const [accessMode, setAccessMode] = useState<AIAccessMode>(permissions.accessMode)
  const [allowedUsers, setAllowedUsers] = useState<string[]>(permissions.allowedUsers)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAccessMode(permissions.accessMode)
    setAllowedUsers(permissions.allowedUsers)
  }, [permissions.accessMode, permissions.allowedUsers])

  const handleSave = async () => {
    // Validate manual mode has users selected
    if (accessMode === 'manual' && allowedUsers.length === 0) {
      setError('Please select at least one user for manual mode')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/sessions/${sessionId}/ai-module`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: permissions.moduleEnabled,
          accessMode,
          allowedUsers: accessMode === 'manual' ? allowedUsers : [],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update settings')
        return
      }

      onUpdate()
      onClose()
    } catch (error) {
      console.error('Failed to save AI settings:', error)
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges =
    accessMode !== permissions.accessMode ||
    (accessMode === 'manual' &&
      JSON.stringify([...allowedUsers].sort()) !==
        JSON.stringify([...permissions.allowedUsers].sort()))

  if (!isOpen) return null

  const modes: { value: AIAccessMode; icon: any; recommended?: boolean }[] = [
    { value: 'host_only', icon: User },
    { value: 'presenters', icon: Users, recommended: true },
    { value: 'manual', icon: Check },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-[#1a1a1a] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-[#27272a] p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500 rounded-xl">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-mono text-2xl font-bold">AI Module Settings</h2>
              <p className="text-sm text-[#a1a1aa]">Control who can chat with Claude</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-[#a1a1aa] mb-3">
              Who can chat with AI?
            </h3>

            <div className="space-y-2">
              {modes.map(({ value, icon: Icon, recommended }) => (
                <button
                  key={value}
                  onClick={() => setAccessMode(value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    accessMode === value
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-[#27272a] bg-[#2a2a2a] hover:border-[#333333]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      accessMode === value
                        ? "bg-purple-500"
                        : "bg-[#1a1a1a]"
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        accessMode === value ? "text-white" : "text-[#71717a]"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">
                          {getAccessModeLabel(value)}
                        </span>
                        {recommended && (
                          <span className="px-2 py-0.5 bg-lime-400/20 text-lime-400 text-xs font-bold rounded">
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#71717a]">
                        {getAccessModeDescription(value)}
                      </p>
                    </div>
                    {accessMode === value && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Selection UI */}
          {accessMode === 'manual' && (
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-white mb-2">
                  Select who can chat with AI
                </h4>
                <p className="text-xs text-[#71717a] mb-3">
                  Choose specific users to grant AI chat access. The host always has access.
                </p>
              </div>
              <UserSelector
                sessionId={sessionId}
                selectedUsers={allowedUsers}
                onSelectionChange={setAllowedUsers}
                hostId={hostId}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-[#2a2a2a] hover:bg-[#333333] text-white font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex-1 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
