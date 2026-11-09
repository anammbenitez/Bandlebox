// How a refused add is shown (deck-manager spec: refusals are visible): the
// section flashes with a short note, the face or button that was used rings
// with the reason in its tooltip, and a polite live region says it aloud.
// Imperative on purpose: these are brief animations on elements that already
// exist, restarted on every refusal.
import { SECTION_LABELS, type SectionKey } from '../../domain/deck.ts';

const faceTimers = new WeakMap<HTMLElement, number>();

/** Rings the face (or zone) around `el` and appends the reason to its title. */
export function flashFace(el: HTMLElement, why: string): void {
	const host = el.closest<HTMLElement>('[data-slug], [data-champion-face], [data-champion-zone]') ?? el;
	if (!host.dataset.refuseSaved) {
		host.dataset.refuseSaved = '1';
		host.dataset.refuseTitle = host.title;
	}
	const pending = faceTimers.get(host);
	if (pending) window.clearTimeout(pending);
	host.classList.remove('refuse-flash');
	void host.offsetWidth; // restart the animation
	host.classList.add('refuse-flash');
	const base = host.dataset.refuseTitle ?? '';
	host.title = base ? `${base} — ${why}` : why;
	faceTimers.set(
		host,
		window.setTimeout(() => {
			host.classList.remove('refuse-flash');
			host.title = host.dataset.refuseTitle ?? '';
			if (host.title === '') host.removeAttribute('title');
			delete host.dataset.refuseSaved;
			delete host.dataset.refuseTitle;
			faceTimers.delete(host);
		}, 1400),
	);
}

let liveRegion: HTMLElement | null = null;
let liveTimer = 0;

/** The deck manager hands over its polite live region (a ref callback), so
 *  announcing needs no lookup by id. */
export function registerLiveRegion(element: HTMLElement | null): void {
	liveRegion = element;
}

/** Says a message politely; clearing first makes a repeat heard again. */
export function announce(message: string): void {
	const live = liveRegion;
	if (!live) return;
	window.clearTimeout(liveTimer);
	live.textContent = '';
	liveTimer = window.setTimeout(() => {
		live.textContent = message;
	}, 60);
}

/** Flashes a section with the reason as a note over it, and says it. */
export function flashSection(section: SectionKey, why: string): void {
	// The one lookup left: the section's element is rendered by the deck viewer,
	// far from the code that reports the refusal, and its note is appended to it.
	const el = document.querySelector<HTMLElement>(`[data-section="${section}"]`);
	if (!el) return;
	el.classList.remove('drag-refuse');
	void el.offsetWidth; // restart the CSS animation
	el.classList.add('drag-refuse');
	el.querySelector('.refusal-note')?.remove();
	const note = document.createElement('span');
	note.className = 'refusal-note';
	note.textContent = why;
	note.setAttribute('aria-hidden', 'true'); // the live region speaks it instead
	el.appendChild(note);
	announce(`${SECTION_LABELS[section]}: ${why}`);
	window.setTimeout(() => note.remove(), 1800);
}
