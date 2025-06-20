import { z } from 'zod';

// Common schemas
const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters').optional();
const fcmTokenSchema = z.string().optional();
const deviceInfoSchema = z.string().default('web');

// Sign up schema
export const signUpSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    name: nameSchema,
    fcmToken: fcmTokenSchema,
    deviceInfo: deviceInfoSchema,
  }),
});

// Sign in schema
export const signInSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    fcmToken: fcmTokenSchema,
    deviceInfo: deviceInfoSchema,
  }),
});

// Verify OTP schema
export const verifyOTPSchema = z.object({
  body: z.object({
    email: emailSchema,
    otp: z.string().length(6, 'OTP must be 6 digits'),
    fcmToken: fcmTokenSchema,
  }),
});

// Resend OTP schema
export const resendOTPSchema = z.object({
  body: z.object({
    email: emailSchema,
    type: z.enum(['signup', 'login', 'password_reset']).default('signup'),
  }),
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

// Sign out schema
export const signOutSchema = z.object({
  body: z.object({
    fcmToken: fcmTokenSchema,
  }),
});

// Export types
export type SignUpInput = z.infer<typeof signUpSchema>['body'];
export type SignInInput = z.infer<typeof signInSchema>['body'];
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>['body'];
export type ResendOTPInput = z.infer<typeof resendOTPSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type SignOutInput = z.infer<typeof signOutSchema>['body'];
