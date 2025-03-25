import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
config();

const MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;
const API_SECRET = process.env.GA_API_SECRET;

if (!MEASUREMENT_ID || !API_SECRET) {
  console.error('Error: GA_MEASUREMENT_ID or GA_API_SECRET is not set in .env file');
}

interface EventData {
  client_id: string;
  events: {
    name: string;
    params: Record<string, any>;
  }[];
}

export async function trackEvent(eventName: string, clientId: string, params: Record<string, any> = {}) {
  if (!MEASUREMENT_ID || !API_SECRET) {
    console.error('Google Analytics not configured');
    return;
  }

  try {
    const data: EventData = {
      client_id: clientId,
      events: [
        {
          name: eventName,
          params: {
            ...params,
            engagement_time_msec: 100, // Default engagement time
          }
        }
      ]
    };

    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Analytics API error: ${response.statusText}`);
    }

    console.log(`Tracked event: ${eventName} for client: ${clientId}`);
  } catch (error) {
    console.error('Error tracking event:', error);
  }
}

// Helper functions for common events
export async function trackQuestionAnswered(clientId: string, questionNumber: number, answer: string) {
  await trackEvent('question_answered', clientId, {
    question_number: questionNumber,
    answer: answer
  });
}

export async function trackAgodaClick(clientId: string, destination: string, linkType: 'hotel' | 'flight') {
  await trackEvent('agoda_click', clientId, {
    destination: destination,
    link_type: linkType
  });
}

export async function trackTripStarted(clientId: string) {
  await trackEvent('trip_started', clientId);
}

export async function trackTripCompleted(clientId: string, destination: string, duration: string) {
  await trackEvent('trip_completed', clientId, {
    destination: destination,
    duration: duration
  });
}

export async function trackTripCancelled(clientId: string) {
  await trackEvent('trip_cancelled', clientId);
}

/**
 * Track error events in Google Analytics
 * @param clientId - Telegram user ID or "system" for non-user errors
 * @param errorType - Category of error (e.g., "API", "UserInput")
 * @param errorMessage - Actual error message
 * @param errorLocation - Function or component where error occurred
 * @param errorDetails - Additional error details (optional)
 * @param isFatal - Whether error is critical (default: false)
 */
export async function trackError(
  clientId: string,
  errorType: string,
  errorMessage: string,
  errorLocation: string,
  errorDetails: Record<string, any> = {},
  isFatal: boolean = false
) {
  await trackEvent('error', clientId, {
    error_type: errorType,
    error_message: errorMessage?.substring(0, 500), // Limit message length
    error_location: errorLocation,
    ...errorDetails,
    fatal: isFatal
  });
} 