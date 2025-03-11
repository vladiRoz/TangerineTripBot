import { config } from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { createPrompt, UNKNOWN } from './prompt-builder';
import { TripDataRequest } from './interface';
import fetch from 'node-fetch';

// Load environment variables
config();

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
      throw new Error('No JSON found in the response');
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    console.error('Raw response:', response);
    throw error;
  }
}

// Function to create a Google Maps URL for a location
function createGoogleMapsUrl(location: string): string {
  const encodedLocation = encodeURIComponent(location);
  return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
}

// Function to format the itinerary for Telegram
function formatItinerary(itinerary: any): string {
  let message = `🌍 *${itinerary.title}*\n\n`;
  
  message += `✨ *HIGHLIGHTS:*\n`;
  itinerary.highlights.forEach((highlight: string, index: number) => {
    message += `   ${index + 1}. ${highlight}\n`;
  });
  
  message += `\n🗓️ *BEST TIME TO VISIT:*\n`;
  message += `   ${itinerary.timing}\n`;
  
  message += `\n🚌 *GETTING AROUND:*\n`;
  message += `   ${itinerary.getting_around}\n`;
  
  message += `\n📅 *ITINERARY:*\n`;
  itinerary.sample_itinerary.forEach((day: string) => {
    message += `   ${day}\n`;
  });
  
  message += `\n📍 *LOCATIONS:*\n`;
  itinerary.locations.forEach((location: string, index: number) => {
    const locationUrl = createGoogleMapsUrl(location);
    message += `   ${index + 1}. [${location}](${locationUrl})\n`;
  });
  
  message += `\n💰 *BUDGET:*\n`;
  const budget = itinerary.budget;
  message += `   ✈️ Flights: ${budget.flights}\n`;
  message += `   🚕 Transportation: ${budget.transportation}\n`;
  message += `   🏨 Accommodation: ${budget.accommodation}\n`;
  message += `   🎭 Activities: ${budget.activities}\n`;
  message += `   🍽️ Food: ${budget.food}\n`;
  message += `   💵 Total: ${budget.total}\n`;
  
  if (budget.not_enough_budget) {
    message += `\n⚠️ *NOTE:* The provided budget is not sufficient for this trip.\n`;
  }
  
  return message;
}

// Function to start a new session
function startNewSession(chatId: number): void {
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
}

// Function to ask for destination
function askDestination(chatId: number): void {
  bot.sendMessage(chatId, '1️⃣ What is your *destination*? (or leave blank for suggestions)', { parse_mode: 'Markdown' })
    .then(message => {
      const session = userSessions.get(chatId);
      if (session) {
        session.messageIds.push(message.message_id);
      }
    });
}

// Function to ask for trip duration
function askDuration(chatId: number): void {
  bot.sendMessage(chatId, '2️⃣ What is your *trip duration* (number of days)?', { parse_mode: 'Markdown' })
    .then(message => {
      const session = userSessions.get(chatId);
      if (session) {
        session.messageIds.push(message.message_id);
      }
    });
}

// Function to ask for travel dates/season
function askTimeOfYear(chatId: number): void {
  bot.sendMessage(chatId, '3️⃣ What are your *travel dates / season / month*?', { parse_mode: 'Markdown' })
    .then(message => {
      const session = userSessions.get(chatId);
      if (session) {
        session.messageIds.push(message.message_id);
      }
    });
}

// Function to ask for vacation style
function askVacationStyle(chatId: number): void {
  bot.sendMessage(
    chatId, 
    '4️⃣ What is your *vacation style*? (e.g., Family Trip, Romantic Getaway, City, etc.)', 
    { parse_mode: 'Markdown' }
  ).then(message => {
    const session = userSessions.get(chatId);
    if (session) {
      session.messageIds.push(message.message_id);
    }
  });
}

// Function to ask for departure city
function askDepartureCity(chatId: number): void {
  bot.sendMessage(chatId, '5️⃣ What is your *departure city*?', { parse_mode: 'Markdown' })
    .then(message => {
      const session = userSessions.get(chatId);
      if (session) {
        session.messageIds.push(message.message_id);
      }
    });
}

// Function to ask for currency
function askCurrency(chatId: number): void {
  bot.sendMessage(chatId, '6️⃣ What *currency* would you like to use? (e.g., USD, EUR, GBP)', { parse_mode: 'Markdown' })
    .then(message => {
      const session = userSessions.get(chatId);
      if (session) {
        session.messageIds.push(message.message_id);
      }
    });
}

// Function to ask for number of adults
function askNumberAdults(chatId: number): void {
  bot.sendMessage(chatId, '7️⃣ How many *adults* are traveling?', { parse_mode: 'Markdown' })
    .then(message => {
      const session = userSessions.get(chatId);
      if (session) {
        session.messageIds.push(message.message_id);
      }
    });
}

