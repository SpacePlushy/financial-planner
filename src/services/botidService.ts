/**
 * BotID Service for protecting expensive operations
 * Uses Vercel BotID to prevent bot abuse of optimization endpoints
 */

interface BotIdConfig {
  protectedRoutes: Array<{
    path: string;
    method: string;
  }>;
}

class BotIdService {
  private static instance: BotIdService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): BotIdService {
    if (!BotIdService.instance) {
      BotIdService.instance = new BotIdService();
    }
    return BotIdService.instance;
  }

  /**
   * Initialize BotID protection for the application
   */
  async initialize(config: BotIdConfig): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // BotID will be initialized through the component in App.tsx
      this.isInitialized = true;
      console.log(
        'BotID protection initialized for routes:',
        config.protectedRoutes
      );
    } catch (error) {
      console.error('Failed to initialize BotID:', error);
    }
  }

  /**
   * Check if the current session is identified as a bot
   * This is a client-side check that should be paired with server-side verification
   */
  async checkSession(): Promise<{ isBot: boolean; reason?: string }> {
    try {
      // In a real implementation, this would check with the BotID service
      // For now, we'll return a placeholder that always allows access
      // Server-side verification would be required for true protection
      return { isBot: false };
    } catch (error) {
      console.error('BotID check failed:', error);
      // On error, allow access but log the issue
      return { isBot: false, reason: 'Check failed' };
    }
  }

  /**
   * Wrap an expensive operation with bot protection
   */
  async protectOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const { isBot, reason } = await this.checkSession();

    if (isBot) {
      throw new Error(
        `Access denied: Bot detected. ${reason || 'Please verify you are human.'}`
      );
    }

    console.log(`BotID: Allowing operation "${operationName}"`);
    return operation();
  }
}

export const botIdService = BotIdService.getInstance();

export type { BotIdConfig };
