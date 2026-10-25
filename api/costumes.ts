import { put } from '@vercel/blob';
import { cleanText, getCostumes, json, putJson } from './_storage.js';
import type { Costume } from '../src/types.js';

export const config = { runtime: 'nodejs' };

export default async function handler(request: Request) {
  try {
    if (request.method === 'GET') return json({ costumes: await getCostumes() });
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

    const body = await request.json();
    const participantName = cleanText(body.participantName, 60);
    const costumeName = cleanText(body.costumeName, 80);
    const description = cleanText(body.description, 280);
    const photoType = ['image/jpeg', 'image/png', 'image/webp'].includes(body.photoType) ? body.photoType : '';
    const match = String(body.photoData || '').match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
    if (!participantName || !costumeName || !description || !photoType || !match) return json({ error: 'Please complete every costume field.' }, 400);
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length > 3 * 1024 * 1024) return json({ error: 'The photo must be smaller than 3 MB.' }, 413);

    const id = crypto.randomUUID();
    const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
    const photo = await put(`photos/${id}.${extension}`, bytes, { access: 'public', contentType: photoType, addRandomSuffix: false });
    const costume: Costume = { id, participantName, costumeName, description, photoUrl: photo.url, createdAt: new Date().toISOString() };
    await putJson(`costumes/${id}.json`, costume);
    return json({ costume }, 201);
  } catch (error) {
    console.error(error);
    return json({ error: 'The costume could not be added. Check the Blob store connection.' }, 500);
  }
}
