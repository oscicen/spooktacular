import { list, put } from '@vercel/blob';
import type { Costume, Ratings, Result } from '../src/types.js';
import { criteria } from '../src/types.js';

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export const cleanText = (value: unknown, max: number) => String(value || '').trim().slice(0, max);

export async function getCostumes(): Promise<Costume[]> {
  const response = await list({ prefix: 'costumes/', limit: 1000 });
  const costumes = await Promise.all(response.blobs.map(async blob => {
    const result = await fetch(blob.url, { cache: 'no-store' });
    return result.ok ? result.json() as Promise<Costume> : null;
  }));
  return costumes.filter((item): item is Costume => Boolean(item)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getResults(): Promise<Result[]> {
  const [costumes, votesList] = await Promise.all([getCostumes(), list({ prefix: 'votes/', limit: 1000 })]);
  const votes = await Promise.all(votesList.blobs.map(async blob => {
    const result = await fetch(blob.url, { cache: 'no-store' });
    return result.ok ? result.json() as Promise<{ costumeId: string; ratings: Ratings }> : null;
  }));
  return costumes.map(costume => {
    const costumeVotes = votes.filter(vote => vote?.costumeId === costume.id);
    const breakdown = Object.fromEntries(criteria.map(criterion => {
      const total = costumeVotes.reduce((sum, vote) => sum + Number(vote?.ratings[criterion.key] || 0), 0);
      return [criterion.key, costumeVotes.length ? total / costumeVotes.length : 0];
    })) as Ratings;
    const score = criteria.reduce((sum, criterion) => sum + breakdown[criterion.key], 0) / criteria.length;
    return { ...costume, breakdown, score, voteCount: costumeVotes.length };
  }).sort((a, b) => b.score - a.score || b.voteCount - a.voteCount || a.costumeName.localeCompare(b.costumeName));
}

export async function putJson(pathname: string, value: unknown, overwrite = false) {
  return put(pathname, JSON.stringify(value), { access: 'public', contentType: 'application/json', allowOverwrite: overwrite, cacheControlMaxAge: 60 });
}
