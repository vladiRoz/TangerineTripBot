import {TripDataRequest} from './interface';

export const UNKNOWN = 'Unknown';

export const createPrompt = (body: TripDataRequest) => {
    return `Plan a trip.
    Departure city: ${body.departureCity}.
    Destination: ${body.destination}.
    Duration: ${body.duration || UNKNOWN}.
    Departure Date: ${body.departureDate || UNKNOWN}.
    Return Date: ${body.returnDate || UNKNOWN}.
    During: ${body.timeOfYear || UNKNOWN}.
    Interest: ${body.vacationStyle?.join(', ') || UNKNOWN}.
    Number of Adults: ${body.numberAdults || 1}.
    Number of Children (under 12 years old): ${body.numberKids || 0}.
    Hotel Rating: ${body.luxuryLevel || UNKNOWN} stars
    Budget: ${body.budget || UNKNOWN} ${body.currency}.
    More info: Local-Travel is ${body.localTravel}. Suggest-Destination is ${body.suggestDestination}.
        
    Answer with the following format and rules:
   1) Destination:      
      A) Known Destination:
        If the user has provided a specific destination, use that destination for the planning.
      B) Unknown Destination + Suggest-Destination is True:
        If no destination is provided (Destination = ${UNKNOWN}) and the user wants a destination suggestion (Suggest-Destination = true), do the following:
        If Local-Travel is false, recommend a destination based on the user's other details and interests.
        If Local-Travel is true, plan the itinerary in and around the user's departure city.

   2) Highlights: An array of string that includes a quick overview of geographical location, official language, key attractions, landmarks or activities.

   3) Timing:
       A) Recommend the best time to visit the destination and explain why (e.g., ideal weather, fewer crowds, special events).
       B) If I requested during a specific season, then tell me what month/s are correlated.
       C) If Departure Date or Time of Year is given, provide details about the expected weather during that period, Any special events, festivals, or notable happenings at the destination during the visit.
       
   4) Getting Around:
        Explain in 2-3 short sentences about the public transportation and other popular forms of traveling.

   5) Sample Itinerary:
       - Format: Provide a daily breakdown as an array of strings, where each string represents activities or places to visit for a single day.
       - Requirements: The suggestions should align with my Interests, the Duration of the trip, the weather, and any Special Events happening during the trip.
       - If the duration value is not provided (Duration = ${UNKNOWN}), then suggest the optimal duration, and set Duration to this value.
       
   6) Locations List:
       - Based on the Sample Itinerary, create a list of specific locations that can be found on Google Maps, formatted as an array of strings.

   7) Budget Breakdown:
       A) General Considerations:
            Account for the Number of Adults and Number of Children in all cost estimations.
       B) Components of the Budget:
            Flights: Provide an estimated cost for round-trip economy flights (most updated rates, excluding low-cost airlines).
            Accommodation: Estimate the cost for ${body.luxuryLevel} stars hotel. If the Hotel Rating is ${UNKNOWN}, provide a cost range.
            Other Expenses: Include estimated costs for transportation, activities, and food.
       C) Currency: ${body.currency}.
       D) Insufficient Budget:
            If the given budget is not enough to cover the trip, provide the minimum budget required and set "not_enough_budget": true.
   
   
   Reply with JSON file in the following format:
   {
     destination: "...",
     title: "{duration} Days in {destination}",
     highlights: ["...", "...", ...],
     timing: "The best time to visit...",
     getting_around: "...",
     sample_itinerary: ["Day 1: ...", "Day 2: ...", "Day 3: ...",... ],
     locations: ["...", "...", ...],
     budget: {
         flights: "Estimated cost for round-trip flights...",
         transportation: "Estimated cost for...",
         accommodation: "Estimated cost for... stars...",
         activities: "Estimated cost for...",
         food: "Estimated cost for...",
         total: "Approximately...",
        not_enough_budget: true/false
        },
   }`;
}
