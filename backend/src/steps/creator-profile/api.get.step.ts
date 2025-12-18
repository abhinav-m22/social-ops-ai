/**
 * API endpoint: Get Creator Profile
 * GET /api/creator/profile?creatorId=xxx
 * 
 * Returns profile if exists, or { exists: false } if not found
 */
import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { getProfileResponseSchema } from './schemas'
import { getProfile } from './service'

export const config: ApiRouteConfig = {
  name: 'GetCreatorProfile',
  type: 'api',
  path: '/api/creator/profile',
  method: 'GET',
  description: 'Get creator profile by creatorId',
  emits: [],
  flows: ['creator-profile'],
  queryParams: [
    { name: 'creatorId', description: 'Creator ID to fetch profile for' }
  ],
  responseSchema: {
    200: getProfileResponseSchema,
    400: z.object({
      success: z.boolean(),
      error: z.string()
    }),
    500: z.object({
      success: z.boolean(),
      error: z.string()
    })
  }
}

export const handler: Handlers['GetCreatorProfile'] = async (
  req,
  { logger, state }
) => {
  const { creatorId } = req.queryParams || {}

  logger.info('GetCreatorProfile: received request', {
    creatorId: typeof creatorId === 'string' ? creatorId : creatorId?.[0]
  })

  try {
    // Validate creatorId
    const id = typeof creatorId === 'string' ? creatorId : creatorId?.[0]
    if (!id) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'creatorId query parameter is required'
        }
      }
    }

    // Fetch profile
    const profile = await getProfile(id, state)

    if (!profile) {
      logger.info('GetCreatorProfile: profile not found', { creatorId: id })
      return {
        status: 200,
        body: {
          exists: false
        }
      }
    }

    logger.info('GetCreatorProfile: profile found', {
      creatorId: id,
      hasPan: !!profile.pan,
      hasGstin: !!profile.gstin,
      isGstRegistered: profile.isGstRegistered
    })

    return {
      status: 200,
      body: {
        exists: true,
        profile
      }
    }
  } catch (error: any) {
    logger.error('GetCreatorProfile: error', {
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

