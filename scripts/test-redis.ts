import { redis } from '../src/utils/redis';
import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

async function testRedisConnection() {
  let client: RedisClient | null = null;
  
  try {
    console.log('Testing Redis connection...');
    
    // Test connection
    await redis.connect();
    console.log('✅ Successfully connected to Redis');
    
    // Get Redis client instance
    client = redis.getClient();
    
    if (!client) {
      throw new Error('Failed to get Redis client');
    }
    
    // Test set and get
    const testKey = 'test:key';
    const testValue = { message: 'Hello, Redis!', timestamp: Date.now() };
    
    console.log('\nTesting set and get operations...');
    await client.set(testKey, JSON.stringify(testValue));
    const result = await client.get(testKey);
    
    if (result) {
      const parsedResult = JSON.parse(result);
      console.log('✅ Successfully set and retrieved value from Redis');
      console.log('Stored value:', parsedResult);
    } else {
      console.error('❌ Failed to retrieve value from Redis');
    }
    
    // Test OTP operations
    console.log('\nTesting OTP operations...');
    const email = 'test@example.com';
    const otpData = {
      otp: '12345',
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes from now
      verified: false,
      purpose: 'signup' as const,
      createdAt: Date.now(),
    };
    
    // Set OTP
    const setResult = await redis.setOTP(email, otpData);
    console.log('Set OTP result:', setResult ? '✅ Success' : '❌ Failed');
    
    // Get OTP
    const retrievedOTP = await redis.getOTP(email);
    if (retrievedOTP) {
      console.log('✅ Successfully retrieved OTP from Redis');
      console.log('Retrieved OTP data:', retrievedOTP);
      
      // Verify OTP
      const isMatch = retrievedOTP.otp === '12345';
      console.log(`OTP verification: ${isMatch ? '✅ Match' : '❌ Mismatch'}`);
      
      // Clean up
      await redis.deleteOTP(email);
      console.log('✅ Cleaned up test OTP data');
      
      // Close the connection
      await client.quit();
    } else {
      console.error('❌ Failed to retrieve OTP from Redis');
    }
    
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    process.exit(1);
  } finally {
    // Close the connection if client exists and is open
    if (client) {
      try {
        // Check if client is still connected before trying to quit
        if (client.isOpen) {
          await client.quit();
          console.log('\n✅ Test completed. Redis connection closed.');
        } else {
          console.log('\n✅ Test completed. Redis connection already closed.');
        }
      } catch (error) {
        // Ignore errors when closing an already closed connection
        if (!(error instanceof Error && error.message.includes('Client is closed'))) {
          console.error('Error closing Redis connection:', error);
        } else {
          console.log('\n✅ Test completed. Redis connection was already closed.');
        }
      }
    } else {
      console.log('\n✅ Test completed (no Redis connection to close)');
    }
  }
}

// Run the test
testRedisConnection().catch(console.error);
