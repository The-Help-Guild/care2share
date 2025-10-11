import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import EditProfile from "./pages/EditProfile";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Profile from "./pages/Profile";
import MyProfile from "./pages/MyProfile";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/home" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/my-profile" element={<MyProfile />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
