import React, { useEffect } from 'react';
import { botIdService } from '../../services/botidService';

interface BotIdProtectionProps {
  protectedOperations?: string[];
}

/**
 * BotID Protection Component
 * Initializes Vercel BotID protection for the application
 *
 * This component should be placed high in the component tree
 * to ensure protection is active before any protected operations
 */
export const BotIdProtection: React.FC<BotIdProtectionProps> = ({
  protectedOperations = ['optimization', 'schedule-generation'],
}) => {
  useEffect(() => {
    // Initialize BotID protection
    botIdService
      .initialize({
        protectedRoutes: protectedOperations.map(op => ({
          path: `/api/${op}`,
          method: 'POST',
        })),
      })
      .catch(error => {
        console.error('Failed to initialize BotID protection:', error);
      });
  }, [protectedOperations]);

  // This component doesn't render anything visible
  return null;
};

export default BotIdProtection;