// Function to ask for number of children
function askNumberKids(chatId: number): void {
  bot.sendMessage(chatId, '8️⃣ How many *children* are traveling?', { parse_mode: 'Markdown' })
    .then(message => {
      const session = userSessions.get(chatId);
      if (session) {
        session.messageIds.push(message.message_id);
      }
    });
}

// Function to ask for hotel rating
function askLuxuryLevel(chatId: number): void {
  bot.sendMessage(chatId, '9️⃣ What is your *preferred hotel rating* (1-5 stars)?', { parse_mode: 'Markdown' })
    .then(message => {
      const session = userSessions.get(chatId);
      if (session) {
        session.messageIds.push(message.message_id);
      }
    });
}

// Function to generate itinerary
async function generateItinerary(chatId: number): Promise<void> {
  const session = userSessions.get(chatId);
  if (!session) return;
  
  try {
    // Send loading message
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
    
    // Generate prompt
    const prompt = createPrompt(tripData);
    
    // Call OpenAI API
    const response = await callOpenAI(prompt);
    
    // Parse the response
    const itinerary = parseResponse(response);
    
    // Format the itinerary for Telegram
    const formattedItinerary = formatItinerary(itinerary);
    
    // Delete loading message
    await bot.deleteMessage(chatId, loadingMessage.message_id);
    
    // Send the itinerary
    await bot.sendMessage(chatId, formattedItinerary, { 
      parse_mode: 'Markdown',
      disable_web_page_preview: true // Prevent link previews from cluttering the message
    });
    
    // Send a message to start a new trip
    await bot.sendMessage(chatId, 'Would you like to plan another trip? Use /start to begin again.');
    
    // Clear the session
    userSessions.delete(chatId);
  } catch (error) {
    console.error('Error generating itinerary:', error);
    bot.sendMessage(chatId, 'Sorry, an error occurred while generating your itinerary. Please try again with /start.');
    userSessions.delete(chatId);
  }
}

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  startNewSession(chatId);
});

// Handle /help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
🍊 *TangerineBot Help* 🍊

I'm an AI-powered travel assistant that helps you plan your perfect trip based on your preferences.

*Commands:*
/start - Start planning a new trip
/help - Show this help message
/cancel - Cancel the current trip planning

*How to use:*
1. Start a new trip planning with /start
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
  bot.sendMessage(chatId, 'Trip planning canceled. Use /start to begin a new trip planning.');
});

// Handle user messages
bot.on('message', (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const session = userSessions.get(chatId);
  
  if (!session) {
    bot.sendMessage(chatId, 'Please use /start to begin planning your trip.');
    return;
  }
  
  // Process user input based on the current step
  switch (session.step) {
    case 1: // Destination
      session.tripData.destination = msg.text.trim() || UNKNOWN;
      session.tripData.suggestDestination = !msg.text.trim();
      session.step++;
      askDuration(chatId);
      break;
    case 2: // Duration
      session.tripData.duration = msg.text.trim() || UNKNOWN;
      session.step++;
      askTimeOfYear(chatId);
      break;
    case 3: // Time of Year
      session.tripData.timeOfYear = msg.text.trim() || UNKNOWN;
      session.step++;
      askVacationStyle(chatId);
      break;
    case 4: // Vacation Style
      session.tripData.vacationStyle = msg.text.trim().split(',').map(style => style.trim());
      session.step++;
      askDepartureCity(chatId);
      break;
    case 5: // Departure City
      session.tripData.departureCity = msg.text.trim();
      session.step++;
      askCurrency(chatId);
      break;
    case 6: // Currency
      session.tripData.currency = msg.text.trim() || 'USD';
      session.step++;
      askNumberAdults(chatId);
      break;
    case 7: // Number of Adults
      const numberAdults = parseInt(msg.text.trim(), 10);
      session.tripData.numberAdults = isNaN(numberAdults) ? 1 : numberAdults;
      session.step++;
      askNumberKids(chatId);
      break;
    case 8: // Number of Kids
      const numberKids = parseInt(msg.text.trim(), 10);
      session.tripData.numberKids = isNaN(numberKids) ? 0 : numberKids;
      session.step++;
      askLuxuryLevel(chatId);
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
        bot.sendMessage(chatId, 'Trip planning canceled. Use /start to begin a new trip planning.');
        userSessions.delete(chatId);
      }
      break;
  }
});

// Start the bot
console.log('🍊 TangerineBot is running...');
console.log('Add your bot to Telegram and use /start to begin planning your trip!');