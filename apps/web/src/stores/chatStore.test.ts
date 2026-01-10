import { describe, it, expect, beforeEach } from 'vitest';
import { useChat, type Message } from './chatStore';

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useChat.setState({
      messages: [],
      isLoading: false,
      error: null,
      contextChips: {
        dataset: null,
        geography: null,
        metric: null,
        year: null,
        scenario: null,
      },
    });
  });

  describe('messages', () => {
    it('starts with empty messages', () => {
      const state = useChat.getState();
      expect(state.messages).toHaveLength(0);
    });

    it('adds a user message', () => {
      const { addMessage } = useChat.getState();
      addMessage({ role: 'user', content: 'Hello' });
      
      const messages = useChat.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello');
      expect(messages[0].id).toBeDefined();
      expect(messages[0].timestamp).toBeDefined();
    });

    it('adds an assistant message', () => {
      const { addMessage } = useChat.getState();
      addMessage({ role: 'assistant', content: 'Hi there!' });
      
      const messages = useChat.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
    });

    it('adds a tool result message', () => {
      const { addMessage } = useChat.getState();
      addMessage({ 
        role: 'tool', 
        content: 'Created run #1234',
        toolName: 'createRun',
        toolResult: { runId: '1234', status: 'queued' },
      });
      
      const messages = useChat.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('tool');
      expect(messages[0].toolName).toBe('createRun');
    });

    it('maintains message order', () => {
      const { addMessage } = useChat.getState();
      addMessage({ role: 'user', content: 'First' });
      addMessage({ role: 'assistant', content: 'Second' });
      addMessage({ role: 'user', content: 'Third' });
      
      const messages = useChat.getState().messages;
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
      expect(messages[2].content).toBe('Third');
    });

    it('clears all messages', () => {
      const { addMessage, clearMessages } = useChat.getState();
      addMessage({ role: 'user', content: 'Hello' });
      addMessage({ role: 'assistant', content: 'Hi' });
      
      clearMessages();
      
      expect(useChat.getState().messages).toHaveLength(0);
    });
  });

  describe('loading state', () => {
    it('starts not loading', () => {
      expect(useChat.getState().isLoading).toBe(false);
    });

    it('sets loading state', () => {
      const { setLoading } = useChat.getState();
      setLoading(true);
      expect(useChat.getState().isLoading).toBe(true);
      
      setLoading(false);
      expect(useChat.getState().isLoading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('starts with no error', () => {
      expect(useChat.getState().error).toBeNull();
    });

    it('sets error', () => {
      const { setError } = useChat.getState();
      setError('Something went wrong');
      expect(useChat.getState().error).toBe('Something went wrong');
    });

    it('clears error', () => {
      useChat.setState({ error: 'Previous error' });
      const { clearError } = useChat.getState();
      clearError();
      expect(useChat.getState().error).toBeNull();
    });
  });

  describe('context chips', () => {
    it('starts with null context', () => {
      const { contextChips } = useChat.getState();
      expect(contextChips.dataset).toBeNull();
      expect(contextChips.geography).toBeNull();
      expect(contextChips.metric).toBeNull();
      expect(contextChips.year).toBeNull();
      expect(contextChips.scenario).toBeNull();
    });

    it('sets individual context chip', () => {
      const { setContextChip } = useChat.getState();
      setContextChip('dataset', 'ONS 2022');
      
      expect(useChat.getState().contextChips.dataset).toBe('ONS 2022');
    });

    it('sets multiple context chips', () => {
      const { setContextChip } = useChat.getState();
      setContextChip('dataset', 'ONS 2022');
      setContextChip('year', '2035');
      setContextChip('geography', 'LAD23');
      
      const { contextChips } = useChat.getState();
      expect(contextChips.dataset).toBe('ONS 2022');
      expect(contextChips.year).toBe('2035');
      expect(contextChips.geography).toBe('LAD23');
    });

    it('clears a context chip', () => {
      useChat.setState({ 
        contextChips: { 
          dataset: 'ONS 2022', 
          geography: 'LAD23',
          metric: null,
          year: null,
          scenario: null,
        } 
      });
      
      const { setContextChip } = useChat.getState();
      setContextChip('dataset', null);
      
      expect(useChat.getState().contextChips.dataset).toBeNull();
      expect(useChat.getState().contextChips.geography).toBe('LAD23');
    });

    it('clears all context chips', () => {
      useChat.setState({ 
        contextChips: { 
          dataset: 'ONS 2022', 
          geography: 'LAD23',
          metric: 'Pop 65+',
          year: '2035',
          scenario: 'Base',
        } 
      });
      
      const { clearContext } = useChat.getState();
      clearContext();
      
      const { contextChips } = useChat.getState();
      expect(contextChips.dataset).toBeNull();
      expect(contextChips.geography).toBeNull();
      expect(contextChips.metric).toBeNull();
      expect(contextChips.year).toBeNull();
      expect(contextChips.scenario).toBeNull();
    });
  });

  describe('suggested actions', () => {
    it('has default suggested actions', () => {
      const { suggestedActions } = useChat.getState();
      expect(suggestedActions).toContain('Run projection');
      expect(suggestedActions).toContain('Add layer');
    });

    it('can set custom suggested actions', () => {
      const { setSuggestedActions } = useChat.getState();
      setSuggestedActions(['Export data', 'Compare runs']);
      
      const { suggestedActions } = useChat.getState();
      expect(suggestedActions).toEqual(['Export data', 'Compare runs']);
    });
  });
});
