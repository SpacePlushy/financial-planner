// This file is only used when deployed to Vercel
// It provides server-side BotID protection for the optimization endpoint

const { checkBotId } = require('botid/server');

module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for bot activity with Vercel BotID
    const { isBot } = await checkBotId();
    
    if (isBot) {
      console.log('Bot detected by Vercel BotID, blocking request');
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Bot activity detected. Please verify you are human.' 
      });
    }

    // If not a bot, proxy the request to the actual optimization logic
    // In production, this would call your optimization service
    res.status(200).json({ 
      message: 'BotID check passed',
      note: 'Implement actual optimization logic here'
    });

  } catch (error) {
    console.error('BotID check error:', error);
    res.status(500).json({ 
      error: 'Protection check failed', 
      message: error.message 
    });
  }
};