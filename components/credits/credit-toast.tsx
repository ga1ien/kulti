import { Coins, Trophy, Star } from "lucide-react"
import { formatCredits } from "@/lib/credits/config"

interface CreditToastProps {
  amount: number
  reason: string
  milestone?: {
    label: string
    reward: number
  }
}

export function CreditToast({ amount, reason, milestone }: CreditToastProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-lime-400/10 rounded-lg">
        {milestone ? (
          <Trophy className="w-5 h-5 text-lime-400 animate-bounce" />
        ) : (
          <Coins className="w-5 h-5 text-lime-400" />
        )}
      </div>
      <div>
        <p className="font-bold text-lime-400">
          +{formatCredits(amount)} Credits
        </p>
        <p className="text-sm text-[#a1a1aa]">{reason}</p>
        {milestone && (
          <p className="text-xs text-lime-400 mt-1 flex items-center gap-1">
            <Star className="w-3 h-3" />
            {milestone.label} unlocked!
          </p>
        )}
      </div>
    </div>
  )
}

interface SpendToastProps {
  amount: number
  reason: string
}

export function SpendToast({ amount, reason }: SpendToastProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-red-500/10 rounded-lg">
        <Coins className="w-5 h-5 text-red-500" />
      </div>
      <div>
        <p className="font-bold text-red-500">
          {formatCredits(amount)} Credits
        </p>
        <p className="text-sm text-[#a1a1aa]">{reason}</p>
      </div>
    </div>
  )
}
