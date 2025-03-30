import OpenAI from "openai";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateRuleSuggestions(prompt: string) {
  try {
    // Define the system message to guide the AI's behavior
    const systemMessage = `You are a workflow automation expert. Your task is to convert natural language descriptions into structured automation rules.

Available Triggers:
- Guest Check-In (ID: 1): Triggered when a guest checks in to their room
- Room Cleaning Completed (ID: 2): Triggered when housekeeping marks a room as cleaned
- Food Order Placed (ID: 3): Triggered when a guest places a food order
- Guest Check-Out (ID: 4): Triggered when a guest checks out from their room
- Maintenance Request (ID: 5): Triggered when a maintenance request is submitted

Available Actions:
- Send Email (ID: 1): Sends an email notification
- Send SMS (ID: 2): Sends an SMS notification
- Create Task (ID: 3): Creates a new task in the system
- Update Status (ID: 4): Updates the status of an entity
- Add Note (ID: 5): Adds a note to a guest profile or reservation

For each rule suggestion, return:
- name: A short, clear name for the rule (max 50 chars)
- description: A longer description of what the rule does
- triggerId: ID of the trigger from the list above
- actionId: ID of the action from the list above
- actionType: Either "immediate" (execute right away) or "scheduled" (execute after a delay)
- scheduleDelay: If actionType is "scheduled", the delay in minutes before executing
- actionDetails: An object containing any additional configuration needed for the action
- confidence: A number between 0 and 1 indicating how confident you are that this suggestion matches what the user wants

Return ONLY a valid JSON object with a "suggestions" array containing 1-3 rule suggestions, sorted by confidence (highest first).
`;

    // Prepare the messages for the API call
    const messages = [
      { role: 'system' as const, content: systemMessage },
      { role: 'user' as const, content: prompt },
    ];

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages,
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    // Extract and parse the response
    const content = response.choices[0]?.message?.content || '';
    let parsedContent;
    
    try {
      // Parse the JSON response
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      throw new Error('Failed to parse AI response. Please try again with a clearer description.');
    }

    // Validate and return the suggestions
    if (!parsedContent.suggestions || !Array.isArray(parsedContent.suggestions)) {
      throw new Error('Invalid AI response format. Please try again.');
    }

    // Post-process and validate each suggestion
    const validatedSuggestions = parsedContent.suggestions.map((suggestion: any) => {
      // Ensure all required fields are present
      const validatedSuggestion: {
        name: string;
        description: string | null;
        triggerId: number;
        actionId: number;
        actionType: 'immediate' | 'scheduled';
        actionDetails: Record<string, any>;
        confidence: number;
        scheduleDelay?: number;
      } = {
        name: String(suggestion.name || '').substring(0, 50),
        description: suggestion.description ? String(suggestion.description) : null,
        triggerId: Number(suggestion.triggerId),
        actionId: Number(suggestion.actionId),
        actionType: ['immediate', 'scheduled'].includes(suggestion.actionType) 
          ? (suggestion.actionType as 'immediate' | 'scheduled')
          : 'immediate',
        actionDetails: suggestion.actionDetails || {},
        confidence: Number(suggestion.confidence) || 0.5,
      };

      // Add scheduleDelay if actionType is 'scheduled'
      if (validatedSuggestion.actionType === 'scheduled') {
        validatedSuggestion.scheduleDelay = Number(suggestion.scheduleDelay) || 15;
      }

      return validatedSuggestion;
    });

    return {
      suggestions: validatedSuggestions.sort((a: any, b: any): number => b.confidence - a.confidence),
    };
  } catch (error) {
    console.error('Error generating rule suggestions:', error);
    throw error;
  }
}