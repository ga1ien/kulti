'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { RoomFormData } from '@/components/admin/room-creation-form'
import { Plus, Pencil, Trash, Archive } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { logger } from '@/lib/logger'

// Code split RoomCreationForm - only load when modal is opened
const RoomCreationForm = dynamic(
  () => import('@/components/admin/room-creation-form').then(mod => ({ default: mod.RoomCreationForm })),
  { ssr: false }
)

interface CommunityRoom {
  id: string
  slug: string
  name: string
  description: string | null
  category: string
  icon_emoji: string
  member_count: number
  message_count: number
  created_at: string
  archived_at: string | null
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<CommunityRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchRooms()
  }, [])

  async function fetchRooms() {
    try {
      const response = await fetch('/api/community/rooms')
      if (response.ok) {
        const data = await response.json()
        setRooms(data)
      }
    } catch (error) {
      logger.error('Failed to fetch rooms', { error })
    } finally {
      setLoading(false)
    }
  }

  async function createRoom(formData: RoomFormData) {
    try {
      const response = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to create room')
      }

      const newRoom = await response.json()
      setRooms([...rooms, newRoom])
      setShowCreateModal(false)
    } catch (error) {
      throw error
    }
  }

  async function archiveRoom(roomId: string) {
    if (!confirm('Are you sure you want to archive this room?')) return

    try {
      const response = await fetch(`/api/admin/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      })

      if (response.ok) {
        fetchRooms()
      }
    } catch (error) {
      logger.error('Failed to archive room', { error, roomId })
      alert('Failed to archive room')
    }
  }

  async function deleteRoom(roomId: string) {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/admin/rooms/${roomId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setRooms(rooms.filter((r) => r.id !== roomId))
      } else {
        alert('Failed to delete room')
      }
    } catch (error) {
      logger.error('Failed to delete room', { error, roomId })
      alert('Failed to delete room')
    }
  }

  const activeRooms = rooms.filter((r) => !r.archived_at)
  const archivedRooms = rooms.filter((r) => r.archived_at)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Community Rooms</h1>
          <p className="mt-2 text-gray-400">
            Create and manage discussion spaces
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          <Plus className="h-5 w-5" />
          Create Room
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-gray-400">
        <span>
          Active Rooms:{' '}
          <span className="font-medium text-white">{activeRooms.length}</span>
        </span>
        <span>
          Archived:{' '}
          <span className="font-medium text-white">{archivedRooms.length}</span>
        </span>
      </div>

      {/* Active Rooms */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 p-4">
          <h2 className="font-semibold text-white">Active Rooms</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading rooms...</div>
          ) : activeRooms.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No active rooms. Create one to get started!
            </div>
          ) : (
            activeRooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-4 hover:bg-gray-800/30"
              >
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-3xl">{room.icon_emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{room.name}</h3>
                      <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400">
                        {room.category}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      {room.description || 'No description'}
                    </p>
                    <div className="mt-2 flex gap-4 text-xs text-gray-500">
                      <span>{room.member_count} members</span>
                      <span>{room.message_count} messages</span>
                      <span>
                        Created{' '}
                        {formatDistanceToNow(new Date(room.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/community/${room.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-purple-400 hover:bg-purple-500/10"
                  >
                    View
                  </a>
                  <button
                    onClick={() => archiveRoom(room.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                    title="Archive room"
                  >
                    <Archive className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => deleteRoom(room.id)}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                    title="Delete room"
                  >
                    <Trash className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Archived Rooms */}
      {archivedRooms.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 p-4">
            <h2 className="font-semibold text-white">Archived Rooms</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {archivedRooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-4 opacity-60 hover:bg-gray-800/30"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{room.icon_emoji}</span>
                  <div>
                    <h3 className="font-medium text-white">{room.name}</h3>
                    <p className="text-xs text-gray-500">
                      Archived{' '}
                      {room.archived_at &&
                        formatDistanceToNow(new Date(room.archived_at), {
                          addSuffix: true,
                        })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteRoom(room.id)}
                  className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                >
                  <Trash className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <RoomCreationForm
          onSubmit={createRoom}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}
