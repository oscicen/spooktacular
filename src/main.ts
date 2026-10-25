import './styles.css';
import { criteria, type Costume, type Ratings, type Result } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;
const voterId = localStorage.getItem('spooktacular-voter') || crypto.randomUUID();
localStorage.setItem('spooktacular-voter', voterId);

const state: { costumes: Costume[]; active: Costume | null } = { costumes: [], active: null };

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]!));

const api = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The spirits interrupted the request.');
  return payload;
};

const shell = (content: string) => `
  <div class="grain"></div>
  <header class="site-header">
    <a href="/" class="brand" aria-label="Spooktacular home">
      <span class="brand-mark">S</span>
      <span><b>Spooktacular</b><small>Costume Awards</small></span>
    </a>
    <span class="moon" aria-hidden="true"><i></i></span>
  </header>
  <main>${content}</main>
  <footer><span>✦</span> Crafted for one strange and wonderful night <span>✦</span></footer>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>`;

function toast(message: string, kind: 'good' | 'bad' = 'good') {
  const element = document.querySelector<HTMLDivElement>('#toast');
  if (!element) return;
  element.textContent = message;
  element.className = `toast show ${kind}`;
  window.setTimeout(() => element.className = 'toast', 3200);
}

function loadingPage(message = 'Calling the costume spirits…') {
  app.innerHTML = shell(`<section class="loading"><div class="spinner">☾</div><p>${message}</p></section>`);
}

function homePage() {
  const rows = state.costumes.length ? state.costumes.map((costume, index) => `
    <article class="costume-row reveal" style="--delay:${index * 55}ms">
      <div class="portrait-wrap">
        <img src="${escapeHtml(costume.photoUrl)}" alt="${escapeHtml(costume.participantName)} wearing ${escapeHtml(costume.costumeName)}" />
        <span>${String(index + 1).padStart(2, '0')}</span>
      </div>
      <div class="costume-copy">
        <p class="eyebrow">${escapeHtml(costume.participantName)}</p>
        <h3>${escapeHtml(costume.costumeName)}</h3>
        <p>${escapeHtml(costume.description)}</p>
      </div>
      <button class="rate-button" data-rate="${costume.id}"><span>Rate costume</span><b>→</b></button>
    </article>`).join('') : `
      <div class="empty-state">
        <div class="empty-icon">☂</div>
        <h3>The ballroom is eerily empty</h3>
        <p>Add the first costume and let the judging begin.</p>
      </div>`;

  app.innerHTML = shell(`
    <section class="hero">
      <div class="hero-art" aria-hidden="true"><div class="hill"></div><div class="house"><i></i><b></b></div><div class="tree">ϟ</div></div>
      <p class="kicker">Tonight's peculiar promenade</p>
      <h1>Who will be the<br/><em>best dressed beast?</em></h1>
      <p class="intro">Study the details. Applaud the effort. Judge kindly—and keep the final scores a delicious mystery.</p>
      <button class="primary-button" id="add-costume">+ Add a costume</button>
    </section>
    <section class="roster">
      <div class="section-heading">
        <div><p class="kicker">The guest list</p><h2>Creatures in contention</h2></div>
        <span>${state.costumes.length} ${state.costumes.length === 1 ? 'costume' : 'costumes'}</span>
      </div>
      <div class="costume-list">${rows}</div>
    </section>
    <dialog id="costume-dialog">
      <button class="dialog-close" aria-label="Close">×</button>
      <p class="kicker">Enter the masquerade</p>
      <h2>Add a costume</h2>
      <form id="costume-form">
        <label>Your name<input name="participantName" maxlength="60" required placeholder="e.g. Lydia" /></label>
        <label>Costume name<input name="costumeName" maxlength="80" required placeholder="e.g. The Moonlit Moth" /></label>
        <label>A short description<textarea name="description" maxlength="280" required placeholder="Tell us about the idea, handmade details, or character…"></textarea><small>Maximum 280 characters</small></label>
        <label>Costume portrait<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /><span class="file-note">JPG, PNG or WebP · up to 3 MB</span></label>
        <button class="primary-button" type="submit">Join the guest list</button>
      </form>
    </dialog>`);

  document.querySelector('#add-costume')?.addEventListener('click', () => (document.querySelector<HTMLDialogElement>('#costume-dialog'))?.showModal());
  document.querySelector('.dialog-close')?.addEventListener('click', () => (document.querySelector<HTMLDialogElement>('#costume-dialog'))?.close());
  document.querySelectorAll<HTMLElement>('[data-rate]').forEach(button => button.addEventListener('click', () => {
    state.active = state.costumes.find(costume => costume.id === button.dataset.rate) || null;
    if (state.active) ratingPage(state.active);
  }));
  document.querySelector<HTMLFormElement>('#costume-form')?.addEventListener('submit', submitCostume);
}

