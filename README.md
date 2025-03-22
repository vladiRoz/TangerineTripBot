# 🍊 TangerineBot - AI Travel Assistant for Telegram

TangerineBot is an AI-powered travel assistant that helps users plan their perfect trip based on their preferences. It creates a well-structured, detailed itinerary along with an estimated budget, all through a Telegram bot interface.

## Features

- Personalized travel itineraries based on user preferences
- Destination suggestions if no specific destination is provided
- Detailed day-by-day itinerary planning
- Budget estimation for flights, accommodation, transportation, activities, and food
- Recommendations for the best time to visit
- Information about getting around at the destination
- Clickable location links that open directly in Google Maps
- Interactive vacation style picker with multiple selection support
- Conversational interface through Telegram

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key
- Telegram Bot Token

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/vladiRoz/TangerineTripBot.git
   cd TangerineTripBot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   TELEGRAM_TOKEN=your_telegram_bot_token_here
   ```

## Usage

### Creating a Telegram Bot

1. Open Telegram and search for @BotFather
2. Send the command `/newbot` and follow the instructions
3. Choose a name for your bot (e.g., "TangerineBot")
4. Choose a username for your bot (e.g., "tangerine_travel_bot")
5. BotFather will provide you with a token - copy this token
6. Add the token to your `.env` file as `TELEGRAM_TOKEN`

### Running Locally (macOS or Linux)

1. Create a `.env` file based on the example:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file and add your API keys.

2. Run the bot using the provided script:
   ```
   ./start-telegram.sh
   ```
   
   Or, manually:
   ```
   npm install
   npm start
   ```

### Deploying to a Server (Ubuntu)

1. SSH into your server
   ```
   ssh user@your-server-ip
   ```

2. Clone the repository
   ```
   git clone https://github.com/yourusername/TangerineTripBot.git
   cd TangerineTripBot
   ```

3. Create a `.env` file with your API keys
   ```
   cp .env.example .env
   nano .env
   ```

4. Run the deployment script
   ```
   ./deploy-server.sh
   ```

5. Check the logs
   ```
   pm2 logs telegram-bot
   ```

### Managing the Bot on the Server

- Check status: `pm2 status`
- View logs: `pm2 logs telegram-bot`
- Restart bot: `pm2 restart telegram-bot`
- Stop bot: `pm2 stop telegram-bot`
- Start bot: `pm2 start telegram-bot`

## Bot Commands

- `/start` - Start planning a new trip
- `/help` - Show help information
- `/cancel` - Cancel the current trip planning

## Travel Preferences

TangerineBot will ask for the following information to generate your personalized travel itinerary:

- Destination (or leave blank for suggestions)
- Trip Duration (number of days)
- Travel Dates / Season / Month
- Vacation Style (select multiple options from an interactive keyboard)
- Departure City
- Currency
- Number of Adults
- Number of Children
- Preferred Hotel Rating (1-5 stars)
- Budget

## Example Output

The bot will generate a detailed travel itinerary including:

- Destination title and highlights
- Best time to visit
- Getting around information
- Day-by-day itinerary
- List of specific locations to visit (with clickable Google Maps links)
- Detailed budget breakdown

## Author

Created by [vladiRoz](https://github.com/vladiRoz)

## License

ISC 

## Agoda Integration

TangerineBot integrates with Agoda's affiliate program to provide hotel and flight booking options for users. The bot uses city IDs from Agoda to generate accurate booking links.

### Updating Agoda City IDs

To update the list of city IDs from Agoda's Content API:

1. Make sure you have API credentials from the [Agoda Partner Portal](https://partners.agoda.com/DeveloperPortal)
2. Add your credentials to the `.env` file:
   ```
   AGODA_API_KEY=your_agoda_api_key_here
   AGODA_API_SECRET=your_agoda_api_secret_here
   ```
3. Run the city ID fetching script:
   ```bash
   # For JavaScript version
   node fetch-agoda-cities.js
   
   # For TypeScript version
   npx ts-node fetch-agoda-cities.ts
   ```
4. The script will generate three files:
   - `agoda-cities.json`: Complete data for all cities
   - `agoda-city-ids.json`: Mapping of city names to IDs
   - `agoda-city-ids.ts`: TypeScript code ready to use in the bot

5. Review and update the `agodaCityIds` object in `agoda-affiliate.ts` with the new city IDs.

// separate into components
// unit tests
// deployment
// rate limiting
// 10 trip planning then premium