import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 🌟 ADD THIS 'server' BLOCK 🌟
  server: {
    // This tells Vite's dev server to redirect all requests starting with '/api'
    // to your backend server running on http://localhost:3000.
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // <-- **Ensure this matches your Node.js port!**
        changeOrigin: true,
        secure: false, // Set to true if your backend uses HTTPS
        // rewrite: (path) => path.replace(/^\/api/, ''), // Often not needed if your backend also uses '/api'
      },
    }
  }
})