<script>
	import { project, hasFrames, totalDuration, setAllDelays } from '$lib/frames.svelte.js';

	let allDelay = $state(100);
</script>

<footer
	class="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-300 bg-slate-200/70 px-3 py-1.5 text-xs text-slate-600"
>
	{#if hasFrames()}
		<span class="font-semibold text-slate-800">
			{project.frames.length} frame{project.frames.length === 1 ? '' : 's'}
		</span>
		<span>{project.width} × {project.height} px</span>
		<span>Total: {(totalDuration() / 1000).toFixed(2)} s</span>
		<span>Frame {project.currentIndex + 1} / {project.frames.length}</span>

		<span class="ml-auto flex items-center gap-1.5">
			<label for="all-delay" class="font-medium text-slate-600">Set all delays</label>
			<input
				id="all-delay"
				type="number"
				min="0"
				max="65500"
				step="10"
				bind:value={allDelay}
				class="w-20 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-center text-xs tabular-nums focus:border-sky-400 focus:outline-none"
			/>
			<span class="text-slate-400">ms</span>
			<button
				class="rounded border border-slate-300 bg-white px-2 py-0.5 font-medium text-slate-700 transition-colors hover:bg-slate-50"
				onclick={() => setAllDelays(allDelay)}
			>
				Apply
			</button>
		</span>

		<button
			class="icon-btn"
			style={project.loop ? 'color:#fff;background-color:#0ea5e9;' : ''}
			title="Loop playback — also written into the exported GIF"
			onclick={() => (project.loop = !project.loop)}
		>
			<span class="material-symbols-rounded text-base leading-none">autorenew</span>
		</button>
	{:else}
		<span>No project loaded</span>
	{/if}
</footer>
