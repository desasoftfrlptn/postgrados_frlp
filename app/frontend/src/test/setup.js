import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Limpieza automática del DOM después de cada test
afterEach(() => {
  cleanup();
});
