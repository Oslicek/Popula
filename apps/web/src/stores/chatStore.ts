/**
 * Chat Store - State management for LLM chat panel
 * 
 * Manages:
 * - Conversation messages (user, assistant, tool results)
 * - Loading state
 * - Error handling
 * - Context chips (current dataset, geography, metric, year, scenario)
 * - Suggested actions
 */

import { create } from 'zustand';

// ============================================================
// Types
// ============================================================

export type MessageRole = 'user' | 'assistant' | 'tool' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  // For tool messages
  toolName?: string;
  toolResult?: unknown;
  // For assistant messages with citations
  citations?: Array<{ label: string; url: string }>;
}

export interface ContextChips {
  dataset: string | null;
  geography: string | null;
  metric: string | null;
  year: string | null;
  scenario: string | null;
}

export interface ChatState {
  // Messages
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;

  // Loading state
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Context chips
  contextChips: ContextChips;
  setContextChip: (key: keyof ContextChips, value: string | null) => void;
  clearContext: () => void;

  // Suggested actions
  suggestedActions: string[];
  setSuggestedActions: (actions: string[]) => void;
}

// ============================================================
// Default values
// ============================================================

const DEFAULT_SUGGESTED_ACTIONS = [
  'Run projection',
  'Add layer',
  'Convert file',
  'Explain',
];

const DEFAULT_CONTEXT_CHIPS: ContextChips = {
  dataset: null,
  geography: null,
  metric: null,
  year: null,
  scenario: null,
};

// ============================================================
// Store
// ============================================================

export const useChat = create<ChatState>((set) => ({
  // Messages
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ],
    })),
  clearMessages: () => set({ messages: [] }),

  // Loading state
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  // Error handling
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Context chips
  contextChips: { ...DEFAULT_CONTEXT_CHIPS },
  setContextChip: (key, value) =>
    set((state) => ({
      contextChips: {
        ...state.contextChips,
        [key]: value,
      },
    })),
  clearContext: () => set({ contextChips: { ...DEFAULT_CONTEXT_CHIPS } }),

  // Suggested actions
  suggestedActions: [...DEFAULT_SUGGESTED_ACTIONS],
  setSuggestedActions: (actions) => set({ suggestedActions: actions }),
}));
