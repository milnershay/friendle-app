import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
        coverage: {
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.test.{ts,tsx}',
                'src/**/*.stories.{ts,tsx}',
                'src/app/layout.tsx', // Often hard to test/not containing logic
                'src/app/api/**', // API routes might need different testing strategy
            ],
            provider: 'v8',
        },
    },
})
