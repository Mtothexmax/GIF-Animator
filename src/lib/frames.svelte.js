// Central state for the animator, using Svelte 5 runes.
// A "frame" is { id, imageData: ImageData, delay: number (ms) }.

export const project = $state({
	frames: [],
	width: 0,
	height: 0,
	name: 'Untitled',
	/** max number of colors used when exporting GIFs (2..256) */
	colors: 256,
	/** ids of the selected frames (click order; last entry = active frame) */
	selectedIds: [],
	/** anchor frame used for Shift+click range selection */
	anchorId: null,
	playing: false,
	loop: true,
	currentIndex: 0
});

let nextId = 1;
const makeId = () => `frame-${nextId++}`;

export const hasFrames = () => project.frames.length > 0;
export const totalDuration = () => project.frames.reduce((sum, f) => sum + (f.delay || 0), 0);
export const currentFrame = () => project.frames[project.currentIndex] ?? null;
export const selectedCount = () => project.selectedIds.length;
export const isSelected = (id) => project.selectedIds.includes(id);
/** The active (last-clicked) selected frame. */
export const selectedFrame = () => {
	const id = project.selectedIds[project.selectedIds.length - 1];
	return id ? (project.frames.find((f) => f.id === id) ?? null) : null;
};
/** All selected frames in timeline order. */
export const selectedFrames = () =>
	project.frames.filter((f) => project.selectedIds.includes(f.id));

function indexOf(id) {
	return project.frames.findIndex((f) => f.id === id);
}

function clampDelay(ms) {
	const n = Math.round(Number(ms));
	if (!Number.isFinite(n)) return 100;
	return Math.min(65500, Math.max(0, n));
}

function cloneImageData(imageData) {
	return new ImageData(
		new Uint8ClampedArray(imageData.data),
		imageData.width,
		imageData.height
	);
}

/** Replace the whole project (assigns ids to frames missing one). */
export function setProject({ frames, width, height, name }) {
	project.frames = frames.map((f) => ({
		id: f.id ?? makeId(),
		imageData: f.imageData,
		delay: clampDelay(f.delay)
	}));
	project.width = width || 0;
	project.height = height || 0;
	project.name = name || 'Untitled';
	project.selectedIds = project.frames.length ? [project.frames[0].id] : [];
	project.anchorId = project.selectedIds[0] ?? null;
	project.currentIndex = 0;
	project.playing = false;
}

/** Append a new frame (optionally select it). */
export function addFrame(imageData, delay, opts = {}) {
	const frame = { id: makeId(), imageData, delay: clampDelay(delay) };
	project.frames.push(frame);
	if (opts.select !== false) {
		project.selectedIds = [frame.id];
		project.anchorId = frame.id;
		project.currentIndex = project.frames.length - 1;
	}
	return frame;
}

/** Remove a single frame by id (e.g. the per-card delete button). */
export function removeFrame(id) {
	const i = indexOf(id);
	if (i === -1) return;
	project.frames.splice(i, 1);
	project.selectedIds = project.selectedIds.filter((x) => x !== id);
	if (project.anchorId === id) project.anchorId = null;
	if (project.frames.length === 0) {
		project.currentIndex = 0;
		project.playing = false;
	} else {
		if (project.currentIndex > project.frames.length - 1) {
			project.currentIndex = project.frames.length - 1;
		}
		if (project.selectedIds.length === 0) {
			const next = project.frames[Math.min(i, project.frames.length - 1)];
			project.selectedIds = [next.id];
			project.anchorId = next.id;
		}
	}
}

/** Remove every selected frame. */
export function removeSelected() {
	if (!project.selectedIds.length) return;
	const ids = new Set(project.selectedIds);
	project.frames = project.frames.filter((f) => !ids.has(f.id));
	project.selectedIds = [];
	project.anchorId = null;
	if (project.frames.length === 0) {
		project.currentIndex = 0;
		project.playing = false;
	} else if (project.currentIndex >= project.frames.length) {
		project.currentIndex = project.frames.length - 1;
	}
}

/**
 * Duplicate the selected frames. The copies are inserted as one contiguous
 * block right after the last selected frame (not interleaved between the
 * originals), and the copies become the new selection.
 */
export function duplicateSelected() {
	if (!project.selectedIds.length) return;
	const ids = new Set(project.selectedIds);
	const copies = [];
	let lastSelectedIndex = -1;
	project.frames.forEach((f, i) => {
		if (ids.has(f.id)) {
			lastSelectedIndex = i;
			copies.push({
				id: makeId(),
				imageData: cloneImageData(f.imageData),
				delay: f.delay
			});
		}
	});
	if (lastSelectedIndex === -1) return;
	project.frames.splice(lastSelectedIndex + 1, 0, ...copies);
	project.selectedIds = copies.map((c) => c.id);
	project.anchorId = copies[copies.length - 1]?.id ?? null;
}

/** Move a single frame one step left (-1) or right (+1). */
export function moveFrame(id, dir) {
	const i = indexOf(id);
	const j = i + dir;
	if (i === -1 || j < 0 || j >= project.frames.length) return;
	const [f] = project.frames.splice(i, 1);
	project.frames.splice(j, 0, f);
}

