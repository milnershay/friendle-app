import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Logo from './Logo';

describe('Logo', () => {
    it('renders correctly with default props', () => {
        render(<Logo />);
        const logoImage = screen.getByAltText('Friendle Logo');
        expect(logoImage).toBeDefined();
        expect(screen.getByText('Friendle')).toBeDefined();
    });

    it('applies custom class name', () => {
        render(<Logo className="custom-class" />);
        // The outer container should have the custom class
        // We can find it by text since it contains the text "Friendle"
        const container = screen.getByText('Friendle').closest('div');
        expect(container?.className).toContain('custom-class');
    });

    it('applies custom size', () => {
        render(<Logo size={100} />);
        const logoImage = screen.getByAltText('Friendle Logo');
        expect(logoImage.getAttribute('width')).toBe('100');
        expect(logoImage.getAttribute('height')).toBe('100');

        const text = screen.getByText('Friendle');
        // Note: styles are applied inline, checking fontSize
        expect(text.style.fontSize).toBe('75px');
    });
});
