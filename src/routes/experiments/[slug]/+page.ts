import { error } from '@sveltejs/kit';
import { getProject } from '#lib/projects';

export const ssr = false;

export function load({ params }: { params: { slug: string } }) {
	const project = getProject(params.slug);
	if (!project) {
		error(404, 'Experiment not found');
	}
	return { project };
}
