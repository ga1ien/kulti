"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const waitlistSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  twitter_handle: z.string().optional(),
  reason: z.string().min(10, "Please tell us more (at least 10 characters)").max(150, "Keep it under 150 characters"),
})

type WaitlistFormData = z.infer<typeof waitlistSchema>

export function WaitlistForm() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [position, setPosition] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
  })

  const onSubmit = async (data: WaitlistFormData) => {
    try {
      setError(null)
      const response = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to join waitlist")
      }

      setPosition(result.position)
      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  if (isSubmitted && position) {
    return (
      <div className="max-w-md mx-auto text-center p-8 bg-surface border border-border-default rounded-lg">
        <h3 className="text-2xl font-bold font-mono text-accent mb-2">
          You're in!
        </h3>
        <p className="text-lg text-muted-2 mb-4">
          You're <span className="text-accent font-bold">#{position}</span> in line
        </p>
        <p className="text-sm text-muted-3">
          We'll email you when it's your turn to join Kulti.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto space-y-4">
      <div>
        <Input
          type="email"
          placeholder="Email address"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Input
          type="text"
          placeholder="Your name"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Input
          type="text"
          placeholder="Twitter handle (optional)"
          {...register("twitter_handle")}
        />
        {errors.twitter_handle && (
          <p className="text-red-500 text-sm mt-1">{errors.twitter_handle.message}</p>
        )}
      </div>

      <div>
        <Textarea
          placeholder="Why do you want to join Kulti? (10-150 characters)"
          {...register("reason")}
        />
        {errors.reason && (
          <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500 rounded-md">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
        {isSubmitting ? "Joining..." : "Join the Waitlist"}
      </Button>
    </form>
  )
}
