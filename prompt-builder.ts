import { TripDataRequest } from "./interface";


export const UNKNOWN = 'unknown';

const highlightsSection = `
    An array of string that includes a quick overview of geographical location, official language, key attractions, landmarks or activities.
`;

const highlightsStructure = '["...", "Official language:...", "Key attractions include ...", "Enjoy/Experience ..."]';

const timingSection = `
    An array of string that includes:
    A) Best Time to Visit: Recommend the best months to visit based on ideal weather, crowd levels, and unique experiences.
    B) If I added Preferred Month/Season, provide details about the expected weather during that month, Any special events or festivals happenings at that month.
    C) Any pros/cons of visiting during that month (e.g., peak tourist season, lower prices).
`;

const timingStructure = '["Best Time to Visit:...", "Weather During Your Visit:...", "Special Events:...", "Pros/Cons:..."]';

const gettingAroundSection = `
    Explain in 2-3 short sentences about the public transportation and other popular forms of traveling.
    Mention ride-sharing apps, bike rentals, or walking friendliness if relevant.
    Highlight any city-specific travel quirks (e.g., “Taxis are expensive; use the metro instead”).
`;

const budgetStructure = `{
    flights: "Estimated cost for round-trip flights...",
    transportation: "Estimated cost for...",
    accommodation: "Estimated cost for... stars...",
    activities: "Estimated cost for...",
    food: "Estimated cost for...",
    total: "Approximately...",
}`;

const sampleItinerarySection = `
    - Daily breakdown (array of strings), where each string represents activities or places to visit for a single day.
    - Requirements: align with Interests, Duration of the trip, weather, and special events happening during the trip.
    - Prioritize unique and engaging experiences rather than just filling up days with less interesting activities.
    - If needed, suggest nearby destinations for variety and adventure. max 2-hour drive between locations.
    - Add information about driving time between locations.
`;

const locationsListSection = `
    - Based on the Sample Itinerary, create a list of specific locations that can be found on Google Maps, using their official names.
`;


export const createPrompt = (body: TripDataRequest) => {

    return `Plan a trip.
    Departure city: ${body.departureCity}.
    Destination: ${body.destination}.
    Duration: ${body.duration || UNKNOWN}.
    Departure Date: ${body.departureDate || UNKNOWN}.
    Return Date: ${body.returnDate || UNKNOWN}.
    Preferred Month/Season: ${body.timeOfYear || UNKNOWN}.
    Interest: ${body.vacationStyle?.join(', ') || 'General'}.
    Number of Adults: ${body.numberAdults || 1}.
    Number of Children (under 12 years old): ${body.numberKids || 0}.
    Hotel Rating: ${body.luxuryLevel || UNKNOWN} stars
    
    Response format and rules:

   1) Highlights: ${highlightsSection}

   2) Timing: ${timingSection}
       
   3) Getting Around:
        ${gettingAroundSection}

   4) Sample Itinerary:
      ${sampleItinerarySection}

    5) Locations List (array of strings):
        ${locationsListSection}

   6) Budget Breakdown:
       A) General Considerations:
            Account for the Number of Adults and Number of Children in all cost estimations.
       B) Components of the Budget:
            Flights: Provide an estimated cost for round-trip economy flights (most updated rates, excluding low-cost airlines).
            Accommodation: Estimate the cost for ${body.luxuryLevel} stars hotel. If the Hotel Rating is ${UNKNOWN}, provide a cost range.
            Other Expenses: Include estimated costs for transportation, activities, and food.
       C) Currency: ${body.currency}.
   
   
   Output format JSON:
   {
     destination: "...",
     title: "{duration} Days in {destination}",
     highlights: ${highlightsStructure},
     timing: ${timingStructure},
     getting_around: "...",
     sample_itinerary: ["Day 1: ...", "Day 2: ...", "Day 3: ...",... ],
     locations: ["...", "...", ...],
     budget: ${budgetStructure},
   }`;
}

export const createPromptForItinerary = (body: TripDataRequest) => {
    //Mandatory fields: destination, duration.

    return `Plan a ${body.duration} trip to ${body.destination}.
    Interest: ${body.vacationStyle?.join(', ') || 'General'}.
          
    Response format and rules:

  1) Sample Itinerary:
      ${sampleItinerarySection}
       
   2) Locations List (array of strings):
       ${locationsListSection}
   
   Output format JSON:
   {
     destination: "...",
     title: "{duration} Days in {destination}",
     sample_itinerary: ["Day 1: ...", "Day 2: ...", "Day 3: ...",... ],
     locations: ["...", "...", ...],
   }`;
}