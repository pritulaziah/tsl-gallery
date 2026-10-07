<script lang="ts">
	import PreviewCanvas from './PreviewCanvas.svelte';
	import type { Project } from '#lib/projects';

	let { project }: { project: Project } = $props();
</script>

<a
	href={`/experiments/${project.slug}`}
	class="group block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 transition duration-300 hover:-translate-y-1 hover:border-slate-600 hover:shadow-xl hover:shadow-sky-500/10"
>
	<PreviewCanvas />

	<div class="p-4">
		<h3 class="font-semibold text-white transition-colors group-hover:text-sky-400">
			{project.title}
		</h3>
		<div class="mt-2 flex flex-wrap gap-1.5">
			{#each project.tags as tag}
				<span class="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
					{tag}
				</span>
			{/each}
		</div>
	</div>
</a>
