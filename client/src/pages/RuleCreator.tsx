import { useState, useEffect } from "react";
import { useLocation, useParams, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InsertRule, Rule, triggerTypes, actionTypes, insertRuleSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ruleFormSchema = insertRuleSchema.extend({
  name: z.string().min(1, "Rule name is required"),
  trigger: z.string().min(1, "Trigger is required"),
  action: z.string().min(1, "Action is required"),
  actionDetails: z.record(z.any()).default({}),
});

type RuleFormValues = z.infer<typeof ruleFormSchema>;

export default function RuleCreator() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute<{ id: string }>("/rules/edit/:id");
  const ruleId = match ? parseInt(params.id) : undefined;
  const isEditMode = !!ruleId;

  const [immediateDetailsVisible, setImmediateDetailsVisible] = useState(true);
  const [scheduledDetailsVisible, setScheduledDetailsVisible] = useState(false);

  // Fetch rule if in edit mode
  const { data: ruleData, isLoading: isLoadingRule } = useQuery<Rule>({
    queryKey: [`/api/rules/${ruleId}`],
    enabled: isEditMode,
  });

  // Form setup
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      trigger: "",
      triggerConditions: [],
      action: "",
      actionType: "immediate",
      actionDetails: {},
      scheduleDelay: 0,
      isActive: true,
    },
  });

  // Update form values when editing existing rule
  useEffect(() => {
    if (ruleData) {
      form.reset(ruleData);
      setImmediateDetailsVisible(ruleData.actionType === "immediate");
      setScheduledDetailsVisible(ruleData.actionType === "scheduled");
    }
  }, [ruleData, form]);

  // Watch form values for preview
  const watchedName = form.watch("name");
  const watchedTrigger = form.watch("trigger");
  const watchedAction = form.watch("action");
  const watchedActionType = form.watch("actionType");
  const watchedScheduleDelay = form.watch("scheduleDelay");

  // Create rule mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertRule) => {
      const res = await apiRequest("POST", "/api/rules", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      toast({
        title: "Success",
        description: "Automation rule created successfully!",
        variant: "default",
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create rule: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update rule mutation
  const updateMutation = useMutation({
    mutationFn: async (data: InsertRule & { id: number }) => {
      const { id, ...updateData } = data;
      const res = await apiRequest("PATCH", `/api/rules/${id}`, updateData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      queryClient.invalidateQueries({ queryKey: [`/api/rules/${ruleId}`] });
      toast({
        title: "Success",
        description: "Automation rule updated successfully!",
        variant: "default",
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update rule: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: RuleFormValues) => {
    if (isEditMode && ruleId) {
      updateMutation.mutate({ ...data, id: ruleId });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleActionTypeChange = (value: string) => {
    form.setValue("actionType", value);
    setImmediateDetailsVisible(value === "immediate");
    setScheduledDetailsVisible(value === "scheduled");
  };

  const handleCancel = () => {
    setLocation("/");
  };

  // Function to get action details form fields based on selected action
  const getActionDetailsFields = () => {
    const action = form.watch("action");
    
    switch(action) {
      case "Send email":
        return (
          <>
            <div className="space-y-3">
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Recipient</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Email address" 
                    {...form.register('actionDetails.recipient')}
                  />
                </FormControl>
              </FormItem>
              
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Subject</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Email subject" 
                    {...form.register('actionDetails.subject')}
                  />
                </FormControl>
              </FormItem>
              
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Message</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter message content" 
                    rows={3} 
                    {...form.register('actionDetails.message')}
                  />
                </FormControl>
              </FormItem>
            </div>
          </>
        );
        
      case "Send Slack notification":
        return (
          <>
            <div className="space-y-3">
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Channel</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Slack channel (e.g. #general)" 
                    {...form.register('actionDetails.channel')}
                  />
                </FormControl>
              </FormItem>
              
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Message</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter message content" 
                    rows={3} 
                    {...form.register('actionDetails.message')}
                  />
                </FormControl>
              </FormItem>
            </div>
          </>
        );
        
      case "Create task":
        return (
          <>
            <div className="space-y-3">
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Task Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Task name" 
                    {...form.register('actionDetails.taskName')}
                  />
                </FormControl>
              </FormItem>
              
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Assignee</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Person or team to assign" 
                    {...form.register('actionDetails.assignee')}
                  />
                </FormControl>
              </FormItem>
              
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Priority</FormLabel>
                <FormControl>
                  <Select 
                    onValueChange={(val) => form.setValue('actionDetails.priority', val)}
                    defaultValue={form.getValues('actionDetails.priority') || "Medium"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            </div>
          </>
        );
        
      case "Turn on device":
      case "Turn off device":
        return (
          <>
            <div className="space-y-3">
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Device ID</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Device identifier" 
                    {...form.register('actionDetails.deviceId')}
                  />
                </FormControl>
              </FormItem>
              
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Device Type</FormLabel>
                <FormControl>
                  <Select 
                    onValueChange={(val) => form.setValue('actionDetails.deviceType', val)}
                    defaultValue={form.getValues('actionDetails.deviceType') || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select device type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="thermostat">Thermostat</SelectItem>
                      <SelectItem value="door">Door</SelectItem>
                      <SelectItem value="tv">TV</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            </div>
          </>
        );
        
      case "Send native notification":
        return (
          <>
            <div className="space-y-3">
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Title</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Notification title" 
                    {...form.register('actionDetails.title')}
                  />
                </FormControl>
              </FormItem>
              
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Message</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Notification message" 
                    rows={3} 
                    {...form.register('actionDetails.message')}
                  />
                </FormControl>
              </FormItem>
              
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Recipients</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="User IDs or 'all'" 
                    {...form.register('actionDetails.recipients')}
                  />
                </FormControl>
              </FormItem>
            </div>
          </>
        );
        
      default:
        return (
          <div className="py-6 text-center text-gray-500">
            Select an action type first
          </div>
        );
    }
  };

  // Determine the delay text for the preview
  const getDelayText = () => {
    if (watchedActionType === 'immediate') {
      return 'immediately';
    } else {
      const delay = watchedScheduleDelay || 0;
      if (delay < 60) {
        return `after ${delay} minutes`;
      } else if (delay === 60) {
        return 'after 1 hour';
      } else if (delay % 60 === 0) {
        return `after ${delay / 60} hours`;
      } else {
        const hours = Math.floor(delay / 60);
        const minutes = delay % 60;
        return `after ${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
    }
  };

  if (isEditMode && isLoadingRule) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="p-6">
              <Skeleton className="h-10 w-full mb-6" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
              <Skeleton className="h-24 w-full mt-8" />
              <div className="flex justify-end mt-6 space-x-3">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {isEditMode ? "Edit Automation Rule" : "Create Automation Rule"}
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="mb-6">
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Give your rule a descriptive name" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Trigger Section */}
                <div className="bg-gray-50 rounded-lg p-5">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">When this happens...</h3>
                  
                  <FormField
                    control={form.control}
                    name="trigger"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Select Trigger</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a trigger..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {triggerTypes.map((trigger) => (
                              <SelectItem key={trigger} value={trigger}>
                                {trigger}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="mb-4">
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Trigger Conditions</Label>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Checkbox 
                          id="condition-1" 
                          checked={form.getValues('triggerConditions')?.includes('weekdays')}
                          onCheckedChange={(checked) => {
                            const current = form.getValues('triggerConditions') || [];
                            if (checked) {
                              form.setValue('triggerConditions', [...current, 'weekdays']);
                            } else {
                              form.setValue('triggerConditions', current.filter(c => c !== 'weekdays'));
                            }
                          }}
                        />
                        <label htmlFor="condition-1" className="ml-2 text-sm text-gray-700">
                          Only on weekdays
                        </label>
                      </div>
                      <div className="flex items-center">
                        <Checkbox 
                          id="condition-2" 
                          checked={form.getValues('triggerConditions')?.includes('long_bookings')}
                          onCheckedChange={(checked) => {
                            const current = form.getValues('triggerConditions') || [];
                            if (checked) {
                              form.setValue('triggerConditions', [...current, 'long_bookings']);
                            } else {
                              form.setValue('triggerConditions', current.filter(c => c !== 'long_bookings'));
                            }
                          }}
                        />
                        <label htmlFor="condition-2" className="ml-2 text-sm text-gray-700">
                          Only for bookings longer than 3 days
                        </label>
                      </div>
                      <Button 
                        type="button" 
                        variant="link" 
                        className="text-primary text-sm font-medium flex items-center mt-1 p-0 h-auto"
                      >
                        <span className="mr-1">+</span> Add condition
                      </Button>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe what this rule does..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Action Section */}
                <div className="bg-gray-50 rounded-lg p-5">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Do this...</h3>
                  
                  {/* Action Type Tabs */}
                  <div className="mb-4">
                    <Tabs 
                      defaultValue="immediate" 
                      value={form.watch("actionType")}
                      onValueChange={handleActionTypeChange}
                    >
                      <TabsList className="w-full">
                        <TabsTrigger value="immediate" className="flex-1">
                          Immediate Action
                        </TabsTrigger>
                        <TabsTrigger value="scheduled" className="flex-1">
                          Scheduled Action
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="immediate">
                        {immediateDetailsVisible && (
                          <div className="mt-4">
                            <FormField
                              control={form.control}
                              name="action"
                              render={({ field }) => (
                                <FormItem className="mb-4">
                                  <FormLabel>Select Action</FormLabel>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select an action..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {actionTypes.map((action) => (
                                        <SelectItem key={action} value={action}>
                                          {action}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div>
                              <Label className="block text-sm font-medium text-gray-700 mb-1">Action Details</Label>
                              {getActionDetailsFields()}
                            </div>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="scheduled">
                        {scheduledDetailsVisible && (
                          <div className="mt-4">
                            <FormField
                              control={form.control}
                              name="scheduleDelay"
                              render={({ field }) => (
                                <FormItem className="mb-4">
                                  <FormLabel>Delay (minutes)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1"
                                      placeholder="15" 
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="action"
                              render={({ field }) => (
                                <FormItem className="mb-4">
                                  <FormLabel>Select Action</FormLabel>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select an action..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {actionTypes.map((action) => (
                                        <SelectItem key={action} value={action}>
                                          {action}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div>
                              <Label className="block text-sm font-medium text-gray-700 mb-1">Action Details</Label>
                              {getActionDetailsFields()}
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </div>
              
              {/* Rule Preview */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Rule Preview</h3>
                <div className="flex items-center flex-wrap">
                  {watchedTrigger ? (
                    <div className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-md font-medium">
                      {watchedTrigger}
                    </div>
                  ) : (
                    <div className="bg-gray-100 text-gray-400 text-sm px-3 py-1 rounded-md font-medium">
                      Select a trigger
                    </div>
                  )}
                  
                  <ArrowRight className="mx-3 h-5 w-5 text-gray-400" />
                  
                  {watchedAction ? (
                    <div className="bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-md font-medium">
                      {watchedAction}
                    </div>
                  ) : (
                    <div className="bg-gray-100 text-gray-400 text-sm px-3 py-1 rounded-md font-medium">
                      Select an action
                    </div>
                  )}
                  
                  {watchedAction && watchedTrigger && (
                    <div className="text-sm text-gray-600 ml-2">
                      {getDelayText()}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end mt-6 space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 
                    "Saving..." : 
                    isEditMode ? "Update Rule" : "Save Rule"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
