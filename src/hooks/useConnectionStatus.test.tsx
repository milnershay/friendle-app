import { renderHook, act } from '@testing-library/react';
import { useConnectionStatus } from './useConnectionStatus';
import { onValue } from 'firebase/database';

// --- Mock Setup ---
let onValueCallback: (snapshot: { val: () => boolean | null }) => void;
const mockUnsubscribe = vi.fn();

vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  onValue: vi.fn().mockImplementation((_query, callback) => {
    onValueCallback = callback;
    return mockUnsubscribe;
  }),
}));
// --- End Mock Setup ---

describe('useConnectionStatus', () => {
  let onlineGetter: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onlineGetter = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
  });

  afterEach(() => {
    onlineGetter.mockRestore();
  });

  it('should return online and disconnected by default', () => {
    const { result } = renderHook(() => useConnectionStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isConnectedToFirebase).toBe(false);
  });

  it('should update isOnline when browser connection changes', () => {
    const { result } = renderHook(() => useConnectionStatus());

    act(() => {
      onlineGetter.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      onlineGetter.mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOnline).toBe(true);
  });

  it('should update isConnectedToFirebase when Firebase connection changes', () => {
    const { result } = renderHook(() => useConnectionStatus());
    expect(result.current.isConnectedToFirebase).toBe(false);

    act(() => {
      onValueCallback({ val: () => true });
    });
    expect(result.current.isConnectedToFirebase).toBe(true);

    act(() => {
      onValueCallback({ val: () => false });
    });
    expect(result.current.isConnectedToFirebase).toBe(false);
  });

  it('should clean up listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useConnectionStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