async function submitCostume(event: SubmitEvent) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const data = new FormData(form);
  const photo = data.get('photo') as File;
  if (photo.size > 3 * 1024 * 1024) return toast('Please choose a photo smaller than 3 MB.', 'bad');
  button.disabled = true;
  button.textContent = 'Summoning…';
  try {
    const photoData = await fileToDataUrl(photo);
    await api('/api/costumes', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        participantName: data.get('participantName'), costumeName: data.get('costumeName'),
        description: data.get('description'), photoData, photoType: photo.type,
      }),
    });
    (document.querySelector<HTMLDialogElement>('#costume-dialog'))?.close();
    toast('Costume added to the guest list.');
    await loadCostumes();
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Could not add the costume.', 'bad');
    button.disabled = false;
    button.textContent = 'Join the guest list';
  }
}

function ratingPage(costume: Costume) {
  const saved = localStorage.getItem(`spooktacular-rated-${costume.id}`);
  app.innerHTML = shell(`
    <section class="rating-page">
      <button class="back-button" id="back">← Back to costumes</button>
      <div class="rating-card">
        <div class="rating-photo"><img src="${escapeHtml(costume.photoUrl)}" alt="${escapeHtml(costume.costumeName)}"/><div class="photo-caption"><span>${escapeHtml(costume.participantName)}</span><strong>${escapeHtml(costume.costumeName)}</strong></div></div>
        <div class="rating-form-wrap">
          <p class="kicker">Your private verdict</p>
          <h1>Rate this curious creation</h1>
          <p class="rating-intro">Choose one bat for “barely stirred the crypt” and five for “magnificently macabre.” Scores stay hidden.</p>
          <form id="rating-form">
            ${criteria.map(criterion => `
              <fieldset><legend><span>${criterion.icon}</span><b>${criterion.label}</b><small>${criterion.hint}</small></legend>
                <div class="scale">${[1,2,3,4,5].map(value => `<label><input type="radio" name="${criterion.key}" value="${value}" required/><span>${value}</span></label>`).join('')}</div>
              </fieldset>`).join('')}
            <button class="primary-button" type="submit">${saved ? 'Update my rating' : 'Cast my rating'}</button>
            ${saved ? '<p class="already-rated">You have rated this costume before. Submitting again updates your vote.</p>' : ''}
          </form>
        </div>
      </div>
    </section>`);
  document.querySelector('#back')?.addEventListener('click', homePage);
  document.querySelector<HTMLFormElement>('#rating-form')?.addEventListener('submit', submitRating);
}

async function submitRating(event: SubmitEvent) {
  event.preventDefault();
  if (!state.active) return;
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  const ratings = Object.fromEntries(criteria.map(item => [item.key, Number(data.get(item.key))])) as Ratings;
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  button.disabled = true;
  button.textContent = 'Sealing the ballot…';
  try {
    await api('/api/votes', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ costumeId: state.active.id, voterId, ratings }),
    });
    localStorage.setItem(`spooktacular-rated-${state.active.id}`, 'true');
    toast('Your secret rating has been cast.');
    window.setTimeout(homePage, 900);
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Could not save your rating.', 'bad');
    button.disabled = false;
    button.textContent = 'Cast my rating';
  }
}

