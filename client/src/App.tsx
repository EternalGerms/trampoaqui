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
import Profile from "@/pages/profile";
import ProviderProfile from "@/pages/provider-profile";
import ProviderDashboard from "@/pages/provider-dashboard";
import CompleteProfile from "@/pages/complete-profile";
import AdminDashboard from "@/pages/admin-dashboard";
import NotFound from "@/pages/not-found";
import EmailVerifiedPage from "@/pages/email-verified";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/services" component={Services} />
      <Route path="/verify-email" component={EmailVerifiedPage} />
      <Route path="/email-verified" component={EmailVerifiedPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile/:id" component={Profile} />
      <Route path="/provider/:id" component={ProviderProfile} />
      <Route path="/provider-dashboard" component={ProviderDashboard} />
      <Route path="/complete-profile" component={CompleteProfile} />
      <Route path="/admin" component={AdminDashboard} />
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
