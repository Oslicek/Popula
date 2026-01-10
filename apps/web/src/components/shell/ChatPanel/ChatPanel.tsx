/**
 * ChatPanel - LLM Chat Interface
 * 
 * Dockable panel for interacting with AI assistant.
 * Shows context chips, conversation history, suggested actions.
 */

import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../../../stores/uiStore';
import { useChat, type Message, type ContextChips } from '../../../stores/chatStore';
import styles from './ChatPanel.module.css';

export function ChatPanel() {
  const { closeChatPanel } = useUIStore();
  const { 
    messages, 
    addMessage, 
    isLoading, 
    setLoading,
    error, 
    clearError,
    contextChips,
    setContextChip,
    suggestedActions,
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message
    addMessage({ role: 'user', content: userMessage });
    
    // Simulate AI response (placeholder)
    setLoading(true);
    setTimeout(() => {
      addMessage({ 
        role: 'assistant', 
        content: 'This is a placeholder response. The chat functionality will be connected to an LLM backend in a future phase.' 
      });
      setLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleActionClick = (action: string) => {
    setInputValue(action);
    inputRef.current?.focus();
  };

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.title}>
          <SparkleIcon className={styles.sparkle} />
          Chat Assistant
        </div>
        <button 
          className={styles.closeButton}
          onClick={closeChatPanel}
          aria-label="Close chat"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          <ErrorIcon className={styles.errorIcon} />
          <span>{error}</span>
          <button className={styles.errorDismiss} onClick={clearError}>
            <CloseIcon />
          </button>
        </div>
      )}

      {/* Context Chips */}
      <ContextChipsSection 
        chips={contextChips} 
        onRemove={(key) => setContextChip(key, null)} 
      />

      {/* Messages Area */}
      <div className={styles.messagesArea}>
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && <LoadingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Suggested Actions */}
      {messages.length === 0 && (
        <div className={styles.suggestedActions}>
          <div className={styles.suggestedLabel}>Try saying:</div>
          <div className={styles.actionButtons}>
            {suggestedActions.map((action) => (
              <button 
                key={action}
                className={styles.actionButton}
                onClick={() => handleActionClick(action)}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <button className={styles.attachButton} aria-label="Attach file">
            <AttachIcon />
          </button>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            rows={1}
          />
          <button 
            className={styles.sendButton}
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function ContextChipsSection({ 
  chips, 
  onRemove 
}: { 
  chips: ContextChips; 
  onRemove: (key: keyof ContextChips) => void;
}) {
  const activeChips = Object.entries(chips).filter(([, value]) => value !== null) as [keyof ContextChips, string][];
  
  if (activeChips.length === 0) {
    return (
      <div className={styles.contextArea}>
        <div className={styles.contextLabel}>Context</div>
        <div className={styles.noContext}>No context set</div>
      </div>
    );
  }

  return (
    <div className={styles.contextArea}>
      <div className={styles.contextLabel}>Context</div>
      <div className={styles.contextChips}>
        {activeChips.map(([key, value]) => (
          <div key={key} className={styles.chip}>
            <span className={styles.chipLabel}>{key}:</span>
            <span className={styles.chipValue}>{value}</span>
            <button 
              className={styles.chipRemove}
              onClick={() => onRemove(key)}
              aria-label={`Remove ${key}`}
            >
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const timeString = message.timestamp.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className={`${styles.message} ${styles[message.role]}`}>
      <div className={styles.messageBubble}>
        {message.role === 'tool' && (
          <div className={styles.toolHeader}>
            <ToolIcon className={styles.toolIcon} />
            {message.toolName || 'Tool'}
          </div>
        )}
        {message.content}
      </div>
      <span className={styles.messageTime}>{timeString}</span>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className={styles.loadingIndicator}>
      <div className={styles.loadingDots}>
        <div className={styles.loadingDot} />
        <div className={styles.loadingDot} />
        <div className={styles.loadingDot} />
      </div>
      <span>Thinking...</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <ChatEmptyIcon className={styles.emptyIcon} />
      <div className={styles.emptyTitle}>How can I help?</div>
      <div className={styles.emptyDescription}>
        Ask questions, run projections, or explore your data.
      </div>
    </div>
  );
}

// ============================================================
// Icons
// ============================================================

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0l1.5 4.5L14 6l-4.5 1.5L8 12l-1.5-4.5L2 6l4.5-1.5L8 0z" />
      <path d="M12 8l.75 2.25L15 11l-2.25.75L12 14l-.75-2.25L9 11l2.25-.75L12 8z" opacity="0.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v4M8 11v.5" strokeLinecap="round" />
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 8l-5.5 5.5a3.5 3.5 0 01-5-5L9 3a2 2 0 013 3L6.5 11.5a.5.5 0 01-1-1L11 5" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2.5 2L14 8l-11.5 6V9.5L9 8 2.5 6.5V2z" />
    </svg>
  );
}

function ToolIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8.5 1.5l4 4-7 7-4-4 7-7z" strokeLinejoin="round" />
      <path d="M1 13l2-2" strokeLinecap="round" />
    </svg>
  );
}

function ChatEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 12a4 4 0 014-4h24a4 4 0 014 4v20a4 4 0 01-4 4H20l-8 6v-6H8a4 4 0 01-4-4V12z" />
      <path d="M16 18h16M16 24h10" strokeLinecap="round" />
    </svg>
  );
}
