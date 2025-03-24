import { config } from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { createPrompt, UNKNOWN } from './prompt-builder';
import { TripDataRequest } from './interface';
import fetch from 'node-fetch';
import { buildAgodaAffiliateLink, buildAgodaFlightLink } from './agoda-affiliate';
import { log } from 'console';

// Load environment variables
config();

// Check if running in production (PM2) or development
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Running in ${isProduction ? 'production' : 'development'} mode`);

// Telegram Bot Token
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
if (!TELEGRAM_TOKEN) {
  console.error('Error: TELEGRAM_TOKEN is not set in .env file');
  process.exit(1);
}

// OpenAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in .env file');
  process.exit(1);
}

// Create a bot instance
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Remove any existing keyboards when the bot starts
console.log('🍊 TangerineBot is starting...');
console.log('Removing any existing keyboards for active chats...');

// Error handling for the bot
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

bot.on('error', (error) => {
  console.error('Bot error:', error);
});

// Setup process handlers for graceful shutdown
process.on('SIGINT', () => {
  console.log('SIGINT received. Stopping bot...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Stopping bot...');
  bot.stopPolling();
  process.exit(0);
});

// User session data
interface UserSession {
  step: number;
  tripData: Partial<TripDataRequest>;
  messageIds: number[];
}

const userSessions = new Map<number, UserSession>();

// Welcome message
const welcomeMessage = `
🍊 *Welcome to TangerineBot - Your AI Travel Assistant!* 🍊

I'll help you plan your perfect trip based on your preferences. Let's get started!

Please provide the following information:
`;

// Function to call OpenAI API
async function callOpenAI(prompt: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${JSON.stringify(data)}`);
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

// Function to parse the JSON response
function parseResponse(response: string): any {
  try {
    // Extract JSON from the response (in case there's additional text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in the response, using fallback structure');
      return {
        destination: "'",
        duration: "",
        travelDates: "",
        vacationStyle: "",
        departureCity: "",
        currency: "",
        numberAdults: 0,
        numberKids: 0,
        luxuryLevel: 0,
        summary: "Unable to generate a detailed itinerary. Please try again.",
        dailyPlan: ["No daily plan available"],
        locations: ["No specific locations available"]
      };
    }
    
    // Parse the JSON
    const parsedData = JSON.parse(jsonMatch[0]);
    console.log('Parsed data:', JSON.stringify(parsedData, null, 2));
    
    // Return the parsed data directly without modifying its structure
    return parsedData;
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    console.error('Raw response:', response);
    // Return a fallback structure instead of throwing
    return {
      destination: "Unknown destination",
      duration: "Unknown duration",
      travelDates: "Unknown dates",
      vacationStyle: "General tourism",
      departureCity: "Unknown departure",
      currency: "USD",
      numberAdults: 1,
      numberKids: 0,
      luxuryLevel: 3,
      summary: "Error generating itinerary. Please try again.",
      dailyPlan: ["No daily plan available"],
      locations: ["No specific locations available"]
    };
  }
}

// Function to create a Google Maps URL for a location
function createGoogleMapsUrl(location: string): string {
  const encodedLocation = encodeURIComponent(location);
  return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
}

function generateAgodaSection(agodaLink: string, destination: string): string {
  let message = `\n🛌 *BOOK YOUR STAY:*\n`;
  message += `We've partnered with [Agoda.com](${agodaLink}) to offer you the best deals on hotels, flights, and transfers for your trip to ${destination}.\n\n`;
  message += `[🏝 Book on Agoda](${agodaLink})\n`;
  
  return message;
} 


