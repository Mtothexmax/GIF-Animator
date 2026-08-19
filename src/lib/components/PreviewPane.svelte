<script>
	import { project, currentFrame, hasFrames } from '$lib/frames.svelte.js';

	let canvas;
	let timer;

	// Keep the canvas at project size and draw the current frame.
	$effect(() => {
		const ctx = canvas?.getContext('2d');
		if (!canvas || !ctx) return;
		canvas.width = project.width || 1;
		canvas.height = project.height || 1;
		const frame = currentFrame();
		if (frame) {
			ctx.putImageData(frame.imageData, 0, 0);
		} else {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
	});

	// Playback loop: schedule each frame using its own delay.
	$effect(() => {
		if (timer) clearTimeout(timer);
		if (project.playing && project.frames.length > 0) {
			const delay = project.frames[project.currentIndex]?.delay ?? 100;
			timer = setTimeout(() => {
				if (project.currentIndex >= project.frames.length - 1) {
					if (project.loop) {
						project.currentIndex = 0;
					} else {
						project.playing = false;
					}
				} else {
					project.currentIndex += 1;
				}
			}, delay);
		}
		return () => {
			if (timer) clearTimeout(timer);
		};
	});
</script>

<div class="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-slate-100 p-4">
	<canvas bind:this={canvas} class="checkerboard max-h-full max-w-full shadow-md ring-1 ring-slate-300"></canvas>
	{#if !hasFrames()}
		<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
			<span class="material-symbols-rounded text-7xl">gif</span>
			<p class="text-lg font-semibold text-slate-500">Drop a GIF or images anywhere</p>
			<p class="max-w-md text-center text-sm">
				…or use the buttons above: Open GIF, Import Images, or Add Frame to start a new project.
			</p>
		</div>
	{/if}
</div>
