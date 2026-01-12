'use client'

import { useEffect } from 'react'

/**
 * This component filters out browser extension errors from the console
 * to reduce noise from third-party scripts (like contentOverview.js)
 */
export function ErrorFilter() {
  useEffect(() => {
    // Store original console.error
    const originalError = console.error

    // Override console.error to filter out extension errors
    console.error = (...args: any[]) => {
      const errorString = args.join(' ')
      
      // Filter out known browser extension errors
      if (
        errorString.includes('contentOverview.js') ||
        errorString.includes('contentForAllPages.js') ||
        errorString.includes('Request failed with status code 401') && errorString.includes('contentOverview')
      ) {
        // Silently ignore these extension errors
        return
      }
      
      // Log all other errors normally
      originalError.apply(console, args)
    }

    // Cleanup: restore original console.error on unmount
    return () => {
      console.error = originalError
    }
  }, [])

  return null
}
