import { AgodaCityIds } from './cities';
import { TripDataRequest } from './interface';

/**
 * Extracts city ID from destination name
 * @param destination The destination city name
 * @returns The city ID or 0 if not found
 */
function extractCityId(destination: string | undefined): number {
  if (!destination) return 0;
  
  const dest = destination.toLowerCase();
  
  // Try to find exact match
  if (AgodaCityIds.has(dest)) {
    return AgodaCityIds.get(dest)?.cityId || 0;
  }
  
  // Try to find partial match
  for (const [city, info] of AgodaCityIds.entries()) {
    if (dest.includes(city) || city.includes(dest)) {
      return info.cityId;
    }
  }
  
  return 0;
}

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
  
  // Get city ID
  const cityId = extractCityId(tripData.destination);
  
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
  if (cityId > 0) {
    params.append('city', cityId.toString());
  }
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
 * Builds an Agoda affiliate link for flights based on trip data
 * @param tripData The trip data from the user session
 * @returns A formatted Agoda deep link for flights with affiliate ID and trip parameters
 */
export function buildAgodaFlightLink(tripData: Partial<TripDataRequest>): string {
  // Affiliate ID
  const cid = '1937751';
  
  // Default values
  const defaultDepartureDate = new Date();
  defaultDepartureDate.setDate(defaultDepartureDate.getDate() + 30); // Default to 30 days from now
  
  const defaultReturnDate = new Date(defaultDepartureDate);
  const duration = parseInt(tripData.duration?.split(' ')[0] || '5', 10);
  defaultReturnDate.setDate(defaultDepartureDate.getDate() + duration); // Default to duration days stay
  
  // Format dates as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  // Calculate departure and return dates
  let departureDate = defaultDepartureDate;
  let returnDate = defaultReturnDate;
  
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
    
    // Set departure date to the 15th of the target month
    departureDate = new Date(currentYear, targetMonth - 1, 15);
    
    // If the date is in the past, use next year
    if (departureDate < new Date()) {
      departureDate = new Date(currentYear + 1, targetMonth - 1, 15);
    }
    
    // Set return date based on duration
    returnDate = new Date(departureDate);
    returnDate.setDate(departureDate.getDate() + duration);
  }
  
  // Get city IDs
  // const originCityId = extractCityId(tripData.departureCity);
  // const destinationCityId = extractCityId(tripData.destination);
  
  // Build the URL parameters
  const params = new URLSearchParams();
  params.append('cid', cid);
  
  // Add origin and destination
  // if (originCityId > 0) {
    // departureFrom=TLV
    // params.append('departureFrom', originCityId.toString());
  // }
  
  // if (destinationCityId > 0) {
    // arrivalTo=SYD
    // params.append('arrivalTo', destinationCityId.toString());
  // }
  
  // Add dates
  params.append('departDate', formatDate(departureDate));
  params.append('returnDate', formatDate(returnDate));
  
  // Add passengers
  // params.append('adults', (tripData.numberAdults || 1).toString());
  // if (tripData.numberKids && tripData.numberKids > 0) {
    // params.append('children', tripData.numberKids.toString());
  // }
  
  // Build the final URL
  return `https://www.agoda.com/flights/results?${params.toString()}`;
}
