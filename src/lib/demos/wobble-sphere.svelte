<script lang="ts">
	import { onMount } from 'svelte';
	import { Inspector } from 'three/addons/inspector/Inspector.js';
	import type { WobbleDemoHandle } from './wobble';

	let canvas: HTMLCanvasElement;
	let failed = $state(false);

	onMount(() => {
		let handle: WobbleDemoHandle | null = null;

		void (async () => {
			try {
				const { createWobbleDemo } = await import('./wobble');
				handle = await createWobbleDemo(canvas);
				handle.renderer.inspector = new Inspector();
				handle.start();
			} catch {
				failed = true;
			}
		})();

		return () => handle?.dispose();
	});
</script>

<div class="relative h-screen w-screen overflow-hidden bg-black">
	<canvas bind:this={canvas} class="h-full w-full"></canvas>

	{#if failed}
		<div class="absolute inset-0 flex items-center justify-center text-slate-400">
			WebGPU is not available in this browser
		</div>
	{/if}

	<a
		href="/"
		class="absolute left-5 top-5 rounded-full border border-slate-700 bg-slate-950/70 px-4 py-1.5 text-sm text-slate-300 backdrop-blur transition hover:text-white"
	>
		← Gallery
	</a>
</div>