// Function to format the itinerary for Telegram
function formatItinerary(itinerary: any, agodaLink: string, flightLink: string): string {
  let message = `🌍 *${itinerary.title}*\n\n`;
  
  message += `✨ *HIGHLIGHTS:*\n`;
  itinerary.highlights.forEach((highlight: string, index: number) => {
    message += `${index + 1}. ${highlight}\n`;
  });
  
  message += `\n🗓️ *BEST TIME TO VISIT:*\n`;
  message += `${itinerary.timing}\n`;
  
  message += `\n🚌 *GETTING AROUND:*\n`;
  message += `${itinerary.getting_around}\n`;
  
  message += `\n📅 *ITINERARY:*\n`;
  itinerary.sample_itinerary.forEach((day: string) => {
    // Check if the day contains a colon to separate day number from description
    if (day.includes(':')) {
      const parts = day.split(':');
      const dayNumber = parts[0].trim();
      const dayText = parts.slice(1).join(':').trim();
      message += `*${dayNumber}*: ${dayText}\n`;
    } else {
      // If no colon, just add the day as is
      message += `${day}\n`;
    }
  });
  
  message += `\n📍 *LOCATIONS:*\n`;
  itinerary.locations.forEach((location: string, index: number) => {
    const locationUrl = createGoogleMapsUrl(location);
    message += `${index + 1}. [${location}](${locationUrl})\n`;
  });
  
  message += `\n💰 *BUDGET:*\n`;
  const budget = itinerary.budget;
  
  message += `✈️ *Flights*: ${budget.flights}\n`;
  message += `🔗 [Book flights](${flightLink})\n`;
  message += `🚕 *Transportation*: ${budget.transportation}\n`;
  message += `🏨 *Accommodation*: ${budget.accommodation}\n`;
  message += `🔗 [Book hotels](${agodaLink})\n`;
  message += `🎭 *Activities*: ${budget.activities}\n`;
  message += `🍽️ *Food*: ${budget.food}\n`;
  message += `💵 *Total*: ${budget.total}\n`;
  
  if (budget.not_enough_budget) {
    message += `\n⚠️ *NOTE:* The provided budget is not sufficient for this trip.\n`;
  }
  
  return message;
}

// Function to start a new session
function startNewSession(chatId: number): void {
  // Remove any existing keyboard first
  bot.sendMessage(chatId, 'Starting new trip planning...', {
    reply_markup: {
      remove_keyboard: true
    }
  }).then(() => {
    userSessions.set(chatId, {
      step: 1,
      tripData: {
        currency: 'USD',
        numberAdults: 1,
        numberKids: 0,
        localTravel: false,
        suggestDestination: false
      },
      messageIds: []
    });
    
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' })
      .then(() => askDestination(chatId));
  });
}

// Function to ask for destination
function askDestination(chatId: number): void {
  bot.sendMessage(chatId, '1️⃣ What is your *destination*?', { parse_mode: 'Markdown' })
    .then(message => {
      const session = userSessions.get(chatId);
      if (session) {
        session.messageIds.push(message.message_id);
      }
    });
}

// Function to ask for trip duration
function askDuration(chatId: number): void {
  // Create inline keyboard with buttons 1-14
  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '1', callback_data: 'duration_1' },
        { text: '2', callback_data: 'duration_2' },
        { text: '3', callback_data: 'duration_3' },
        { text: '4', callback_data: 'duration_4' },
        { text: '5', callback_data: 'duration_5' }
      ],
      [
        { text: '6', callback_data: 'duration_6' },
        { text: '7', callback_data: 'duration_7' },
        { text: '8', callback_data: 'duration_8' },
        { text: '9', callback_data: 'duration_9' },
        { text: '10', callback_data: 'duration_10' }
      ],
      [
        { text: '11', callback_data: 'duration_11' },
        { text: '12', callback_data: 'duration_12' },
        { text: '13', callback_data: 'duration_13' },
        { text: '14', callback_data: 'duration_14' }
      ]
    ]
  };

  bot.sendMessage(chatId, '2️⃣ How many days will your trip be?', { 
    parse_mode: 'Markdown',
    reply_markup: inlineKeyboard
  })
  .then(message => {
    const session = userSessions.get(chatId);
    if (session) {
      session.messageIds.push(message.message_id);
    }
  });
}

