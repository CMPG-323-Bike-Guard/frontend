import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { demo } from '@/api/client';

beforeEach(() => {
  if (!demo.enabled) {
    throw new Error('Feature component tests require mock API mode to prevent real network requests.');
  }
  demo.reset();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});