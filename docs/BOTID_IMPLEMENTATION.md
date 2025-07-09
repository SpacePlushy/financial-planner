# Vercel BotID Implementation

This document describes the Vercel BotID implementation in the Financial Schedule Optimizer application.

## Overview

Vercel BotID is an invisible CAPTCHA alternative that protects expensive operations from bot abuse without impacting user experience. It's powered by Kasada and provides enterprise-grade bot detection.

## Implementation Details

### 1. Installation

```bash
npm install botid
```

### 2. Components Added

#### BotIdProtection Component (`src/components/BotIdProtection/`)
- Initializes BotID protection for the application
- Placed at the root of the component tree in App.tsx
- Configures protected operations (optimization, schedule-generation)

#### BotID Service (`src/services/botidService.ts`)
- Singleton service for managing BotID checks
- Provides methods to check sessions and protect operations
- Wraps expensive operations with bot protection

#### Vercel Optimizer Hook (`src/hooks/useVercelOptimizer.ts`)
- Uses server-side optimization when deployed to Vercel
- Falls back to client-side optimization in development
- Handles Server-Sent Events for progress updates

### 3. API Endpoint

#### `/api/optimize.js`
- Vercel Function that handles optimization requests
- Performs server-side BotID verification using `checkBotId()`
- Returns 403 Forbidden if bot activity is detected
- Streams optimization progress using Server-Sent Events

### 4. Configuration

#### `vercel.json`
```json
{
  "functions": {
    "api/optimize.js": {
      "maxDuration": 30
    }
  }
}
```

## How It Works

1. **Client-Side**: The BotIdProtection component initializes protection when the app loads
2. **Server-Side**: When optimization is requested, the API endpoint checks for bots
3. **Protection**: Bots are blocked with a 403 response before expensive operations run
4. **User Experience**: Legitimate users experience no delays or CAPTCHAs

## Deployment

### Development
- BotID protection is initialized but not enforced
- Optimization runs client-side
- No actual bot blocking occurs

### Production (Vercel)
- Full BotID protection is active
- Server-side verification blocks bots
- Optimization runs on Vercel Functions with protection

## Testing

To test BotID protection:

1. Deploy to Vercel:
   ```bash
   vercel
   ```

2. The optimization will automatically use the protected endpoint when:
   - `NODE_ENV === 'production'`
   - Running on Vercel (detected by URL)

3. Bot attempts will receive:
   ```json
   {
     "error": "Access denied",
     "message": "Bot activity detected. Please verify you are human."
   }
   ```

## Requirements

- Vercel Pro or Enterprise plan (for Deep Analysis)
- Deployment to Vercel platform
- Node.js 18.x or later

## Benefits

1. **No User Friction**: Invisible to legitimate users
2. **Advanced Protection**: Detects sophisticated bots using Puppeteer/Playwright
3. **Cost Savings**: Prevents expensive operations from bot abuse
4. **Easy Integration**: Simple setup with minimal code changes

## Monitoring

Bot attempts are logged in Vercel's dashboard under the Firewall tab when Deep Analysis is enabled.

## Further Customization

To protect additional endpoints:

1. Add them to the `protectedOperations` array in BotIdProtection component
2. Create corresponding API endpoints with `checkBotId()` verification
3. Update client code to use the protected endpoints

## Resources

- [Vercel BotID Documentation](https://vercel.com/docs/botid)
- [Vercel BotID Blog Post](https://vercel.com/blog/introducing-botid)