import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.personalfinance.manager',
  appName: 'personal-finance-manager',
  webDir: 'dist',
  plugins: {
    // Capacitor 8 ships SystemBars as a core plugin (no npm install needed).
    // targetSdk 36 forces edge-to-edge: the WebView draws behind the status
    // bar and cutout, so the real insets must be exposed to CSS.
    SystemBars: {
      // "css" injects --safe-area-inset-* on <html> and lets the WebView
      // draw edge-to-edge on modern WebViews. On older WebViews the plugin
      // pads the native view instead and sets the vars to 0 — so adding
      // safe-area padding in CSS can never produce a double gap.
      insetsHandling: 'css',
      // Matches the viewport-fit=cover meta tag in index.html and prevents
      // a layout shift on the first frame before the meta tag is measured.
      initialViewportFitValueHint: 'cover',
      // DEFAULT follows the device light/dark setting initially. The app
      // then calls SystemBars.setStyle() whenever the in-app theme changes.
      style: 'DEFAULT',
      hidden: false,
    },
  },
};

export default config;
