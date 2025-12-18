/**
 * API endpoint: Create or Update Creator Profile
 * POST /api/creator/profile
 * 
 * Idempotent upsert operation - creates if not exists, updates if exists
 */
import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { createOrUpdateProfileSchema, getProfileResponseSchema } from './schemas'
import { createOrUpdateProfile } from './service'
import type { CreatorProfile } from './types'

export const config: ApiRouteConfig = {
  name: 'CreateOrUpdateCreatorProfile',
  type: 'api',
  path: '/api/creator/profile',
  method: 'POST',
  description: 'Creates or updates a creator profile (upsert operation)',
  emits: [],
  flows: ['creator-profile'],
  bodySchema: createOrUpdateProfileSchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      profile: z.any() // CreatorProfile
    }),
    400: z.object({
      success: z.boolean(),
      error: z.string(),
      issues: z.array(z.any()).optional()
    }),
    500: z.object({
      success: z.boolean(),
      error: z.string()
    })
  }
}

export const handler: Handlers['CreateOrUpdateCreatorProfile'] = async (
  req,
  { logger, state }
) => {
  const { body } = req

  logger.info('CreateOrUpdateCreatorProfile: received request', {
    creatorId: body?.creatorId
  })

  try {
    // Validate request body
    const parsed = createOrUpdateProfileSchema.safeParse(body)
    if (!parsed.success) {
      logger.warn('CreateOrUpdateCreatorProfile: validation failed', {
        issues: parsed.error.issues
      })
      return {
        status: 400,
        body: {
          success: false,
          error: 'Invalid request data',
          issues: parsed.error.issues
        }
      }
    }

    const { creatorId, ...profileData } = parsed.data

    if (!creatorId) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'creatorId is required'
        }
      }
    }

    // Normalize fields (uppercase for PAN, GSTIN, IFSC)
    const normalizedData = {
      ...profileData,
      pan: profileData.pan ? profileData.pan.toUpperCase() : undefined,
      gstin: profileData.gstin ? profileData.gstin.toUpperCase() : undefined,
      ifsc: profileData.ifsc ? profileData.ifsc.toUpperCase() : undefined,
    }

    // Upsert profile
    const profile = await createOrUpdateProfile(
      creatorId,
      normalizedData as Partial<CreatorProfile>,
      state
    )

    logger.info('CreateOrUpdateCreatorProfile: profile saved', {
      creatorId,
      hasPan: !!profile.pan,
      hasGstin: !!profile.gstin,
      isGstRegistered: profile.isGstRegistered,
      socialsCount: profile.socials.length
    })

    return {
      status: 200,
      body: {
        success: true,
        profile
      }
    }
  } catch (error: any) {
    logger.error('CreateOrUpdateCreatorProfile: error', {
      error: error.message,
      stack: error.stack
    })

    return {
      status: 500,
      body: {
        success: false,
        error: 'Internal server error'
      }
    }
  }
}

