const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fetch health status from the backend API.
 * Tracks response latency and handles connection errors.
 */
export async function checkBackendHealth() {
  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${API_BASE_URL}/api/health`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    return {
      connected: true,
      latency,
      data: json.data,
      error: null,
    };
  } catch (error) {
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);
    return {
      connected: false,
      latency,
      data: null,
      error: error.name === 'AbortError' ? 'Request timed out after 8s' : (error.message || 'Connection failed'),
    };
  }
}
