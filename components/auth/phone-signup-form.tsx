'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from './phone-input'
import { OTPInput } from './otp-input'
import { sendPhoneOTP, verifyPhoneOTP, completePhoneSignup } from '@/lib/auth/phone-auth'
import { ArrowLeft, Loader2 } from 'lucide-react'

// Step 1: Invite Code
const step1Schema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
})

// Step 2: Phone Number (handled by PhoneInput component)
// Step 3: OTP (handled by OTPInput component)

// Step 4: Profile Completion
const step4Schema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, dashes, and underscores'
    ),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type Step1Data = z.infer<typeof step1Schema>
type Step4Data = z.infer<typeof step4Schema>

export function PhoneSignupForm() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Form data storage
  const [inviteCode, setInviteCode] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [userId, setUserId] = useState('')

  // Resend OTP cooldown
  const [resendCooldown, setResendCooldown] = useState(0)
  // OTP expiration timer (60 seconds from Supabase)
  const [otpExpiration, setOtpExpiration] = useState(0)

  // Step 1 form
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
  })

  // Step 4 form
  const step4Form = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
  })

  // Step 1: Validate invite code
  const handleStep1Submit = async (data: Step1Data) => {
    try {
      setError(null)
      setLoading(true)

      // Validate invite code via API
      const response = await fetch('/api/invites/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: data.inviteCode }),
      })

      const result = await response.json()

      if (!result.isValid) {
        throw new Error(result.error || 'Invalid invite code')
      }

      setInviteCode(data.inviteCode)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate invite code')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Send OTP
  const handleSendOTP = async () => {
    try {
      setError(null)
      setLoading(true)

      if (!phone) {
        throw new Error('Please enter your phone number')
      }

      const result = await sendPhoneOTP(phone)

      if (!result.success) {
        throw new Error(result.error || 'Failed to send verification code')
      }

      // Start cooldown timer
      setResendCooldown(60)
      const cooldownInterval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownInterval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Start OTP expiration timer (60 seconds)
      setOtpExpiration(60)
      const expirationInterval = setInterval(() => {
        setOtpExpiration((prev) => {
          if (prev <= 1) {
            clearInterval(expirationInterval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Verify OTP
  const handleVerifyOTP = async () => {
    try {
      setError(null)
      setLoading(true)

      if (otp.length !== 6) {
        throw new Error('Please enter the 6-digit verification code')
      }

      const result = await verifyPhoneOTP(phone, otp)

      if (!result.success) {
        throw new Error(result.error || 'Invalid or expired verification code')
      }

      if (!result.data?.user?.id) {
        throw new Error('Verification succeeded but user ID not found')
      }

      setUserId(result.data.user.id)
      setStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code')
    } finally {
      setLoading(false)
    }
  }

  // Step 4: Complete profile
  const handleCompleteProfile = async (data: Step4Data) => {
    try {
      setError(null)
      setLoading(true)

      const result = await completePhoneSignup({
        userId,
        phone,
        inviteCode,
        username: data.username,
        displayName: data.displayName,
        email: data.email,
        password: data.password,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to complete signup')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete signup')
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return

    try {
      setError(null)
      setOtp('') // Clear existing OTP

      const result = await sendPhoneOTP(phone)

      if (!result.success) {
        throw new Error(result.error || 'Failed to resend verification code')
      }

      // Start cooldown timer
      setResendCooldown(60)
      const cooldownInterval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownInterval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Start OTP expiration timer (60 seconds)
      setOtpExpiration(60)
      const expirationInterval = setInterval(() => {
        setOtpExpiration((prev) => {
          if (prev <= 1) {
            clearInterval(expirationInterval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code')
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full mx-1 transition-colors duration-300 ${
                s <= step ? 'bg-lime-400' : 'bg-[#27272a]'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-[#71717a] text-center">
          Step {step} of 4
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Step 1: Invite Code */}
      {step === 1 && (
        <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Enter Invite Code</h2>
            <p className="text-[#a1a1aa]">You need an invite code to join Kulti</p>
          </div>

          <div>
            <label htmlFor="inviteCode" className="block text-lg font-medium mb-3 text-white">
              Invite Code
            </label>
            <Input
              id="inviteCode"
              {...step1Form.register('inviteCode')}
              placeholder="K1A2B"
              className="h-14 text-lg"
              disabled={loading}
            />
            {step1Form.formState.errors.inviteCode && (
              <p className="mt-2 text-sm text-red-500">
                {step1Form.formState.errors.inviteCode.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold text-xl px-12 py-6 h-auto rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Validating...
              </>
            ) : (
              'Continue'
            )}
          </Button>

        </form>
      )}

      {/* Step 2: Phone Number */}
      {step === 2 && (
        <div className="space-y-6">
          <button
            onClick={() => setStep(1)}
            className="flex items-center text-sm text-[#71717a] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Enter Phone Number</h2>
            <p className="text-[#a1a1aa]">We'll send you a verification code</p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-lg font-medium mb-3 text-white">
              Phone Number
            </label>
            <PhoneInput value={phone} onChange={setPhone} disabled={loading} />
          </div>

          <Button
            onClick={handleSendOTP}
            disabled={loading || !phone}
            className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold text-xl px-12 py-6 h-auto rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Sending Code...
              </>
            ) : (
              'Send Verification Code'
            )}
          </Button>
        </div>
      )}

      {/* Step 3: OTP Verification */}
      {step === 3 && (
        <div className="space-y-6">
          <button
            onClick={() => setStep(2)}
            className="flex items-center text-sm text-[#71717a] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Enter Verification Code</h2>
            <p className="text-[#a1a1aa]">
              We sent a 6-digit code to {phone}
            </p>
            {otpExpiration > 0 && (
              <p className="text-sm text-lime-400 mt-2">
                Code expires in 0:{otpExpiration.toString().padStart(2, '0')}
              </p>
            )}
            {otpExpiration === 0 && (
              <p className="text-sm text-red-500 mt-2">
                Code has expired. Please request a new one.
              </p>
            )}
          </div>

          <div className="py-6">
            <OTPInput
              value={otp}
              onChange={setOtp}
              disabled={loading}
              error={error || undefined}
              onComplete={() => {}}
            />
          </div>

          <Button
            onClick={handleVerifyOTP}
            disabled={loading || otp.length !== 6}
            className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold text-xl px-12 py-6 h-auto rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>

          <div className="text-center">
            <button
              onClick={handleResendOTP}
              disabled={resendCooldown > 0}
              className="text-sm text-lime-400 hover:text-lime-300 disabled:text-[#71717a] disabled:cursor-not-allowed transition-colors"
            >
              {resendCooldown > 0
                ? `Resend code in 0:${resendCooldown.toString().padStart(2, '0')}`
                : 'Resend verification code'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Profile Completion */}
      {step === 4 && (
        <form onSubmit={step4Form.handleSubmit(handleCompleteProfile)} className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Complete Your Profile</h2>
            <p className="text-[#a1a1aa]">Just a few more details</p>
          </div>

          <div>
            <label htmlFor="username" className="block text-lg font-medium mb-3 text-white">
              Username <span className="text-red-500">*</span>
            </label>
            <Input
              id="username"
              {...step4Form.register('username')}
              placeholder="johndoe"
              className="h-14 text-lg"
              disabled={loading}
            />
            {step4Form.formState.errors.username && (
              <p className="mt-2 text-sm text-red-500">
                {step4Form.formState.errors.username.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="displayName" className="block text-lg font-medium mb-3 text-white">
              Display Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="displayName"
              {...step4Form.register('displayName')}
              placeholder="John Doe"
              className="h-14 text-lg"
              disabled={loading}
            />
            {step4Form.formState.errors.displayName && (
              <p className="mt-2 text-sm text-red-500">
                {step4Form.formState.errors.displayName.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-lg font-medium mb-3 text-white">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              id="email"
              type="email"
              {...step4Form.register('email')}
              placeholder="john@example.com"
              className="h-14 text-lg"
              disabled={loading}
            />
            <p className="mt-2 text-xs text-[#71717a]">
              Used for account recovery and notifications
            </p>
            {step4Form.formState.errors.email && (
              <p className="mt-2 text-sm text-red-500">
                {step4Form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-lg font-medium mb-3 text-white">
              Password <span className="text-red-500">*</span>
            </label>
            <Input
              id="password"
              type="password"
              {...step4Form.register('password')}
              placeholder="••••••••"
              className="h-14 text-lg"
              disabled={loading}
            />
            <p className="mt-2 text-xs text-[#71717a]">
              Used to login with email instead of phone
            </p>
            {step4Form.formState.errors.password && (
              <p className="mt-2 text-sm text-red-500">
                {step4Form.formState.errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold text-xl px-12 py-6 h-auto rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Complete Signup'
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
