import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Rule } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatRelative } from "date-fns";
import { Pencil, Trash2, ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
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

interface RuleCardProps {
  rule: Rule;
}

export default function RuleCard({ rule }: RuleCardProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    <>
      <div className="rule-card bg-white rounded-lg shadow-md transition-all duration-200 border border-gray-100 overflow-hidden">
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center">
              <span className={`w-3 h-3 ${rule.isActive ? 'bg-green-500' : 'bg-gray-400'} rounded-full mr-2`}></span>
              <h3 className="font-semibold text-lg text-gray-800">{rule.name}</h3>
            </div>
            <div className="flex">
              <button 
                className="text-gray-500 hover:text-gray-700 p-1"
                onClick={handleEdit}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button 
                className="text-gray-500 hover:text-red-500 p-1"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center mb-4">
            <div 
              className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium cursor-pointer"
              onClick={handleRuleTest}
              title="Click to test this trigger"
            >
              {rule.trigger}
            </div>
            <ArrowRight className="mx-2 h-3 w-3 text-gray-400" />
            <div className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
              {rule.action}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">{rule.description}</p>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {formatLastTriggered(rule.lastTriggered)}
            </span>
            <Switch 
              checked={rule.isActive}
              onCheckedChange={handleToggle}
            />
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
    </>
  );
}
