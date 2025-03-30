import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

export default function EmptyState({ 
  title, 
  description, 
  buttonText, 
  onClick,
  icon
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <div className="mb-4 text-gray-400">
        {icon || <Plus size={40} />}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 text-center mb-6 max-w-md">{description}</p>
      <Button onClick={onClick}>
        <Plus className="mr-2 h-4 w-4" />
        {buttonText}
      </Button>
    </div>
  );
}