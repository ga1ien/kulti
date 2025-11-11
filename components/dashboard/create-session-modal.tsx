"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X } from "lucide-react"

const createSessionSchema = z.object({
  title: z.string().min(1, "Title is required").max(60, "Title must be less than 60 characters"),
  description: z.string().max(280, "Description must be less than 280 characters").optional(),
  isPublic: z.boolean(),
  maxParticipants: z.number().min(2).max(6),
  enableOBS: z.boolean(),
})

type CreateSessionFormData = z.infer<typeof createSessionSchema>

interface CreateSessionModalProps {
  onClose: () => void
}

export function CreateSessionModal({ onClose }: CreateSessionModalProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateSessionFormData>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      isPublic: true,
      maxParticipants: 4,
      enableOBS: false,
    },
  })

  const isPublic = watch("isPublic")
  const enableOBS = watch("enableOBS")

  const onSubmit = async (data: CreateSessionFormData) => {
    try {
      setError(null)
      const response = await fetch("/api/sessions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create session")
      }

      router.push(`/s/${result.roomCode}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-[#1a1a1a]/95 border border-[#27272a] rounded-2xl max-w-2xl w-full p-10 animate-fade-in-delay-1">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl font-bold font-mono">Create Session</h2>
          <button
            onClick={onClose}
            className="p-3 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-lg font-medium mb-3 text-white">
              Title *
            </label>
            <Input
              id="title"
              placeholder="Building a sick new feature"
              {...register("title")}
              className="h-14 text-lg"
            />
            {errors.title && (
              <p className="text-red-500 text-base mt-2">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-lg font-medium mb-3 text-white">
              Description (optional)
            </label>
            <Textarea
              id="description"
              placeholder="What are we building today?"
              {...register("description")}
              className="text-lg min-h-[100px]"
            />
            {errors.description && (
              <p className="text-red-500 text-base mt-2">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-lg font-medium mb-3 text-white">Privacy</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setValue("isPublic", true)}
                className={`flex-1 p-5 rounded-xl border ${
                  isPublic
                    ? "border-lime-400 bg-lime-400/10"
                    : "border-[#27272a] hover:border-lime-400/30"
                } transition-all duration-300`}
              >
                <div className="font-bold text-lg">Public</div>
                <div className="text-base text-[#a1a1aa]">Anyone can join</div>
              </button>
              <button
                type="button"
                onClick={() => setValue("isPublic", false)}
                className={`flex-1 p-5 rounded-xl border ${
                  !isPublic
                    ? "border-lime-400 bg-lime-400/10"
                    : "border-[#27272a] hover:border-lime-400/30"
                } transition-all duration-300`}
              >
                <div className="font-bold text-lg">Private</div>
                <div className="text-base text-[#a1a1aa]">Invite only</div>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="maxParticipants" className="block text-lg font-medium mb-3 text-white">
              Max Participants
            </label>
            <select
              id="maxParticipants"
              {...register("maxParticipants", { valueAsNumber: true })}
              className="w-full h-14 rounded-lg border border-[#27272a] bg-[#0a0a0a] px-4 py-2 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
            >
              <option value={2}>2 people</option>
              <option value={3}>3 people</option>
              <option value={4}>4 people</option>
              <option value={5}>5 people</option>
              <option value={6}>6 people</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-4 cursor-pointer p-5 rounded-xl border border-[#27272a] hover:border-lime-400/30 transition-all duration-300">
              <input
                type="checkbox"
                {...register("enableOBS")}
                className="w-5 h-5 rounded border-[#27272a] text-lime-400 focus:ring-lime-400 focus:ring-offset-0"
              />
              <div className="flex-1">
                <div className="font-bold text-base">Enable OBS Streaming</div>
                <div className="text-base text-[#a1a1aa]">
                  Allow streaming from OBS alongside browser participants
                </div>
              </div>
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
              <p className="text-red-500 text-base">{error}</p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#2a2a2a] text-white font-bold text-lg px-8 py-4 rounded-xl hover:bg-[#3a3a3a] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-lime-400 hover:bg-lime-500 text-black font-bold text-lg px-8 py-4 rounded-xl transition-colors duration-300 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmitting ? "Creating..." : "Create Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
