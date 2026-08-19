<script>
	import { moveFrame, removeFrame, setDelay, selectFrame } from '$lib/frames.svelte.js';

	let {
		frame,
		i,
		selected = false,
		isCurrent = false,
		dragFrom = false,
		dropTarget = false,
		ondragstart,
		ondragover,
		ondrop,
		ondragend
	} = $props();

	let thumb;

	const borderClass = $derived(
		dropTarget
			? 'border-sky-400 ring-2 ring-sky-300'
			: selected
				? 'border-sky-500'
				: 'border-slate-200'
	);

	// Plain click: select only this frame.
	// Ctrl/Cmd+click: toggle it in the multi-selection. Shift+click: range select.
	function onCardClick(e) {
		if (e.shiftKey) selectFrame(frame.id, 'range');
		else if (e.ctrlKey || e.metaKey) selectFrame(frame.id, 'toggle');
		else selectFrame(frame.id);
	}

	// Draw a fitted thumbnail whenever the frame's pixels change.
	$effect(() => {
		const el = thumb;
		if (!el) return;
		const { width, height } = frame.imageData;
		const src = document.createElement('canvas');
		src.width = width;
		src.height = height;
		src.getContext('2d').putImageData(frame.imageData, 0, 0);
		const scale = Math.min(96 / width, 96 / height);
		const tw = Math.max(1, Math.round(width * scale));
		const th = Math.max(1, Math.round(height * scale));
		el.width = tw;
		el.height = th;
		el.getContext('2d').drawImage(src, 0, 0, tw, th);
	});
</script>

<div
	class="group relative flex w-32 shrink-0 flex-col items-center rounded-md border bg-white pb-1 shadow-sm transition-all {borderClass}"
	class:opacity-50={dragFrom}
	class:bg-sky-50={isCurrent}
	class:ring-1={isCurrent}
	class:ring-sky-400={isCurrent}
	draggable="true"
	role="button"
	tabindex="0"
	onclick={onCardClick}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') selectFrame(frame.id);
	}}
	ondragstart={ondragstart}
	ondragover={ondragover}
	ondrop={ondrop}
	ondragend={ondragend}
>
	<span
		class="absolute left-1 top-1 z-10 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white"
	>{i + 1}</span
	>

	{#if isCurrent}
		<span class="material-symbols-rounded absolute right-1 top-1 z-10 text-sm text-sky-500" title="Playing now">play_circle</span>
	{:else if selected}
		<span class="material-symbols-rounded absolute right-1 top-1 z-10 text-sm text-sky-600" title="Selected">check_circle</span>
	{/if}

	<div class="mt-2 flex h-[104px] w-full items-center justify-center">
		<canvas bind:this={thumb} class="checkerboard max-h-[104px] max-w-[104px] shadow ring-1 ring-slate-200"></canvas>
	</div>

	<div class="mt-1 flex w-full items-center justify-center gap-0.5 px-1">
		<input
			type="number"
			min="0"
			max="65500"
			step="10"
			value={frame.delay}
			class="w-16 rounded border border-slate-300 px-1 py-0.5 text-center text-xs tabular-nums focus:border-sky-400 focus:outline-none"
			title="Frame duration in milliseconds"
			onchange={(e) => setDelay(frame.id, e.currentTarget.value)}
			onclick={(e) => e.stopPropagation()}
		/>
		<span class="text-[10px] text-slate-400">ms</span>
	</div>

	<div class="mt-1 flex items-center gap-0.5">
		<button
			class="icon-btn"
			title="Move frame left"
			onclick={(e) => {
				e.stopPropagation();
				moveFrame(frame.id, -1);
			}}
		>
			<span class="material-symbols-rounded text-sm leading-none">chevron_left</span>
		</button>
		<button
			class="icon-btn"
			title="Move frame right"
			onclick={(e) => {
				e.stopPropagation();
				moveFrame(frame.id, 1);
			}}
		>
			<span class="material-symbols-rounded text-sm leading-none">chevron_right</span>
		</button>
		<button
			class="icon-btn text-red-500 hover:bg-red-50 hover:text-red-600"
			title="Remove frame"
			onclick={(e) => {
				e.stopPropagation();
				removeFrame(frame.id);
			}}
		>
			<span class="material-symbols-rounded text-sm leading-none">delete</span>
		</button>
	</div>
</div>
