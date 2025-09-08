import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from "@google/genai";

// Fix: Create gemini utility file
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAX_RETRIES = 3;

/**
 * A wrapper for the Gemini API's generateContent method that includes
 * a default model and exponential backoff for retries on failure.
 * @param params - The parameters for the generateContent call, model is optional.
 * @returns A promise that resolves with the GenerateContentResponse.
 * @throws An error if the request fails after all retries.
 */
export const generateContentWithFallback = async (params: Omit<GenerateContentParameters, 'model'> & { model?: string }): Promise<GenerateContentResponse> => {
    let lastError: Error | null = null;

    const fullParams: GenerateContentParameters = {
        model: params.model || 'gemini-2.5-flash',
        ...params
    };
    
    // For specific tool calls, we should ensure the right model is used
    // Fix: Use 'in' operator for type guarding to check for the presence of 'googleSearch' property.
    if (params.config?.tools?.some(t => 'googleSearch' in t)) {
        fullParams.model = 'gemini-2.5-flash';
    }

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            // Using ai.models.generateContent as per guidelines
            const response = await ai.models.generateContent(fullParams);
            return response;
        } catch (error: any) {
            lastError = error;
            console.error(`Gemini API call attempt ${i + 1} failed:`, error);
            
            // Do not retry on client-side errors like bad requests
            if (error.name === 'GoogleGenerativeAIError' && error.message.includes('[400')) {
                 throw error;
            }

            // Exponential backoff
            if (i < MAX_RETRIES - 1) {
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw new Error(`Failed to get response from Gemini API after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
};