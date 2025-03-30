import { useState, useEffect } from "react";
import { useLocation, useParams, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InsertRule, Rule, actionScheduleEnum, insertRuleSchema, userTypeEnum } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import AddItemDialog from "@/components/AddItemDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
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
import { ArrowRight, X, Bell, Zap, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// We need to add validation to make sure the user selects a trigger and action
const ruleFormSchema = insertRuleSchema.extend({
  name: z.string().min(1, "Rule name is required"),
  triggerId: z.number().min(1, "Trigger is required"),
  actionId: z.number().min(1, "Action is required"),
  userType: z.enum(["admin", "security", "maintenance", "host", "guest"], {
    required_error: "Please select a user type",
  }),
});

type RuleFormValues = z.infer<typeof ruleFormSchema>;
type Trigger = { id: number; name: string; description: string | null; createdAt: string };
type Action = { id: number; name: string; description: string | null; createdAt: string };

export default function RuleCreator() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute<{ id: string }>("/rules/edit/:id");
  const ruleId = match ? parseInt(params.id) : undefined;
  const isEditMode = !!ruleId;

  const [immediateDetailsVisible, setImmediateDetailsVisible] = useState(true);
  const [scheduledDetailsVisible, setScheduledDetailsVisible] = useState(false);
  const [isAddTriggerDialogOpen, setIsAddTriggerDialogOpen] = useState(false);
  const [isAddActionDialogOpen, setIsAddActionDialogOpen] = useState(false);

  // Fetch all triggers and actions for selection
  const { data: triggers = [] } = useQuery<Trigger[]>({
    queryKey: ['/api/triggers'],
  });

  const { data: actions = [] } = useQuery<Action[]>({
    queryKey: ['/api/actions'],
  });

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
      triggerId: 0,
      triggerConditions: [],
      actionId: 0,
      actionType: "immediate",
      actionDetails: {},
      scheduleDelay: 0,
      userType: "admin", // Default to admin
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

  // Get selected trigger and action names for display
  const selectedTriggerId = form.watch("triggerId");
  const selectedActionId = form.watch("actionId");
  const watchedActionType = form.watch("actionType") as "immediate" | "scheduled";
  const watchedScheduleDelay = form.watch("scheduleDelay");
  const watchedUserType = form.watch("userType");

  const selectedTrigger = triggers.find(t => t.id === selectedTriggerId);
  const selectedAction = actions.find(a => a.id === selectedActionId);

  // Create rule mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertRule) => {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to create rule');
      }
      
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
      const res = await fetch(`/api/rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to update rule');
      }
      
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

  const handleActionTypeChange = (value: "immediate" | "scheduled") => {
    form.setValue("actionType", value);
    setImmediateDetailsVisible(value === "immediate");
    setScheduledDetailsVisible(value === "scheduled");
  };

  const handleCancel = () => {
    setLocation("/");
  };

  // Function to get action details form fields based on selected action
  const getActionDetailsFields = () => {
    const actionName = selectedAction?.name;
    
    if (!actionName) return (
      <div className="py-6 text-center text-gray-500">
        Select an action first
      </div>
    );
    
    switch(actionName) {
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

  // Add dialogs for creating triggers and actions
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Add trigger dialog */}
      <AddItemDialog 
        open={isAddTriggerDialogOpen} 
        onOpenChange={setIsAddTriggerDialogOpen} 
        type="trigger" 
      />
      
      {/* Add action dialog */}
      <AddItemDialog 
        open={isAddActionDialogOpen} 
        onOpenChange={setIsAddActionDialogOpen} 
        type="action" 
      />
      
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
                  <FormItem className="mb-4">
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
              
              {/* User Type Selector */}
              <FormField
                control={form.control}
                name="userType"
                render={({ field }) => (
                  <FormItem className="mb-6">
                    <FormLabel>User Type</FormLabel>
                    <FormDescription>
                      Select the type of user this rule is for
                    </FormDescription>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin/Business Owner</SelectItem>
                        <SelectItem value="security">Security Team</SelectItem>
                        <SelectItem value="maintenance">Housekeeping & Maintenance</SelectItem>
                        <SelectItem value="host">Host/Property Manager</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
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
                    name="triggerId"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Select Trigger</FormLabel>
                        <Select
                          value={field.value ? String(field.value) : undefined}
                          onValueChange={(value) => field.onChange(Number(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a trigger..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {triggers.length > 0 ? (
                              triggers.map((trigger) => (
                                <SelectItem key={trigger.id} value={String(trigger.id)}>
                                  {trigger.name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-center text-sm text-gray-500">
                                No triggers found. Add one first.
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Add button to create a new trigger */}
                  {triggers.length === 0 ? (
                    <div className="mb-4">
                      <EmptyState
                        title="No triggers available"
                        description="Create a new trigger to use in your automation rule"
                        buttonText="Create Trigger"
                        onClick={() => setIsAddTriggerDialogOpen(true)}
                        icon={<Bell className="h-10 w-10" />}
                      />
                    </div>
                  ) : (
                    <div className="flex justify-end mb-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsAddTriggerDialogOpen(true)}
                      >
                        Add New Trigger
                      </Button>
                    </div>
                  )}
                  
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
                          Only for bookings longer than 7 days
                        </label>
                      </div>
                      <div className="flex items-center">
                        <Checkbox 
                          id="condition-3" 
                          checked={form.getValues('triggerConditions')?.includes('new_guests')}
                          onCheckedChange={(checked) => {
                            const current = form.getValues('triggerConditions') || [];
                            if (checked) {
                              form.setValue('triggerConditions', [...current, 'new_guests']);
                            } else {
                              form.setValue('triggerConditions', current.filter(c => c !== 'new_guests'));
                            }
                          }}
                        />
                        <label htmlFor="condition-3" className="ml-2 text-sm text-gray-700">
                          Only for new guests
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Section */}
                <div className="bg-gray-50 rounded-lg p-5">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Do this...</h3>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Description (optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add a description of what this rule does" 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="actionId"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Select Action</FormLabel>
                        <Select
                          value={field.value ? String(field.value) : undefined}
                          onValueChange={(value) => field.onChange(Number(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an action..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {actions.length > 0 ? (
                              actions.map((action) => (
                                <SelectItem key={action.id} value={String(action.id)}>
                                  {action.name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-center text-sm text-gray-500">
                                No actions found. Add one first.
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Add button to create a new action */}
                  {actions.length === 0 ? (
                    <div className="mb-4">
                      <EmptyState
                        title="No actions available"
                        description="Create a new action to use in your automation rule"
                        buttonText="Create Action"
                        onClick={() => setIsAddActionDialogOpen(true)}
                        icon={<Zap className="h-10 w-10" />}
                      />
                    </div>
                  ) : (
                    <div className="flex justify-end mb-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsAddActionDialogOpen(true)}
                      >
                        Add New Action
                      </Button>
                    </div>
                  )}
                  
                  <Tabs defaultValue="immediate" className="mb-4">
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger 
                        value="immediate"
                        onClick={() => handleActionTypeChange('immediate')}
                      >
                        Immediately
                      </TabsTrigger>
                      <TabsTrigger 
                        value="scheduled"
                        onClick={() => handleActionTypeChange('scheduled')}
                      >
                        Scheduled
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="immediate" className="pt-3">
                      <p className="text-sm text-gray-500">The action will be executed immediately when the trigger occurs.</p>
                    </TabsContent>
                    <TabsContent value="scheduled" className="pt-3">
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
                                placeholder="Enter delay in minutes" 
                                {...field} 
                                onChange={(e) => field.onChange(e.target.valueAsNumber)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                  
                  {selectedActionId > 0 && (
                    <div className="bg-gray-100 rounded-md p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Action Details</h4>
                      {getActionDetailsFields()}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Preview Section */}
              <div className="mt-8 p-5 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Preview</h3>
                <div className="flex items-center mb-2">
                  {watchedUserType && (
                    <Badge
                      className={`mr-3 ${
                        watchedUserType === 'admin'
                          ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                          : watchedUserType === 'security'
                          ? 'bg-red-100 text-red-800 hover:bg-red-200'
                          : watchedUserType === 'maintenance'
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : watchedUserType === 'host'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      }`}
                    >
                      {watchedUserType === 'admin'
                        ? 'Admin/Business Owner'
                        : watchedUserType === 'security'
                        ? 'Security Team'
                        : watchedUserType === 'maintenance'
                        ? 'Housekeeping & Maintenance'
                        : watchedUserType === 'host'
                        ? 'Host/Property Manager'
                        : 'Guest'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center">
                  <div className="text-base">
                    <span className="font-medium">If</span> <span className="text-blue-600">{selectedTrigger?.name || "a trigger"}</span> <span className="font-medium">happens, then</span> <span className="text-green-600">{selectedAction?.name || "an action"}</span> <span className="font-medium">will execute</span> <span className="text-purple-600">{getDelayText()}</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {form.getValues('triggerConditions')?.length > 0 && (
                    <div className="mb-1">
                      <span className="font-medium">Conditions:</span> {form.getValues('triggerConditions').join(', ')}
                    </div>
                  )}
                  {form.getValues('description') && (
                    <div>
                      <span className="font-medium">Description:</span> {form.getValues('description')}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
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
                  {createMutation.isPending || updateMutation.isPending ? (
                    "Saving..."
                  ) : isEditMode ? (
                    "Update Rule"
                  ) : (
                    "Create Rule"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}