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
		reverseSelected
	} from '$lib/frames.svelte.js';
	import {
		isGif,
		decodeGifToFrames,
		loadImageAsImageData,
		loadDataUrlAsImageData,
		fitTo,
		imageDataToCanvas,
		encodeFramesToGif,
		downloadBlob,
		baseName
	} from '$lib/gifUtils.js';

	let openInput;
	let importInput;
	let projectInput;

	let error = $state('');
	let errorTimer;
	let dragOver = $state(false);

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
			const bytes = encodeFramesToGif(project.frames, project.width, project.height);
			downloadBlob(new Blob([bytes], { type: 'image/gif' }), `${baseName(project.name)}.gif`);
		} catch (err) {
			console.error(err);
			showError('Could not export GIF: ' + (err?.message || err));
		}
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
</div>