function resultsGate(message = '') {
  app.innerHTML = shell(`
    <section class="results-gate">
      <div class="keyhole">♠</div><p class="kicker">Organizer's chamber</p><h1>The final reckoning</h1>
      <p>These scores are tucked safely behind a secret code.</p>
      <form id="unlock-form"><label>Results code<input name="code" type="password" autocomplete="off" required placeholder="Whisper the password…" /></label><button class="primary-button">Unlock results</button></form>
      ${message ? `<p class="gate-error">${escapeHtml(message)}</p>` : ''}<a href="/">← Return to the party</a>
    </section>`);
  document.querySelector<HTMLFormElement>('#unlock-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget as HTMLFormElement).get('code') || '');
    loadResults(code);
  });
}

async function loadResults(code: string) {
  loadingPage('Counting every last bat…');
  try {
    const { results } = await api<{ results: Result[] }>('/api/results', { headers: { 'x-results-code': code } });
    history.replaceState({}, '', `/results?code=${encodeURIComponent(code)}`);
    resultsPage(results);
  } catch (error) {
    resultsGate(error instanceof Error ? error.message : 'That code did not open the door.');
  }
}

function resultsPage(results: Result[]) {
  const podium = results.slice(0, 3);
  const maxVotes = Math.max(1, ...results.map(result => result.voteCount));
  app.innerHTML = shell(`
    <section class="results-page">
      <div class="results-heading"><p class="kicker">The final reckoning</p><h1>Tonight's most<br/><em>marvellous monsters</em></h1><p>Scores are the arithmetic mean of all five judging criteria.</p></div>
      ${results.length ? `
        <div class="podium">${podium.map((result, index) => `<article class="place place-${index + 1}"><span class="medal">${['♛','Ⅱ','Ⅲ'][index]}</span><img src="${escapeHtml(result.photoUrl)}" alt="${escapeHtml(result.costumeName)}"/><small>${index + 1}${['st','nd','rd'][index]} place</small><h2>${escapeHtml(result.costumeName)}</h2><p>${escapeHtml(result.participantName)}</p><strong>${result.score ? result.score.toFixed(2) : '—'}<i>/ 5</i></strong><em>${result.voteCount} ${result.voteCount === 1 ? 'vote' : 'votes'}</em></article>`).join('')}</div>
        <div class="score-table">
          <div class="score-head"><span>Rank & costume</span>${criteria.map(item => `<span>${item.label}</span>`).join('')}<span>Overall</span></div>
          ${results.map((result, index) => `<div class="score-row"><span><b>#${index + 1}</b><img src="${escapeHtml(result.photoUrl)}" alt=""/><i><strong>${escapeHtml(result.costumeName)}</strong><small>${escapeHtml(result.participantName)} · ${result.voteCount} votes</small></i></span>${criteria.map(item => `<span data-label="${item.label}">${result.breakdown[item.key].toFixed(1)}</span>`).join('')}<span data-label="Overall"><strong>${result.score.toFixed(2)}</strong><i class="vote-bar" style="--width:${(result.voteCount / maxVotes) * 100}%"></i></span></div>`).join('')}
        </div>` : '<div class="empty-state"><div class="empty-icon">☾</div><h3>No verdicts yet</h3><p>The scores will appear after the first rating is cast.</p></div>'}
      <a class="back-button results-back" href="/">← Back to the party</a>
    </section>`);
}

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file);
});

async function loadCostumes() {
  loadingPage();
  try {
    const { costumes } = await api<{ costumes: Costume[] }>('/api/costumes');
    state.costumes = costumes;
    homePage();
  } catch (error) {
    app.innerHTML = shell(`<section class="error-page"><span>☠</span><h1>The crypt won't open</h1><p>${escapeHtml(error instanceof Error ? error.message : 'Could not load costumes.')}</p><button class="primary-button" id="retry">Try again</button></section>`);
    document.querySelector('#retry')?.addEventListener('click', loadCostumes);
  }
}

if (location.pathname === '/results') {
  const code = new URLSearchParams(location.search).get('code');
  code ? loadResults(code) : resultsGate();
} else {
  loadCostumes();
}