// Function to ask for travel dates/season
function askTimeOfYear(chatId: number): void {
  console.log(`askTimeOfYear called for chat ID ${chatId}`);
  
  // Create inline keyboard with months and emojis
  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: 'January', callback_data: 'month_January' },
        { text: 'February', callback_data: 'month_February' },
        { text: 'March', callback_data: 'month_March' },
        { text: 'April', callback_data: 'month_April' }
      ],
      [
        { text: 'May', callback_data: 'month_May' },
        { text: 'June', callback_data: 'month_June' },
        { text: 'July', callback_data: 'month_July' },
        { text: 'August', callback_data: 'month_August' }
      ],
      [
        { text: 'September', callback_data: 'month_September' },
        { text: 'October', callback_data: 'month_October' },
        { text: 'November', callback_data: 'month_November' },
        { text: 'December', callback_data: 'month_December' }
      ],
      [
        { text: '❄️ Winter', callback_data: 'season_Winter' },
        { text: '🌱 Spring', callback_data: 'season_Spring' },
        { text: '☀️ Summer', callback_data: 'season_Summer' },
        { text: '🍂 Fall', callback_data: 'season_Fall' }
      ]
    ]
  };

  bot.sendMessage(chatId, '3️⃣ What is your preferred *season / month*?', { 
    parse_mode: 'Markdown',
    reply_markup: inlineKeyboard
  })
  .then(message => {
    const session = userSessions.get(chatId);
    if (session) {
      session.messageIds.push(message.message_id);
      console.log(`Added message ID ${message.message_id} to session, current step: ${session.step}`);
    }
  });
}

// Function to ask for vacation style
function askVacationStyle(chatId: number): void {
  // Create inline keyboard with vacation styles
  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '👨‍👩‍👧‍👦 Family Trip', callback_data: 'style_Family Trip' },
        { text: '💑 Romantic Getaway', callback_data: 'style_Romantic Getaway' }
      ],
      [
        { text: '🌆 City', callback_data: 'style_City' },
        { text: '🏖️ Beaches & Islands', callback_data: 'style_Beach&Islands' }
      ],
      [
        { text: '🏺 Local Culture', callback_data: 'style_Cultural' },
        { text: '🛍️ Shopping & Fashion', callback_data: 'style_Shopping&Fashion' }, 
      ],
      [
        { text: '🦁 Nature & Wildlife', callback_data: 'style_Nature&Wildlife' },
        { text: '🥾 Tracks & Hikes', callback_data: 'style_Tracks&Hikes' }
      ],
      [
        { text: '🎡 Amusement Parks', callback_data: 'style_AmusementParks' },
        { text: '🏂 Extreme Sports', callback_data: 'style_ExtremeSports' }
      ],
      [
        { text: '🚗 Road trips', callback_data: 'style_RoadTrips' },
        { text: '🎒 Backpackers', callback_data: 'style_Backpackers' }
      ],
      [
        { text: '✅ Done', callback_data: 'style_done' }
      ]
    ]
  };

  bot.sendMessage(
    chatId, 
    '4️⃣ What experience are you looking for? (Select all that apply)', 
    { 
      parse_mode: 'Markdown',
      reply_markup: inlineKeyboard
    }
  ).then(message => {
    const session = userSessions.get(chatId);
    if (session) {
      session.messageIds.push(message.message_id);
    }
  });
}

// Function to ask for departure city
function askDepartureCity(chatId: number): void {
  console.log(`askDepartureCity called for chat ID ${chatId}`);
  
  bot.sendMessage(chatId, '5️⃣ Where are you departing from?', { parse_mode: 'Markdown' })
    .then(message => {
      const session = userSessions.get(chatId);
      if (session) {
        session.messageIds.push(message.message_id);
        console.log(`Added departure city message ID ${message.message_id} to session, current step: ${session.step}`);
      }
    });
}

// Function to ask for currency
function askCurrency(chatId: number): void {
  console.log(`askCurrency called for chat ID ${chatId}`);
  
  // Create inline keyboard with common currencies
  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '🇺🇸 USD', callback_data: 'currency_USD' },
        { text: '🇪🇺 EUR', callback_data: 'currency_EUR' }
      ],
      [
        { text: '🇦🇺 AUD', callback_data: 'currency_AUD' },
        { text: '🇳🇿 NZD', callback_data: 'currency_NZD' }
      ],
      [
        { text: '🇬🇧 GBP', callback_data: 'currency_GBP' },
        { text: '🇯🇵 JPY', callback_data: 'currency_JPY' }
      ],
      [
        { text: '🇭🇰 HKD', callback_data: 'currency_HKD' },
        { text: '🇨🇳 CNY', callback_data: 'currency_CNY' }
      ],
      [
        { text: '🇮🇳 INR', callback_data: 'currency_INR' },
        { text: '🇨🇦 CAD', callback_data: 'currency_CAD' }
      ],
      [
        { text: '🇮🇱 ILS', callback_data: 'currency_ILS' },
        { text: '🇨🇭 CHF', callback_data: 'currency_CHF' },
      ],
    ]
  };

  bot.sendMessage(chatId, '6️⃣ What *currency* would you like to use?', { 
    parse_mode: 'Markdown',
    reply_markup: inlineKeyboard
  })
  .then(message => {
    const session = userSessions.get(chatId);
    if (session) {
      session.messageIds.push(message.message_id);
      console.log(`Added currency message ID ${message.message_id} to session, current step: ${session.step}`);
    }
  });
}

