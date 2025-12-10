import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // safely expose API_KEY to the client-side code
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});