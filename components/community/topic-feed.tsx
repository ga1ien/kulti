"use client"

import { useState } from "react"
import {
  ArrowUp,
  MessageSquare,
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react"
import { TopicWithCreator, TopicStatus } from "@/lib/community/types"
import { toggleTopicVote, streamTopic } from "@/lib/community"
import { formatDistanceToNow } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { TopicCreationModal } from "./topic-creation-modal"
import { TopicDetailModal } from "./topic-detail-modal"
import { logger } from '@/lib/logger'

interface TopicFeedProps {
  roomId: string
  topics: TopicWithCreator[]
  currentUserId: string
  isHost?: boolean
  onTopicCreated?: () => void
}

const STATUS_COLORS: Record<TopicStatus, string> = {
  proposed: "text-[#a1a1aa]",
  planned: "text-blue-400",
  "in-progress": "text-lime-400",
  completed: "text-green-400",
  archived: "text-[#71717a]",
}

const STATUS_LABELS: Record<TopicStatus, string> = {
  proposed: "Proposed",
  planned: "Planned",
  "in-progress": "Live Now",
  completed: "Completed",
  archived: "Archived",
}

export function TopicFeed({
  roomId,
  topics,
  currentUserId,
  isHost = false,
  onTopicCreated,
}: TopicFeedProps) {
  const [filter, setFilter] = useState<TopicStatus | "all">("proposed")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<TopicWithCreator | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const filteredTopics =
    filter === "all" ? topics : topics.filter((t) => t.status === filter)

  const handleTopicClick = (topic: TopicWithCreator) => {
    setSelectedTopic(_topic)
    setShowDetailModal(true)
  }

  const handleDetailModalClose = () => {
    setShowDetailModal(false)
    setSelectedTopic(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Discussion Topics</h2>
          <p className="text-[#a1a1aa] mt-1">
            Propose topics for future streams and vote on what you'd like to see
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-lime-400 text-black rounded-lg font-medium hover:bg-lime-500 transition-colors"
        >
          Propose Topic
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-lime-400 text-black"
              : "bg-[#1a1a1a] text-[#a1a1aa] border border-[#27272a] hover:border-[#3f3f46]"
          }`}
        >
          All
        </button>
        {(["proposed", "planned", "in-progress", "completed"] as TopicStatus[]).map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? "bg-lime-400 text-black"
                  : "bg-[#1a1a1a] text-[#a1a1aa] border border-[#27272a] hover:border-[#3f3f46]"
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          )
        )}
      </div>

      {/* Topics List */}
      {filteredTopics.length === 0 ? (
        <div className="text-center py-12 bg-[#1a1a1a] rounded-xl border border-[#27272a]">
          <div className="text-6xl mb-4">💡</div>
          <p className="text-[#a1a1aa] text-lg">No topics yet</p>
          <p className="text-[#71717a] text-sm mt-2">
            Be the first to propose a topic for discussion!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTopics.map((_topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              currentUserId={currentUserId}
              isHost={isHost}
              onClick={handleTopicClick}
            />
          ))}
        </div>
      )}

      {/* Create Topic Modal */}
      <TopicCreationModal
        isOpen={showCreateModal}
        roomId={roomId}
        onClose={() => setShowCreateModal(false)}
        onTopicCreated={() => {
          setShowCreateModal(false)
          onTopicCreated?.()
        }}
      />

      {/* Topic Detail Modal */}
      <TopicDetailModal
        isOpen={showDetailModal}
        topic={selectedTopic}
        currentUserId={currentUserId}
        isHost={isHost}
        onClose={handleDetailModalClose}
        onTopicUpdated={onTopicCreated}
      />
    </div>
  )
}

interface TopicCardProps {
  topic: TopicWithCreator
  currentUserId: string
  isHost: boolean
  onClick: (topic: TopicWithCreator) => void
}

function TopicCard({ topic, currentUserId, isHost, onClick }: TopicCardProps) {
  const [isVoting, setIsVoting] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [votes, setVotes] = useState(topic.upvote_count)
  const [hasVoted, setHasVoted] = useState(topic.user_voted)
  const router = useRouter()

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isVoting) return

    setIsVoting(true)
    try {
      const result = await toggleTopicVote(topic.id)
      setVotes(result.newCount)
      setHasVoted(result.upvoted)
    } catch (error) {
      logger.error("Failed to vote:", { error })
      alert("Failed to vote. Please try again.")
    } finally {
      setIsVoting(false)
    }
  }

  const handleStreamThis = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (
      !confirm(
        "This will create a new live stream for this topic. All users who engaged with this topic will be notified. Continue?"
      )
    ) {
      return
    }

    setIsStreaming(true)
    try {
      const result = await streamTopic(topic.id)
      // Redirect to the new session
      router.push(`/session/${result.roomCode}`)
    } catch (error) {
      logger.error("Failed to create stream:", { error })
      alert("Failed to create stream. Please try again.")
    } finally {
      setIsStreaming(false)
    }
  }

  const statusColor = STATUS_COLORS[topic.status]
  const statusLabel = STATUS_LABELS[topic.status]

  return (
    <div
      onClick={() => onClick(_topic)}
      className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-6 hover:border-[#3f3f46] transition-colors cursor-pointer"
    >
      <div className="flex gap-4">
        {/* Vote Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleVote}
            disabled={isVoting || topic.status !== "proposed"}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              hasVoted
                ? "bg-lime-400 text-black"
                : "bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46] hover:text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-white">{votes}</span>
        </div>

        {/* Topic Content */}
        <div className="flex-1 min-w-0">
          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-medium ${statusColor}`}>
              {statusLabel}
            </span>
            {topic.status === "in-progress" && (
              <span className="flex items-center gap-1 text-xs text-lime-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-400"></span>
                </span>
                Live
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-white mb-2">
            {topic.title}
          </h3>

          {/* Description */}
          {topic.description && (
            <p className="text-[#a1a1aa] text-sm mb-3 line-clamp-2">
              {topic.description}
            </p>
          )}

          {/* Tags */}
          {topic.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {topic.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-[#27272a] text-[#a1a1aa] text-xs rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-[#71717a]">
              {/* Creator */}
              <div className="flex items-center gap-2">
                {topic.creator_avatar ? (
                  <Image
                    src={topic.creator_avatar}
                    alt={topic.creator_name}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#27272a] flex items-center justify-center text-xs">
                    {topic.creator_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span>{topic.creator_name}</span>
              </div>

              {/* Time */}
              <span>
                {formatDistanceToNow(new Date(topic.created_at), {
                  addSuffix: true,
                })}
              </span>

              {/* Comments */}
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                <span>{topic.comment_count}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Stream This Topic Button (Host Only) */}
              {isHost &&
                topic.status === "proposed" &&
                votes >= 5 && (
                  <button
                    onClick={handleStreamThis}
                    disabled={isStreaming}
                    className="px-4 py-2 bg-gradient-to-r from-lime-400 to-green-400 text-black rounded-lg font-medium hover:from-lime-500 hover:to-green-500 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isStreaming ? "Creating..." : "Stream This Topic"}
                  </button>
                )}

              {/* View Session Link */}
              {topic.covered_in_session_id && (
                <Link
                  href={`/session/${topic.covered_in_session_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-4 py-2 bg-[#27272a] text-white rounded-lg font-medium hover:bg-[#3f3f46] transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  View Stream
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
