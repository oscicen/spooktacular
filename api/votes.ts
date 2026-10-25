import { cleanText, json, putJson } from './_storage.js';
import { criteria, type Ratings } from '../src/types.js';

export const config = { runtime: 'nodejs' };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const costumeId = cleanText(body.costumeId, 80);
    const voterId = cleanText(body.voterId, 80);
    const ratings = body.ratings as Ratings;
    const valid = costumeId && voterId && ratings && criteria.every(item => Number.isInteger(ratings[item.key]) && ratings[item.key] >= 1 && ratings[item.key] <= 5);
    if (!valid) return json({ error: 'Every category needs a rating from 1 to 5.' }, 400);
    await putJson(`votes/${costumeId}/${voterId}.json`, { costumeId, voterId, ratings, updatedAt: new Date().toISOString() }, true);
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: 'Your rating could not be saved.' }, 500);
  }
}
