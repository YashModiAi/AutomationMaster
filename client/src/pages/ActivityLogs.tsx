import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { ActivityLog } from "@shared/schema";
import { Search, Filter, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimeToNow } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ActivityLogs() {
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const { data: logs, isLoading, isError } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity', { status: filter }],
    queryFn: () => {
      const url = filter && filter !== 'all'
        ? `/api/activity?status=${filter}` 
        : '/api/activity';
      return fetch(url).then(res => res.json());
    }
  });

  // Get related rule data for each log
  const { data: rules } = useQuery({
    queryKey: ['/api/rules'],
    enabled: !isLoading && !isError && logs !== undefined
  });

  const getRuleName = (ruleId: number) => {
    if (!rules || !Array.isArray(rules)) return "Unknown Rule";
    const rule = rules.find((r: any) => r.id === ruleId);
    return rule ? rule.name : "Unknown Rule";
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'success':
        return <Badge variant="outline" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Success</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800"><Calendar className="h-3 w-3 mr-1" /> Scheduled</Badge>;
      case 'canceled':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><XCircle className="h-3 w-3 mr-1" /> Canceled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredLogs = logs?.filter(log => 
    getRuleName(log.ruleId).toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Activity Logs</h2>
            <div className="flex space-x-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search logs..."
                  className="pl-10 pr-4 py-2"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-6 w-1/3" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <div className="flex justify-between mt-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center">
              <p className="text-red-500 mb-4">Failed to load activity logs</p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/activity'] })}
                variant="outline"
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <Clock className="h-12 w-12 text-gray-400 mb-3" />
                    <h3 className="text-xl font-medium text-gray-900 mb-1">No activity logs found</h3>
                    <p className="text-gray-500">
                      {filter ? `No ${filter} logs yet. Try changing the filter.` : 'No logs have been recorded yet.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredLogs.map(log => (
                  <Card key={log.id}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-base font-medium">
                          {getRuleName(log.ruleId)}
                        </CardTitle>
                        {getStatusBadge(log.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-500">
                          Triggered {formatTimeToNow(new Date(log.triggeredAt))}
                        </div>
                        {log.executedAt && (
                          <div className="text-sm text-gray-500">
                            Executed {formatTimeToNow(new Date(log.executedAt))}
                            {log.executionDuration && (
                              <span className="ml-2 text-xs text-gray-400">
                                ({(log.executionDuration / 1000).toFixed(2)}s)
                              </span>
                            )}
                          </div>
                        )}
                        {log.scheduleTime && (
                          <div className="text-sm text-gray-500">
                            {new Date(log.scheduleTime) > new Date() 
                              ? `Scheduled for ${formatTimeToNow(new Date(log.scheduleTime))}`
                              : `Was scheduled for ${formatTimeToNow(new Date(log.scheduleTime))}`}
                          </div>
                        )}
                        {log.details && log.details.error && (
                          <div className="text-sm text-red-500 mt-2">
                            Error: {log.details.error}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}