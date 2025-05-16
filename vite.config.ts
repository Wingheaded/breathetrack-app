// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'; // Import the PWA plugin

export default defineConfig({
  plugins: [
    react(),
    // *** Add the VitePWA plugin configuration back in ***
    VitePWA({
      registerType: 'autoUpdate', // Keep the app updated automatically
      injectRegister: 'auto', // Let the plugin handle service worker registration
      workbox: {
         // Define which files the PWA's service worker should cache for offline use
         // This pattern covers common web assets.
         globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}']
      },
      // Include essential icons needed for the PWA manifest and install prompts
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'maskable-icon.png'],
      // Manifest details: Defines how the app appears when installed
      manifest: {
        name: 'BreatheTrack', // Full app name
        short_name: 'BreatheTrack', // Shorter name for home screens
        description: 'Track your COPD vitals and symptoms', // App description
        theme_color: '#ffffff', // Color of the browser toolbar (match your app theme)
        background_color: '#ffffff', // Color shown briefly on app start
        display: 'standalone', // Makes it feel more like a native app (hides browser UI)
        scope: '/', // The URL scope of the PWA
        start_url: '/', // Which page should open when the app is launched
        icons: [
          // --- Ensure these icon files exist in your 'public' folder ---
          {
            src: 'pwa-192x192.png', // Standard icon size
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png', // Larger icon size
            sizes: '512x512',
            type: 'image/png',
          },
          {
             src: 'maskable-icon.png', // Special icon format for Android adaptive icons
             sizes: '512x512',
             type: 'image/png',
             purpose: 'maskable' // Indicates it can be masked into shapes
          }
        ],
      },
    }),
  ],
  // Optional: Define base path if deploying to a subdirectory (e.g., '/breathetrack/')
  // base: '/',
});