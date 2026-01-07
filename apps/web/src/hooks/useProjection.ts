/**
 * Hook for managing demographic projections.
 * Handles submission, progress tracking, and result retrieval.
 * 
 * TODO: Implement when projection functionality is added
 */

import { useState, useCallback } from 'react';
import type { ProjectionResult, ProjectionProgress } from '@popula/shared-types';

// ============================================================
// TYPES
// ============================================================

interface CreateScenarioRequest {
  name: string;
  description?: string;
  baseYear: number;
  endYear: number;
  regions: string[];
}

interface UseProjectionOptions {
  /** Called when projection starts */
  onStart?: (scenarioId: string) => void;
  /** Called on progress updates */
  onProgress?: (progress: ProjectionProgress) => void;
  /** Called when projection completes */
  onComplete?: (result: ProjectionResult) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

interface UseProjectionReturn {
  /** Submit a new scenario for projection */
  submit: (request: CreateScenarioRequest) => Promise<string>;
  /** Current scenario ID being processed */
  scenarioId: string | null;
  /** Whether a projection is running */
  isRunning: boolean;
  /** Current progress (0-100) */
  progress: number;
  /** Current year being processed */
  currentYear: number | null;
  /** Final result when complete */
  result: ProjectionResult | null;
  /** Error if projection failed */
  error: Error | null;
  /** Reset state for new projection */
  reset: () => void;
}

// ============================================================
// HOOK
// ============================================================

export function useProjection(_options: UseProjectionOptions = {}): UseProjectionReturn {
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [result, setResult] = useState<ProjectionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Submit a new scenario - TODO: implement with real NATS messaging
  const submit = useCallback(async (_request: CreateScenarioRequest): Promise<string> => {
    throw new Error('Not implemented - projection functionality coming soon');
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setScenarioId(null);
    setIsRunning(false);
    setProgress(0);
    setCurrentYear(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    submit,
    scenarioId,
    isRunning,
    progress,
    currentYear,
    result,
    error,
    reset,
  };
}
