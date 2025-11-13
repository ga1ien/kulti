"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

export interface FAQItem {
  question: string
  answer: string
}

interface FAQSectionProps {
  title: string
  items: FAQItem[]
  searchQuery?: string
}

export const FAQSection = ({ title, items, searchQuery = "" }: FAQSectionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const filteredItems = items.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (filteredItems.length === 0) {
    return null
  }

  const highlightText = (text: string) => {
    if (!searchQuery) return text

    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"))
    return parts.map((part, index) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={index} className="bg-lime-400/20 text-lime-400">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl sm:text-3xl font-bold font-mono mb-4 text-lime-400">
        {title}
      </h2>
      <div className="space-y-3">
        {filteredItems.map((item, index) => {
          const isOpen = openIndex === index
          return (
            <div
              key={index}
              className="bg-[#1a1a1a] border border-[#27272a] rounded-xl overflow-hidden transition-all duration-200 hover:border-lime-400/50"
            >
              <button
                onClick={() => handleToggle(index)}
                className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left min-h-[68px] transition-colors"
                aria-expanded={isOpen}
              >
                <span className="font-medium text-base sm:text-lg text-white flex-1">
                  {highlightText(item.question)}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-lime-400 flex-shrink-0 transition-transform duration-200 ${
                    isOpen ? "transform rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
                  <div className="text-[#a1a1aa] text-sm sm:text-base leading-relaxed pt-2 border-t border-[#27272a]">
                    {highlightText(item.answer)}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
