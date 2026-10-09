<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/env';
	import type { DemoHandle } from '#lib/demos/types';
	import type { Project } from '#lib/projects';

	let { project }: { project: Project } = $props();

	let canvas: HTMLCanvasElement;
	let wrap: HTMLDivElement;
	let ready = $state(false);
	let failed = $state(false);

	let handle: DemoHandle | null = null;
	let loading = false;

	onMount(() => {
		if (!browser || !('gpu' in navigator)) {
			failed = true;
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						if (handle) {
							handle.start();
						} else if (!loading && !failed) {
							loading = true;
							void (async () => {
								try {
									const create = await project.preview();
									handle = await create(canvas, { preview: true });
									ready = true;
									handle.start();
								} catch {
									failed = true;
								} finally {
									loading = false;
								}
							})();
						}
					} else if (handle) {
						handle.stop();
					}
				}
			},
			{ rootMargin: '200px' }
		);
		observer.observe(wrap);

		return () => {
			observer.disconnect();
			handle?.dispose();
			handle = null;
		};
	});
</script>

<div bind:this={wrap} class="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
	{#if failed}
		<div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-xs text-slate-500">
			WebGPU unavailable
		</div>
	{:else if !ready}
		<div class="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950"></div>
	{/if}
	<canvas bind:this={canvas} class="h-full w-full"></canvas>
</div>
