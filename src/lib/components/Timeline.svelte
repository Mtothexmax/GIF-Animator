<script>
	import FrameCard from './FrameCard.svelte';
	import {
		project,
		selectedCount,
		isSelected,
		moveFrameTo,
		selectAll,
		clearSelection
	} from '$lib/frames.svelte.js';

	let dragFrom = $state(null);
	let dropTarget = $state(null);

	// Ctrl/Cmd+A selects all frames, Escape clears the selection.
	function onKeydown(e) {
		if (e.key === 'Escape') {
			clearSelection();
		} else if ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey)) {
			if (e.target instanceof HTMLInputElement) return; // keep native text selection in inputs
			e.preventDefault();
			selectAll();
		}
	}

	// Attach the shortcut listener without tripping the a11y static-element check.
	function keyboardShortcuts(node) {
		const handler = (e) => onKeydown(e);
		node.addEventListener('keydown', handler);
		return {
			destroy() {
				node.removeEventListener('keydown', handler);
			}
		};
	}
</script>

<section class="shrink-0 border-t border-slate-300 bg-slate-200/70" role="group" aria-label="Frame timeline" use:keyboardShortcuts>
	<div
		class="flex items-center gap-2 border-b border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"
	>
		<span class="material-symbols-rounded text-base leading-none text-slate-400">timeline</span>
		<span>Timeline</span>

		{#if selectedCount() >= 2}
			<span
				class="rounded-full bg-sky-100 px-2 py-0.5 font-semibold normal-case tracking-normal text-sky-700"
			>
				{selectedCount()} selected
			</span>
		{/if}

		<span class="ml-auto hidden font-normal normal-case tracking-normal text-slate-400 sm:inline">
			Ctrl/Cmd+click to multi-select · Shift+click for a range · drag to reorder
		</span>
	</div>

	<div class="flex h-44 items-stretch gap-2 overflow-x-auto p-3">
		{#if project.frames.length === 0}
			<div class="flex flex-1 items-center justify-center text-sm text-slate-400">
				No frames yet — open a GIF, import images, or click “Add Frame”.
			</div>
		{:else}
			{#each project.frames as frame, i (frame.id)}
				<FrameCard
					{frame}
					{i}
					selected={isSelected(frame.id)}
					isCurrent={project.playing && i === project.currentIndex}
					dragFrom={dragFrom === i}
					dropTarget={dropTarget === i}
					ondragstart={(e) => {
						dragFrom = i;
						dropTarget = null;
						e.dataTransfer.effectAllowed = 'move';
						e.dataTransfer.setData('text/plain', String(i));
					}}
					ondragover={(e) => {
						e.preventDefault();
						e.dataTransfer.dropEffect = 'move';
						if (dropTarget !== i) dropTarget = i;
					}}
					ondrop={(e) => {
						e.preventDefault();
						if (dragFrom !== null && dragFrom !== i) moveFrameTo(dragFrom, i);
						dragFrom = null;
						dropTarget = null;
					}}
					ondragend={() => {
						dragFrom = null;
						dropTarget = null;
					}}
				/>
			{/each}
		{/if}
	</div>
</section>
