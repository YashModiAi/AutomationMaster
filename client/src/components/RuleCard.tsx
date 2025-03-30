import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Rule } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatRelative } from "date-fns";
import { Pencil, Trash2, ArrowRight, Play, Clock, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatScheduleDelay } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RuleCardProps {
  rule: Rule;
}

export default function RuleCard({ rule }: RuleCardProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Format last triggered date
  const formatLastTriggered = (date: Date | null) => {
    if (!date) return "Never triggered";
    return `Last triggered: ${formatRelative(new Date(date), new Date())}`;
  };

  // Toggle rule active status
  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/rules/${rule.id}/toggle`, null);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      toast({
        title: rule.isActive ? "Rule deactivated" : "Rule activated",
        description: `"${rule.name}" is now ${rule.isActive ? "inactive" : "active"}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${rule.isActive ? "deactivate" : "activate"} rule`,
        variant: "destructive",
      });
    }
  });

  // Delete rule
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/rules/${rule.id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      toast({
        title: "Rule deleted",
        description: `"${rule.name}" has been removed`,
      });
      setShowDeleteDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    }
  });

  // Trigger rule simulation
  const triggerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/rules/${rule.id}/trigger`, null);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      toast({
        title: "Rule triggered",
        description: `Successfully executed "${rule.name}"`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to trigger rule",
        variant: "destructive",
      });
    }
  });

  const handleToggle = () => {
    toggleMutation.mutate();
  };

  const handleEdit = () => {
    navigate(`/rules/edit/${rule.id}`);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
  };

  const handleRuleTest = () => {
    if (!rule.isActive) {
      toast({
        title: "Cannot trigger inactive rule",
        description: "Activate the rule first to test it",
        variant: "destructive",
      });
      return;
    }
    triggerMutation.mutate();
  };

  return (
    <TooltipProvider>
      <div 
        className={`rule-card bg-white rounded-lg shadow-sm hover:shadow transition-all duration-200 
          border ${rule.isActive ? 'border-primary/10' : 'border-gray-200'} overflow-hidden
          ${isHovered ? 'translate-y-[-2px]' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center">
              <Badge 
                variant={rule.isActive ? "default" : "outline"} 
                className={`mr-2 text-xs px-1.5 ${!rule.isActive && 'text-gray-500 bg-gray-100'}`}
              >
                {rule.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <h3 className="font-semibold text-lg text-gray-800 line-clamp-1">{rule.name}</h3>
            </div>
            <div className="flex space-x-1 ml-2 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    onClick={handleEdit}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit rule</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete rule</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center mb-4 gap-2">
            <div 
              className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer flex items-center"
              onClick={handleRuleTest}
              title="Click to test this trigger"
            >
              <span className="line-clamp-1">Trigger #{rule.triggerId}</span>
            </div>
            <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <div className="bg-primary/5 text-primary text-xs px-2.5 py-1 rounded-full font-medium flex items-center">
              <span className="line-clamp-1">Action #{rule.actionId}</span>
            </div>
            
            {rule.actionType === 'scheduled' && rule.scheduleDelay && (
              <Badge variant="outline" className="ml-1 text-xs bg-orange-50 text-orange-700 border-orange-200 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatScheduleDelay(rule.scheduleDelay)}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {rule.description || "No description provided"}
          </p>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 flex items-center">
              <Calendar className="h-3 w-3 mr-1 text-gray-400" />
              {formatLastTriggered(rule.lastTriggered)}
            </span>
            
            <div className="flex items-center space-x-2">
              {rule.isActive && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 px-2 text-xs flex items-center"
                      onClick={handleRuleTest}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Test
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Manually trigger this rule</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              <Switch 
                checked={rule.isActive}
                onCheckedChange={handleToggle}
              />
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{rule.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
