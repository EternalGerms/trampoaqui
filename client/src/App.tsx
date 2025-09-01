import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Services from "@/pages/services";
import Dashboard from "@/pages/dashboard";
import ProviderProfile from "@/pages/provider-profile";
import ProviderPublicProfile from "@/pages/provider-public-profile";
import ProviderDashboard from "@/pages/provider-dashboard";
import CompleteProfile from "@/pages/complete-profile";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/services" component={Services} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/provider/:id" component={ProviderProfile} />
      <Route path="/provider-profile/:id" component={ProviderPublicProfile} />
      <Route path="/provider-dashboard" component={ProviderDashboard} />
      <Route path="/complete-profile" component={CompleteProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
