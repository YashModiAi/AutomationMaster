import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { apiRequest, queryClient } from "../lib/queryClient";
import { InsertRule } from "@shared/schema";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Spinner } from "../components/ui/spinner";
import { formatTimeToNow, getActionTypeLabel, formatScheduleDelay } from "../lib/utils";

interface RuleSuggestion {
  name: string;
  description: string | null;
  triggerId: number;
  triggerName?: string;
  actionId: number;
  actionName?: string;
  actionType: "immediate" | "scheduled";
  scheduleDelay?: number;
  actionDetails: Record<string, any>;
  confidence: number;
}

export default function AIRuleCreator() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<RuleSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<RuleSuggestion | null>(null);
  const [_, navigate] = useLocation();

  // Fetch triggers and actions
  const { data: triggers = [] } = useQuery<any[]>({
    queryKey: ['/api/triggers'],
    enabled: true,
  });

  const { data: actions = [] } = useQuery<any[]>({
    queryKey: ['/api/actions'],
    enabled: true,
  });

  // Generate rule suggestions
  const generateSuggestions = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a description of the rule you want to create.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setSuggestions([]);
    setSelectedSuggestion(null);

    try {
      const response = await apiRequest('POST', '/api/ai/generate-rule', {
        prompt,
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.suggestions && data.suggestions.length > 0) {
          // Enrich suggestions with trigger and action names
          const enrichedSuggestions = data.suggestions.map((suggestion: RuleSuggestion) => {
            const matchedTrigger = triggers?.find((t: any) => t.id === suggestion.triggerId);
            const matchedAction = actions?.find((a: any) => a.id === suggestion.actionId);
            
            return {
              ...suggestion,
              triggerName: matchedTrigger?.name || `Unknown Trigger (ID: ${suggestion.triggerId})`,
              actionName: matchedAction?.name || `Unknown Action (ID: ${suggestion.actionId})`,
            };
          });
          
          setSuggestions(enrichedSuggestions);
        } else {
          toast({
            title: "No suggestions found",
            description: "AI couldn't generate any rule suggestions. Try rephrasing your request.",
            variant: "destructive",
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || "Failed to generate suggestions");
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate suggestions",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (data: InsertRule) => {
      const response = await apiRequest('POST', '/api/rules', data);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || "Failed to create rule");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      toast({
        title: "Success",
        description: "Rule created successfully",
      });
      navigate("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create rule",
        variant: "destructive",
      });
    },
  });

  const handleSelectSuggestion = (suggestion: RuleSuggestion) => {
    setSelectedSuggestion(suggestion);
  };

  const handleCreateRule = () => {
    if (!selectedSuggestion) return;

    const ruleData: InsertRule = {
      name: selectedSuggestion.name,
      description: selectedSuggestion.description,
      triggerId: selectedSuggestion.triggerId,
      actionId: selectedSuggestion.actionId,
      actionType: selectedSuggestion.actionType,
      actionDetails: selectedSuggestion.actionDetails,
      isActive: true,
    };

    if (selectedSuggestion.actionType === "scheduled" && selectedSuggestion.scheduleDelay) {
      ruleData.scheduleDelay = selectedSuggestion.scheduleDelay;
    }

    createRuleMutation.mutate(ruleData);
  };

  return (
    <div className="container py-10">
      <div className="mb-8">
        <Button 
          variant="outline" 
          onClick={() => navigate("/")}
          className="mb-4"
        >
          ← Back to Rules
        </Button>
        <h1 className="text-3xl font-bold mb-2">AI Rule Creator</h1>
        <p className="text-muted-foreground">
          Describe the automation rule you want to create in plain language, and our AI will help you set it up.
        </p>
      </div>

      <div className="mb-6">
        <label className="font-medium block mb-2">What automation would you like to create?</label>
        <div className="flex gap-3">
          <Textarea
            placeholder="Example: When a guest checks in, send a welcome email after 10 minutes"
            className="flex-1"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
          <Button 
            onClick={generateSuggestions}
            disabled={isGenerating || !prompt.trim()}
            className="self-end"
          >
            {isGenerating ? <Spinner className="mr-2" /> : null}
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>

      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner className="h-8 w-8 mb-4" />
          <p className="text-muted-foreground">Generating rule suggestions...</p>
        </div>
      )}

      {!isGenerating && suggestions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Suggested Rules</h2>
          <p className="text-muted-foreground mb-4">
            Select one of the suggestions below to create your rule:
          </p>

          <div className="grid gap-4">
            {suggestions.map((suggestion, index) => (
              <Card
                key={index}
                className={`p-4 cursor-pointer border-2 transition-all ${
                  selectedSuggestion === suggestion
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{suggestion.name}</h3>
                  <Badge variant="outline">
                    {Math.round(suggestion.confidence * 100)}% match
                  </Badge>
                </div>
                
                {suggestion.description && (
                  <p className="text-muted-foreground text-sm mb-3">
                    {suggestion.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    When: {suggestion.triggerName}
                  </Badge>
                  <Badge variant="secondary">
                    Then: {suggestion.actionName} ({getActionTypeLabel(suggestion.actionType)}
                    {suggestion.actionType === "scheduled" && suggestion.scheduleDelay 
                      ? ` after ${formatScheduleDelay(suggestion.scheduleDelay)}` 
                      : ""})
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedSuggestion && (
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleCreateRule}
            disabled={createRuleMutation.isPending}
            className="w-full sm:w-auto"
          >
            {createRuleMutation.isPending ? <Spinner className="mr-2" /> : null}
            {createRuleMutation.isPending ? "Creating..." : "Create Selected Rule"}
          </Button>
        </div>
      )}

      {!isGenerating && suggestions.length === 0 && prompt && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No rule suggestions yet. Enter a prompt and click "Generate".
          </p>
        </div>
      )}
    </div>
  );
}