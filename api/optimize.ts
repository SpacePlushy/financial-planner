import { VercelRequest, VercelResponse } from '@vercel/node';
import { GeneticOptimizer } from '../src/services/geneticOptimizer/GeneticOptimizer';
import {
  OptimizationConfig,
  OptimizationProgress,
  OptimizationResult,
  Expense,
  Deposit,
  ShiftTypes,
} from '../src/types';

// Enable CORS
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

interface OptimizationRequest {
  config: OptimizationConfig;
  expenses: Expense[];
  deposits: Deposit[];
  shiftTypes: ShiftTypes;
}

interface OptimizationResponse {
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse<OptimizationResponse>
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).setHeaders(headers).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).setHeaders(headers).json({
      success: false,
      error: 'Method not allowed',
      performanceMetrics: {
        startTime: Date.now(),
        endTime: Date.now(),
        totalTime: 0,
        serverRegion: process.env.VERCEL_REGION || 'unknown',
      },
    });
    return;
  }

  const startTime = Date.now();

  try {
    const { config, expenses, deposits, shiftTypes } = req.body as OptimizationRequest;

    if (!config) {
      throw new Error('No configuration provided');
    }

    // Create optimizer instance
    const optimizer = new GeneticOptimizer(
      config,
      expenses || [],
      deposits || [],
      shiftTypes
    );

    // Track progress (we'll send final result only due to serverless limitations)
    let lastProgress: OptimizationProgress | null = null;

    // Run optimization
    const result = await optimizer.optimize(async (progress) => {
      lastProgress = progress;
      // In serverless, we can't stream updates back to client
      // So we just track the progress internally
    });

    const endTime = Date.now();

    res.status(200).setHeaders(headers).json({
      success: true,
      result,
      performanceMetrics: {
        startTime,
        endTime,
        totalTime: endTime - startTime,
        serverRegion: process.env.VERCEL_REGION || 'unknown',
      },
    });
  } catch (error) {
    const endTime = Date.now();
    
    res.status(500).setHeaders(headers).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      performanceMetrics: {
        startTime,
        endTime,
        totalTime: endTime - startTime,
        serverRegion: process.env.VERCEL_REGION || 'unknown',
      },
    });
  }
}

// Vercel configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 60, // Maximum allowed duration for hobby plan
};