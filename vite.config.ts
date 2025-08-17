import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // Cette importation n'est plus nécessaire et peut être supprimée

export default defineConfig({
  plugins: [react()],
  // Suppression du bloc resolve et alias
});
