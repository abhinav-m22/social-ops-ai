/**
 * TypeScript types for Creator Profile module
 */

export type SocialPlatform = 'instagram' | 'youtube' | 'twitter' | 'linkedin' | 'facebook' | 'whatsapp'

export interface SocialProfile {
  platform: SocialPlatform
  handle: string
  url?: string
  followers?: number
}

export interface CreatorProfile {
  creatorId: string
  
  // Identity
  fullName: string
  businessName?: string
  email: string
  phone: string
  address?: string
  
  // Tax
  pan: string
  gstin?: string
  isGstRegistered: boolean // derived field
  
  // Payment
  bankName: string
  accountNumber: string
  ifsc: string
  upiId?: string
  
  // Social Profiles
  socials: SocialProfile[]
  
  // Preferences
  defaultPaymentTermsDays: number
  lateFeePercent?: number
  
  // Timestamps
  createdAt: string
  updatedAt: string
}

export interface ProfileValidationResult {
  status: 'ok' | 'incomplete'
  profile?: CreatorProfile
  missingFields?: string[]
}


