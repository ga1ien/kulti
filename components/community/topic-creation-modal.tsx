"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { createTopic } from "@/lib/community"
import { logger } from '@/lib/logger'

interface TopicCreationModalProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
  onTopicCreated?: () => void
}

export function TopicCreationModal({
  isOpen,
  onClose,
  roomId,
  onTopicCreated,
}: TopicCreationModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedTitle = title.trim()
    if (trimmedTitle.length < 5) {
      setError("Title must be at least 5 characters")
      return
    }

    if (trimmedTitle.length > 200) {
      setError("Title must be less than 200 characters")
      return
    }

    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      await createTopic(roomId, {
        title: trimmedTitle,
        description: description.trim() || undefined,
        tags,
      })

      // Reset form
      setTitle("")
      setDescription("")
      setTags([])
      setTagInput("")

      onTopicCreated?.()
      onClose()
    } catch (error) {
      logger.error("Failed to create topic:", error)
      setError(error instanceof Error ? error.message : "Failed to create topic. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle("")
      setDescription("")
      setTags([])
      setTagInput("")
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#27272a] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Propose a Topic</h2>
              <p className="text-sm text-[#a1a1aa] mt-1">
                Suggest a topic for future streams and discussions
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-[#71717a] hover:text-white transition-colors disabled:opacity-50"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label
              htmlFor="topic-title"
              className="block text-sm font-medium text-white mb-2"
            >
              Title <span className="text-red-400">*</span>
            </label>
            <input
              id="topic-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What would you like to discuss?"
              maxLength={200}
              required
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#27272a] rounded-lg text-white placeholder-[#71717a] focus:border-lime-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-[#71717a] mt-1">
              {title.length}/200 characters (minimum 5)
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="topic-description"
              className="block text-sm font-medium text-white mb-2"
            >
              Description (optional)
            </label>
            <textarea
              id="topic-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more context about what you'd like to cover..."
              maxLength={2000}
              rows={4}
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#27272a] rounded-lg text-white placeholder-[#71717a] focus:border-lime-400 focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-[#71717a] mt-1">
              {description.length}/2000 characters
            </p>
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="topic-tags"
              className="block text-sm font-medium text-white mb-2"
            >
              Tags (optional, max 5)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                id="topic-tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add tags..."
                disabled={isSubmitting || tags.length >= 5}
                className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[#27272a] rounded-lg text-white placeholder-[#71717a] focus:border-lime-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={isSubmitting || !tagInput.trim() || tags.length >= 5}
                className="px-4 py-2 bg-[#27272a] text-white rounded-lg hover:bg-[#3f3f46] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-lime-400/20 text-lime-400 rounded-lg text-sm flex items-center gap-2"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      disabled={isSubmitting}
                      className="hover:text-white transition-colors disabled:opacity-50"
                      aria-label={`Remove ${tag} tag`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-[#1a1a1a] text-white rounded-lg font-medium hover:bg-[#27272a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || title.trim().length < 5 || isSubmitting}
              className="flex-1 px-4 py-3 bg-lime-400 text-black rounded-lg font-medium hover:bg-lime-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Propose Topic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
