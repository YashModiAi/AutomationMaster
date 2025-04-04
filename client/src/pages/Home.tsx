import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import RuleCard from "@/components/RuleCard";
import AddRuleCard from "@/components/AddRuleCard";
import Tips from "@/components/Tips";
import { Rule } from "@shared/schema";
import { Search, Filter, Wand2, Info, ArrowRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Type of user for categorizing automation rules
type UserType = 'admin' | 'security' | 'maintenance' | 'host' | 'guest' | 'miscellaneous' | null;

// Helper to convert user type to display name
function getUserTypeLabel(type: UserType): string {
  switch (type) {
    case 'admin': return 'Admin/Business Owner';
    case 'security': return 'Security Team';
    case 'maintenance': return 'Housekeeping & Maintenance';
    case 'host': return 'Host/Property Manager';
    case 'guest': return 'Guest';
    case 'miscellaneous': return 'Miscellaneous';
    default: return 'All Roles';
  }
}

// Helper to get badge color for user type
function getUserTypeColor(type: UserType): string {
  switch (type) {
    case 'admin': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'security': return 'bg-red-100 text-red-700 border-red-200';
    case 'maintenance': return 'bg-green-100 text-green-700 border-green-200';
    case 'host': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'guest': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'miscellaneous': return 'bg-pink-100 text-pink-700 border-pink-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [showTips, setShowTips] = useState(true);
  const [filterUserType, setFilterUserType] = useState<UserType>(null);
  const isMobile = useIsMobile();

  const { data: rules, isLoading, isError } = useQuery<Rule[]>({
    queryKey: ['/api/rules']
  });

  const handleCreateRule = () => {
    setLocation("/rules/new");
  };

  // Filter rules by search term and user type
  const filteredRules = rules?.filter((rule: Rule) => {
    // Filter by search text
    const matchesSearch = 
      rule.name.toLowerCase().includes(search.toLowerCase()) || 
      (rule.description?.toLowerCase().includes(search.toLowerCase()) || false);
    
    // Filter by user type if one is selected
    const matchesUserType = !filterUserType || rule.userType === filterUserType;
    
    return matchesSearch && matchesUserType;
  });
  
  const activeRules = filteredRules?.filter(rule => rule.isActive).length || 0;
  const totalRules = filteredRules?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCreateRule={handleCreateRule} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          {/* Heading and stats summary */}
          <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Your Automation Rules</h2>
              {!isLoading && !isError && (
                <div className="mt-1 text-sm text-gray-500 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {activeRules} active
                  </Badge>
                  <span>{totalRules} total rules</span>
                  {filterUserType && (
                    <div className="flex items-center">
                      <span className="mx-1">•</span>
                      <Badge className={`${getUserTypeColor(filterUserType)}`}>
                        {getUserTypeLabel(filterUserType)}
                      </Badge>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-5 w-5 ml-1" 
                        onClick={() => setFilterUserType(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Action buttons - stacked on mobile, inline on desktop */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <Link 
                to="/rules/ai-new"
                className={buttonVariants({
                  variant: "outline",
                  className: "flex items-center justify-center"
                })}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                AI Rule Creator
              </Link>
              
              {/* Search and filter - full width on mobile, responsive on larger screens */}
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="Search rules..."
                    className="pl-10 pr-4 py-2 w-full"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className={`h-10 w-10 flex-shrink-0 relative ${filterUserType ? 'bg-primary/10 border-primary/30' : ''}`}>
                      <Filter className="h-4 w-4" />
                      {filterUserType && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className={!filterUserType ? "font-semibold bg-gray-50" : ""}
                      onClick={() => setFilterUserType(null)}
                    >
                      All Roles
                      {!filterUserType && <Badge className="ml-auto">Active</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className={filterUserType === 'admin' ? "font-semibold bg-gray-50" : ""}
                      onClick={() => setFilterUserType('admin')}
                    >
                      Admin/Business Owner
                      {filterUserType === 'admin' && <Badge className="ml-auto">Active</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className={filterUserType === 'security' ? "font-semibold bg-gray-50" : ""}
                      onClick={() => setFilterUserType('security')}
                    >
                      Security Team
                      {filterUserType === 'security' && <Badge className="ml-auto">Active</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className={filterUserType === 'maintenance' ? "font-semibold bg-gray-50" : ""}
                      onClick={() => setFilterUserType('maintenance')}
                    >
                      Housekeeping & Maintenance
                      {filterUserType === 'maintenance' && <Badge className="ml-auto">Active</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className={filterUserType === 'host' ? "font-semibold bg-gray-50" : ""}
                      onClick={() => setFilterUserType('host')}
                    >
                      Host/Property Manager
                      {filterUserType === 'host' && <Badge className="ml-auto">Active</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className={filterUserType === 'guest' ? "font-semibold bg-gray-50" : ""}
                      onClick={() => setFilterUserType('guest')}
                    >
                      Guest
                      {filterUserType === 'guest' && <Badge className="ml-auto">Active</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className={filterUserType === 'miscellaneous' ? "font-semibold bg-gray-50" : ""}
                      onClick={() => setFilterUserType('miscellaneous')}
                    >
                      Miscellaneous
                      {filterUserType === 'miscellaneous' && <Badge className="ml-auto">Active</Badge>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Quick intro for new users */}
          {!isLoading && !isError && totalRules === 0 && (
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="mb-4 md:mb-0 md:mr-6">
                  <div className="flex items-center mb-2">
                    <Info className="h-5 w-5 text-primary mr-2" />
                    <h3 className="font-semibold text-lg">Get Started with Automation Rules</h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Create your first automation rule to streamline your business workflows. 
                    Connect triggers with actions to automate repetitive tasks.
                  </p>
                  <div className="flex space-x-3">
                    <Button onClick={handleCreateRule} className="flex items-center">
                      Create First Rule
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => setLocation("/rules/ai-new")} className="flex items-center">
                      <Wand2 className="mr-2 h-4 w-4" />
                      Try AI Assistant
                    </Button>
                  </div>
                </div>
                <div className="hidden md:block bg-white/80 p-4 rounded-lg shadow-sm border border-primary/10 max-w-xs">
                  <p className="text-sm font-medium text-gray-700 mb-2">Example rules you can create:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-center">
                      <ArrowRight className="h-3 w-3 text-primary mr-1 flex-shrink-0" />
                      <span>Send email when an order is placed</span>
                    </li>
                    <li className="flex items-center">
                      <ArrowRight className="h-3 w-3 text-primary mr-1 flex-shrink-0" />
                      <span>Create task when payment is received</span>
                    </li>
                    <li className="flex items-center">
                      <ArrowRight className="h-3 w-3 text-primary mr-1 flex-shrink-0" />
                      <span>Schedule follow-up after customer visit</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(isMobile ? 2 : 3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                  <div className="flex justify-between items-start mb-3">
                    <Skeleton className="h-6 w-2/3" />
                    <div className="flex space-x-1">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center mb-4 space-x-2">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-3/4 mb-4" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-11 rounded-full" />
                  </div>
                </div>
              ))}
              <Skeleton className="bg-white rounded-lg border-2 border-dashed border-gray-300 h-52" />
            </div>
          ) : isError ? (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center">
              <p className="text-red-500 mb-4">Failed to load automation rules</p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/rules'] })}
                variant="outline"
              >
                Retry
              </Button>
            </div>
          ) : filteredRules && filteredRules.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredRules.map(rule => (
                <RuleCard key={rule.id} rule={rule} />
              ))}
              <AddRuleCard onClick={handleCreateRule} />
            </div>
          ) : search || filterUserType ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500 mb-2">
                {search && filterUserType
                  ? `No ${getUserTypeLabel(filterUserType).toLowerCase()} rules match your search`
                  : search
                  ? "No rules match your search"
                  : `No ${getUserTypeLabel(filterUserType).toLowerCase()} rules found`}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {search && (
                  <Button onClick={() => setSearch("")} variant="outline" size="sm">
                    Clear Search
                  </Button>
                )}
                {filterUserType && (
                  <Button onClick={() => setFilterUserType(null)} variant="outline" size="sm">
                    Show All Roles
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <AddRuleCard onClick={handleCreateRule} />
            </div>
          )}
        </div>
      </main>

      {showTips && <Tips onClose={() => setShowTips(false)} />}
    </div>
  );
}
