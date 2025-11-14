/**
 * Claude AI Service
 *
 * Integration with Anthropic's Claude API for session AI chat
 */

import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeResponse {
  content: string
  tokens: {
    input: number
    output: number
    total: number
  }
  stopReason: string
}

/**
 * Send message to Claude and get response
 */
export async function sendToClaude(
  messages: ClaudeMessage[],
  systemPrompt?: string
): Promise<ClaudeResponse> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    const contentBlock = response.content[0]
    if (contentBlock.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    return {
      content: contentBlock.text,
      tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      },
      stopReason: response.stop_reason || 'end_turn',
    }
  } catch (error) {
    logger.error('Claude API error:', error)
    throw new Error('Failed to get response from Claude')
  }
}

/**
 * Calculate credits cost for token usage
 * Roughly: 1 credit per 1000 tokens (can adjust based on costs)
 */
export function calculateTokenCost(tokens: number): number {
  // Claude Sonnet 4.5 pricing (approximate):
  // Input: $3 per 1M tokens = $0.000003 per token
  // Output: $15 per 1M tokens = $0.000015 per token
  // For simplicity, we'll charge 5 credits per 1000 tokens average
  return Math.ceil(tokens / 200) // 1 credit per 200 tokens
}

/**
 * Build system prompt for session AI
 */
export function buildSessionSystemPrompt(sessionContext: {
  title: string
  hostName: string
  participantCount: number
}): string {
  return `You are an AI assistant helping a group of ${sessionContext.participantCount} developers who are building together in real-time on kulti.club.

**Session Context:**
- Session Title: "${sessionContext.title}"
- Host: ${sessionContext.hostName}
- This is a live coding/building session where people are collaborating

**Your Role:**
- Answer questions from any participant in the session
- Provide context-aware help based on what they're building
- Be concise and clear (they're in a live session, not reading documentation)
- Reference previous messages in the conversation when relevant
- Help facilitate their collaboration
- When someone shows code or describes an error, provide actionable debugging steps

**Guidelines:**
- Keep responses focused and practical
- Use code examples when helpful
- Ask clarifying questions if the problem is unclear
- Encourage collaboration between participants
- Be encouraging and supportive

**Format:**
- Use markdown for formatting
- Use code blocks with syntax highlighting
- Use bullet points for lists
- Keep paragraphs short

Remember: You're a collaborative assistant in a live session, not a lecturer. Be helpful, concise, and practical.`
}

/**
 * Format user message with attribution
 */
export function formatUserMessage(username: string, content: string): string {
  return `@${username}: ${content}`
}

/**
 * Parse message to check if it's directed at Claude
 */
export function isClaudeMessage(content: string): boolean {
  const lowerContent = content.toLowerCase().trim()
  return (
    lowerContent.startsWith('claude') ||
    lowerContent.startsWith('@claude') ||
    lowerContent.startsWith('hey claude') ||
    lowerContent.startsWith('hi claude')
  )
}

/**
 * Strip Claude mention from message
 */
export function stripClaudeMention(content: string): string {
  return content
    .replace(/^@?claude[,:]?\s*/i, '')
    .replace(/^(hey|hi)\s+claude[,:]?\s*/i, '')
    .trim()
}
