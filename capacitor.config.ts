import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.6a64a84eea4f4b719a4cf9914525b580',
  appName: 'Raio-X Comportamental',
  webDir: 'dist',
  server: {
    // For development with live-reload, uncomment and set your dev URL:
    // url: 'https://6a64a84e-ea4f-4b71-9a4c-f9914525b580.lovableproject.com?forceHideBadge=true',
    // cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0a0f',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0f',
    },
    // Prepared for future push notifications
    // PushNotifications: {
    //   presentationOptions: ['badge', 'sound', 'alert'],
    // },
  },
};

export default config;
