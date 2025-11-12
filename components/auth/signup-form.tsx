"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

const signupSchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, dashes, and underscores"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type SignupFormData = z.infer<typeof signupSchema>

export function SignupForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    try {
      setError(null)
      const supabase = createClient()

      // Validate invite code via API
      const validateResponse = await fetch('/api/invites/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: data.inviteCode }),
      })

      const validateResult = await validateResponse.json()

      if (!validateResult.isValid) {
        throw new Error(validateResult.error || 'Invalid invite code')
      }

      // Check username availability
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", data.username)
        .single()

      if (existingUser) {
        throw new Error("Username is already taken")
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            display_name: data.displayName,
            invite_code: data.inviteCode,
          },
        },
      })

      if (authError) throw authError

      // Record invite usage and award referral credits
      if (authData.user) {
        await supabase.rpc('use_invite_code', {
          p_code: data.inviteCode,
          p_user_id: authData.user.id,
          p_metadata: {
            signup_timestamp: new Date().toISOString(),
          },
        })
      }

      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="inviteCode" className="block text-lg font-medium mb-3 text-white">
          Invite Code
        </label>
        <Input
          id="inviteCode"
          type="text"
          placeholder="K1A2B"
          {...register("inviteCode")}
          className="h-14 text-lg"
        />
        {errors.inviteCode && (
          <p className="text-red-500 text-base mt-2">{errors.inviteCode.message}</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="username" className="block text-lg font-medium mb-3 text-white">
            Username
          </label>
          <Input
            id="username"
            type="text"
            placeholder="viber123"
            {...register("username")}
            className="h-14 text-lg"
          />
          {errors.username && (
            <p className="text-red-500 text-base mt-2">{errors.username.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="displayName" className="block text-lg font-medium mb-3 text-white">
            Display Name
          </label>
          <Input
            id="displayName"
            type="text"
            placeholder="John Doe"
            {...register("displayName")}
            className="h-14 text-lg"
          />
          {errors.displayName && (
            <p className="text-red-500 text-base mt-2">{errors.displayName.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-lg font-medium mb-3 text-white">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...register("email")}
          className="h-14 text-lg"
        />
        {errors.email && (
          <p className="text-red-500 text-base mt-2">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-lg font-medium mb-3 text-white">
          Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register("password")}
          className="h-14 text-lg"
        />
        {errors.password && (
          <p className="text-red-500 text-base mt-2">{errors.password.message}</p>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-500 text-base">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold text-xl px-12 py-5 rounded-xl transition-colors duration-300 disabled:opacity-50 disabled:hover:scale-100"
      >
        {isSubmitting ? "Creating account..." : "Create Account"}
      </button>
    </form>
  )
}
