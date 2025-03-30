import { Plus } from "lucide-react";

interface AddRuleCardProps {
  onClick: () => void;
}

export default function AddRuleCard({ onClick }: AddRuleCardProps) {
  return (
    <div 
      className="bg-white rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-6 cursor-pointer hover:border-primary transition-colors"
      onClick={onClick}
    >
      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
        <Plus className="h-5 w-5 text-primary" />
      </div>
      <p className="text-gray-600 font-medium">Create New Rule</p>
      <p className="text-xs text-gray-500 text-center mt-1">Click to add a new automation rule</p>
    </div>
  );
}
