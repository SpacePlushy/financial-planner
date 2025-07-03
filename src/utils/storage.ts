import { StoredAppData } from '../context/types';
import { logger } from './logger';

// Constants
const STORAGE_KEY = 'financial-schedule-optimizer';
const CURRENT_VERSION = '1.0.0';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

/**
 * Compression utilities using browser's native CompressionStream API
 */
export const compressionUtils = {
  /**
   * Compress a string using gzip
   */
  async compress(data: string): Promise<string> {
    try {
      if (!('CompressionStream' in window)) {
        // Fallback: return base64 encoded string if compression not supported
        return btoa(encodeURIComponent(data));
      }

      const encoder = new TextEncoder();
      const encoded = encoder.encode(data);

      const cs = new (window as Record<string, unknown>).CompressionStream(
        'gzip'
      );
      const writer = cs.writable.getWriter();
      writer.write(encoded);
      writer.close();

      const compressedData = await new Response(cs.readable).arrayBuffer();
      const compressed = new Uint8Array(compressedData);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...Array.from(compressed)));
    } catch (error) {
      logger.error('Storage', 'Compression failed', error as Error);
      // Fallback to base64 encoding
      return btoa(encodeURIComponent(data));
    }
  },

  /**
   * Decompress a gzip compressed string
   */
  async decompress(compressed: string): Promise<string> {
    try {
      if (!('DecompressionStream' in window)) {
        // Fallback: decode base64 string if decompression not supported
        return decodeURIComponent(atob(compressed));
      }

      // Convert from base64
      const binaryString = atob(compressed);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const ds = new (window as Record<string, unknown>).DecompressionStream(
        'gzip'
      );
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();

      const decompressedData = await new Response(ds.readable).arrayBuffer();
      const decoder = new TextDecoder();

      return decoder.decode(decompressedData);
    } catch (error) {
      logger.error('Storage', 'Decompression failed', error as Error);
      // Try fallback decoding
      try {
        return decodeURIComponent(atob(compressed));
      } catch {
        throw new Error('Failed to decompress data');
      }
    }
  },
};

/**
 * Storage quota management utilities
 */
export const storageQuota = {
  /**
   * Check available storage quota
   */
  async checkQuota(): Promise<{
    usage: number;
    quota: number;
    available: number;
  }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || MAX_STORAGE_SIZE;

        return {
          usage,
          quota,
          available: quota - usage,
        };
      }
    } catch (error) {
      logger.warn('Storage', 'Failed to check storage quota', error as Error);
    }

    // Fallback: estimate based on localStorage
    const used = new Blob(Object.values(localStorage)).size;
    return {
      usage: used,
      quota: MAX_STORAGE_SIZE,
      available: MAX_STORAGE_SIZE - used,
    };
  },

  /**
   * Check if there's enough space for data
   */
  async hasSpace(dataSize: number): Promise<boolean> {
    const { available } = await this.checkQuota();
    return available > dataSize * 1.1; // 10% buffer
  },
};

/**
 * LocalStorage wrapper with error handling and compression
 */
export const storage = {
  /**
   * Save data to localStorage with compression
   */
  async save(data: StoredAppData): Promise<void> {
    try {
      // Add metadata
      const dataWithMeta = {
        ...data,
        version: CURRENT_VERSION,
        timestamp: new Date().toISOString(),
      };

      const serialized = JSON.stringify(dataWithMeta);
      const dataSize = new Blob([serialized]).size;

      // Check storage quota
      if (!(await storageQuota.hasSpace(dataSize))) {
        throw new Error('Insufficient storage space');
      }

      // Compress data
      const compressed = await compressionUtils.compress(serialized);

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, compressed);

      logger.info('Storage', 'Data saved successfully', {
        originalSize: dataSize,
        compressedSize: compressed.length,
        compressionRatio: (compressed.length / dataSize).toFixed(2),
      });
    } catch (error) {
      logger.error('Storage', 'Failed to save data', error as Error);
      throw error;
    }
  },

  /**
   * Load data from localStorage with decompression
   */
  async load(): Promise<StoredAppData | null> {
    try {
      const compressed = localStorage.getItem(STORAGE_KEY);
      if (!compressed) {
        return null;
      }

      // Decompress data
      const decompressed = await compressionUtils.decompress(compressed);
      const data = JSON.parse(decompressed) as StoredAppData;

      // Check version
      if (data.version !== CURRENT_VERSION) {
        logger.info('Storage', 'Data migration required', {
          fromVersion: data.version,
          toVersion: CURRENT_VERSION,
        });
        return await this.migrate(data);
      }

      return data;
    } catch (error) {
      logger.error('Storage', 'Failed to load data', error as Error);

      // Try to recover by clearing corrupted data
      if (error instanceof SyntaxError) {
        logger.warn('Storage', 'Corrupted data detected, clearing storage');
        await this.clear();
      }

      return null;
    }
  },

  /**
   * Clear all stored data
   */
  async clear(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
      logger.info('Storage', 'Storage cleared');
    } catch (error) {
      logger.error('Storage', 'Failed to clear storage', error as Error);
      throw error;
    }
  },

  /**
   * Export data as JSON string
   */
  async export(data: StoredAppData): Promise<string> {
    const exportData = {
      ...data,
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      exported: true,
    };

    return JSON.stringify(exportData, null, 2);
  },

  /**
   * Import data from JSON string
   */
  async import(jsonString: string): Promise<StoredAppData> {
    try {
      const data = JSON.parse(jsonString) as StoredAppData;

      // Validate required fields
      if (!data.version || !data.timestamp) {
        throw new Error('Invalid data format');
      }

      // Migrate if needed
      if (data.version !== CURRENT_VERSION) {
        return await this.migrate(data);
      }

      return data;
    } catch (error) {
      logger.error('Storage', 'Failed to import data', error as Error);
      throw new Error('Invalid import file format');
    }
  },

  /**
   * Migrate data between versions
   */
  async migrate(data: StoredAppData): Promise<StoredAppData> {
    let migrated = { ...data };

    // Migration logic based on version
    // Example: if (data.version === '0.9.0') { ... }

    // For now, just update the version
    migrated.version = CURRENT_VERSION;

    logger.info('Storage', 'Data migrated', {
      fromVersion: data.version,
      toVersion: CURRENT_VERSION,
    });

    return migrated;
  },
};

/**
 * File utilities for import/export
 */
export const fileUtils = {
  /**
   * Download data as a file
   */
  download(data: string, filename: string): void {
    try {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      // Ensure we have a valid DOM element and document.body exists
      const canAppend =
        link &&
        document.body &&
        typeof document.body.appendChild === 'function';
      if (!canAppend) {
        console.warn('DOM manipulation not available in this environment');
        return;
      }

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      if (link.parentNode) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  },

  /**
   * Read file as text
   */
  async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = e => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  },
};
