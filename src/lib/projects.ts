import type { Component } from 'svelte';
import type { DemoFactory } from './demos/types';

export interface Project {
	slug: string;
	title: string;
	tags: string[];
	/** Lazy-loaded full-screen demo component (used on the detail page). */
	component: () => Promise<{ default: Component<any> }>;
	/** Lazy-loaded demo factory (used for the card preview). */
	preview: () => Promise<DemoFactory>;
}

export const projects: Project[] = [
	{
		slug: 'lily-pond',
		title: 'Lily Pond',
		tags: ['webgpu', 'tsl', 'water'],
		component: () => import('./demos/lily-pond.svelte'),
		preview: () => import('./demos/lily-pond').then((mod) => mod.createLilyPondDemo)
	}
];

export function getProject(slug: string): Project | undefined {
	return projects.find((project) => project.slug === slug);
}
