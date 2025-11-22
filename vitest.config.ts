import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
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
            ],
            provider: 'v8',
        },
    },
})
