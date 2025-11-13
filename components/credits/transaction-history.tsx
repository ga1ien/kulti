"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, ArrowDownLeft, Clock, Loader2 } from "lucide-react"
import { TransactionRowSkeleton } from "@/components/ui/loading-skeleton"
import { formatCredits } from "@/lib/credits/config"

interface TransactionHistoryProps {
  userId: string
}

interface Transaction {
  id: string
  amount: number
  type: string
  balance_after: number
  source_session_id: string | null
  metadata: any
  created_at: string
}

const TRANSACTION_LABELS: Record<string, string> = {
  earned_watching: "Watched Session",
  earned_hosting: "Hosted Session",
  milestone_bonus: "Milestone Bonus",
  first_session_bonus: "First Session Bonus",
  first_stream_bonus: "First Stream Bonus",
  referral_bonus: "Referral Bonus",
  spent_feature: "Boosted Session",
  spent_tipping: "Sent Tip",
  received_tip: "Received Tip",
}

const TRANSACTION_ICONS: Record<string, React.ReactNode> = {
  earned_watching: <ArrowUpRight className="w-4 h-4 text-green-500" />,
  earned_hosting: <ArrowUpRight className="w-4 h-4 text-green-500" />,
  milestone_bonus: <ArrowUpRight className="w-4 h-4 text-yellow-500" />,
  first_session_bonus: <ArrowUpRight className="w-4 h-4 text-yellow-500" />,
  first_stream_bonus: <ArrowUpRight className="w-4 h-4 text-yellow-500" />,
  referral_bonus: <ArrowUpRight className="w-4 h-4 text-yellow-500" />,
  received_tip: <ArrowUpRight className="w-4 h-4 text-pink-500" />,
  spent_feature: <ArrowDownLeft className="w-4 h-4 text-red-500" />,
  spent_tipping: <ArrowDownLeft className="w-4 h-4 text-pink-500" />,
}

export function TransactionHistory({ userId }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "earned" | "spent">("all")

  const getTransactionLabel = (tx: Transaction): string => {
    const baseLabel = TRANSACTION_LABELS[tx.type] || tx.type

    // Add username context for tips
    if (tx.type === 'spent_tipping' && tx.metadata?.recipientUsername) {
      return `Tipped @${tx.metadata.recipientUsername}`
    }
    if (tx.type === 'received_tip' && tx.metadata?.fromUsername) {
      return `Tip from @${tx.metadata.fromUsername}`
    }

    return baseLabel
  }

  const getTransactionSubtext = (tx: Transaction): string | null => {
    // Show tip message if provided
    if ((tx.type === 'spent_tipping' || tx.type === 'received_tip') && tx.metadata?.message) {
      return `"${tx.metadata.message}"`
    }
    return null
  }

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch(`/api/credits/transactions?limit=50`)
        if (response.ok) {
          const data = await response.json()
          setTransactions(data.transactions)
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [userId])

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "earned") return tx.amount > 0
    if (filter === "spent") return tx.amount < 0
    return true
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-6">
        <h2 className="font-mono text-2xl font-bold mb-6">Transaction History</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <TransactionRowSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-mono text-2xl font-bold">Transaction History</h2>

        {/* Filter Tabs */}
        <div className="flex gap-2" role="group" aria-label="Transaction filter">
          <button
            onClick={() => setFilter("all")}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-lime-400 text-black"
                : "bg-[#2a2a2a] text-[#a1a1aa] hover:text-white"
            }`}
            aria-label="Show all transactions"
            aria-pressed={filter === "all"}
          >
            All
          </button>
          <button
            onClick={() => setFilter("earned")}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "earned"
                ? "bg-green-500 text-black"
                : "bg-[#2a2a2a] text-[#a1a1aa] hover:text-white"
            }`}
            aria-label="Show earned credits only"
            aria-pressed={filter === "earned"}
          >
            Earned
          </button>
          <button
            onClick={() => setFilter("spent")}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "spent"
                ? "bg-red-500 text-black"
                : "bg-[#2a2a2a] text-[#a1a1aa] hover:text-white"
            }`}
            aria-label="Show spent credits only"
            aria-pressed={filter === "spent"}
          >
            Spent
          </button>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12" role="status" aria-label="No transactions">
          <Clock className="w-12 h-12 text-[#a1a1aa] mx-auto mb-4" aria-hidden="true" />
          <p className="text-[#a1a1aa]">No transactions yet</p>
          <p className="text-sm text-[#71717a] mt-2">
            Join or host a session to start earning credits
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 bg-[#2a2a2a] hover:bg-[#333333] rounded-lg transition-colors"
            >
              {/* Left Side - Type & Time */}
              <div className="flex items-center gap-4">
                <div className="p-2 bg-[#1a1a1a] rounded-lg">
                  {TRANSACTION_ICONS[tx.type] || (
                    <ArrowUpRight className="w-4 h-4 text-[#a1a1aa]" />
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {getTransactionLabel(tx)}
                  </p>
                  {getTransactionSubtext(tx) && (
                    <p className="text-sm text-[#a1a1aa] italic mt-0.5">
                      {getTransactionSubtext(tx)}
                    </p>
                  )}
                  <p className="text-sm text-[#71717a] mt-0.5">
                    {formatDate(tx.created_at)}
                  </p>
                </div>
              </div>

              {/* Right Side - Amount */}
              <div className="text-right">
                <p
                  className={`font-mono text-lg font-bold ${
                    tx.amount > 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {formatCredits(tx.amount)}
                </p>
                <p className="text-xs text-[#71717a]">
                  Balance: {formatCredits(tx.balance_after)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
