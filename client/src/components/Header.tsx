import { Settings, ClipboardList, Menu, X, Plus, Bell, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useState } from "react";

interface HeaderProps {
  onCreateRule?: () => void;
}

export default function Header({ onCreateRule }: HeaderProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <header className="bg-white shadow relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Settings className="text-primary mr-2 h-5 w-5" />
              <h1 className="text-xl font-semibold text-gray-800">Automation Rules</h1>
            </Link>
          </div>
          
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex space-x-8">
              <Link href="/" className={`text-sm font-medium ${location === '/' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                Dashboard
              </Link>
              <Link href="/activity" className={`text-sm font-medium flex items-center ${location === '/activity' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                <ClipboardList className="mr-1 h-4 w-4" />
                Activity Logs
              </Link>
              <Link href="/settings" className={`text-sm font-medium flex items-center ${location === '/settings' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                <Cog className="mr-1 h-4 w-4" />
                Settings
              </Link>
            </nav>
            
            <div className="flex items-center space-x-4">
              {onCreateRule && (
                <Button 
                  onClick={onCreateRule} 
                  className="px-4 py-2 bg-primary text-white rounded-md flex items-center hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Rule
                </Button>
              )}
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5 text-gray-600" />
              </Button>
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-medium">
                JS
              </div>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-4">
            {onCreateRule && (
              <Button 
                onClick={onCreateRule} 
                variant="default"
                size="sm"
                className="rounded-md flex items-center"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5 text-gray-600" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1" 
              onClick={toggleMobileMenu}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-md">
          <div className="px-4 py-3 space-y-2">
            <Link 
              href="/" 
              className={`block py-2 px-4 text-base font-medium rounded-md ${location === '/' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              href="/activity" 
              className={`block py-2 px-4 text-base font-medium rounded-md ${location === '/activity' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                <ClipboardList className="mr-2 h-5 w-5" />
                Activity Logs
              </div>
            </Link>
            <Link 
              href="/settings" 
              className={`block py-2 px-4 text-base font-medium rounded-md ${location === '/settings' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                <Cog className="mr-2 h-5 w-5" />
                Settings
              </div>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