// Function to ask for number of adults
function askNumberAdults(chatId: number): void {
  // Create inline keyboard with buttons 1-5
  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '1', callback_data: 'adults_1' },
        { text: '2', callback_data: 'adults_2' },
        { text: '3', callback_data: 'adults_3' },
        { text: '4', callback_data: 'adults_4' },
        { text: '5', callback_data: 'adults_5' }
      ]
    ]
  };

  bot.sendMessage(chatId, '7️⃣ How many *adults* are traveling?', { 
    parse_mode: 'Markdown',
    reply_markup: inlineKeyboard
  })
  .then(message => {
    const session = userSessions.get(chatId);
    if (session) {
      session.messageIds.push(message.message_id);
    }
  });
}

// Function to ask for number of children
function askNumberKids(chatId: number): void {
  // Create inline keyboard with buttons 0-4
  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '0', callback_data: 'kids_0' },
        { text: '1', callback_data: 'kids_1' },
        { text: '2', callback_data: 'kids_2' },
        { text: '3', callback_data: 'kids_3' },
        { text: '4', callback_data: 'kids_4' }
      ]
    ]
  };

  bot.sendMessage(chatId, '8️⃣ How many *children* are traveling?', { 
    parse_mode: 'Markdown',
    reply_markup: inlineKeyboard
  })
  .then(message => {
    const session = userSessions.get(chatId);
    if (session) {
      session.messageIds.push(message.message_id);
    }
  });
}

// Function to ask for hotel rating
function askLuxuryLevel(chatId: number): void {
  // Create inline keyboard with buttons 1-5 stars
  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '1 ⭐', callback_data: 'luxury_1' },
        { text: '2 ⭐', callback_data: 'luxury_2' },
        { text: '3 ⭐', callback_data: 'luxury_3' },
        { text: '4 ⭐', callback_data: 'luxury_4' },
        { text: '5 ⭐', callback_data: 'luxury_5' }
      ]
    ]
  };

  bot.sendMessage(chatId, '9️⃣ What is your *preferred hotel rating*?', { 
    parse_mode: 'Markdown',
    reply_markup: inlineKeyboard
  })
  .then(message => {
    const session = userSessions.get(chatId);
    if (session) {
      session.messageIds.push(message.message_id);
    }
  });
}

