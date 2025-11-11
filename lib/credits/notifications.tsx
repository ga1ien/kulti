"use client"

import React from "react"
import toast from "react-hot-toast"
import { CreditToast, SpendToast } from "@/components/credits/credit-toast"

export function notifyCreditEarned(amount: number, reason: string) {
  toast.custom((t) => (
    <div
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } max-w-md w-full bg-[#1a1a1a] border border-lime-400 rounded-xl shadow-2xl p-4`}
    >
      <CreditToast amount={amount} reason={reason} />
    </div>
  ))
}

export function notifyMilestoneAchieved(
  milestone: { label: string; reward: number },
  totalCredits: number
) {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } max-w-md w-full bg-[#1a1a1a] border border-lime-400 rounded-xl shadow-2xl p-4`}
      >
        <CreditToast
          amount={totalCredits}
          reason="Milestone Achievement"
          milestone={milestone}
        />
      </div>
    ),
    {
      duration: 6000, // Show longer for milestones
    }
  )
}

export function notifyCreditsSpent(amount: number, reason: string) {
  toast.custom((t) => (
    <div
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } max-w-md w-full bg-[#1a1a1a] border border-red-500 rounded-xl shadow-2xl p-4`}
    >
      <SpendToast amount={amount} reason={reason} />
    </div>
  ))
}

export function notifyInsufficientCredits(required: number, current: number) {
  toast.error(`Need ${required} credits (you have ${current})`, {
    icon: "💰",
  })
}
