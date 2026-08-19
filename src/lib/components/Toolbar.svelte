<script>
	import { project, hasFrames, selectedCount, togglePlay } from '$lib/frames.svelte.js';

	let {
		onNew,
		onOpen,
		onImport,
		onOpenProject,
		onAddFrame,
		onDuplicate,
		onDelete,
		onMoveLeft,
		onMoveRight,
		onReverse,
		onExportGif,
		onSaveProject
	} = $props();

	const btn =
		'inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';
</script>

<header class="flex items-center gap-1 bg-slate-900 px-3 py-2 text-white shadow-md">
	<div class="mr-1 flex shrink-0 items-center gap-2">
		<span class="material-symbols-rounded text-2xl text-sky-400">gif</span>
		<span class="text-base font-bold tracking-tight">GIF Animator</span>
	</div>

	<div class="mx-1 h-6 w-px shrink-0 bg-white/20"></div>

	<button class={btn} onclick={onNew} title="New project (clear the timeline)">
		<span class="material-symbols-rounded text-lg leading-none">note_add</span><span class="hidden xl:inline">New</span>
	</button>
	<button class={btn} onclick={onOpen} title="Open a GIF file">
		<span class="material-symbols-rounded text-lg leading-none">image</span><span class="hidden xl:inline">Open GIF</span>
	</button>
	<button class={btn} onclick={onImport} title="Import images or GIFs as new frames">
		<span class="material-symbols-rounded text-lg leading-none">add_photo_alternate</span><span class="hidden xl:inline">Import</span>
	</button>
	<button class={btn} onclick={onOpenProject} title="Open a saved project (.json)">
		<span class="material-symbols-rounded text-lg leading-none">folder_open</span><span class="hidden xl:inline">Open Project</span>
	</button>

	<div class="mx-1 h-6 w-px shrink-0 bg-white/20"></div>

	<button class={btn} onclick={onAddFrame} title="Add a blank frame">
		<span class="material-symbols-rounded text-lg leading-none">add_box</span><span class="hidden xl:inline">Add Frame</span>
	</button>
	<button class={btn} disabled={!selectedCount()} onclick={onDuplicate} title="Duplicate the selected frame(s)">
		<span class="material-symbols-rounded text-lg leading-none">content_copy</span><span class="hidden xl:inline">Duplicate</span>
	</button>
	<button class={btn} disabled={!selectedCount()} onclick={onDelete} title="Remove the selected frame(s)">
		<span class="material-symbols-rounded text-lg leading-none">delete</span><span class="hidden xl:inline">Delete</span>
	</button>
	<button class={btn} disabled={!selectedCount()} onclick={onMoveLeft} title="Move the selected frame(s) left">
		<span class="material-symbols-rounded text-lg leading-none">chevron_left</span>
	</button>
	<button class={btn} disabled={!selectedCount()} onclick={onMoveRight} title="Move the selected frame(s) right">
		<span class="material-symbols-rounded text-lg leading-none">chevron_right</span>
	</button>
	{#if selectedCount() >= 2}
		<button class={btn} onclick={onReverse} title="Reverse the order of the selected frames">
			<span class="material-symbols-rounded text-lg leading-none">swap_horiz</span><span class="hidden xl:inline">Reverse</span>
		</button>
	{/if}

	<div class="mx-1 h-6 w-px shrink-0 bg-white/20"></div>

	<button class={btn} disabled={!hasFrames()} onclick={togglePlay} title="Play / pause preview">
		<span class="material-symbols-rounded text-lg leading-none">{project.playing ? 'pause' : 'play_arrow'}</span>
		<span class="hidden xl:inline">{project.playing ? 'Pause' : 'Play'}</span>
	</button>

	<div class="flex-1"></div>

	<button class={btn} disabled={!hasFrames()} onclick={onExportGif} title="Save / export the animation as a GIF file">
		<span class="material-symbols-rounded text-lg leading-none">download</span><span class="hidden lg:inline">Save GIF</span>
	</button>
	<button class={btn} disabled={!hasFrames()} onclick={onSaveProject} title="Save the project (frames + delays) as JSON">
		<span class="material-symbols-rounded text-lg leading-none">save</span><span class="hidden lg:inline">Save Project</span>
	</button>
</header>
