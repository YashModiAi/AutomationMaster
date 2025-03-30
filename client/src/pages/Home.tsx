import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import RuleCard from "@/components/RuleCard";
import AddRuleCard from "@/components/AddRuleCard";
import Tips from "@/components/Tips";
import { Rule } from "@shared/schema";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [showTips, setShowTips] = useState(true);

  const { data: rules, isLoading, isError } = useQuery<Rule[]>({
    queryKey: ['/api/rules'],
  });

  const handleCreateRule = () => {
    setLocation("/rules/new");
  };

  const filteredRules = rules?.filter(rule => 
    rule.name.toLowerCase().includes(search.toLowerCase()) || 
    rule.description?.toLowerCase().includes(search.toLowerCase()) ||
    rule.trigger.toLowerCase().includes(search.toLowerCase()) ||
    rule.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCreateRule={handleCreateRule} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Automation Rules</h2>
            <div className="flex space-x-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search rules..."
                  className="pl-10 pr-4 py-2"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-5">
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
            <div className="p-8 text-center">
              <p className="text-red-500 mb-4">Failed to load automation rules</p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/rules'] })}
                variant="outline"
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRules?.map(rule => (
                <RuleCard key={rule.id} rule={rule} />
              ))}
              <AddRuleCard onClick={handleCreateRule} />
            </div>
          )}
        </div>
      </main>

      {showTips && <Tips onClose={() => setShowTips(false)} />}
    </div>
  );
}
