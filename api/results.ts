import { getResults, json } from './_storage.js';

export const config = { runtime: 'nodejs' };

export default async function handler(request: Request) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
  const expected = process.env.RESULTS_CODE;
  const supplied = request.headers.get('x-results-code');
  if (!expected || !supplied || supplied !== expected) return json({ error: 'That code did not open the door.' }, 401);
  try {
    return json({ results: await getResults() });
  } catch (error) {
    console.error(error);
    return json({ error: 'The results could not be counted.' }, 500);
  }
}
