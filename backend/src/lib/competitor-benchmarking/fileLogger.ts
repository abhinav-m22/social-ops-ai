/**
 * File Logger for Competitor Benchmarking
 * Logs detailed information to files for debugging
 */

import { promises as fs } from 'fs'
import path from 'path'

const LOG_DIR = path.join(process.cwd(), 'logs', 'competitor-benchmarking')

/**
 * Ensure log directory exists
 */
async function ensureLogDir(): Promise<void> {
  try {
    await fs.access(LOG_DIR)
  } catch {
    await fs.mkdir(LOG_DIR, { recursive: true })
  }
}

/**
 * Write log entry to file
 */
export async function writeLogToFile(
  filename: string,
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: any
): Promise<void> {
  try {
    await ensureLogDir()

    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined
    }

    const logFile = path.join(LOG_DIR, `${filename}.log`)
    const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}\n${data ? JSON.stringify(data, null, 2) + '\n' : ''}---\n`

    await fs.appendFile(logFile, logLine, 'utf8')
  } catch (error) {
    console.error('Failed to write log to file:', error)
  }
}

/**
 * Enhanced logger that writes to both console and file
 */
export function createFileLogger(filename: string, consoleLogger: any) {
  return {
    info: (message: string, data?: any) => {
      consoleLogger.info(message, data)
      writeLogToFile(filename, 'info', message, data)
    },
    warn: (message: string, data?: any) => {
      consoleLogger.warn(message, data)
      writeLogToFile(filename, 'warn', message, data)
    },
    error: (message: string, data?: any) => {
      consoleLogger.error(message, data)
      writeLogToFile(filename, 'error', message, data)
    },
    debug: (message: string, data?: any) => {
      consoleLogger.debug?.(message, data)
      writeLogToFile(filename, 'debug', message, data)
    }
  }
}

