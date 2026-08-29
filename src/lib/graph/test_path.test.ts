import { test } from 'vitest';
import { GraphAnalyticsEngine } from './analytics';

test('test path', async () => {
  const paths = await GraphAnalyticsEngine.findShortestPaths('Vijay Shinde', 'Devendra Maurya', 6);
  console.log('--- COLORFUL PATHS ---', paths.slice(0, 5));
});
