'use client'

import { useState } from 'react'
import { Check, X, Eye, Copy } from 'lucide-react'
import type { Invite } from '@/types/database'
import Link from 'next/link'

interface InviteCodeTableProps {
  invites: Invite[]
  onToggleActive: (_id: string, _isActive: boolean) => Promise<void>
  loading: boolean
}

export function InviteCodeTable({
  invites,
  onToggleActive,
  loading,
}: InviteCodeTableProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
        <p className="text-gray-500">Loading invite codes...</p>
      </div>
    )
  }

  if (invites.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
        <p className="text-gray-500">No invite codes found</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-800 bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Uses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Expires
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {invites.map((invite) => (
              <tr key={invite.id} className="hover:bg-gray-800/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-gray-800 px-2 py-1 text-sm font-mono text-purple-400">
                      {invite.code}
                    </code>
                    <button
                      onClick={() => copyToClipboard(invite.code)}
                      className="text-gray-500 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      {copiedCode === invite.code ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {invite.metadata?.note && (
                    <p className="mt-1 text-xs text-gray-500">
                      {invite.metadata.note}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-white">
                  {invite.current_uses} / {invite.max_uses}
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {invite.expires_at
                    ? new Date(invite.expires_at).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="px-6 py-4">
                  {invite.is_active ? (
                    <span className="inline-flex rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-500">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-gray-500/10 px-2 py-1 text-xs font-medium text-gray-500">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {new Date(invite.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/invites/${invite.id}`}
                      className="text-purple-400 hover:text-purple-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => onToggleActive(invite.id, invite.is_active)}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center ${
                        invite.is_active
                          ? 'text-red-400 hover:text-red-300'
                          : 'text-green-400 hover:text-green-300'
                      }`}
                    >
                      {invite.is_active ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
