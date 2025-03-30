import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Key } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";

// Form schema for settings
const settingsFormSchema = z.object({
  openaiApiKey: z
    .string()
    .min(1, "API key is required")
    .regex(/^sk-[a-zA-Z0-9]{32,}$/, "Invalid OpenAI API key format"),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function Settings() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const { toast } = useToast();

  // Check if OpenAI API key is configured
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const response = await apiRequest<{ hasKey: boolean }>({ 
          endpoint: '/api/settings/openai-key-status',
          method: 'GET'
        });
        
        if (response && response.hasKey !== undefined) {
          setHasKey(response.hasKey);
        }
      } catch (error) {
        console.error("Error checking API key status:", error);
      }
    };

    checkApiKey();
  }, []);

  // Form definition
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      openaiApiKey: "",
    },
  });

  // Submit handler
  const onSubmit = async (data: SettingsFormValues) => {
    setIsLoading(true);
    try {
      await apiRequest<{ success: boolean; message: string }>({
        endpoint: '/api/settings/openai-key',
        method: 'POST',
        data: { apiKey: data.openaiApiKey }
      });
      
      toast({
        title: "API Key Updated",
        description: "Your OpenAI API key has been securely saved.",
      });
      
      setHasKey(true);
      form.reset();
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error",
        description: "Failed to update API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Header />
      
      <div className="max-w-3xl mx-auto mt-8">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        
        {hasKey && (
          <Card className="mb-8 bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Key className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-green-700">
                  OpenAI API key is configured and ready to use
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>OpenAI API Configuration</CardTitle>
            <CardDescription>
              Set up your OpenAI API key to enable AI-powered rule creation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="openaiApiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OpenAI API Key</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="sk-..."
                          type="password"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Your API key will be securely stored in environment variables
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save API Key
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>AI Usage</CardTitle>
            <CardDescription>
              Information about AI features in this application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p>
                This application uses OpenAI's models to provide AI-assisted rule creation.
                When you use the "Create Rule with AI" feature, your inputs are sent to OpenAI
                to generate rule suggestions that match your business needs.
              </p>
              <h4 className="text-lg font-medium mt-4">Supported Features:</h4>
              <ul className="list-disc pl-5 mt-2">
                <li>Natural language rule creation</li>
                <li>Intelligent trigger and action matching</li>
                <li>Automatic scheduling recommendation</li>
                <li>Context-aware rules based on business domain</li>
              </ul>
              <h4 className="text-lg font-medium mt-4">Pricing:</h4>
              <p>
                You are billed by OpenAI based on your usage. For pricing details,
                please refer to the <a href="https://openai.com/pricing" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  OpenAI pricing page
                </a>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}