import { useState } from 'react';
import { X, Lightbulb } from "lucide-react";

interface TipsProps {
  onClose: () => void;
}

const tips = [
  "Try combining multiple triggers and actions to create powerful workflows.",
  "Scheduled actions can help with follow-ups or reminders after a specific event.",
  "Use conditions to make your automation rules more specific and targeted.",
  "Test your rules after creating them to ensure they work as expected.",
  "You can create rules that work together in sequence by chaining them."
];

export default function Tips({ onClose }: TipsProps) {
  const [currentTip, setCurrentTip] = useState(0);

  const handleNextTip = () => {
    setCurrentTip((prev) => (prev + 1) % tips.length);
  };

  return (
    <div className="fixed bottom-6 right-6 max-w-xs bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
      <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
        <div className="flex items-center">
          <Lightbulb className="text-yellow-500 mr-2 h-5 w-5" />
          <h3 className="font-medium text-gray-800">Automation Tips</h3>
        </div>
        <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600 mb-3">{tips[currentTip]}</p>
        <div className="flex justify-end">
          <button 
            className="text-xs text-primary font-medium hover:text-blue-700"
            onClick={handleNextTip}
          >
            See more tips
          </button>
        </div>
      </div>
    </div>
  );
}
