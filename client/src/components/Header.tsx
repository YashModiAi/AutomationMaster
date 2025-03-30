import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onCreateRule?: () => void;
}

export default function Header({ onCreateRule }: HeaderProps) {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Settings className="text-primary mr-2 h-5 w-5" />
          <h1 className="text-xl font-semibold text-gray-800">Automation Rules</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={onCreateRule} 
            className="px-4 py-2 bg-primary text-white rounded-md flex items-center hover:bg-blue-600 transition-colors"
          >
            <span className="mr-1">+</span>
            Create Rule
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </Button>
          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-medium">
            JS
          </div>
        </div>
      </div>
    </header>
  );
}
