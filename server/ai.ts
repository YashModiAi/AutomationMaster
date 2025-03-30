import OpenAI from "openai";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

import { storage } from "./storage";

export async function generateRuleSuggestions(prompt: string) {
  try {
    // Fetch available triggers and actions from the database
    const triggers = await storage.getAllTriggers();
    const actions = await storage.getAllActions();

    // Generate trigger list for the prompt
    const triggersList = triggers
      .map(
        (trigger) =>
          `- ${trigger.name} (ID: ${trigger.id}): ${trigger.description || "No description"}`,
      )
      .join("\n");

    // Generate action list for the prompt
    const actionsList = actions
      .map(
        (action) =>
          `- ${action.name} (ID: ${action.id}): ${action.description || "No description"}`,
      )
      .join("\n");

    // Define the system message with dynamic triggers and actions
    const systemMessage = `You are a workflow automation expert. Your task is to convert natural language descriptions into structured automation rules.

Available Triggers:
${triggersList}

Available Actions:
${actionsList}

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
      { role: "system" as const, content: systemMessage },
      { role: "user" as const, content: prompt },
    ];

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using the more affordable gpt-4o-mini model as requested
      messages,
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    // Extract and parse the response
    const content = response.choices[0]?.message?.content || "";
    let parsedContent;

    try {
      // Parse the JSON response
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      throw new Error(
        "Failed to parse AI response. Please try again with a clearer description.",
      );
    }

    // Validate and return the suggestions
    if (
      !parsedContent.suggestions ||
      !Array.isArray(parsedContent.suggestions)
    ) {
      throw new Error("Invalid AI response format. Please try again.");
    }

    // Post-process and validate each suggestion
    const validatedSuggestions = parsedContent.suggestions.map(
      (suggestion: any) => {
        // Ensure all required fields are present
        const validatedSuggestion: {
          name: string;
          description: string | null;
          triggerId: number;
          actionId: number;
          actionType: "immediate" | "scheduled";
          actionDetails: Record<string, any>;
          confidence: number;
          scheduleDelay?: number;
        } = {
          name: String(suggestion.name || "").substring(0, 50),
          description: suggestion.description
            ? String(suggestion.description)
            : null,
          triggerId: Number(suggestion.triggerId),
          actionId: Number(suggestion.actionId),
          actionType: ["immediate", "scheduled"].includes(suggestion.actionType)
            ? (suggestion.actionType as "immediate" | "scheduled")
            : "immediate",
          actionDetails: suggestion.actionDetails || {},
          confidence: Number(suggestion.confidence) || 0.5,
        };

        // Add scheduleDelay if actionType is 'scheduled'
        if (validatedSuggestion.actionType === "scheduled") {
          validatedSuggestion.scheduleDelay =
            Number(suggestion.scheduleDelay) || 15;
        }

        return validatedSuggestion;
      },
    );

    return {
      suggestions: validatedSuggestions.sort(
        (a: any, b: any): number => b.confidence - a.confidence,
      ),
    };
  } catch (error) {
    console.error("Error generating rule suggestions:", error);
    throw error;
  }
}
