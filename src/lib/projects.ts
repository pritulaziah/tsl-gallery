import type { Component } from 'svelte';

export interface Project {
	slug: string;
	title: string;
	tags: string[];
	/** Lazy-loaded full-screen demo component (used on the detail page). */
	component: () => Promise<{ default: Component<any> }>;
}

export const projects: Project[] = [
	{
		slug: 'wobble-sphere',
		title: 'Wobble Sphere',
		tags: ['webgpu', 'tsl', 'vertex-displacement'],
		component: () => import('./demos/wobble-sphere.svelte')
	}
];

export function getProject(slug: string): Project | undefined {
	return projects.find((project) => project.slug === slug);
}
