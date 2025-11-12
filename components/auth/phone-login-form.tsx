'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PhoneInput } from './phone-input'
import { OTPInput } from './otp-input'
import { sendPhoneOTP, verifyPhoneOTP } from '@/lib/auth/phone-auth'
import { ArrowLeft, Loader2 } from 'lucide-react'

export function PhoneLoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')

  // Resend OTP cooldown
  const [resendCooldown, setResendCooldown] = useState(0)
  // OTP expiration timer (60 seconds from Supabase)
  const [otpExpiration, setOtpExpiration] = useState(0)

  // Step 1: Send OTP
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

      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP and login
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

      // Successful login - redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code')
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
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full mx-1 transition-colors duration-300 ${
                s <= step ? 'bg-lime-400' : 'bg-[#27272a]'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-[#71717a] text-center">
          Step {step} of 2
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Step 1: Phone Number */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Login with Phone</h2>
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

      {/* Step 2: OTP Verification */}
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
              'Verify & Login'
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
    </div>
  )
}
