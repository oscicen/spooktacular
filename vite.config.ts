import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'es2022' },
  plugins: [{
    name: 'local-party-preview',
    configureServer(server) {
      const portraits = ['🦋', '🎃', '👻'].map((symbol, index) =>
        `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600"><rect width="500" height="600" fill="${['#39274b', '#4c2a20', '#263449'][index]}"/><circle cx="250" cy="245" r="155" fill="#16101d"/><text x="250" y="330" text-anchor="middle" font-size="180">${symbol}</text></svg>`)}`,
      );
      const costumes = [
        { id: 'moth', participantName: 'Lydia', costumeName: 'The Moonlit Moth', description: 'Hand-cut wings, midnight velvet, and just enough silver thread to catch the moonlight.', photoUrl: portraits[0], createdAt: '2026-10-25T18:00:00Z', voteCount: 12 },
        { id: 'pumpkin', participantName: 'Victor', costumeName: 'The Pumpkin King’s Tailor', description: 'A crooked waistcoat stitched from old curtains, with a lantern crown carved by hand.', photoUrl: portraits[1], createdAt: '2026-10-25T18:01:00Z', voteCount: 10 },
        { id: 'ghost', participantName: 'Beatrice', costumeName: 'The Polite Poltergeist', description: 'Victorian lace, floating teacups, and a spectral commitment to excellent manners.', photoUrl: portraits[2], createdAt: '2026-10-25T18:02:00Z', voteCount: 8 },
      ];
      server.middlewares.use('/api/costumes', (_request, response) => {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ costumes }));
      });
      server.middlewares.use('/api/votes', (_request, response) => {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ ok: true }));
      });
      server.middlewares.use('/api/results', (request, response) => {
        const authorized = request.headers['x-results-code'] === 'preview';
        response.statusCode = authorized ? 200 : 401;
        response.setHeader('content-type', 'application/json');
        const results = costumes.map((costume, index) => ({ ...costume, score: 4.72 - index * .31, voteCount: 12 - index * 2, breakdown: { originality: 4.8 - index * .2, creativity: 4.7 - index * .2, effort: 4.6 - index * .2, craftsmanship: 4.5 - index * .2, presence: 5 - index * .2 } }));
        response.end(JSON.stringify(authorized ? { results } : { error: 'That code did not open the door.' }));
      });
    },
  }],
});
