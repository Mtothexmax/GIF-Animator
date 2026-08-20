<script>
	import Toolbar from '$lib/components/Toolbar.svelte';
	import PreviewPane from '$lib/components/PreviewPane.svelte';
	import Timeline from '$lib/components/Timeline.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import {
		project,
		hasFrames,
		selectedCount,
		setProject,
		addFrame,
		removeSelected,
		duplicateSelected,
		moveSelected,
		reverseSelected,
		setColors,
		resizeProject
	} from '$lib/frames.svelte.js';
	import {
		isGif,
		decodeGifToFrames,
		loadImageAsImageData,
		loadDataUrlAsImageData,
		fitTo,
		padTo,
		imageDataToCanvas,
		encodeFramesToGif,
		exportFramesAsZip,
		downloadBlob,
		baseName
	} from '$lib/gifUtils.js';

	let openInput;
	let importInput;
	let projectInput;

	let error = $state('');
	let errorTimer;
	let dragOver = $state(false);

	// Dialog state for the "..." menu
	let sizeDialogOpen = $state(false);
	let sizeW = $state(400);
	let sizeH = $state(300);
	let sizeScale = $state(true);
	/** aspect-ratio lock (width / height) for the size dialog */
	let sizeLocked = $state(true);
	let sizeRatio = $state(1);
	let colorsDialogOpen = $state(false);
	let colorCount = $state(256);

	function showError(message) {
		error = message;
		clearTimeout(errorTimer);
		errorTimer = setTimeout(() => {
			error = '';
		}, 6000);
	}

	// ---- Open a GIF (replaces the project) ----
	async function handleOpenGif(file) {
		try {
			const frames = decodeGifToFrames(await file.arrayBuffer());
			if (!frames.length) return showError('No frames found in that GIF.');
			setProject({
				frames,
				width: frames[0].imageData.width,
				height: frames[0].imageData.height,
				name: file.name
			});
		} catch (err) {
			console.error(err);
			showError(`Could not read “${file.name}”. It may not be a valid GIF.`);
		}
	}

	// ---- Import images / GIFs (appends frames; creates the project if empty) ----
	async function handleImport(fileList) {
		const files = [...fileList];
		if (!files.length) return;

		const items = [];
		for (const file of files) {
			try {
				if (isGif(file)) {
					items.push(...decodeGifToFrames(await file.arrayBuffer()));
				} else {
					items.push({ imageData: await loadImageAsImageData(file), delay: 100 });
				}
			} catch (err) {
				console.error(err);
				showError(`Could not read “${file.name}”.`);
			}
		}
		if (!items.length) return;

		if (project.frames.length === 0) {
			const w = items[0].imageData.width;
			const h = items[0].imageData.height;
			const frames = items.map((it) => ({
				imageData: fitTo(it.imageData, w, h),
				delay: it.delay
			}));
			setProject({ frames, width: w, height: h, name: files[0]?.name });
		} else {
			for (const it of items) {
				addFrame(fitTo(it.imageData, project.width, project.height), it.delay);
			}
		}
	}

	// ---- Open a saved project (.json) ----
	async function handleOpenProject(file) {
		try {
			const json = JSON.parse(await file.text());
			const raw = Array.isArray(json.frames) ? json.frames : [];
			if (!raw.length) return showError('That project file has no frames.');
			const frames = [];
			for (const f of raw) {
				frames.push({
					imageData: await loadDataUrlAsImageData(f.dataUrl),
					delay: f.delay ?? 100
				});
			}
			setProject({
				frames,
				width: json.width || frames[0].imageData.width,
				height: json.height || frames[0].imageData.height,
				name: json.name || file.name
			});
		} catch (err) {
			console.error(err);
			showError('Could not open that project file.');
		}
	}

	// ---- Clear everything ----
	function handleNewProject() {
		setProject({ frames: [], width: 0, height: 0, name: 'Untitled' });
	}

	// ---- Add a blank frame (starts a 400x300 project when empty) ----
	function handleAddFrame() {
		if (hasFrames()) {
			const canvas = document.createElement('canvas');
			canvas.width = project.width;
			canvas.height = project.height;
			const imageData = canvas.getContext('2d').getImageData(0, 0, project.width, project.height);
			addFrame(imageData, 100);
		} else {
			const w = 400;
			const h = 300;
			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			const imageData = canvas.getContext('2d').getImageData(0, 0, w, h);
			setProject({ frames: [{ imageData, delay: 100 }], width: w, height: h, name: 'Untitled' });
		}
	}

	// ---- Export the timeline as a GIF ----
	function handleExportGif() {
		try {
			const bytes = encodeFramesToGif(project.frames, project.width, project.height, {
				colors: project.colors,
				loop: project.loop
			});
			downloadBlob(new Blob([bytes], { type: 'image/gif' }), `${baseName(project.name)}.gif`);
		} catch (err) {
			console.error(err);
			showError('Could not export GIF: ' + (err?.message || err));
		}
	}

	// ---- Export each frame as its own GIF file inside a ZIP ----
	function handleExportFramesZip() {
		try {
			const blob = exportFramesAsZip(
				project.frames,
				project.width,
				project.height,
				baseName(project.name),
				project.colors,
				project.loop
			);
			downloadBlob(blob, `${baseName(project.name)}-frames.zip`);
		} catch (err) {
			console.error(err);
			showError('Could not export frames: ' + (err?.message || err));
		}
	}

	// ---- Change canvas size: scale or pad every frame to the new size ----
	function openSizeDialog() {
		sizeW = project.width || 400;
		sizeH = project.height || 300;
		sizeRatio = sizeH > 0 ? sizeW / sizeH : 1;
		sizeScale = true;
		sizeDialogOpen = true;
	}

	// With the aspect lock on, keep the width/height ratio when either field changes.
	function onSizeChange(field) {
		if (!sizeLocked) return;
		const ratio = Number(sizeRatio) || 1;
		if (field === 'w') {
			const w = Number(sizeW) || 1;
			sizeH = Math.max(1, Math.round(w / ratio));
		} else {
			const h = Number(sizeH) || 1;
			sizeW = Math.max(1, Math.round(h * ratio));
		}
	}

	function applySize() {
		const w = Math.max(1, Math.min(4096, Math.trunc(Number(sizeW)) || project.width || 400));
		const h = Math.max(1, Math.min(4096, Math.trunc(Number(sizeH)) || project.height || 300));
		const frames = project.frames.map((f) => ({
			id: f.id,
			imageData: sizeScale ? fitTo(f.imageData, w, h) : padTo(f.imageData, w, h),
			delay: f.delay
		}));
		resizeProject(frames, w, h);
		sizeDialogOpen = false;
	}

	// ---- Change the max color count used for GIF export ----
	function openColorsDialog() {
		colorCount = project.colors;
		colorsDialogOpen = true;
	}

	function applyColors() {
		setColors(colorCount);
		colorsDialogOpen = false;
	}

	// ---- Save the project as JSON (frames as PNG data URLs + delays) ----
	function handleSaveProject() {
		try {
			const data = {
				name: project.name,
				width: project.width,
				height: project.height,
				frames: project.frames.map((f) => ({
					dataUrl: imageDataToCanvas(f.imageData).toDataURL('image/png'),
					delay: f.delay
				}))
			};
			downloadBlob(
				new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
				`${baseName(project.name)}.gifanim.json`
			);
		} catch (err) {
			console.error(err);
			showError('Could not save project: ' + (err?.message || err));
		}
	}

	// ---- Drag & drop onto the window ----
	function onDrop(e) {
		e.preventDefault();
		dragOver = false;
		const files = [...(e.dataTransfer?.files ?? [])];
		if (!files.length) return;
		if (files.length === 1 && files[0].name.toLowerCase().endsWith('.json')) {
			handleOpenProject(files[0]);
		} else {
			handleImport(files);
		}
	}
