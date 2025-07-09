import { checkBotId } from 'botid/server';
import { GeneticOptimizer } from '../src/services/geneticOptimizer/GeneticOptimizer';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for bot activity with BotID
    const { isBot } = await checkBotId();
    
    if (isBot) {
      console.log('Bot detected, blocking request');
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Bot activity detected. Please verify you are human.' 
      });
    }

    // Extract optimization config from request body
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({ error: 'Missing optimization config' });
    }

    // Create optimizer instance and run optimization
    const optimizer = new GeneticOptimizer(config);
    
    // Set up SSE for progress updates
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Run optimization with progress callback
    const result = await optimizer.optimize(async (progress) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', data: progress })}\n\n`);
    });

    // Send final result
    res.write(`data: ${JSON.stringify({ type: 'complete', data: result })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ 
      error: 'Optimization failed', 
      message: error.message 
    });
  }
}