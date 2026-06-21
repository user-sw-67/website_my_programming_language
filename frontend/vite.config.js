import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// .env лежит в website/.env (на уровень выше frontend/) — единый файл для backend и frontend
const envDir = '../';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, 'VITE_');
  return {
    envDir,
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://backend:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
