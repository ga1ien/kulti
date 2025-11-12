'use client'

import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from 'react'

interface OTPInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
  onComplete?: (value: string) => void
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  disabled,
  error,
  onComplete,
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(() => Array(length).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(length).fill(null))

  // Update internal state when value prop changes
  useEffect(() => {
    if (value !== otp.join('')) {
      const digits = value.padEnd(length, '').slice(0, length).split('')
      setOtp(digits)
    }
  }, [value, length])

  const handleChange = (index: number, digit: string) => {
    if (disabled) return

    // Only allow single digits
    const newDigit = digit.replace(/\D/g, '').slice(-1)

    const newOtp = [...otp]
    newOtp[index] = newDigit
    setOtp(newOtp)

    const newValue = newOtp.join('')
    onChange(newValue)

    // Auto-focus next input
    if (newDigit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Call onComplete if all digits are filled
    if (newValue.length === length && onComplete) {
      onComplete(newValue)
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault()

      if (otp[index]) {
        // Clear current input
        const newOtp = [...otp]
        newOtp[index] = ''
        setOtp(newOtp)
        onChange(newOtp.join(''))
      } else if (index > 0) {
        // Move to previous input and clear it
        const newOtp = [...otp]
        newOtp[index - 1] = ''
        setOtp(newOtp)
        onChange(newOtp.join(''))
        inputRefs.current[index - 1]?.focus()
      }
    }

    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()

    if (disabled) return

    const pastedData = e.clipboardData.getData('text/plain')
    const digits = pastedData.replace(/\D/g, '').slice(0, length).split('')

    const newOtp = Array(length).fill('')
    digits.forEach((digit, index) => {
      if (index < length) {
        newOtp[index] = digit
      }
    })

    setOtp(newOtp)
    const newValue = newOtp.join('')
    onChange(newValue)

    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtp.findIndex((d) => !d)
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex
    inputRefs.current[focusIndex]?.focus()

    // Call onComplete if all digits are filled
    if (newValue.length === length && onComplete) {
      onComplete(newValue)
    }
  }

  const handleFocus = (index: number) => {
    // Select all text on focus for easy replacement
    inputRefs.current[index]?.select()
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex gap-3 justify-center items-center">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={otp[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            onFocus={() => handleFocus(index)}
            disabled={disabled}
            className={`w-14 h-14 md:w-16 md:h-16 text-center text-2xl md:text-3xl font-bold bg-[#1a1a1a] border-2 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-lime-400/50 ${
              error
                ? 'border-red-500 focus:border-red-500 text-red-500'
                : otp[index]
                ? 'border-lime-400 text-lime-400'
                : 'border-[#27272a] hover:border-lime-400/30 focus:border-lime-400 text-white'
            }`}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      {/* Helper Text */}
      <p className="text-xs text-[#71717a] text-center">
        Enter the {length}-digit code sent to your phone
      </p>
    </div>
  )
}
