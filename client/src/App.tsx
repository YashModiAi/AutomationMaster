import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import RuleCreator from "@/pages/RuleCreator";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/rules/new" component={RuleCreator} />
      <Route path="/rules/edit/:id" component={RuleCreator} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
