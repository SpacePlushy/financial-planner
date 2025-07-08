import {
  OptimizationConfig,
  OptimizationResult,
  Expense,
  Deposit,
  ShiftTypes,
} from '../types';

export interface ServerOptimizationResponse {
  success: boolean;
  result?: OptimizationResult;
  error?: string;
  performanceMetrics: {
    startTime: number;
    endTime: number;
    totalTime: number;
    serverRegion: string;
  };
}

export class ServerOptimizer {
  private baseUrl: string;

  constructor() {
    // Use the current origin in production, or localhost in development
    this.baseUrl =
      process.env.NODE_ENV === 'production'
        ? window.location.origin
        : 'http://localhost:3000';
  }

  async optimize(
    config: OptimizationConfig,
    expenses: Expense[],
    deposits: Deposit[],
    shiftTypes: ShiftTypes
  ): Promise<ServerOptimizationResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/api/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config,
          expenses,
          deposits,
          shiftTypes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        performanceMetrics: {
          startTime,
          endTime,
          totalTime: endTime - startTime,
          serverRegion: 'error',
        },
      };
    }
  }
}