</script>

<svelte:head>
	<title>GIF Animator</title>
</svelte:head>

<div class="flex h-dvh flex-col overflow-hidden bg-slate-100 text-slate-800">
	<Toolbar
		onNew={handleNewProject}
		onOpen={() => openInput?.click()}
		onImport={() => importInput?.click()}
		onOpenProject={() => projectInput?.click()}
		onAddFrame={handleAddFrame}
		onDuplicate={() => selectedCount() > 0 && duplicateSelected()}
		onDelete={() => selectedCount() > 0 && removeSelected()}
		onMoveLeft={() => selectedCount() > 0 && moveSelected(-1)}
		onMoveRight={() => selectedCount() > 0 && moveSelected(1)}
		onReverse={reverseSelected}
		onExportGif={handleExportGif}
		onSaveProject={handleSaveProject}
		onExportFramesZip={handleExportFramesZip}
		onChangeSize={openSizeDialog}
		onChangeColors={openColorsDialog}
	/>

	{#if error}
		<div class="flex items-center gap-2 bg-red-100 px-3 py-2 text-sm text-red-800">
			<span class="material-symbols-rounded text-base leading-none">error</span>
			<span>{error}</span>
		</div>
	{/if}

	<main
		class="min-h-0 flex-1 p-3 transition-shadow {dragOver ? 'ring-2 ring-inset ring-sky-400' : ''}"
		ondragover={(e) => {
			e.preventDefault();
			dragOver = true;
		}}
		ondragleave={(e) => {
			if (e.target === e.currentTarget) dragOver = false;
		}}
		ondrop={onDrop}
	>
		<PreviewPane />
	</main>

	<Timeline />
	<StatusBar />

	<input
		bind:this={openInput}
		type="file"
		accept=".gif,image/gif"
		class="hidden"
		onchange={(e) => {
			const f = e.currentTarget.files?.[0];
			if (f) handleOpenGif(f);
			e.currentTarget.value = '';
		}}
	/>
	<input
		bind:this={importInput}
		type="file"
		accept="image/*"
		multiple
		class="hidden"
		onchange={(e) => {
			handleImport(e.currentTarget.files ?? []);
			e.currentTarget.value = '';
		}}
	/>
	<input
		bind:this={projectInput}
		type="file"
		accept=".json,application/json"
		class="hidden"
		onchange={(e) => {
			const f = e.currentTarget.files?.[0];
			if (f) handleOpenProject(f);
			e.currentTarget.value = '';
		}}
	/>

	{#if sizeDialogOpen}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<div class="w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
				<h2 class="mb-3 text-sm font-semibold text-slate-800">Change size</h2>
				<div class="mb-3 flex items-end gap-2">
					<label class="flex flex-1 flex-col gap-1 text-xs text-slate-500">
						Width
						<input
							type="number"
							min="1"
							max="4096"
							bind:value={sizeW}
							oninput={() => onSizeChange('w')}
							class="rounded border border-slate-300 px-2 py-1 text-sm focus:border-sky-400 focus:outline-none"
						/>
					</label>
					<button
						class="icon-btn mb-0.5"
						style={sizeLocked ? 'color:#fff;background-color:#0ea5e9;' : ''}
						title={sizeLocked
							? 'Aspect ratio locked — unlock to edit freely'
							: 'Aspect ratio unlocked — lock to keep proportions'}
						onclick={() => (sizeLocked = !sizeLocked)}
					>
						<span class="material-symbols-rounded text-base leading-none">{sizeLocked ? 'link' : 'link_off'}</span>
					</button>
					<label class="flex flex-1 flex-col gap-1 text-xs text-slate-500">
						Height
						<input
							type="number"
							min="1"
							max="4096"
							bind:value={sizeH}
							oninput={() => onSizeChange('h')}
							class="rounded border border-slate-300 px-2 py-1 text-sm focus:border-sky-400 focus:outline-none"
						/>
					</label>
				</div>
				<label class="mb-4 flex items-center gap-2 text-xs text-slate-600">
					<input type="checkbox" bind:checked={sizeScale} class="h-4 w-4 accent-sky-500" />
					Scale frame content (unchecked: keep content, transparent padding)
				</label>
				<div class="flex justify-end gap-2">
					<button
						class="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
						onclick={() => (sizeDialogOpen = false)}
					>
						Cancel
					</button>
					<button
						class="rounded bg-sky-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky-400"
						onclick={applySize}
					>
						Apply
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if colorsDialogOpen}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<div class="w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
				<h2 class="mb-1 text-sm font-semibold text-slate-800">Number of colors</h2>
				<p class="mb-3 text-xs text-slate-500">Max colors used when exporting GIF files.</p>
				<select
					bind:value={colorCount}
					class="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-sky-400 focus:outline-none"
				>
					{#each [2, 4, 8, 16, 32, 64, 128, 256] as n}
						<option value={n}>{n} colors</option>
					{/each}
				</select>
				<div class="mt-4 flex justify-end gap-2">
					<button
						class="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
						onclick={() => (colorsDialogOpen = false)}
					>
						Cancel
					</button>
					<button
						class="rounded bg-sky-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky-400"
						onclick={applyColors}
					>
						Apply
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
