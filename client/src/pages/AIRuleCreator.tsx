import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { apiRequest, queryClient } from "../lib/queryClient";
import { InsertRule, userTypeEnum } from "@shared/schema";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Spinner } from "../components/ui/spinner";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  userType?: string; // Add user type to suggestion interface
  confidence: number;
}

export default function AIRuleCreator() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<RuleSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<RuleSuggestion | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<string>("admin");
  const [_, navigate] = useLocation();
  
  // Example prompts that users can try
  const examplePrompts = [
    "When a guest checks in, send a welcome SMS after 5 minutes",
    "Create a task for housekeeping when room cleaning is completed",
    "Send an email when a maintenance request is submitted",
    "When a food order is placed, update the status and send an SMS"
  ];

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
      const response = await fetch('/api/ai/generate-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        credentials: 'include'
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
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
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
    
    // If the suggestion has a user type, set it as the selected user type
    if (suggestion.userType && 
        ['admin', 'security', 'maintenance', 'host', 'guest', 'miscellaneous'].includes(suggestion.userType)) {
      setSelectedUserType(suggestion.userType);
    }
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
      userType: selectedUserType as any, // Use the selected user type
      isActive: true,
    };

    if (selectedSuggestion.actionType === "scheduled" && selectedSuggestion.scheduleDelay) {
      ruleData.scheduleDelay = selectedSuggestion.scheduleDelay;
    }

    createRuleMutation.mutate(ruleData);
  };
  
  // Function to use an example prompt
  const useExamplePrompt = (example: string) => {
    setPrompt(example);
    // Scroll the textarea into view
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.focus();
      // Scroll to the textarea with a small delay to ensure focus works
      setTimeout(() => {
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  return (
    <div className="container py-10 px-10">
      <div className="mb-8">
        <Button 
          variant="outline" 
          onClick={() => navigate("/")}
          className="mb-4"
        >
          ← Back to Rules
        </Button>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">AI Rule Creator</h1>
        <p className="text-muted-foreground text-lg">
          Describe the automation rule you want to create in plain language, and our AI will help you set it up.
        </p>
      </div>

      <Card className="p-6 mb-8 border-primary/30">
        <h2 className="text-xl font-semibold mb-4">Create New Automation</h2>
        
        {/* User type selection */}
        <div className="mb-6">
          <Label htmlFor="userType" className="font-medium block mb-2">Rule category:</Label>
          <Select
            value={selectedUserType}
            onValueChange={setSelectedUserType}
          >
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Select user type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin/Business Owner</SelectItem>
              <SelectItem value="security">Security Team</SelectItem>
              <SelectItem value="maintenance">Housekeeping & Maintenance</SelectItem>
              <SelectItem value="host">Host/Property Manager</SelectItem>
              <SelectItem value="guest">Guest</SelectItem>
              <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            Categorize this rule based on which role it's most relevant for
          </p>
        </div>
        
        {/* Information about available triggers and actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-muted/30 rounded-lg">
          <div>
            <h3 className="text-sm font-medium mb-2 text-primary">Available Triggers</h3>
            <ul className="text-sm space-y-1">
              {triggers.map(trigger => (
                <li key={trigger.id} className="flex items-start">
                  <span className="mr-1.5 text-primary text-xs mt-0.5">•</span>
                  <span>{trigger.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2 text-primary">Available Actions</h3>
            <ul className="text-sm space-y-1">
              {actions.map(action => (
                <li key={action.id} className="flex items-start">
                  <span className="mr-1.5 text-primary text-xs mt-0.5">•</span>
                  <span>{action.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Example prompts section */}
        <div className="mb-6">
          <div className="flex flex-col mb-3">
            <span className="text-sm font-medium mb-2">Try an example:</span>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((example, index) => (
                <Button 
                  key={index} 
                  variant="outline" 
                  size="sm" 
                  onClick={() => useExamplePrompt(example)}
                  className="text-xs border-primary/30 hover:bg-primary/5"
                >
                  {example.length > 40 ? example.substring(0, 40) + '...' : example}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="font-medium block mb-2">What automation would you like to create?</label>
          <div className="space-y-3">
            <Textarea
              placeholder="Example: When a guest checks in, send a welcome email after 10 minutes"
              className="w-full"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
            <div className="flex items-center gap-3">
              <Button 
                onClick={generateSuggestions}
                disabled={isGenerating || !prompt.trim()}
                className="px-6"
                size="lg"
              >
                {isGenerating ? <Spinner className="mr-2" /> : null}
                {isGenerating ? "Generating..." : "Generate Suggestions"}
              </Button>
              {!isGenerating && prompt.trim() && (
                <p className="text-muted-foreground text-sm">
                  AI will analyze your request and suggest matching rules
                </p>
              )}
            </div>
          </div>
        </div>
        
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-10 animate-pulse">
            <Spinner className="h-10 w-10 mb-4 text-primary" />
            <p className="text-muted-foreground">Analyzing your request and generating rule suggestions...</p>
          </div>
        )}
      </Card>

      {!isGenerating && suggestions.length > 0 && (
        <Card className="p-6 mb-8 border-primary/30">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <span className="bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">AI-Generated Suggestions</span>
            <Badge className="bg-primary/20 text-primary hover:bg-primary/30">{suggestions.length} option{suggestions.length !== 1 ? 's' : ''}</Badge>
          </h2>
          <p className="text-muted-foreground mb-6">
            Select the suggestion that best matches what you want to create:
          </p>

          <div className="grid gap-4">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`p-5 cursor-pointer border rounded-lg transition-all hover:shadow-md ${
                  selectedSuggestion === suggestion
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium text-lg">{suggestion.name}</h3>
                  <Badge 
                    variant={
                      suggestion.confidence > 0.8 ? "default" : 
                      suggestion.confidence > 0.6 ? "secondary" : "outline"
                    }
                    className="ml-2"
                  >
                    {Math.round(suggestion.confidence * 100)}% match
                  </Badge>
                </div>
                
                {suggestion.description && (
                  <p className="text-muted-foreground mb-4">
                    {suggestion.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2 mt-2">
                  <div className="flex items-center text-sm">
                    <span className="font-semibold mr-2">When:</span>
                    <Badge variant="secondary" className="font-normal">
                      {suggestion.triggerName}
                    </Badge>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="font-semibold mr-2">Then:</span>
                    <Badge variant="secondary" className="font-normal">
                      {suggestion.actionName} ({getActionTypeLabel(suggestion.actionType)}
                      {suggestion.actionType === "scheduled" && suggestion.scheduleDelay 
                        ? ` after ${formatScheduleDelay(suggestion.scheduleDelay)}` 
                        : ""})
                    </Badge>
                  </div>
                  {suggestion.userType && (
                    <div className="flex items-center text-sm">
                      <span className="font-semibold mr-2">For:</span>
                      <Badge 
                        className={
                          suggestion.userType === 'admin'
                            ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                            : suggestion.userType === 'security'
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : suggestion.userType === 'maintenance'
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : suggestion.userType === 'host'
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : suggestion.userType === 'guest'
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                        }
                      >
                        {suggestion.userType === 'admin'
                          ? 'Admin/Business Owner'
                          : suggestion.userType === 'security'
                          ? 'Security Team'
                          : suggestion.userType === 'maintenance'
                          ? 'Housekeeping & Maintenance'
                          : suggestion.userType === 'host'
                          ? 'Host/Property Manager'
                          : suggestion.userType === 'guest'
                          ? 'Guest'
                          : 'Miscellaneous'}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {selectedSuggestion && (
            <div className="mt-6">
              <div className="mb-4 p-4 bg-muted/30 rounded-lg">
                <h3 className="text-sm font-medium mb-2">Selected user category:</h3>
                <Badge
                  className={
                    selectedUserType === 'admin'
                      ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                      : selectedUserType === 'security'
                      ? 'bg-red-100 text-red-800 hover:bg-red-200'
                      : selectedUserType === 'maintenance'
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : selectedUserType === 'host'
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : selectedUserType === 'guest'
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                  }
                >
                  {selectedUserType === 'admin'
                    ? 'Admin/Business Owner'
                    : selectedUserType === 'security'
                    ? 'Security Team'
                    : selectedUserType === 'maintenance'
                    ? 'Housekeeping & Maintenance'
                    : selectedUserType === 'host'
                    ? 'Host/Property Manager'
                    : selectedUserType === 'guest'
                    ? 'Guest'
                    : 'Miscellaneous'}
                </Badge>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleCreateRule}
                  disabled={createRuleMutation.isPending}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  {createRuleMutation.isPending ? <Spinner className="mr-2" /> : null}
                  {createRuleMutation.isPending ? "Creating..." : "Create Selected Rule"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {!isGenerating && suggestions.length === 0 && prompt && (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <p className="text-muted-foreground">
            No rule suggestions yet. Enter a prompt and click "Generate Suggestions".
          </p>
        </div>
      )}
    </div>
  );
}