// Function to generate itinerary
async function generateItinerary(chatId: number): Promise<void> {
  try {
    const session = userSessions.get(chatId);
    if (!session) {
      bot.sendMessage(chatId, 'Session expired. Please use /plan to start again.');
      return;
    }

    const loadingMessage = await bot.sendMessage(chatId, '🔄 Generating your personalized travel itinerary... Please wait...');
    
    // Prepare trip data
    const tripData: TripDataRequest = {
      destination: session.tripData.destination || UNKNOWN,
      duration: session.tripData.duration || UNKNOWN,
      timeOfYear: session.tripData.timeOfYear || UNKNOWN,
      vacationStyle: session.tripData.vacationStyle,
      departureCity: session.tripData.departureCity || 'Unknown',
      currency: session.tripData.currency || 'USD',
      numberAdults: session.tripData.numberAdults || 1,
      numberKids: session.tripData.numberKids || 0,
      luxuryLevel: session.tripData.luxuryLevel,
      budget: session.tripData.budget,
      localTravel: session.tripData.localTravel || false,
      suggestDestination: !session.tripData.destination || session.tripData.destination === UNKNOWN
    };

    console.log('tripData', tripData);
    
    // Generate prompt
    const prompt = createPrompt(tripData);

    console.log('prompt', prompt);
    
    // Call OpenAI API
    const response = await callOpenAI(prompt);

    console.log('response', response);
    
    // Parse the response
    const itinerary = parseResponse(response);
    
    // Delete loading message
    await bot.deleteMessage(chatId, loadingMessage.message_id);

    const agodaLink = buildAgodaAffiliateLink(tripData);

    const flightLink = buildAgodaFlightLink(session.tripData);
    
    let message = formatItinerary(itinerary, agodaLink, flightLink);

    // Add Agoda affiliate link section
    message += generateAgodaSection(agodaLink, itinerary.destination || 'your destination');
    
    // Send the itinerary
    await bot.sendMessage(chatId, message, { 
      parse_mode: 'Markdown', 
      disable_web_page_preview: false 
    });
    
    // Send a message to start a new trip
    await bot.sendMessage(chatId, 'Would you like to plan another trip? Use /plan to begin again.');
    
    // Clear the session
    userSessions.delete(chatId);
  } catch (error) {
    console.error('Error generating itinerary:', error);
    bot.sendMessage(chatId, 'Sorry, an error occurred while generating your itinerary. Please try again with /plan.');
    userSessions.delete(chatId);
  }
}

// Function to remove keyboard
function removeKeyboard(chatId: number, messageText: string): void {
  bot.sendMessage(chatId, messageText, {
    parse_mode: 'Markdown',
    reply_markup: {
      remove_keyboard: true
    }
  });
}

// Handle /plan command (main entry point for trip planning)
bot.onText(/\/plan/, (msg) => {
  const chatId = msg.chat.id;
  // Remove any existing keyboard before starting new session
  startNewSession(chatId);
});

// Handle /start command (welcome message)
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  // Remove any existing keyboard first
  bot.sendMessage(chatId, 'Welcome to TangerineBot!', {
    reply_markup: {
      remove_keyboard: true
    }
  }).then(() => {
    const welcomeText = `
🍊 *Welcome to TangerineBot - Your AI Travel Assistant!* 🍊

I can help you plan your perfect trip based on your preferences.

*Commands:*
/plan - Start planning a new trip
/help - Show help message
/cancel - Cancel the current trip planning

Use /plan to begin your travel planning journey!
`;
    bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown' });
  });
});

// Handle /help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
🍊 *TangerineBot Help* 🍊

I'm an AI-powered travel assistant that helps you plan your perfect trip based on your preferences.

*Commands:*
/plan - Start planning a new trip
/help - Show this help message
/cancel - Cancel the current trip planning

*How to use:*
1. Start a new trip planning with /plan
2. Answer the questions about your travel preferences
3. I'll generate a personalized travel itinerary for you

*Travel preferences include:*
Destination
Trip Duration
Travel Dates / Season / Month
Vacation Style
Departure City
Currency
Number of Adults
Number of Children
Preferred Hotel Rating

