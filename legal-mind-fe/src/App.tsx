import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalErrorBoundary } from "@/components/app/GlobalErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { AuthProvider } from "@/providers/AuthProvider";
import { useAppStore } from "@/store/appStore";
import Index from "./pages/Index.tsx";
import Home from "./pages/Home.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import NotFound from "./pages/NotFound.tsx";
import { AppWebSocketProvider } from "@/realtime/websocket.context.tsx";

const queryClient = new QueryClient();
const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:4000/ws";

const ProtectedChatRoute = () => {
  const { hydrated, status } = useAuth();

  if (!hydrated || status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading workspace...</p>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/" replace />;
  }

  return <Index />;
};

const AppShell = () => {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const resetChat = useAppStore((state) => state.resetChat);

  const wsUrl = accessToken
    ? `${wsBaseUrl}?token=${encodeURIComponent(accessToken)}`
    : null;

  const handleResetChat = () => {
    resetChat();
    queryClient.removeQueries({ queryKey: ["chats"] });
  };

  return (
    <GlobalErrorBoundary onReset={handleResetChat}>
      <AppWebSocketProvider url={wsUrl}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/chat" element={<ProtectedChatRoute />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppWebSocketProvider>
    </GlobalErrorBoundary>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  </QueryClientProvider>
);

export default App;