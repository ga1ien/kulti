"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X, Loader2 } from "lucide-react"

const createSessionSchema = z.object({
  title: z.string().min(1, "Title is required").max(60, "Title must be less than 60 characters"),
  description: z.string().max(280, "Description must be less than 280 characters").optional(),
  isPublic: z.boolean(),
  maxPresenters: z.number().min(2).max(6),
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
      maxPresenters: 4,
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
        const errorMessage = result.error || "Failed to create session"
        toast.error(errorMessage)
        setError(errorMessage)
        return
      }

      toast.success("Session created successfully!")
      router.push(`/s/${result.roomCode}`)
      router.refresh()
    } catch (err) {
      console.error("Failed to create session:", err)
      const errorMessage = err instanceof Error ? err.message : "Network error. Please try again."
      toast.error(errorMessage)
      setError(errorMessage)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-session-title"
    >
      <div className="bg-[#1a1a1a]/95 border border-[#27272a] rounded-xl sm:rounded-2xl max-w-2xl w-full p-6 sm:p-10 my-8 animate-fade-in-delay-1 max-h-[calc(100vh-64px)] overflow-y-auto">
        <div className="flex justify-between items-start mb-6 sm:mb-8">
          <h2 id="create-session-title" className="text-2xl sm:text-3xl lg:text-4xl font-bold font-mono">Create Session</h2>
          <button
            onClick={onClose}
            className="p-2 sm:p-3 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-[#2a2a2a] rounded-lg transition-colors flex-shrink-0"
            aria-label="Close create session modal"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
          <div>
            <label htmlFor="title" className="block text-base sm:text-lg font-medium mb-2 sm:mb-3 text-white">
              Title *
            </label>
            <Input
              id="title"
              placeholder="Building a sick new feature"
              {...register("title")}
              className="h-12 sm:h-14 text-base sm:text-lg"
            />
            {errors.title && (
              <p className="text-red-500 text-sm sm:text-base mt-2">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-base sm:text-lg font-medium mb-2 sm:mb-3 text-white">
              Description (optional)
            </label>
            <Textarea
              id="description"
              placeholder="What are we building today?"
              {...register("description")}
              className="text-base sm:text-lg min-h-[80px] sm:min-h-[100px]"
            />
            {errors.description && (
              <p className="text-red-500 text-sm sm:text-base mt-2">{errors.description.message}</p>
            )}
          </div>

          <fieldset>
            <legend className="block text-base sm:text-lg font-medium mb-2 sm:mb-3 text-white">Privacy</legend>
            <div className="flex gap-3 sm:gap-4" role="group" aria-label="Session privacy">
              <button
                type="button"
                onClick={() => setValue("isPublic", true)}
                className={`flex-1 p-4 sm:p-5 min-h-[56px] rounded-xl border ${
                  isPublic
                    ? "border-lime-400 bg-lime-400/10"
                    : "border-[#27272a] hover:border-lime-400/30"
                } transition-all duration-300`}
                aria-pressed={isPublic}
                aria-label="Make session public - anyone can join"
              >
                <div className="font-bold text-base sm:text-lg">Public</div>
                <div className="text-sm sm:text-base text-[#a1a1aa]">Anyone can join</div>
              </button>
              <button
                type="button"
                onClick={() => setValue("isPublic", false)}
                className={`flex-1 p-4 sm:p-5 min-h-[56px] rounded-xl border ${
                  !isPublic
                    ? "border-lime-400 bg-lime-400/10"
                    : "border-[#27272a] hover:border-lime-400/30"
                } transition-all duration-300`}
                aria-pressed={!isPublic}
                aria-label="Make session private - invite only"
              >
                <div className="font-bold text-base sm:text-lg">Private</div>
                <div className="text-sm sm:text-base text-[#a1a1aa]">Invite only</div>
              </button>
            </div>
          </fieldset>

          <div>
            <label htmlFor="maxPresenters" className="block text-base sm:text-lg font-medium mb-2 sm:mb-3 text-white">
              Max Presenters
            </label>
            <select
              id="maxPresenters"
              {...register("maxPresenters", { valueAsNumber: true })}
              className="w-full h-12 sm:h-14 min-h-[48px] rounded-lg border border-[#27272a] bg-[#0a0a0a] px-3 sm:px-4 py-2 text-base sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
            >
              <option value={2}>2 presenters</option>
              <option value={3}>3 presenters</option>
              <option value={4}>4 presenters</option>
              <option value={5}>5 presenters</option>
              <option value={6}>6 presenters</option>
            </select>
            <p className="text-sm text-[#a1a1aa] mt-2">
              Presenters can share video/audio. Viewers are unlimited.
            </p>
          </div>

          <div>
            <label
              htmlFor="enableOBS"
              className="flex items-center gap-3 sm:gap-4 cursor-pointer p-4 sm:p-5 min-h-[56px] rounded-xl border border-[#27272a] hover:border-lime-400/30 transition-all duration-300"
            >
              <input
                id="enableOBS"
                type="checkbox"
                {...register("enableOBS")}
                className="w-5 h-5 min-w-[20px] rounded border-[#27272a] text-lime-400 focus:ring-lime-400 focus:ring-offset-0"
                aria-describedby="obs-help"
              />
              <div className="flex-1">
                <div className="font-bold text-sm sm:text-base">Enable OBS Streaming</div>
                <div id="obs-help" className="text-sm sm:text-base text-[#a1a1aa]">
                  Allow streaming from OBS alongside browser participants
                </div>
              </div>
            </label>
          </div>

          {error && (
            <div className="p-3 sm:p-4 bg-red-500/10 border border-red-500 rounded-lg" role="alert">
              <p className="text-red-500 text-sm sm:text-base">{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 bg-[#2a2a2a] text-white font-bold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 min-h-[56px] rounded-xl hover:bg-[#3a3a3a] transition-colors"
              aria-label="Cancel and close modal"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:flex-1 bg-lime-400 hover:bg-lime-500 text-black font-bold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 min-h-[56px] rounded-xl transition-colors duration-300 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              aria-label={isSubmitting ? "Creating session" : "Create new session"}
              aria-disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Creating..." : "Create Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
