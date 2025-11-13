'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Users,
  MessageSquare,
  Video,
  BarChart3,
  ShieldCheck,
  Ticket,
} from 'lucide-react'

const navigation = [
  { name: 'Overview', href: '/admin', icon: Home },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Invite Codes', href: '/admin/invites', icon: Ticket },
  { name: 'Community Rooms', href: '/admin/rooms', icon: MessageSquare },
  { name: 'Sessions', href: '/admin/sessions', icon: Video },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-800 bg-gray-900">
      {/* Admin Badge */}
      <div className="flex items-center gap-2 border-b border-gray-800 p-4">
        <ShieldCheck className="h-6 w-6 text-purple-500" />
        <div>
          <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
          <p className="text-xs text-gray-400">Platform Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors
                ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Back to Dashboard */}
      <div className="border-t border-gray-800 p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
