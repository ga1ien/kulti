"use client"

import { useState, useEffect } from "react"
import { X, ArrowUp, MessageSquare, Sparkles, Loader2, Send } from "lucide-react"
import {
  getTopicComments,
  createTopicComment,
  toggleTopicVote,
  streamTopic,
} from "@/lib/community"
import {
  TopicCommentWithProfile,
  DiscussionTopic,
  TopicWithCreator,
} from "@/lib/community/types"
import { formatDistanceToNow } from "date-fns"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { logger } from '@/lib/logger'

interface TopicDetailModalProps {
  isOpen: boolean
  onClose: () => void
  topic: TopicWithCreator | null
  currentUserId: string
  isHost?: boolean
  onTopicUpdated?: () => void
}

export function TopicDetailModal({
  isOpen,
  onClose,
  topic,
  currentUserId,
  isHost = false,
  onTopicUpdated,
}: TopicDetailModalProps) {
  const router = useRouter()
  const [comments, setComments] = useState<TopicCommentWithProfile[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local state for vote count and status
  const [localVoteCount, setLocalVoteCount] = useState(topic?.upvote_count || 0)
  const [localHasVoted, setLocalHasVoted] = useState(topic?.user_voted || false)

  // Update local state when topic changes
  useEffect(() => {
    if (topic) {
      setLocalVoteCount(topic.upvote_count)
      setLocalHasVoted(topic.user_voted)
    }
  }, [topic])

  // Fetch comments when modal opens or topic changes
  useEffect(() => {
    if (isOpen && topic) {
      loadComments()
    }
  }, [isOpen, topic])

  const loadComments = async () => {
    if (!topic) return

    setIsLoadingComments(true)
    setError(null)

    try {
      // Use the topic_id field that comes from the database
      const topicId = (topic as any).topic_id || topic.id
      const response = await getTopicComments(topicId)
      setComments(response.comments)
    } catch (error) {
      logger.error("Failed to load comments:", error)
      setError("Failed to load comments")
    } finally {
      setIsLoadingComments(false)
    }
  }

  const handleVote = async () => {
    if (!topic || isVoting || topic.status !== "proposed") return

    setIsVoting(true)
    try {
      const topicId = (topic as any).topic_id || topic.id
      const result = await toggleTopicVote(topicId)
      setLocalVoteCount(result.newCount)
      setLocalHasVoted(result.upvoted)
      onTopicUpdated?.()
    } catch (error) {
      logger.error("Failed to vote:", error)
      setError("Failed to vote. Please try again.")
    } finally {
      setIsVoting(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!topic || !newComment.trim() || isSubmittingComment) return

    setIsSubmittingComment(true)
    setError(null)

    try {
      const topicId = (topic as any).topic_id || topic.id
      const response = await createTopicComment(topicId, newComment.trim())
      setComments([...comments, response.comment])
      setNewComment("")
      onTopicUpdated?.()
    } catch (error) {
      logger.error("Failed to submit comment:", error)
      setError("Failed to submit comment. Please try again.")
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleStreamThis = async () => {
    if (!topic) return

    const confirmed = confirm(
      "This will create a new live stream for this topic. All users who engaged with this topic will be notified. Continue?"
    )

    if (!confirmed) return

    setIsStreaming(true)
    setError(null)

    try {
      const topicId = (topic as any).topic_id || topic.id
      const result = await streamTopic(topicId)
      router.push(`/session/${result.roomCode}`)
    } catch (error) {
      logger.error("Failed to create stream:", error)
      setError("Failed to create stream. Please try again.")
    } finally {
      setIsStreaming(false)
    }
  }

  const handleClose = () => {
    if (!isSubmittingComment && !isStreaming) {
      setNewComment("")
      setError(null)
      onClose()
    }
  }

  if (!isOpen || !topic) return null

  const canStreamTopic = isHost && topic.status === "proposed" && localVoteCount >= 5

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#27272a] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#27272a]">
          <div className="flex-1 pr-4">
            <h2 className="text-2xl font-bold text-white mb-2">{topic.title}</h2>
            {topic.description && (
              <p className="text-[#a1a1aa] text-sm">{topic.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmittingComment || isStreaming}
            className="text-[#71717a] hover:text-white transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Topic Meta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-[#71717a]">
              {/* Creator */}
              <div className="flex items-center gap-2">
                {topic.creator_avatar ? (
                  <Image
                    src={topic.creator_avatar}
                    alt={topic.creator_name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#27272a] flex items-center justify-center text-xs text-white">
                    {topic.creator_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-white">{topic.creator_name}</span>
              </div>

              {/* Time */}
              <span>
                {formatDistanceToNow(new Date(topic.created_at), {
                  addSuffix: true,
                })}
              </span>

              {/* Status */}
              <span className="px-2 py-1 bg-[#27272a] text-[#a1a1aa] text-xs rounded-md">
                {topic.status}
              </span>
            </div>

            {/* Vote Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleVote}
                disabled={isVoting || topic.status !== "proposed"}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  localHasVoted
                    ? "bg-lime-400 text-black"
                    : "bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46] hover:text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ArrowUp className="w-5 h-5" />
                <span>{localVoteCount}</span>
              </button>

              {/* Stream This Topic Button */}
              {canStreamTopic && (
                <button
                  onClick={handleStreamThis}
                  disabled={isStreaming}
                  className="px-4 py-2 bg-gradient-to-r from-lime-400 to-green-400 text-black rounded-lg font-medium hover:from-lime-500 hover:to-green-500 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStreaming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Stream This Topic
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Tags */}
          {topic.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {topic.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-[#27272a] text-[#a1a1aa] text-xs rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#a1a1aa]" />
              <h3 className="text-lg font-bold text-white">
                Comments ({comments.length})
              </h3>
            </div>

            {/* Comments List */}
            {isLoadingComments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#a1a1aa]" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 bg-[#1a1a1a] rounded-lg border border-[#27272a]">
                <MessageSquare className="w-12 h-12 text-[#71717a] mx-auto mb-3" />
                <p className="text-[#a1a1aa]">No comments yet</p>
                <p className="text-[#71717a] text-sm mt-1">
                  Be the first to share your thoughts!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Comment Form */}
        <div className="border-t border-[#27272a] p-6">
          <form onSubmit={handleSubmitComment} className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              disabled={isSubmittingComment}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#27272a] rounded-lg text-white placeholder-[#71717a] focus:border-lime-400 focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-[#71717a]">
                {newComment.length}/1000 characters
              </p>
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmittingComment}
                className="px-4 py-2 bg-lime-400 text-black rounded-lg font-medium hover:bg-lime-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmittingComment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Post Comment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

interface CommentCardProps {
  comment: TopicCommentWithProfile
}

function CommentCard({ comment }: CommentCardProps) {
  return (
    <div className="bg-[#1a1a1a] border border-[#27272a] rounded-lg p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {comment.commenter?.avatar_url ? (
          <Image
            src={comment.commenter.avatar_url}
            alt={comment.commenter.display_name}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#27272a] flex items-center justify-center text-white font-medium">
            {comment.commenter?.display_name.charAt(0).toUpperCase() || "?"}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-white">
              {comment.commenter?.display_name || "Unknown User"}
            </span>
            <span className="text-xs text-[#71717a]">
              {comment.commenter?.username
                ? `@${comment.commenter.username}`
                : ""}
            </span>
            <span className="text-xs text-[#71717a]">·</span>
            <span className="text-xs text-[#71717a]">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
              })}
            </span>
            {comment.edited_at && (
              <>
                <span className="text-xs text-[#71717a]">·</span>
                <span className="text-xs text-[#71717a]">edited</span>
              </>
            )}
          </div>

          {/* Content */}
          <p className="text-[#a1a1aa] text-sm whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>
      </div>
    </div>
  )
}
