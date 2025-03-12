import { TripDataRequest } from './interface';

// Agoda city ID mapping (common destinations)
export const agodaCityIds: Record<string, number> = {
  'bangkok': 9395,
  'london': 4548,
  'paris': 1633,
  'new york': 10451,
  'tokyo': 4155,
  'singapore': 4064,
  'dubai': 4376,
  'rome': 1722,
  'bali': 17193,
  'phuket': 8064,
  'barcelona': 1718,
  'hong kong': 1710,
  'istanbul': 3962,
  'kuala lumpur': 4078,
  'seoul': 4168,
  'amsterdam': 1704,
  'miami': 10402,
  'los angeles': 10401,
  'berlin': 1712,
  'sydney': 14370,
  'madrid': 1725,
  'venice': 1747,
  'las vegas': 10389,
  'vienna': 1726,
  'prague': 1713,
  'milan': 1730,
  'budapest': 1705,
  'lisbon': 1724,
  'florence': 1719,
  'san francisco': 10409
};

/**
 * Builds an Agoda affiliate link based on trip data
 * @param tripData The trip data from the user session
 * @returns A formatted Agoda deep link with affiliate ID and trip parameters
 */
export function buildAgodaAffiliateLink(tripData: Partial<TripDataRequest>): string {
  // Affiliate ID
  const cid = '1937751';
  
  // Default values
  const defaultCheckIn = new Date();
  defaultCheckIn.setDate(defaultCheckIn.getDate() + 30); // Default to 30 days from now
  
  const defaultCheckOut = new Date(defaultCheckIn);
  defaultCheckOut.setDate(defaultCheckOut.getDate() + 5); // Default to 5 days stay
  
  // Format dates as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  // Parse destination to find city ID
  let cityId = 0;
  const destination = tripData.destination?.toLowerCase() || '';
  
  // Try to find exact match
  if (agodaCityIds[destination]) {
    cityId = agodaCityIds[destination];
  } else {
    // Try to find partial match
    for (const [city, id] of Object.entries(agodaCityIds)) {
      if (destination.includes(city) || city.includes(destination)) {
        cityId = id;
        break;
      }
    }
  }
  
  // If no city ID found, default to Bangkok (popular destination)
  if (cityId === 0) {
    cityId = 9395; // Bangkok
  }
  
  // Calculate check-in and check-out dates
  let checkIn = defaultCheckIn;
  let checkOut = defaultCheckOut;
  
  // If we have time of year info, try to set appropriate dates
  if (tripData.timeOfYear) {
    const timeOfYear = tripData.timeOfYear.toLowerCase();
    const currentYear = new Date().getFullYear();
    let targetMonth = 6; // Default to June
    
    // Map seasons/months to numeric months
    if (timeOfYear.includes('winter') || timeOfYear.includes('december') || timeOfYear.includes('january') || timeOfYear.includes('february')) {
      targetMonth = 1; // January
    } else if (timeOfYear.includes('spring') || timeOfYear.includes('march') || timeOfYear.includes('april') || timeOfYear.includes('may')) {
      targetMonth = 4; // April
    } else if (timeOfYear.includes('summer') || timeOfYear.includes('june') || timeOfYear.includes('july') || timeOfYear.includes('august')) {
      targetMonth = 7; // July
    } else if (timeOfYear.includes('fall') || timeOfYear.includes('autumn') || timeOfYear.includes('september') || timeOfYear.includes('october') || timeOfYear.includes('november')) {
      targetMonth = 10; // October
    } else {
      // Try to extract month names
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      for (let i = 0; i < months.length; i++) {
        if (timeOfYear.includes(months[i])) {
          targetMonth = i + 1;
          break;
        }
      }
    }
    
    // Set check-in date to the 15th of the target month
    checkIn = new Date(currentYear, targetMonth - 1, 15);
    
    // If the date is in the past, use next year
    if (checkIn < new Date()) {
      checkIn = new Date(currentYear + 1, targetMonth - 1, 15);
    }
    
    // Set check-out date based on duration
    checkOut = new Date(checkIn);
    const duration = parseInt(tripData.duration?.split(' ')[0] || '5', 10);
    checkOut.setDate(checkIn.getDate() + duration);
  }
  
  // Build the URL parameters
  const params = new URLSearchParams();
  params.append('pcs', '1');
  params.append('cid', cid);
  params.append('hl', 'en-us');
  params.append('city', cityId.toString());
  params.append('checkIn', formatDate(checkIn));
  params.append('checkOut', formatDate(checkOut));
  params.append('adults', (tripData.numberAdults || 2).toString());
  
  // Add children if any
  if (tripData.numberKids && tripData.numberKids > 0) {
    params.append('children', tripData.numberKids.toString());
  }
  
  // Add hotel star rating if specified
  if (tripData.luxuryLevel && tripData.luxuryLevel > 0) {
    params.append('hotelStarRating', tripData.luxuryLevel.toString());
  }
  
  // Build the final URL
  return `https://www.agoda.com/partners/partnersearch.aspx?${params.toString()}`;
}

/**
 * Generates the Agoda affiliate section for the itinerary message
 * @param tripData The trip data from the user session
 * @param destination The formatted destination name
 * @returns A formatted message section with Agoda affiliate link
 */
export function generateAgodaSection(tripData: Partial<TripDataRequest>, destination: string): string {
  const agodaLink = buildAgodaAffiliateLink(tripData);
  
  let message = `\n🛌 *BOOK YOUR STAY:*\n`;
  message += `We've partnered with [Agoda.com](${agodaLink}) to offer you the best deals on hotels, flights, and transfers for your trip to ${destination}.\n\n`;
  message += `[🏝 Book on Agoda](${agodaLink})\n`;
  
  return message;
} 