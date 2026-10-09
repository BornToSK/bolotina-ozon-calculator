import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({base:process.env.VITE_BASE_PATH??'/',plugins:[react()],build:{rollupOptions:{output:{manualChunks(id){
 if(/node_modules\/(react|react-dom|scheduler|react-is|use-sync-external-store|@tanstack\/react-table|@tanstack\/table-core)\//.test(id)||id.includes('commonjsHelpers'))return 'react';
 if(id.includes('/node_modules/xlsx/'))return 'excel';
 if(id.includes('/node_modules/lucide-react/'))return 'icons';
 if(id.includes('/node_modules/fflate/'))return 'archive';
 if(id.includes('/node_modules/'))return 'charts';
 if(id.endsWith('/tariffs/ozon-2026-10-05.json'))return 'tariff';
 if(id.endsWith('/src/data/initial.json'))return 'products';
 if(id.endsWith('/src/data/legacy-config.json'))return 'legacy';
}}}},test:{include:['tests/**/*.test.ts']}});

