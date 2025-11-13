"use client"

import { useState } from "react"
import { toast } from "react-hot-toast"
import { X, Heart, Coins } from "lucide-react"
import { formatCredits } from "@/lib/credits/config"
import { notifyCreditsSpent, notifyInsufficientCredits } from "@/lib/credits/notifications"

interface TipModalProps {
  isOpen: boolean
  onClose: () => void
  recipientId: string
  recipientName: string
  recipientUsername: string
  currentBalance: number
  sessionId?: string
  onSuccess?: () => void
}

const QUICK_TIP_AMOUNTS = [50, 100, 250, 500, 1000]

export function TipModal({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  recipientUsername,
  currentBalance,
  sessionId,
  onSuccess,
}: TipModalProps) {
  const [amount, setAmount] = useState(100)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [customAmount, setCustomAmount] = useState("")
  const [showCustom, setShowCustom] = useState(false)

  const handleQuickAmount = (value: number) => {
    setAmount(value)
    setShowCustom(false)
    setCustomAmount("")
  }

  const handleCustomAmount = (value: string) => {
    const num = parseInt(value) || 0
    setCustomAmount(value)
    setAmount(Math.min(Math.max(num, 1), 10000))
  }

  const handleSend = async () => {
    if (amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    if (amount > currentBalance) {
      notifyInsufficientCredits(amount, currentBalance)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/credits/tip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId,
          amount,
          message: message.trim() || undefined,
          sessionId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        notifyCreditsSpent(
          amount,
          `Tipped @${recipientUsername}${message ? `: "${message}"` : ''}`
        )
        onSuccess?.()
        onClose()
      } else {
        if (response.status === 402) {
          notifyInsufficientCredits(amount, currentBalance)
        } else {
          const errorMessage = data.error || 'Failed to send tip'
          toast.error(errorMessage)
        }
      }
    } catch (error) {
      console.error('Tip error:', error)
      toast.error('Failed to send tip. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const canAfford = currentBalance >= amount

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tip-modal-title"
    >
      <div className="relative w-full max-w-lg bg-[#1a1a1a] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-b border-[#27272a] p-4 sm:p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-[#2a2a2a] rounded-lg transition-colors"
            aria-label="Close tip modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2 pr-12">
            <div className="p-3 bg-pink-500 rounded-xl flex-shrink-0">
              <Heart className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 id="tip-modal-title" className="font-mono text-xl sm:text-2xl font-bold">Send Tip</h2>
              <p className="text-sm text-[#a1a1aa]">Show your appreciation</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Recipient */}
          <div className="p-4 bg-[#2a2a2a] rounded-xl">
            <p className="text-sm text-[#a1a1aa] mb-1">Tipping:</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-lime-400 flex items-center justify-center text-black font-bold">
                {recipientName[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold">{recipientName}</p>
                <p className="text-sm text-[#71717a]">@{recipientUsername}</p>
              </div>
            </div>
          </div>

          {/* Quick Amounts */}
          <div>
            <h3 className="text-sm font-medium text-[#a1a1aa] mb-3">Amount</h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {QUICK_TIP_AMOUNTS.map((value) => (
                <button
                  key={value}
                  onClick={() => handleQuickAmount(value)}
                  className={`min-h-[44px] px-3 sm:px-4 py-3 rounded-lg font-mono font-bold transition-colors text-sm sm:text-base ${
                    amount === value && !showCustom
                      ? "bg-lime-400 text-black"
                      : "bg-[#2a2a2a] text-white hover:bg-[#333333]"
                  }`}
                  aria-label={`Tip ${formatCredits(value)}`}
                  aria-pressed={amount === value && !showCustom}
                >
                  {formatCredits(value)}
                </button>
              ))}
              <button
                onClick={() => setShowCustom(true)}
                className={`min-h-[44px] px-3 sm:px-4 py-3 rounded-lg font-bold transition-colors text-sm sm:text-base ${
                  showCustom
                    ? "bg-lime-400 text-black"
                    : "bg-[#2a2a2a] text-white hover:bg-[#333333]"
                }`}
                aria-label="Enter custom tip amount"
                aria-pressed={showCustom}
              >
                Custom
              </button>
            </div>

            {/* Custom Amount Input */}
            {showCustom && (
              <>
                <label htmlFor="custom-tip-amount" className="sr-only">
                  Custom tip amount (1 to 10,000 credits)
                </label>
                <input
                  id="custom-tip-amount"
                  type="number"
                  value={customAmount}
                  onChange={(e) => handleCustomAmount(e.target.value)}
                  placeholder="Enter amount (1-10,000)"
                  className="w-full px-4 py-3 min-h-[48px] bg-[#2a2a2a] border border-[#27272a] rounded-lg text-white font-mono focus:border-lime-400 focus:outline-none"
                  min={1}
                  max={10000}
                  aria-describedby="custom-amount-help"
                />
                <p id="custom-amount-help" className="sr-only">
                  Enter a custom tip amount between 1 and 10,000 credits
                </p>
              </>
            )}
          </div>

          {/* Message */}
          <div>
            <label htmlFor="tip-message" className="block text-sm font-medium text-[#a1a1aa] mb-3">
              Message (Optional)
            </label>
            <input
              id="tip-message"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a nice message..."
              className="w-full px-4 py-3 min-h-[48px] bg-[#2a2a2a] border border-[#27272a] rounded-lg text-white focus:border-lime-400 focus:outline-none"
              maxLength={100}
              aria-describedby="tip-message-help"
            />
            <p id="tip-message-help" className="text-xs text-[#71717a] mt-1">
              {message.length}/100 characters
            </p>
          </div>

          {/* Balance Summary */}
          <div className="p-4 bg-[#2a2a2a] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#a1a1aa]">Amount</span>
              <span className="font-mono font-bold text-pink-500 text-lg">
                {formatCredits(amount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#a1a1aa]">Your Balance</span>
              <span className={`font-mono font-bold text-lg ${
                canAfford ? 'text-white' : 'text-red-500'
              }`}>
                {formatCredits(currentBalance)}
              </span>
            </div>
            {canAfford && (
              <div className="pt-3 border-t border-[#27272a]">
                <div className="flex items-center justify-between">
                  <span className="text-[#a1a1aa]">After Tip</span>
                  <span className="font-mono font-bold">
                    {formatCredits(currentBalance - amount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Insufficient Balance Warning */}
          {!canAfford && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-500">
                You need {formatCredits(amount - currentBalance)} more credits to send this tip.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 min-h-[48px] bg-[#2a2a2a] hover:bg-[#333333] text-white font-bold rounded-lg transition-colors"
              aria-label="Cancel and close modal"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !canAfford || amount <= 0}
              className={`flex-1 px-6 py-3 min-h-[48px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                canAfford && !loading && amount > 0
                  ? 'bg-pink-500 hover:bg-pink-600 text-white'
                  : 'bg-[#2a2a2a] text-[#71717a] cursor-not-allowed'
              }`}
              aria-label={`Send ${formatCredits(amount)} tip to ${recipientName}`}
              aria-disabled={loading || !canAfford || amount <= 0}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Heart className="w-5 h-5" aria-hidden="true" />
                  <span>Send Tip</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
