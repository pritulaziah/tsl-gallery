<script lang="ts">
	import ProjectCard from '#lib/components/ProjectCard.svelte';
	import { projects } from '#lib/projects';
</script>

<div class="min-h-screen bg-slate-950 text-slate-200">
	<header class="mx-auto flex max-w-6xl items-center justify-between px-6 pt-8">
		<a href="/" class="text-xl font-bold text-white">TSL Gallery</a>
	</header>

	<main class="mx-auto max-w-6xl px-6 pb-16">
		<section class="py-10">
			<h1 class="text-3xl font-bold text-white">TSL Experiments</h1>
			<p class="mt-2 text-slate-400">
				A collection of experiments built with Three.js Shading Language and WebGPU.
			</p>
		</section>

		<section class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each projects as project (project.slug)}
				<ProjectCard {project} />
			{/each}
		</section>
	</main>
</div>
