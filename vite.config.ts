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
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          const normalized = id.replace(/\\/g, '/');

          if (normalized.includes('recharts')) return 'charts';
          if (normalized.includes('@supabase') || normalized.includes('websocket')) return 'data';
          if (normalized.includes('@tanstack')) return 'query';
          if (normalized.includes('react-router')) return 'router';
          if (normalized.includes('/react/') || normalized.includes('scheduler') || normalized.includes('use-subscription')) return 'react-core';
          if (normalized.includes('@radix-ui')) return 'ui-kit';
          if (normalized.includes('lucide-react')) return 'icons';
          if (normalized.includes('date-fns') || normalized.includes('zod') || normalized.includes('clsx') || normalized.includes('tailwind-merge')) return 'utils';
          if (normalized.includes('cmdk') || normalized.includes('embla') || normalized.includes('vaul')) return 'ui-helpers';
          return 'vendor';
        }
      }
    }
  },
}));
