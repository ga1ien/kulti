/**
 * Credit Balance Hook
 *
 * Shared hook for fetching and managing credit balance state.
 * Reduces duplication across components that need credit balance.
 */

import { useState, useEffect, useCallback } from 'react'
import { fetchCreditBalance } from '@/lib/utils/api'

export function useCreditBalance() {
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const refreshBalance = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const newBalance = await fetchCreditBalance()
      if (newBalance !== null) {
        setBalance(newBalance)
      } else {
        setError('Failed to fetch balance')
      }
    } catch (err) {
      logger.error('Failed to fetch balance', { error: err })
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshBalance()
  }, [refreshBalance])

  return {
    balance,
    loading,
    error,
    refreshBalance,
  }
}