If you have any issues, please use /cancel and start again.
`;
  
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Handle /cancel command
bot.onText(/\/cancel/, (msg) => {
  const chatId = msg.chat.id;
  userSessions.delete(chatId);
  // Remove any existing keyboard when canceling
  bot.sendMessage(chatId, 'Trip planning canceled. Use /plan to begin a new trip planning.', {
    reply_markup: {
      remove_keyboard: true
    }
  });
});

// Handle user messages
bot.on('message', (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const session = userSessions.get(chatId);
  
  if (!session) {
    bot.sendMessage(chatId, 'Please use /plan to begin planning your trip.');
    return;
  }
  
  console.log(`Processing message for step ${session.step}: "${msg.text}"`);
  
  // Process user input based on the current step
  switch (session.step) {
    case 1: // Destination
      session.tripData.destination = msg.text.trim() || UNKNOWN;
      session.tripData.suggestDestination = !msg.text.trim();
      session.step++;
      console.log(`Updated step to ${session.step}, asking for duration`);
      askDuration(chatId);
      break;
    case 2: // Duration
      const durationInput = msg.text.trim();
      if (durationInput) {
        const duration = parseInt(durationInput, 10);
        if (!isNaN(duration) && duration > 0 && duration <= 100) {
          session.tripData.duration = `${duration} days`;
          session.step++;
          console.log(`Updated step to ${session.step}, asking for time of year`);
          askTimeOfYear(chatId);
        } else {
          bot.sendMessage(chatId, 'Please enter a number between 1 and 14 days, or use the buttons below.');
        }
      }
      break;
    case 3: // Time of Year
      session.tripData.timeOfYear = msg.text.trim() || UNKNOWN;
      session.step++;
      console.log(`Updated step to ${session.step}, asking for vacation style`);
      askVacationStyle(chatId);
      break;
    case 4: // Vacation Style
      session.tripData.vacationStyle = msg.text.trim().split(',').map(style => style.trim());
      session.step++;
      console.log(`Updated step to ${session.step}, asking for departure city`);
      askDepartureCity(chatId);
      break;
    case 5: // Departure City
      session.tripData.departureCity = msg.text.trim();
      session.step = 6; // Explicitly set to step 6
      console.log(`Updated step to ${session.step}, asking for currency. Departure city set to: ${session.tripData.departureCity}`);
      askCurrency(chatId);
      break;
    case 6: // Currency
      session.tripData.currency = msg.text.trim() || 'USD';
      session.step++;
      console.log(`Updated step to ${session.step}, asking for number of adults`);
      askNumberAdults(chatId);
      break;
    case 7: // Number of Adults
      const adultsInput = msg.text.trim();
      if (adultsInput) {
        const numberAdults = parseInt(adultsInput, 10);
        if (!isNaN(numberAdults) && numberAdults > 0 && numberAdults <= 20) {
          session.tripData.numberAdults = numberAdults;
          session.step++;
          askNumberKids(chatId);
        } else {
          bot.sendMessage(chatId, 'Please enter a number between 1 and 5 adults, or use the buttons below.');
        }
      }
      break;
    case 8: // Number of Kids
      const kidsInput = msg.text.trim();
      if (kidsInput) {
        const numberKids = parseInt(kidsInput, 10);
        if (!isNaN(numberKids) && numberKids >= 0 && numberKids <= 20) {
          session.tripData.numberKids = numberKids;
          session.step++;
          askLuxuryLevel(chatId);
        } else {
          bot.sendMessage(chatId, 'Please enter a number between 0 and 4 children, or use the buttons below.');
        }
      }
      break;
    case 9: // Luxury Level
      const luxuryLevel = parseInt(msg.text.trim(), 10);
      session.tripData.luxuryLevel = isNaN(luxuryLevel) ? undefined : luxuryLevel;
      
      // Show summary and confirm
      let summary = '📋 *Trip Planning Summary:*\n\n';
      summary += `🌍 Destination: ${session.tripData.destination}\n`;
      summary += `⏱️ Duration: ${session.tripData.duration}\n`;
      summary += `🗓️ Travel Dates/Season: ${session.tripData.timeOfYear}\n`;
      summary += `🏖️ Vacation Style: ${session.tripData.vacationStyle?.join(', ')}\n`;
      summary += `🛫 Departure City: ${session.tripData.departureCity}\n`;
      summary += `💵 Currency: ${session.tripData.currency}\n`;
      summary += `👨‍👩‍👧‍👦 Travelers: ${session.tripData.numberAdults} adults, ${session.tripData.numberKids} children\n`;
      summary += `🏨 Hotel Rating: ${session.tripData.luxuryLevel || 'Not specified'} stars\n\n`;
      summary += 'Is this correct? Type *YES* to generate your itinerary or *NO* to start over.';

      bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });
      session.step++;
      break;
    case 10: // Confirmation
      if (msg.text.trim().toUpperCase() === 'YES') {
        generateItinerary(chatId);
      } else {
        bot.sendMessage(chatId, 'Trip planning canceled. Use /plan to begin a new trip planning.');
        userSessions.delete(chatId);
      }
      break;
  }
});

// Handle callback queries from inline buttons
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message?.chat.id;
  const data = callbackQuery.data;
  
  if (!chatId || !data) return;
  
  const session = userSessions.get(chatId);
  if (!session) return;
  
  // Handle duration selection
  if (data.startsWith('duration_')) {
    const duration = parseInt(data.split('_')[1]);
    session.tripData.duration = `${duration} days`;
    
    // Acknowledge the callback
    bot.answerCallbackQuery(callbackQuery.id, { text: `Selected: ${duration} days` });
    
    // Update the message to show the selection
    bot.editMessageText(`2️⃣ Trip duration: *${duration} days*`, {
      chat_id: chatId,
      message_id: callbackQuery.message?.message_id,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [] }  // Empty inline keyboard
    });
    
    // Move to the next step
    askTimeOfYear(chatId);
  }
  
  // Handle month/season selection
  else if (data.startsWith('month_') || data.startsWith('season_')) {
    const timeType = data.startsWith('month_') ? 'month' : 'season';
    const timeValue = data.split('_')[1];
    session.tripData.timeOfYear = timeValue;
    
    // Acknowledge the callback
    bot.answerCallbackQuery(callbackQuery.id, { text: `Selected: ${timeValue}` });
    
    // Update the message to show the selection
    bot.editMessageText(`3️⃣ Preferred timing: *${timeValue}*`, {
      chat_id: chatId,
      message_id: callbackQuery.message?.message_id,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [] }  // Empty inline keyboard
    });
    
    // Move to the next step
    askVacationStyle(chatId);
  }
  
  // Handle vacation style selection
  else if (data.startsWith('style_')) {
    const style = data.split('_')[1];
    
    // Check if the user clicked "Done"
    if (style === 'done') {
      // If no styles were selected, set a default
      if (!session.tripData.vacationStyle || session.tripData.vacationStyle.length === 0) {
        session.tripData.vacationStyle = ['General Tourism'];
      }
      
      // Acknowledge the callback
      bot.answerCallbackQuery(callbackQuery.id, { text: 'Vacation styles confirmed' });
      
      // Update the message to show final selections
      const stylesText = session.tripData.vacationStyle.join(', ');
      bot.editMessageText(`4️⃣ Vacation styles: *${stylesText}*`, {
        chat_id: chatId,
        message_id: callbackQuery.message?.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [] }  // Empty inline keyboard
      });
      
      // Ensure we're at the correct step before moving to departure city
      session.step = 5;
      console.log(`Setting step to 5 after vacation style selection is done`);
      
      // Move to the next step
      askDepartureCity(chatId);
      return;
    }
    
    // Initialize the array if it doesn't exist
    if (!session.tripData.vacationStyle) {
      session.tripData.vacationStyle = [];
    }
    
    // Check if the style is already in the array
    const styleIndex = session.tripData.vacationStyle.indexOf(style);
    
    if (styleIndex === -1) {
      // Style not in array, add it
      session.tripData.vacationStyle.push(style);
      bot.answerCallbackQuery(callbackQuery.id, { text: `Added: ${style}` });
    } else {
      // Style already in array, remove it
      session.tripData.vacationStyle.splice(styleIndex, 1);
      bot.answerCallbackQuery(callbackQuery.id, { text: `Removed: ${style}` });
    }
    
    // Update the message to show current selections but keep the keyboard
    const stylesText = session.tripData.vacationStyle.length > 0 
      ? session.tripData.vacationStyle.join(', ')
      : 'No styles selected';
      
    bot.editMessageText(`4️⃣ Vacation styles: *${stylesText}*\n\nSelect more or click "Done" when finished. Click a style again to remove it.`, {
      chat_id: chatId,
      message_id: callbackQuery.message?.message_id,
      parse_mode: 'Markdown',
      reply_markup: callbackQuery.message?.reply_markup  // Keep the original keyboard
    });
  }
  
  // Handle currency selection
  else if (data.startsWith('currency_')) {
    const currency = data.split('_')[1];
    session.tripData.currency = currency;
    
    // Acknowledge the callback
    bot.answerCallbackQuery(callbackQuery.id, { text: `Selected: ${currency}` });
    
    // Update the message to show the selection
    bot.editMessageText(`6️⃣ Currency: *${currency}*`, {
      chat_id: chatId,
      message_id: callbackQuery.message?.message_id,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [] }  // Empty inline keyboard
    });
    
    // Move to the next step
    askNumberAdults(chatId);
  }
  
  // Handle adults selection
  else if (data.startsWith('adults_')) {
    const numberAdults = parseInt(data.split('_')[1]);
    session.tripData.numberAdults = isNaN(numberAdults) ? 1 : numberAdults;
    
    // Acknowledge the callback
    bot.answerCallbackQuery(callbackQuery.id, { text: `Selected: ${numberAdults} adults` });
    
    // Update the message to show the selection
    bot.editMessageText(`7️⃣ Adults: *${numberAdults}*`, {
      chat_id: chatId,
      message_id: callbackQuery.message?.message_id,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [] }  // Empty inline keyboard
    });
    
    // Move to the next step
    askNumberKids(chatId);
  }
  
  // Handle kids selection
  else if (data.startsWith('kids_')) {
    const numberKids = parseInt(data.split('_')[1]);
    session.tripData.numberKids = isNaN(numberKids) ? 0 : numberKids;
    
    // Acknowledge the callback
    bot.answerCallbackQuery(callbackQuery.id, { text: `Selected: ${numberKids} children` });
    
    // Update the message to show the selection
    bot.editMessageText(`8️⃣ Children: *${numberKids}*`, {
      chat_id: chatId,
      message_id: callbackQuery.message?.message_id,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [] }  // Empty inline keyboard
    });
    
    // Move to the next step
    askLuxuryLevel(chatId);
  }
  
  // Handle luxury level selection
  else if (data.startsWith('luxury_')) {
    const luxuryLevel = parseInt(data.split('_')[1]);
    session.tripData.luxuryLevel = luxuryLevel;
    
    // Acknowledge the callback
    bot.answerCallbackQuery(callbackQuery.id, { text: `Selected: ${luxuryLevel} stars` });
    
    // Update the message to show the selection
    bot.editMessageText(`9️⃣ Hotel rating: *${luxuryLevel} ⭐*`, {
      chat_id: chatId,
      message_id: callbackQuery.message?.message_id,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [] }  // Empty inline keyboard
    });
    
    // Show summary and ask for confirmation with inline buttons
    let summary = '*Trip Summary:*\n\n';
    summary += `🌍 Destination: ${session.tripData.destination}\n`;
    summary += `⏱️ Duration: ${session.tripData.duration}\n`;
    summary += `🗓️ Travel Dates/Season: ${session.tripData.timeOfYear}\n`;
    summary += `🏖️ Vacation Style: ${session.tripData.vacationStyle?.join(', ')}\n`;
    summary += `🛫 Departure City: ${session.tripData.departureCity}\n`;
    summary += `💵 Currency: ${session.tripData.currency}\n`;
    summary += `👨‍👩‍👧‍👦 Travelers: ${session.tripData.numberAdults} adults, ${session.tripData.numberKids} children\n`;
    summary += `🛌 Hotel Rating: ${session.tripData.luxuryLevel || 'Not specified'} ⭐\n\n`;
    summary += 'Is this correct?';
    
    // Create inline keyboard for confirmation
    const confirmKeyboard = {
      inline_keyboard: [
        [
          { text: '✅ Yes', callback_data: 'confirm_yes' },
          { text: '❌ No', callback_data: 'confirm_no' }
        ]
      ]
    };
    
    bot.sendMessage(chatId, summary, { 
      parse_mode: 'Markdown',
      reply_markup: confirmKeyboard
    });
    
    session.step = 10; // Move to confirmation step
  }
  
  // Handle confirmation response
  else if (data.startsWith('confirm_')) {
    const answer = data.split('_')[1];
    
    // Acknowledge the callback
    bot.answerCallbackQuery(callbackQuery.id);
    
    if (answer === 'yes') {
      // Remove the inline keyboard by editing the message
      bot.editMessageText(callbackQuery.message?.text || 'Trip Summary', {
        chat_id: chatId,
        message_id: callbackQuery.message?.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [] } // Empty inline keyboard
      });
      
      generateItinerary(chatId);
    } else {
      // Update the message to show cancellation
      bot.editMessageText(`❌ Trip planning canceled. Use /plan to begin a new trip planning.`, {
        chat_id: chatId,
        message_id: callbackQuery.message?.message_id,
        parse_mode: 'Markdown'
      });
      
      // Clear the session
      userSessions.delete(chatId);
    }
  }
});