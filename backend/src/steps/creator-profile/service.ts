/**
 * Service layer for Creator Profile operations
 * Handles DB reads/writes and business logic
 */
import type { CreatorProfile, ProfileValidationResult, SocialProfile } from './types'

const STATE_GROUP = 'creatorProfiles'

/**
 * Get a creator profile by creatorId
 */
export async function getProfile(
  creatorId: string,
  state: any
): Promise<CreatorProfile | null> {
  const profile = await state.get(STATE_GROUP, creatorId)
  if (!profile) {
    return null
  }
  // Ensure derived fields are calculated
  return enrichProfile(profile)
}

/**
 * Create or update a creator profile (upsert)
 */
export async function createOrUpdateProfile(
  creatorId: string,
  data: Partial<CreatorProfile>,
  state: any
): Promise<CreatorProfile> {
  const existing = await state.get(STATE_GROUP, creatorId)
  const now = new Date().toISOString()
  
  if (existing) {
    // Update existing profile
    const updated: CreatorProfile = {
      ...existing,
      ...data,
      creatorId, // Ensure creatorId is not overwritten
      updatedAt: now,
      // Merge socials arrays if provided
      socials: data.socials !== undefined 
        ? mergeSocials(existing.socials || [], data.socials)
        : (existing.socials || [])
    }
    const enriched = enrichProfile(updated)
    await state.set(STATE_GROUP, creatorId, enriched)
    return enriched
  } else {
    // Create new profile
    const newProfile: CreatorProfile = {
      creatorId,
      fullName: data.fullName || '',
      businessName: data.businessName,
      email: data.email || '',
      phone: data.phone || '',
      address: data.address,
      pan: data.pan || '',
      gstin: data.gstin,
      isGstRegistered: false, // Will be calculated by enrichProfile
      bankName: data.bankName || '',
      accountNumber: data.accountNumber || '',
      ifsc: data.ifsc || '',
      upiId: data.upiId,
      socials: data.socials || [],
      defaultPaymentTermsDays: data.defaultPaymentTermsDays || 15,
      lateFeePercent: data.lateFeePercent,
      createdAt: now,
      updatedAt: now
    }
    const enriched = enrichProfile(newProfile)
    await state.set(STATE_GROUP, creatorId, enriched)
    return enriched
  }
}

/**
 * Enrich profile with derived fields
 */
function enrichProfile(profile: Partial<CreatorProfile>): CreatorProfile {
  return {
    ...profile as CreatorProfile,
    isGstRegistered: !!(profile.gstin && profile.gstin.length > 0)
  }
}

/**
 * Merge social profiles, ensuring no duplicates by platform
 */
function mergeSocials(
  existing: SocialProfile[],
  newSocials: SocialProfile[]
): SocialProfile[] {
  const merged = [...existing]
  
  for (const newSocial of newSocials) {
    const existingIndex = merged.findIndex(s => s.platform === newSocial.platform)
    if (existingIndex >= 0) {
      // Update existing
      merged[existingIndex] = newSocial
    } else {
      // Add new
      merged.push(newSocial)
    }
  }
  
  return merged
}

/**
 * Validate that profile has required fields
 */
export function validateRequiredFields(
  profile: CreatorProfile | null,
  requiredFields?: string[]
): ProfileValidationResult {
  if (!profile) {
    return {
      status: 'incomplete',
      missingFields: requiredFields || getAllRequiredFields()
    }
  }
  
  if (!requiredFields || requiredFields.length === 0) {
    // Default required fields
    const defaults = getAllRequiredFields()
    return validateFields(profile, defaults)
  }
  
  return validateFields(profile, requiredFields)
}

/**
 * Get all required fields for a complete profile
 */
function getAllRequiredFields(): string[] {
  return [
    'fullName',
    'email',
    'phone',
    'pan',
    'bankName',
    'accountNumber',
    'ifsc'
  ]
}

/**
 * Validate specific fields exist and are non-empty
 */
function validateFields(
  profile: CreatorProfile,
  fields: string[]
): ProfileValidationResult {
  const missing: string[] = []
  
  for (const field of fields) {
    const value = (profile as any)[field]
    if (value === undefined || value === null || value === '') {
      missing.push(field)
    }
  }
  
  if (missing.length > 0) {
    return {
      status: 'incomplete',
      profile,
      missingFields: missing
    }
  }
  
  return {
    status: 'ok',
    profile
  }
}

