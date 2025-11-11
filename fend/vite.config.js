import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/", // where the app will be served under Laravel public
  resolve: {
    dedupe: ['react', 'react-dom'], // Ensure only one instance of React is used
  },
  optimizeDeps: {
    include: ['react', 'react-dom'], // Pre-bundle React to ensure single instance
  },
  build: {
    outDir: "../bend/public", // output INTO Laravel public
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    emptyOutDir: false, // Don't empty public dir to preserve Laravel's index.php
    rollupOptions: {
      output: {
        // Better handling of circular dependencies
        chunkFileNames: 'assets/[name]-[hash].js',
        manualChunks: (id) => {
          // Split vendor libraries into separate chunks for better caching and parallel loading
          if (id.includes('node_modules')) {
            // React core, router, AND all React-dependent packages together
            // This ensures React is available to all packages that need it
            if (
              id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/react-router') ||
              id.includes('react-bootstrap') ||
              id.includes('react-chartjs') ||
              id.includes('react-datepicker') ||
              id.includes('react-hot-toast') ||
              id.includes('react-icons') ||
              id === 'react' ||
              id === 'react-dom'
            ) {
              return 'react-vendor';
            }
            // Chart.js core library (no React dependency)
            if (id.includes('chart.js') && !id.includes('react-chartjs')) {
              return 'chart-vendor';
            }
            // PDF libraries (even though dynamically imported, keep them grouped)
            if (id.includes('jspdf')) {
              return 'pdf-vendor';
            }
            // Bootstrap CSS/JS (pure Bootstrap, no React dependency)
            if (id.includes('bootstrap') && !id.includes('react-bootstrap') && !id.includes('bootstrap-icons')) {
              return 'bootstrap-vendor';
            }
            // Bootstrap icons (just fonts/CSS, can be separate)
            if (id.includes('bootstrap-icons')) {
              return 'bootstrap-vendor'; // Just fonts, no JS dependency
            }
            // Excel library
            if (id.includes('exceljs')) {
              return 'excel-vendor';
            }
            // Date utilities
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            // Axios - common HTTP client (keep separate to avoid circular deps)
            if (id.includes('axios')) {
              return 'vendor-axios';
            }
            // FingerprintJS
            if (id.includes('@fingerprintjs') || id.includes('fingerprintjs')) {
              return 'vendor-utils';
            }
            // Other large vendor libraries
            if (id.includes('html2canvas') || id.includes('dompurify')) {
              return 'utils-vendor';
            }
            // For remaining packages, let Vite handle automatically to avoid circular dependencies
            // Return undefined for smaller packages to be included in main bundle or auto-chunked
            // Only force large packages into vendor
            if (id.includes('node_modules')) {
              // Check file size would be ideal but we can't here, so just return vendor for now
              // but this might cause circular deps - let's try returning undefined instead
              return undefined; // Let Vite auto-chunk to avoid circular dependencies
            }
            return undefined;
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB (default is 500KB)
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: false,        // important: don't WS proxy to Laravel API
      }
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  }

  //0000000000000000
  // server: {
  //   host: true, // optional; helps when testing
  // },

  // server: {
  //   host: '127.0.0.1',
  //   port: 5173,
  // },
});
