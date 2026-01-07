/**
 * Hook for managing demographic projections.
 * Handles submission, progress tracking, and result retrieval.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNatsConnection, useNatsSubscription } from './useNats';
import { 
  SUBJECTS, 
  buildSubject, 
  createMessage,
  type ProjectionProgressMessage,
  type ProjectionResultMessage,
  type ScenarioAcceptedMessage,
} from '@popula/shared-types';
import type { 
  CreateScenarioRequest, 
  ProjectionResult, 
  ProjectionProgress 
} from '@popula/shared-types';

// ============================================================
// TYPES
// ============================================================

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

export function useProjection(options: UseProjectionOptions = {}): UseProjectionReturn {
  const { publish, isConnected } = useNatsConnection();
  
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [result, setResult] = useState<ProjectionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Submit a new scenario
  const submit = useCallback(async (request: CreateScenarioRequest): Promise<string> => {
    if (!isConnected) {
      throw new Error('Not connected to server');
    }

    // Reset state
    setIsRunning(true);
    setProgress(0);
    setCurrentYear(null);
    setResult(null);
    setError(null);

    // Create and send message
    const message = createMessage(request);
    await publish(SUBJECTS.SCENARIO_SUBMIT, message);

    // The scenario ID will be set when we receive the accepted message
    return message.correlationId;
  }, [isConnected, publish]);

  // Subscribe to scenario accepted messages
  useNatsSubscription<ScenarioAcceptedMessage>(
    SUBJECTS.SCENARIO_ACCEPTED,
    (msg) => {
      const { scenario } = msg.payload;
      setScenarioId(scenario.id);
      options.onStart?.(scenario.id);
    },
    [options.onStart]
  );

  // Subscribe to progress updates (only when we have a scenario ID)
  useEffect(() => {
    if (!scenarioId) return;

    // This would need dynamic subscription based on scenarioId
    // For now, we'll use a wildcard pattern or separate hook
  }, [scenarioId]);

  // Handle progress updates
  const handleProgress = useCallback((msg: ProjectionProgressMessage) => {
    const progressData = msg.payload;
    setProgress(progressData.percentComplete);
    setCurrentYear(progressData.currentYear);
    options.onProgress?.(progressData);
  }, [options]);

  // Handle result
  const handleResult = useCallback((msg: ProjectionResultMessage) => {
    const resultData = msg.payload;
    setResult(resultData);
    setIsRunning(false);
    setProgress(100);
    options.onComplete?.(resultData);
  }, [options]);

  // Subscribe to progress and result if we have a scenario ID
  useNatsSubscription<ProjectionProgressMessage>(
    scenarioId ? buildSubject.projectionProgress(scenarioId) : '',
    handleProgress,
    [scenarioId, handleProgress]
  );

  useNatsSubscription<ProjectionResultMessage>(
    scenarioId ? buildSubject.projectionResult(scenarioId) : '',
    handleResult,
    [scenarioId, handleResult]
  );

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

