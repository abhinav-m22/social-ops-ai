/**
 * Zod schemas for Creator Profile validation
 */
import { z } from 'zod'

export const socialPlatformSchema = z.enum([
  'instagram',
  'youtube',
  'twitter',
  'linkedin',
  'facebook',
  'whatsapp'
])

export const socialProfileSchema = z.object({
  platform: socialPlatformSchema,
  handle: z.string().min(1, 'Handle is required'),
  url: z.string().url().optional(),
  followers: z.number().int().min(0).optional()
})

// PAN validation: 10 characters, alphanumeric, format: ABCDE1234F
// Note: No transform - will be handled in handler to avoid JSON Schema issues
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i // case-insensitive
const panSchema = z.string()
  .length(10, 'PAN must be 10 characters')
  .regex(panRegex, 'Invalid PAN format (expected: ABCDE1234F)')

// GSTIN validation: 15 characters, alphanumeric
// Note: No transform - will be handled in handler
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i // case-insensitive
const gstinSchema = z.string()
  .length(15, 'GSTIN must be 15 characters')
  .regex(gstinRegex, 'Invalid GSTIN format')
  .optional()

// IFSC validation: 11 characters, format: ABCD0123456
// Note: No transform - will be handled in handler
const ifscRegex = /^[A-Z]{4}0[0-9]{6}$/i // case-insensitive
const ifscSchema = z.string()
  .length(11, 'IFSC must be 11 characters')
  .regex(ifscRegex, 'Invalid IFSC format (expected: ABCD0123456)')

// Account number: 9-18 digits
const accountNumberSchema = z.string()
  .regex(/^[0-9]{9,18}$/, 'Account number must be 9-18 digits')

// UPI ID validation: format user@bank or user@upi
const upiIdSchema = z.string()
  .regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/, 'Invalid UPI ID format')
  .optional()

export const createOrUpdateProfileSchema = z.object({
  creatorId: z.string().min(1, 'creatorId is required'),
  
  // Identity
  fullName: z.string().min(1, 'Full name is required').optional(),
  businessName: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').optional(),
  address: z.string().optional(),
  
  // Tax
  pan: panSchema.optional(),
  gstin: gstinSchema,
  
  // Payment
  bankName: z.string().min(1, 'Bank name is required').optional(),
  accountNumber: accountNumberSchema.optional(),
  ifsc: ifscSchema.optional(),
  upiId: upiIdSchema,
  
  // Social Profiles
  socials: z.array(socialProfileSchema)
    .refine(
      (socials) => {
        const platforms = socials.map(s => s.platform)
        return new Set(platforms).size === platforms.length
      },
      { message: 'Duplicate platforms are not allowed' }
    )
    .optional(),
  
  // Preferences
  defaultPaymentTermsDays: z.number().int().min(1).max(365).optional(),
  lateFeePercent: z.number().min(0).max(100).optional()
})

export const getProfileResponseSchema = z.object({
  exists: z.boolean(),
  profile: z.any().optional() // Full profile if exists
})

export const ensureProfileInputSchema = z.object({
  creatorId: z.string().min(1, 'creatorId is required'),
  requiredFields: z.array(z.string()).optional()
})

export const ensureProfileOutputSchema = z.object({
  status: z.enum(['ok', 'incomplete']),
  profile: z.any().optional(),
  missingFields: z.array(z.string()).optional()
})

