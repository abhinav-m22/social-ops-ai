export type SocialPlatform = 'instagram' | 'youtube' | 'twitter' | 'linkedin' | 'facebook' | 'whatsapp'

export interface SocialProfile {
  platform: SocialPlatform
  handle: string
  url?: string
  followers?: number
}

export interface CreatorProfile {
  creatorId: string
  fullName: string
  businessName?: string
  email: string
  phone: string
  address?: string
  pan: string
  gstin?: string
  isGstRegistered: boolean
  bankName: string
  accountNumber: string
  ifsc: string
  upiId?: string
  socials: SocialProfile[]
  defaultPaymentTermsDays: number
  lateFeePercent?: number
  createdAt: string
  updatedAt: string
}

export interface CreateOrUpdateProfileRequest {
  creatorId: string
  fullName?: string
  businessName?: string
  email?: string
  phone?: string
  address?: string
  pan?: string
  gstin?: string
  bankName?: string
  accountNumber?: string
  ifsc?: string
  upiId?: string
  socials?: SocialProfile[]
  defaultPaymentTermsDays?: number
  lateFeePercent?: number
}

