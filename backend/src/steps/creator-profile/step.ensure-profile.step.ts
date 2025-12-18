/**
 * Motia Event Step: Ensure Creator Profile
 * 
 * Used by deal, invoice, email, negotiation flows to ensure
 * required profile fields exist before continuing.
 * 
 * Topic: creator.profile.ensure
 */
import type { EventConfig, Handlers } from 'motia'
import { ensureProfileInputSchema } from './schemas'
import { getProfile, validateRequiredFields } from './service'

export const config: EventConfig = {
  name: 'EnsureCreatorProfile',
  type: 'event',
  subscribes: ['creator.profile.ensure'],
  emits: [],
  description: 'Ensures creator profile exists and has required fields',
  flows: ['creator-profile'],
  input: ensureProfileInputSchema
}

export const handler: Handlers['EnsureCreatorProfile'] = async (
  input,
  { logger, state }
) => {
  const { creatorId, requiredFields } = input

  logger.info('EnsureCreatorProfile: processing', {
    creatorId,
    requiredFields: requiredFields?.length || 0
  })

  try {
    if (!creatorId) {
      logger.error('EnsureCreatorProfile: creatorId missing')
      return {
        status: 'incomplete',
        missingFields: ['creatorId']
      }
    }

    // Fetch profile
    const profile = await getProfile(creatorId, state)

    // Validate required fields
    const validation = validateRequiredFields(profile, requiredFields)

    if (validation.status === 'incomplete') {
      logger.warn('EnsureCreatorProfile: profile incomplete', {
        creatorId,
        missingFields: validation.missingFields
      })
    } else {
      logger.info('EnsureCreatorProfile: profile complete', {
        creatorId
      })
    }

    return validation
  } catch (error: any) {
    logger.error('EnsureCreatorProfile: error', {
      creatorId,
      error: error.message,
      stack: error.stack
    })

    // Don't throw - return incomplete status
    return {
      status: 'incomplete',
      missingFields: ['profile_load_error']
    }
  }
}

