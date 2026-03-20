import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils', () => {
    describe('cn', () => {
        it('merges basic string classes', () => {
            expect(cn('class1', 'class2')).toBe('class1 class2');
        });

        it('handles conditional classes', () => {
            expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
        });

        it('handles arrays', () => {
            expect(cn(['class1', 'class2'])).toBe('class1 class2');
        });

        it('handles objects', () => {
            expect(cn({ 'class1': true, 'class2': false, 'class3': true })).toBe('class1 class3');
        });

        it('overrides tailwind classes correctly via tailwind-merge', () => {
            expect(cn('px-2 py-1 bg-red-500', 'px-4 bg-blue-500')).toBe('py-1 px-4 bg-blue-500');
            expect(cn('text-sm text-center', 'text-lg')).toBe('text-center text-lg');
        });

        it('handles mixed inputs', () => {
            expect(cn(
                'base-class',
                ['array-class1', 'array-class2'],
                { 'obj-class1': true, 'obj-class2': false },
                'px-2',
                'px-4'
            )).toBe('base-class array-class1 array-class2 obj-class1 px-4');
        });

        it('ignores null, undefined, and false', () => {
            expect(cn('class1', null, undefined, false, 'class2')).toBe('class1 class2');
        });
    });
});
