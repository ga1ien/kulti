"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { User, Shield, Bell, HelpCircle } from "lucide-react"
import { ErrorBoundary } from "@/components/error-boundary"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    {
      href: "/settings",
      label: "Account",
      icon: User,
      description: "Profile and security settings",
    },
    {
      href: "/settings/privacy",
      label: "Privacy",
      icon: Shield,
      description: "Visibility and privacy controls",
    },
    {
      href: "/settings/notifications",
      label: "Notifications",
      icon: Bell,
      description: "Notification preferences",
    },
    {
      href: "/help",
      label: "Help",
      icon: HelpCircle,
      description: "FAQs and support articles",
    },
  ]

  return (
    <ErrorBoundary>
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-mono mb-3 sm:mb-4">
            Settings
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-[#a1a1aa]">
            Manage your account, privacy, and notification preferences
          </p>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-80 flex-shrink-0">
            <nav className="space-y-2 flex flex-col sm:grid sm:grid-cols-2 lg:flex lg:flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 min-h-[72px] rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-lime-400/10 border-2 border-lime-400"
                        : "bg-[#1a1a1a] border-2 border-[#27272a] hover:border-lime-400/50"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg flex-shrink-0 ${
                        isActive ? "bg-lime-400 text-black" : "bg-[#2a2a2a]"
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-bold mb-1 text-sm sm:text-base ${
                          isActive ? "text-lime-400" : "text-white"
                        }`}
                      >
                        {item.label}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#a1a1aa]">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
