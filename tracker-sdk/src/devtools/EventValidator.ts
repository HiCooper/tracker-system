import type { EventDTO } from '../types/EventTypes';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const REQUIRED_FIELDS = ['eventId', 'eventType', 'timestamp'] as const;
const RECOMMENDED_FIELDS = ['userId', 'anonymousId', 'session'] as const;

export function validateEvent(event: EventDTO): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!event.eventId) errors.push('Missing required field: eventId');
  if (!event.eventType) errors.push('Missing required field: eventType');
  if (!event.timestamp || event.timestamp <= 0) errors.push('Missing or invalid: timestamp');

  // Check recommended fields
  if (!event.userId && !event.anonymousId) {
    warnings.push('Both userId and anonymousId are missing — event will be anonymous-only');
  }
  if (!event.session?.sessionId) {
    warnings.push('Missing session.sessionId — session tracking may be incomplete');
  }
  if (!event.page?.url) {
    warnings.push('Missing page.url — page context unavailable');
  }

  // Check event-specific data
  switch (event.eventType) {
    case 'click':
      if (!event.data?.elementId && !event.data?.elementType) {
        warnings.push('Click event missing element info');
      }
      break;
    case 'exposure':
      if (!event.data?.elementId) {
        warnings.push('Exposure event missing elementId');
      }
      break;
    case 'error':
      if (!event.data?.errorMessage) {
        warnings.push('Error event missing errorMessage');
      }
      break;
  }

  // Timestamp sanity check
  if (event.timestamp && event.timestamp > Date.now() + 60000) {
    warnings.push('Timestamp is in the future (clock skew?)');
  }
  if (event.timestamp && event.timestamp < Date.now() - 3600000) {
    warnings.push('Timestamp is over 1 hour old');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a batch of events and return summary counts.
 */
export function validateBatch(events: EventDTO[]): {
  total: number;
  valid: number;
  withErrors: number;
  withWarnings: number;
} {
  let valid = 0;
  let withErrors = 0;
  let withWarnings = 0;

  for (const event of events) {
    const result = validateEvent(event);
    if (result.valid) valid++;
    if (result.errors.length > 0) withErrors++;
    if (result.warnings.length > 0) withWarnings++;
  }

  return {
    total: events.length,
    valid,
    withErrors,
    withWarnings,
  };
}
