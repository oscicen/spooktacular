import { del, list, put } from '@vercel/blob';
import { cleanText, getCostumes, json, putJson } from './_storage.js';
import type { Costume } from '../src/types.js';

export const config = { runtime: 'nodejs' };

export async function GET() {
  try {
    const [costumes, votes] = await Promise.all([
      getCostumes(),
      list({ prefix: 'votes/', limit: 1000 }),
    ]);
    const voteCounts = new Map<string, number>();
    votes.blobs.forEach(blob => {
      const costumeId = blob.pathname.split('/')[1];
      if (costumeId) voteCounts.set(costumeId, (voteCounts.get(costumeId) || 0) + 1);
    });
    return json({ costumes: costumes.map(costume => ({ ...costume, voteCount: voteCounts.get(costume.id) || 0 })) });
  } catch (error) {
    console.error(error);
    return json({ error: 'The costume list could not be loaded. Check the Blob store connection.' }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const expected = process.env.RESULTS_CODE;
    const supplied = request.headers.get('x-results-code');
    if (!expected || !supplied || supplied !== expected) return json({ error: 'That code did not open the door.' }, 401);

    const costumeId = cleanText(new URL(request.url).searchParams.get('costumeId'), 80);
    const costume = (await getCostumes()).find(item => item.id === costumeId);
    if (!costume) return json({ error: 'That costume is no longer on the guest list.' }, 404);

    const votes = await list({ prefix: `votes/${costumeId}/`, limit: 1000 });
    await del([
      `costumes/${costumeId}.json`,
      costume.photoUrl,
      ...votes.blobs.map(blob => blob.url),
    ]);
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: 'The costume could not be deleted.' }, 500);
  }
}

export async function POST(request: Request) {
  try {
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
