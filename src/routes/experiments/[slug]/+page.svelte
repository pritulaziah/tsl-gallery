<script lang="ts">
	import type { Component } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const project = $derived(data.project);

	let Mod = $state<Component<any> | null>(null);

	$effect(() => {
		let cancelled = false;
		project.component().then((mod) => {
			if (!cancelled) Mod = mod.default;
		});
		return () => {
			cancelled = true;
		};
	});
</script>

{#if Mod}
	<Mod />
{:else}
	<div class="flex h-screen w-screen items-center justify-center bg-black text-slate-400">
		Loading…
	</div>
{/if}
