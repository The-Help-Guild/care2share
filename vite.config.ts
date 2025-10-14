import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://zufjzqrbipbvzqjhougo.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Zmp6cXJiaXBidnpxamhvdWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTQyNjcsImV4cCI6MjA3NTc3MDI2N30.Bt39Aeh3TOvJAEIE_IOUif_qnNBrk5tKjP8MzwSuvu0'),
  },
}));
