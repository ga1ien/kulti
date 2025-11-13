"use client"

import { useState, useEffect } from "react"
import { Check, Users, Loader2, UserCircle } from "lucide-react"
import Image from "next/image"

export interface ParticipantInfo {
  userId: string
  role: "host" | "presenter" | "viewer"
  username: string
  displayName: string
  avatarUrl: string | null
  joinedAt: string
}

interface UserSelectorProps {
  sessionId: string
  selectedUsers: string[]
  onSelectionChange: (userIds: string[]) => void
  hostId?: string
}

export function UserSelector({
  sessionId,
  selectedUsers,
  onSelectionChange,
  hostId,
}: UserSelectorProps) {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchParticipants()
  }, [sessionId])

  const fetchParticipants = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/sessions/${sessionId}/participants`)

      if (!response.ok) {
        throw new Error("Failed to fetch participants")
      }

      const data = await response.json()

      // Filter out host from the list since host always has access
      const filteredParticipants = data.participants.filter(
        (p: ParticipantInfo) => p.userId !== hostId
      )

      setParticipants(filteredParticipants)
    } catch (err) {
      console.error("Error fetching participants:", err)
      setError("Failed to load participants")
    } finally {
      setLoading(false)
    }
  }

  const toggleUser = (userId: string) => {
    const newSelection = selectedUsers.includes(userId)
      ? selectedUsers.filter((id) => id !== userId)
      : [...selectedUsers, userId]

    onSelectionChange(newSelection)
  }

  const toggleAll = () => {
    if (selectedUsers.length === participants.length) {
      // Deselect all
      onSelectionChange([])
    } else {
      // Select all
      onSelectionChange(participants.map((p) => p.userId))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#71717a]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  if (participants.length === 0) {
    return (
      <div className="p-4 bg-[#2a2a2a] rounded-xl text-center">
        <Users className="w-8 h-8 text-[#71717a] mx-auto mb-2" />
        <p className="text-sm text-[#a1a1aa]">
          No other participants in this session yet
        </p>
        <p className="text-xs text-[#71717a] mt-1">
          Users will appear here as they join
        </p>
      </div>
    )
  }

  const allSelected = selectedUsers.length === participants.length

  return (
    <div className="space-y-3">
      {/* Select All / Clear All */}
      <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#a1a1aa]" />
          <span className="text-sm text-[#a1a1aa]">
            {selectedUsers.length} of {participants.length} selected
          </span>
        </div>
        <button
          onClick={toggleAll}
          className="text-sm font-bold text-purple-500 hover:text-purple-400 transition-colors"
        >
          {allSelected ? "Clear All" : "Select All"}
        </button>
      </div>

      {/* Participant List */}
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {participants.map((participant) => {
          const isSelected = selectedUsers.includes(participant.userId)

          return (
            <button
              key={participant.userId}
              onClick={() => toggleUser(participant.userId)}
              className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-[#27272a] bg-[#2a2a2a] hover:border-[#333333]"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {participant.avatarUrl ? (
                    <Image
                      src={participant.avatarUrl}
                      alt={participant.displayName}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <UserCircle className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-white truncate">
                      {participant.displayName}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded ${
                        participant.role === "presenter"
                          ? "bg-lime-400/20 text-lime-400"
                          : "bg-[#333333] text-[#71717a]"
                      }`}
                    >
                      {participant.role.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-[#71717a] truncate">
                    @{participant.username}
                  </p>
                </div>

                {/* Checkbox */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-purple-500 border-purple-500"
                        : "border-[#333333] bg-[#1a1a1a]"
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Info Note */}
      <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#27272a]">
        <p className="text-xs text-[#71717a]">
          Note: The host always has AI access and viewers cannot chat with AI
          regardless of selection.
        </p>
      </div>
    </div>
  )
}
