import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";

interface AddRuleCardProps {
  onClick: () => void;
}

export default function AddRuleCard({ onClick }: AddRuleCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`bg-white rounded-lg border-2 border-dashed ${isHovered ? 'border-primary bg-primary/5' : 'border-gray-300'} 
        flex flex-col items-center justify-center p-6 cursor-pointer transition-all duration-200 
        hover:shadow-md ${isHovered ? 'translate-y-[-2px]' : ''} min-h-[240px]`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`w-14 h-14 rounded-full ${isHovered ? 'bg-primary/20' : 'bg-gray-100'} 
        flex items-center justify-center mb-4 transition-colors`}>
        <Plus className={`h-6 w-6 ${isHovered ? 'text-primary' : 'text-gray-600'}`} />
      </div>
      <p className={`font-medium text-lg ${isHovered ? 'text-primary' : 'text-gray-700'}`}>
        Create New Rule
      </p>
      <div className="flex items-center gap-1 mt-3 bg-white/80 px-3 py-1.5 rounded-md">
        <Sparkles className="h-3 w-3 text-amber-500" />
        <p className="text-xs text-gray-600">Automate your workflows</p>
      </div>
      <p className="text-xs text-gray-500 text-center mt-3 max-w-[180px]">
        Connect triggers with actions to streamline your business processes
      </p>
    </div>
  );
}