/** Move all selected frames one step left (-1) or right (+1) as a block. */
export function moveSelected(dir) {
	const ids = new Set(project.selectedIds);
	if (!ids.size) return;
	let moved = false;
	if (dir < 0) {
		for (let i = 1; i < project.frames.length; i++) {
			if (ids.has(project.frames[i].id) && !ids.has(project.frames[i - 1].id)) {
				const [f] = project.frames.splice(i, 1);
				project.frames.splice(i - 1, 0, f);
				moved = true;
			}
		}
	} else {
		for (let i = project.frames.length - 2; i >= 0; i--) {
			if (ids.has(project.frames[i].id) && !ids.has(project.frames[i + 1].id)) {
				const [f] = project.frames.splice(i, 1);
				project.frames.splice(i + 1, 0, f);
				moved = true;
			}
		}
	}
	if (moved && project.currentIndex >= project.frames.length) {
		project.currentIndex = project.frames.length - 1;
	}
}

/** Reverse the order of the selected frames in place (their positions stay fixed). */
export function reverseSelected() {
	if (project.selectedIds.length < 2) return;
	const ids = new Set(project.selectedIds);
	const indices = [];
	project.frames.forEach((f, i) => {
		if (ids.has(f.id)) indices.push(i);
	});
	if (indices.length < 2) return;
	const picked = indices.map((i) => project.frames[i]);
	const reversed = picked.reverse();
	const copy = [...project.frames];
	indices.forEach((idx, k) => {
		copy[idx] = reversed[k];
	});
	project.frames = copy;
}

/** Move the frame at `from` so it ends up at index `to` (drag & drop). */
export function moveFrameTo(from, to) {
	if (from === to) return;
	if (from < 0 || to < 0 || from >= project.frames.length || to >= project.frames.length) return;
	const [f] = project.frames.splice(from, 1);
	project.frames.splice(to, 0, f);
}

/**
 * Move a single frame to a 0-based index (used by the editable position
 * number on each frame card). Non-finite targets are ignored.
 */
export function moveFrameToIndex(id, to) {
	if (!Number.isFinite(to)) return;
	const from = indexOf(id);
	if (from === -1) return;
	to = Math.max(0, Math.min(project.frames.length - 1, Math.trunc(to)));
	if (to === from) return;
	const [f] = project.frames.splice(from, 1);
	project.frames.splice(to, 0, f);
}

/** Set one frame's delay (ms). */
export function setDelay(id, ms) {
	const f = project.frames.find((x) => x.id === id);
	if (f) f.delay = clampDelay(ms);
}

/** Set every frame's delay (ms). */
export function setAllDelays(ms) {
	const d = clampDelay(ms);
	for (const f of project.frames) f.delay = d;
}

/**
 * Select a frame. Modes:
 * - 'replace' (default): select only this frame
 * - 'toggle': Ctrl/Cmd+click — add/remove this frame to/from the selection
 * - 'range': Shift+click — select everything from the anchor to this frame
 */
export function selectFrame(id, mode = 'replace') {
	const i = indexOf(id);
	if (i === -1) return;
	if (mode === 'toggle') {
		if (project.selectedIds.includes(id)) {
			project.selectedIds = project.selectedIds.filter((x) => x !== id);
		} else {
			project.selectedIds = [...project.selectedIds, id];
			project.anchorId = id;
		}
	} else if (mode === 'range') {
		const anchor =
			project.anchorId ?? project.selectedIds[project.selectedIds.length - 1] ?? project.frames[0]?.id;
		const a = indexOf(anchor);
		if (a === -1) {
			project.selectedIds = [id];
			project.anchorId = id;
		} else {
			const lo = Math.min(a, i);
			const hi = Math.max(a, i);
			project.selectedIds = project.frames.slice(lo, hi + 1).map((f) => f.id);
		}
	} else {
		project.selectedIds = [id];
		project.anchorId = id;
	}
	project.currentIndex = i;
}

/** Select every frame. */
export function selectAll() {
	project.selectedIds = project.frames.map((f) => f.id);
	project.anchorId = project.selectedIds[project.selectedIds.length - 1] ?? null;
}

/** Clear the selection. */
export function clearSelection() {
	project.selectedIds = [];
	project.anchorId = null;
}

const COLOR_LEVELS = [2, 4, 8, 16, 32, 64, 128, 256];

/** Set the max color count used for GIF export (snaps to the nearest power of two). */
export function setColors(n) {
	const v = Number(n);
	if (!Number.isFinite(v) || v <= 0) return;
	project.colors = COLOR_LEVELS.reduce(
		(best, a) => (Math.abs(a - v) < Math.abs(best - v) ? a : best),
		256
	);
}

/**
 * Replace the frames and canvas size (e.g. after a size change), keeping the
 * selection and playback position intact.
 */
export function resizeProject(newFrames, width, height) {
	project.frames = newFrames;
	project.width = width;
	project.height = height;
	if (project.frames.length === 0) {
		project.selectedIds = [];
		project.anchorId = null;
		project.currentIndex = 0;
		project.playing = false;
	} else if (project.currentIndex >= project.frames.length) {
		project.currentIndex = project.frames.length - 1;
	}
}

export function togglePlay() {
	// Loop off + sitting on the last frame: restart from the beginning when
	// pressing play (the animation is finished, so starting there again would
	// otherwise do nothing). With loop on, playback just continues/loops.
	if (
		!project.playing &&
		!project.loop &&
		project.frames.length > 1 &&
		project.currentIndex >= project.frames.length - 1
	) {
		project.currentIndex = 0;
	}
	project.playing = !project.playing;
}
