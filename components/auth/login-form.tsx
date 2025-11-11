"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null)
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) throw error

      const redirectTo = searchParams.get("redirectTo") || "/dashboard"
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
        {isSubmitting ? "Signing in..." : "Sign In"}
      </button>

      <p className="text-center text-lg text-[#a1a1aa]">
        Don't have an account?{" "}
        <Link href="/signup" className="text-lime-400 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  )
}
