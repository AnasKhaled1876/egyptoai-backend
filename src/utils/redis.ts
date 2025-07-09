import { createClient } from 'redis';

// Interface for OTP data
interface OTPData {
  otp: string;
  expiresAt: number; // Storing as timestamp for JSON serialization
  verified: boolean;
  purpose?: 'signup' | 'verification' | 'password_reset';
  createdAt?: number;
  verifiedAt?: number;
  verificationToken?: string;
}

class RedisClient {
  private client: ReturnType<typeof createClient>;
  private static instance: RedisClient;
  private isConnected = false;

  private constructor() {
    // Create Redis client with proper type safety
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Common options
    const commonOptions = {
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 5) {
            console.error('Max retries reached. Could not connect to Redis.');
            return new Error('Could not connect to Redis after multiple attempts');
          }
          return 1000; // Reconnect after 1 second
        },
      },
    };

    // For production, add TLS options
    if (process.env.NODE_ENV === 'production' && redisUrl.startsWith('rediss://')) {
      // Parse the URL to get the host
      const url = new URL(redisUrl);
      
      this.client = createClient({
        ...commonOptions,
        socket: {
          ...commonOptions.socket,
          tls: true,
          host: url.hostname,
          port: url.port ? parseInt(url.port, 10) : 6379,
          rejectUnauthorized: false,
        },
      });
    } else {
      // For development or non-TLS connections
      this.client = createClient(commonOptions);
    }

    // Handle connection events
    this.client.on('error', (err) => console.error('Redis Client Error:', err));
    this.client.on('connect', () => console.log('Redis Client Connected'));
    this.client.on('reconnecting', () => console.log('Redis Client Reconnecting'));
    this.client.on('ready', () => {
      console.log('Redis Client Ready');
      this.isConnected = true;
    });
  }

  // Singleton pattern to ensure only one Redis client instance
  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  // Get the Redis client instance
  public getClient(): ReturnType<typeof createClient> {
    return this.client;
  }

  // Connect to Redis
  public async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  // Store OTP data
  public async setOTP(email: string, data: Omit<OTPData, 'email'>): Promise<boolean> {
    try {
      const ttlInSeconds = Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / 1000);
      await this.client.setEx(
        `otp:${email}`,
        ttlInSeconds,
        JSON.stringify(data)
      );
      return true;
    } catch (error) {
      console.error('Error setting OTP in Redis:', error);
      return false;
    }
  }

  // Get OTP data
  public async getOTP(email: string): Promise<OTPData | null> {
    try {
      const data = await this.client.get(`otp:${email}`);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      // Convert timestamps back to Date objects
      return {
        ...parsed,
        expiresAt: new Date(parsed.expiresAt),
        createdAt: parsed.createdAt ? new Date(parsed.createdAt) : undefined,
        verifiedAt: parsed.verifiedAt ? new Date(parsed.verifiedAt) : undefined,
      };
    } catch (error) {
      console.error('Error getting OTP from Redis:', error);
      return null;
    }
  }

  // Delete OTP data
  public async deleteOTP(email: string): Promise<boolean> {
    try {
      await this.client.del(`otp:${email}`);
      return true;
    } catch (error) {
      console.error('Error deleting OTP from Redis:', error);
      return false;
    }
  }

  // Check if Redis is connected
  public isReady(): boolean {
    return this.isConnected;
  }
}

// Create and export a singleton instance
export const redis = RedisClient.getInstance();

// Helper function to initialize Redis connection
export const initRedis = async (): Promise<void> => {
  try {
    await redis.connect();
    console.log('Redis connection established');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    // In production, you might want to handle this more gracefully
    process.exit(1);
  }
};

// Export types
export type { OTPData };
