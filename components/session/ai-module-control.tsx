"use client"

import { useState } from "react"
import { Bot, Settings, Power } from "lucide-react"
import type { AIPermissions } from "@/lib/session"

interface AIModuleControlProps {
  permissions: AIPermissions
  onOpenSettings: () => void
  onToggle: (enabled: boolean) => Promise<void>
}

export function AIModuleControl({
  permissions,
  onOpenSettings,
  onToggle,
}: AIModuleControlProps) {
  const [toggling, setToggling] = useState(false)

  if (!permissions.canToggle) {
    return null // Only show for hosts
  }

  const handleQuickToggle = async () => {
    setToggling(true)
    try {
      await onToggle(!permissions.moduleEnabled)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#27272a] rounded-lg">
      {/* AI Icon */}
      <div className={`p-1.5 rounded-lg ${
        permissions.moduleEnabled
          ? "bg-purple-500/10"
          : "bg-[#2a2a2a]"
      }`}>
        <Bot className={`w-4 h-4 ${
          permissions.moduleEnabled
            ? "text-purple-500"
            : "text-[#71717a]"
        }`} />
      </div>

      {/* Status */}
      <div className="flex flex-col">
        <span className="text-xs font-medium">AI Module</span>
        <span className={`text-xs font-bold ${
          permissions.moduleEnabled
            ? "text-purple-500"
            : "text-[#71717a]"
        }`}>
          {permissions.moduleEnabled ? "ON" : "OFF"}
        </span>
      </div>

      {/* Quick Toggle */}
      <button
        onClick={handleQuickToggle}
        disabled={toggling}
        className={`p-1.5 rounded-lg transition-colors ${
          permissions.moduleEnabled
            ? "bg-purple-500 hover:bg-purple-600"
            : "bg-[#2a2a2a] hover:bg-[#333333]"
        } disabled:opacity-50`}
        title={permissions.moduleEnabled ? "Turn off" : "Turn on"}
      >
        <Power className="w-4 h-4 text-white" />
      </button>

      {/* Settings */}
      <button
        onClick={onOpenSettings}
        className="p-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333333] transition-colors"
        title="AI Settings"
      >
        <Settings className="w-4 h-4 text-white" />
      </button>
    </div>
  )
}
