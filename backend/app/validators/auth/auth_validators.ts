import { z } from 'zod'

// ========================================
// REGISTER
// ========================================
export const registerSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(2).max(50).trim(),
})
export type RegisterDto = z.infer<typeof registerSchema>

// ========================================
// LOGIN
// ========================================
export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
})
export type LoginDto = z.infer<typeof loginSchema>

// ========================================
// FORGOT PASSWORD
// ========================================
export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
})
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>

// ========================================
// RESET PASSWORD
// ========================================
export const resetPasswordSchema = z.object({
  token: z.string().length(64),
  password: z.string().min(8).max(100),
})
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>

// ========================================
// VERIFY EMAIL
// ========================================
export const verifyEmailSchema = z.object({
  token: z.string().length(64),
})
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>

// ========================================
// CHANGE PASSWORD
// ========================================
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
})
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>

// ========================================
// SET PASSWORD
// ========================================
export const setPasswordSchema = z.object({
  password: z.string().min(8).max(100),
})
export type SetPasswordDto = z.infer<typeof setPasswordSchema>
