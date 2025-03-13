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

### Running the Bot

1. Start the Telegram bot:
   ```
   npm start
   ```
   
   Or use the provided script:
   ```
   ./start-telegram.sh
   ```

2. Open Telegram and search for your bot by username.

3. Start a conversation with your bot by sending the `/start` command.

4. Follow the bot's instructions to provide your travel preferences.

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



// click extra time to remove selection of vacation style if possible
// make basic itinary TBD
// separate into components
// unit tests
// deployment
