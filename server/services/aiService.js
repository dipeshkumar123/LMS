// services/aiService.js
const axios = require('axios');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config(); // Load environment variables

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

if (!OPENROUTER_API_KEY) {
    logger.warn('OPENROUTER_API_KEY not found in environment variables. AI features requiring it will fail.');
}

/**
 * Makes a request to the OpenRouter Chat Completions API.
 * @param {Array<object>} messages - The array of message objects (e.g., [{ role: 'system', content: '...' }, { role: 'user', content: '...' }]).
 * @param {number} [max_tokens=150] - Max tokens for the response.
 * @param {number} [temperature=0.7] - Sampling temperature.
 * @param {string} [model="gpt-3.5-turbo"] - The model to use.
 * @returns {Promise<string>} - The content of the AI's response message.
 * @throws {Error} - If the API key is missing or the API call fails.
 */
const callOpenAI = async (messages, max_tokens = 250, temperature = 0.5, model = "gpt-3.5-turbo") => {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API Key is not configured.');
    }

    try {
        logger.info(`Calling OpenRouter API with model ${model}...`);
        // logger.info('Prompt Messages:', JSON.stringify(messages));

        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: model,
                messages: messages,
                max_tokens: max_tokens,
                temperature: temperature,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`
                }
            }
        );

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const aiResponse = response.data.choices[0].message?.content;
            return aiResponse.trim();
        } else {
            logger.error('Invalid response structure from OpenRouter API:', response.data);
            throw new Error('Failed to get a valid response from AI service.');
        }
    } catch (error) {
        logger.error('Error calling OpenRouter API:', error.response ? JSON.stringify(error.response.data) : error.message);
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message || 'AI service request failed.';
        const aiError = new Error(message);
        aiError.status = status || 500;
        throw aiError;
    }
};

/**
 * Attempts to parse a string that might contain a JSON object or array.
 * Handles cases where the JSON is embedded within text (e.g., ```json ... ```).
 * @param {string} text - The text possibly containing JSON.
 * @returns {object | null} - The parsed JSON object/array or null if parsing fails.
 */
const parseJsonFromText = (text) => {
    if (!text || typeof text !== 'string') {
        return null;
    }
    try {
        // Try direct parsing first
        return JSON.parse(text);
    } catch (e) {
        // If direct parsing fails, look for JSON within backticks
        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
            try {
                return JSON.parse(match[1]);
            } catch (e2) {
                 logger.warn('Failed to parse JSON found within backticks:', e2.message);
                return null;
            }
        } else {
             // Look for JSON that might just start with { or [ and end with } or ]
             const potentialJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1)
                                || text.substring(text.indexOf('['), text.lastIndexOf(']') + 1);
             if (potentialJson) {
                 try {
                     return JSON.parse(potentialJson);
                 } catch (e3) {
                      // Ignore if substring isn't valid JSON
                 }
             }
        }
    }
    logger.warn('Could not parse JSON from AI response text.');
    return null; // Return null if no valid JSON found
};


module.exports = {
    callOpenAI,
    parseJsonFromText,
};