import { parseGIF, decompressFrames } from 'gifuct-js';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

/** True if the file is a GIF (by MIME type or extension). */
export function isGif(file) {
	return file.type === 'image/gif' || /\.gif$/i.test(file.name || '');
}

/** Strip the extension from a file name; falls back to "animation". */
export function baseName(name = '') {
	const base = String(name).replace(/\.[^.]+$/, '');
	return base || 'animation';
}

/**
 * Decode a GIF file (ArrayBuffer) into composited frames.
 * Returns [{ imageData: ImageData, delay: number(ms) }] in display order,
 * correctly applying each frame's disposal method.
 */
export function decodeGifToFrames(arrayBuffer) {
	const parsed = parseGIF(arrayBuffer);
	const rawFrames = decompressFrames(parsed, true);
	if (!rawFrames.length) return [];

	const width = parsed.lsd.width;
	const height = parsed.lsd.height;
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });

	const out = [];
	let previousSnapshot = null; // canvas state just before the previous frame was drawn

	for (let i = 0; i < rawFrames.length; i++) {
		const frame = rawFrames[i];

		// Apply the *previous* frame's disposal method before drawing this one.
		if (i > 0) {
			const prev = rawFrames[i - 1];
			if (prev.disposalType === 3 && previousSnapshot) {
				// Restore to the state before the previous frame was drawn.
				ctx.putImageData(previousSnapshot, 0, 0);
			} else if (prev.disposalType === 2) {
				// Restore the previous frame's rectangle to background (transparent).
				ctx.clearRect(prev.dims.left, prev.dims.top, prev.dims.width, prev.dims.height);
			}
		}

		// Snapshot the canvas before drawing this frame (needed for disposal type 3 later).
		previousSnapshot = ctx.getImageData(0, 0, width, height);

		// Draw this frame's patch (gifuct-js already applies transparency via alpha 0).
		if (frame.dims.width > 0 && frame.dims.height > 0) {
			const patch = document.createElement('canvas');
			patch.width = frame.dims.width;
			patch.height = frame.dims.height;
			const pctx = patch.getContext('2d');
			const imageData = pctx.createImageData(frame.dims.width, frame.dims.height);
			imageData.data.set(frame.patch);
			pctx.putImageData(imageData, 0, 0);
			ctx.drawImage(patch, frame.dims.left, frame.dims.top);
		}

		out.push({
			imageData: ctx.getImageData(0, 0, width, height),
			delay: frame.delay || 100
		});
	}

	return out;
}

/** Load a regular image file (PNG/JPG/...) into an ImageData. */
export function loadImageAsImageData(blob) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(blob);
		const img = new Image();
		img.onload = () => {
			try {
				const canvas = document.createElement('canvas');
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;
				const ctx = canvas.getContext('2d', { willReadFrequently: true });
				ctx.drawImage(img, 0, 0);
				resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
			} finally {
				URL.revokeObjectURL(url);
			}
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Image failed to load'));
		};
		img.src = url;
	});
}

/** Load an image data-URL into an ImageData. */
export function loadDataUrlAsImageData(dataUrl) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			const ctx = canvas.getContext('2d', { willReadFrequently: true });
			ctx.drawImage(img, 0, 0);
			resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
		};
		img.onerror = reject;
		img.src = dataUrl;
	});
}

/** Draw an ImageData into a canvas of its own size. */
export function imageDataToCanvas(imageData) {
	const canvas = document.createElement('canvas');
	canvas.width = imageData.width;
	canvas.height = imageData.height;
	const ctx = canvas.getContext('2d');
	ctx.putImageData(imageData, 0, 0);
	return canvas;
}

/**
 * Fit an ImageData into width x height, scaling (with resampling) if needed.
 * Returns the same object when the size already matches.
 */
export function fitTo(imageData, width, height) {
	if (imageData.width === width && imageData.height === height) return imageData;
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(imageDataToCanvas(imageData), 0, 0, width, height);
	return ctx.getImageData(0, 0, width, height);
}

/** True if the RGBA buffer contains any non-opaque pixel. */
function hasAlpha(data) {
	for (let i = 3; i < data.length; i += 4) {
		if (data[i] < 255) return true;
	}
	return false;
}

/**
 * Encode frames (each with per-frame delay in ms) into a GIF file's bytes.
 * Frames with transparency use a 1-bit-alpha palette; opaque frames use a
 * higher-quality rgb565 palette. Loops forever.
 */
export function encodeFramesToGif(frames, width, height) {
	const gif = GIFEncoder();
	let first = true;

	for (const f of frames) {
		const data = f.imageData.data;
		let palette;
		let index;
		let opts;

		if (hasAlpha(data)) {
			// Clear the RGB of transparent pixels so nearest-color mapping
			// deterministically picks the transparent palette entry.
			const prepped = new Uint8ClampedArray(data);
			for (let i = 0; i < prepped.length; i += 4) {
				if (prepped[i + 3] < 128) {
					prepped[i] = 0;
					prepped[i + 1] = 0;
					prepped[i + 2] = 0;
				}
			}
			palette = quantize(prepped, 256, { format: 'rgba4444', oneBitAlpha: true });
			index = applyPalette(prepped, palette, 'rgba4444');
			const transparentIndex = palette.findIndex((c) => c.length > 3 && c[3] === 0);
			opts = {
				palette,
				delay: f.delay,
				transparent: true,
				transparentIndex: transparentIndex >= 0 ? transparentIndex : 0
			};
		} else {
			palette = quantize(data, 256);
			index = applyPalette(data, palette);
			opts = { palette, delay: f.delay };
		}

		if (first) {
			opts.repeat = 0; // loop forever
			first = false;
		}

		gif.writeFrame(index, width, height, opts);
	}

	gif.finish();
	return gif.bytes();
}

/** Trigger a browser download of a Blob under the given file name. */
export function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 3000);
}
