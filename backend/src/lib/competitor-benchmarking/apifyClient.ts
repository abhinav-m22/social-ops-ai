/**
 * Apify Client Helper for Competitor Benchmarking
 * Centralizes Apify actor execution logic
 */

import { ApifyClient } from 'apify-client'

let apifyClientInstance: ApifyClient | null = null

/**
 * Initialize and get Apify client instance
 */
export function getApifyClient(): ApifyClient {
  if (!apifyClientInstance) {
    const token = process.env.APIFY_API_TOKEN
    
    if (!token) {
      throw new Error('APIFY_API_TOKEN environment variable is not set')
    }

    apifyClientInstance = new ApifyClient({
      token
    })
  }

  return apifyClientInstance
}

/**
 * Execute an Apify actor and return the dataset items
 * @param actorId - The Apify actor ID (e.g., 'apify/instagram-profile-scraper')
 * @param input - The input configuration for the actor
 * @param logger - Optional logger for debugging
 * @returns Array of items from the actor's default dataset, or null on error
 */
export async function runApifyActor<T = any>(
  actorId: string,
  input: Record<string, any>,
  logger?: { info: Function; warn: Function; error: Function }
): Promise<T[] | null> {
  const client = getApifyClient()
  
  try {
    logger?.info('RunApifyActor: Starting actor execution', {
      actorId,
      inputKeys: Object.keys(input)
    })

    // Start the actor run
    const run = await client.actor(actorId).call(input)
    
    logger?.info('RunApifyActor: Actor run started', {
      actorId,
      runId: run.id,
      status: run.status
    })

    // Wait for the run to finish
    const finishedRun = await client.run(run.id).waitForFinish()
    
    if (finishedRun.status !== 'SUCCEEDED') {
      logger?.error('RunApifyActor: Actor run failed', {
        actorId,
        runId: run.id,
        status: finishedRun.status,
        statusMessage: finishedRun.statusMessage
      })
      return null
    }

    logger?.info('RunApifyActor: Actor run completed successfully', {
      actorId,
      runId: run.id,
      defaultDatasetId: finishedRun.defaultDatasetId
    })

    // Get the dataset items
    if (!finishedRun.defaultDatasetId) {
      logger?.warn('RunApifyActor: No default dataset ID found', {
        actorId,
        runId: run.id
      })
      return []
    }

    const datasetItems = await client.dataset(finishedRun.defaultDatasetId).listItems()
    
    logger?.info('RunApifyActor: Retrieved dataset items', {
      actorId,
      runId: run.id,
      itemCount: datasetItems.items.length,
      datasetId: finishedRun.defaultDatasetId,
      sampleItem: datasetItems.items.length > 0 ? {
        keys: Object.keys(datasetItems.items[0]),
        sample: JSON.stringify(datasetItems.items[0], null, 2)
      } : null
    })

    return datasetItems.items as T[]
  } catch (error) {
    logger?.error('RunApifyActor: Error executing actor', {
      actorId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return null
  }
}

/**
 * Check if Apify is configured (API token exists)
 */
export function isApifyConfigured(): boolean {
  return !!process.env.APIFY_API_TOKEN
}

