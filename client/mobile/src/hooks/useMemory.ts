/**
 * Memory Protocol Hook
 * Manages Short-Term Memory (STM) for context-aware AI interactions
 * 
 * Implements three types of memory:
 * 1. Operational Context: Recently searched/created entities (LRU cache)
 * 2. Conversation Context: Recent chat history (FIFO queue)
 * 3. Correction Context: Failed/pending intents (single slot)
 * 
 * Features localStorage persistence for debugging and session recovery
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Memory types as per protocol
interface OperationalItem {
  id: string;
  name: string;
  stamp: number;
}

interface OperationalContext {
  [entityType: string]: OperationalItem[];
}

interface ConversationTurn {
  user: string;
  agent: string;
  stamp: number;
}

interface CorrectionContext {
  workflowId?: string;
  missingFields?: string[];
  partialParams?: Record<string, any>;
  errorMessage?: string;
  stamp?: number;
}

// Protocol-defined TTLs (in milliseconds)
const TTL = {
  OPERATIONAL: 5 * 60 * 1000,  // 5 minutes
  CONVERSATION: 30 * 60 * 1000, // 30 minutes
  CORRECTION: 0, // Immediate (cleared after use)
};

const MAX_ITEMS = {
  OPERATIONAL_PER_TYPE: 5,
  CONVERSATION_TURNS: 5,
};

// localStorage keys
const STORAGE_KEYS = {
  OPERATIONAL: 'solomind:memory:operational',
  CONVERSATION: 'solomind:memory:conversation',
  CORRECTION: 'solomind:memory:correction',
};

export function useMemory() {
  // Load from localStorage on init
  const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      console.error('[useMemory] Failed to load from localStorage:', e);
      return defaultValue;
    }
  };

  // 1. Operational Context (LRU)
  const [operational, setOperational] = useState<OperationalContext>(() => 
    loadFromStorage(STORAGE_KEYS.OPERATIONAL, {})
  );
  
  // 2. Conversation Context (FIFO)
  const [conversation, setConversation] = useState<ConversationTurn[]>(() =>
    loadFromStorage(STORAGE_KEYS.CONVERSATION, [])
  );
  
  // 3. Correction Context (Single Slot)
  const [correction, setCorrection] = useState<CorrectionContext | null>(() =>
    loadFromStorage<CorrectionContext | null>(STORAGE_KEYS.CORRECTION, null)
  );

  // Persist to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.OPERATIONAL, JSON.stringify(operational));
    } catch (e) {
      console.error('[useMemory] Failed to persist operational context:', e);
    }
  }, [operational]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONVERSATION, JSON.stringify(conversation));
    } catch (e) {
      console.error('[useMemory] Failed to persist conversation context:', e);
    }
  }, [conversation]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CORRECTION, JSON.stringify(correction));
    } catch (e) {
      console.error('[useMemory] Failed to persist correction context:', e);
    }
  }, [correction]);

  // TTL cleanup intervals
  const cleanupTimers = useRef<ReturnType<typeof setInterval>[]>([]);

  // Cleanup expired items
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      
      // Clean operational context
      setOperational(prev => {
        const cleaned: OperationalContext = {};
        Object.entries(prev).forEach(([type, items]) => {
          cleaned[type] = items.filter(item => now - item.stamp < TTL.OPERATIONAL);
        });
        return cleaned;
      });

      // Clean conversation context
      setConversation(prev => 
        prev.filter(turn => now - turn.stamp < TTL.CONVERSATION)
      );

      // Correction context is cleared immediately, no TTL needed
    }, 60 * 1000); // Check every minute

    cleanupTimers.current.push(timer);
    return () => clearInterval(timer);
  }, []);

  /**
   * Add or update an entity in operational context
   * Implements LRU: moves existing items to front, adds new items at front
   */
  const addOperational = useCallback((entityType: string, id: string, name: string) => {
    console.log(`[useMemory] Adding operational: ${entityType}/${id} (${name})`);
    setOperational(prev => {
      const items = prev[entityType] || [];
      
      // Remove if already exists
      const filtered = items.filter(item => item.id !== id);
      
      // Add to front with current timestamp
      const updated = [{ id, name, stamp: Date.now() }, ...filtered];
      
      // Keep only MAX_ITEMS
      return {
        ...prev,
        [entityType]: updated.slice(0, MAX_ITEMS.OPERATIONAL_PER_TYPE),
      };
    });
  }, []);

  /**
   * Add a conversation turn (user message + agent response)
   */
  const addConversation = useCallback((userMsg: string, agentMsg: string) => {
    console.log(`[useMemory] Adding conversation: User="${userMsg.slice(0, 30)}..." / Agent="${agentMsg.slice(0, 30)}..."`);
    setConversation(prev => {
      const newTurn: ConversationTurn = {
        user: userMsg,
        agent: agentMsg,
        stamp: Date.now(),
      };
      
      // Add to end, keep last N turns
      const updated = [...prev, newTurn];
      return updated.slice(-MAX_ITEMS.CONVERSATION_TURNS);
    });
  }, []);

  /**
   * Set correction context (for failed/pending intents)
   */
  const setCorrectionContext = useCallback((context: CorrectionContext | null) => {
    console.log('[useMemory] Setting correction context:', context);
    setCorrection(context ? { ...context, stamp: Date.now() } : null);
  }, []);

  /**
   * Clear correction context (after successful execution)
   */
  const clearCorrection = useCallback(() => {
    console.log('[useMemory] Clearing correction context');
    setCorrection(null);
  }, []);

  /**
   * Clear all memory (for explicit "start over" commands)
   */
  const clearAll = useCallback(() => {
    console.log('[useMemory] Clearing all memory contexts');
    setOperational({});
    setConversation([]);
    setCorrection(null);
  }, []);

  /**
   * Format memory into a string for agent.purpose API
   * This is the key method that formats STM for LLM consumption
   */
  const formatMemoryString = useCallback((): string => {
    const parts: string[] = [];

    // 1. Operational Context
    const recentOps = Object.entries(operational)
      .flatMap(([type, items]) => 
        items.slice(0, 3).map(item => `${type}: ${item.name} (${item.id})`)
      );
    if (recentOps.length > 0) {
      parts.push(`[Recent Operations]\n${recentOps.join('\n')}`);
    }

    // 2. Conversation Context
    if (conversation.length > 0) {
      const recentConv = conversation.slice(-3).map(turn => 
        `User: ${turn.user}\nAgent: ${turn.agent}`
      ).join('\n');
      parts.push(`[Conversation History]\n${recentConv}`);
    }

    // 3. Correction Context
    if (correction) {
      const corrParts = [
        `Workflow: ${correction.workflowId}`,
        correction.missingFields ? `Missing: ${correction.missingFields.join(', ')}` : '',
        correction.errorMessage ? `Error: ${correction.errorMessage}` : '',
      ].filter(Boolean);
      parts.push(`[Pending Intent]\n${corrParts.join('\n')}`);
    }

    const result = parts.join('\n\n');
    if (result) {
      console.log('[useMemory] Formatted memory string:', result.slice(0, 100) + '...');
    }
    return result;
  }, [operational, conversation, correction]);

  return {
    // State
    operational,
    conversation,
    correction,
    
    // Actions
    addOperational,
    addConversation,
    setCorrection: setCorrectionContext,
    clearCorrection,
    clearAll,
    
    // Formatter
    formatMemoryString,
  };
}

