import { render, screen } from '@testing-library/react';
import VersionDisplay from './VersionDisplay';
import { describe, it, expect, vi } from 'vitest';

describe('VersionDisplay', () => {
    it('renders the version when env var is set', () => {
        vi.stubEnv('NEXT_PUBLIC_APP_VERSION', '1.2.3');
        render(<VersionDisplay />);
        expect(screen.getByText('v1.2.3')).toBeDefined();
        vi.unstubAllEnvs();
    });

    it('returns null when env var is missing', () => {
        vi.stubEnv('NEXT_PUBLIC_APP_VERSION', '');
        const { container } = render(<VersionDisplay />);
        expect(container.firstChild).toBeNull();
        vi.unstubAllEnvs();
    });
});
