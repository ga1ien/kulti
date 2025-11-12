'use client'

import { forwardRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  placeholder?: string
}

const COUNTRY_CODES = [
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+1', country: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: '+52', country: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: '+7', country: 'RU', flag: '🇷🇺', name: 'Russia' },
]

// Format phone number as (123) 456-7890
const formatPhoneNumber = (digits: string): string => {
  // Remove all non-digit characters
  const cleaned = digits.replace(/\D/g, '')

  // Format based on length
  if (cleaned.length === 0) return ''
  if (cleaned.length <= 3) return `(${cleaned}`
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, error, disabled, placeholder = '(123) 456-7890' }, ref) => {
    const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0])
    const [showDropdown, setShowDropdown] = useState(false)
    const [displayValue, setDisplayValue] = useState('')

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow digits
      const digits = e.target.value.replace(/\D/g, '')

      // Limit to 10 digits for US/Canada numbers
      const limitedDigits = digits.slice(0, 10)

      // Format for display
      const formatted = formatPhoneNumber(limitedDigits)
      setDisplayValue(formatted)

      // Combine country code and phone number in E.164 format
      onChange(`${countryCode.code}${limitedDigits}`)
    }

    const handleCountrySelect = (country: typeof COUNTRY_CODES[0]) => {
      setCountryCode(country)
      setShowDropdown(false)
      // Update the full phone number with new country code
      const digits = displayValue.replace(/\D/g, '')
      onChange(`${country.code}${digits}`)
    }

    return (
      <div className="relative">
        <div className="flex gap-2">
          {/* Country Code Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={disabled}
              className="h-14 px-4 bg-[#1a1a1a] border border-[#27272a] rounded-lg hover:border-lime-400/30 focus:border-lime-400 focus:outline-none transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-2xl">{countryCode.flag}</span>
              <span className="text-lg text-white">{countryCode.code}</span>
              <ChevronDown className="w-4 h-4 text-[#71717a]" />
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />

                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 mt-2 w-64 bg-[#1a1a1a] border border-[#27272a] rounded-lg shadow-2xl z-20 max-h-80 overflow-y-auto">
                  {COUNTRY_CODES.map((country) => (
                    <button
                      key={`${country.code}-${country.country}`}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#27272a] transition-colors duration-150 text-left"
                    >
                      <span className="text-2xl">{country.flag}</span>
                      <div className="flex-1">
                        <div className="text-sm text-white">{country.name}</div>
                        <div className="text-xs text-[#71717a]">{country.code}</div>
                      </div>
                      {countryCode.code === country.code && countryCode.country === country.country && (
                        <div className="w-2 h-2 rounded-full bg-lime-400" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Phone Number Input */}
          <input
            ref={ref}
            type="tel"
            value={displayValue}
            onChange={handlePhoneChange}
            disabled={disabled}
            placeholder={placeholder}
            className={`flex-1 h-14 px-4 text-lg bg-[#1a1a1a] border rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[#71717a] text-white focus:outline-none focus:ring-2 focus:ring-lime-400/50 ${
              error
                ? 'border-red-500 focus:border-red-500'
                : 'border-[#27272a] hover:border-lime-400/30 focus:border-lime-400'
            }`}
          />
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}

        {/* Helper Text */}
        <p className="mt-2 text-xs text-[#71717a]">
          Enter your phone number. We'll send you a verification code.
        </p>
      </div>
    )
  }
)

PhoneInput.displayName = 'PhoneInput'
