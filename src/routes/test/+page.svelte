<script lang="ts">
	import {
		WebGPURenderer,
		Scene,
		PerspectiveCamera,
		Mesh,
		SphereGeometry,
		MeshBasicNodeMaterial
	} from 'three/webgpu';
	import { time, positionWorld, positionLocal, normalLocal } from 'three/tsl';
	import { Inspector } from 'three/addons/inspector/Inspector.js';
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;

	onMount(() => {
		const renderer = new WebGPURenderer({ canvas, antialias: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		const scene = new Scene();
		const camera = new PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.set(0, 0, 4);

		const geometry = new SphereGeometry(1, 128, 128);

		// Animated wobble (TSL)
		const material = new MeshBasicNodeMaterial({ color: 0x38bdf8, wireframe: true });
		const wave = time.add(positionWorld.y).sin().mul(0.15);
		material.positionNode = positionLocal.add(normalLocal.mul(wave));

		const mesh = new Mesh(geometry, material);
		scene.add(mesh);

		const resize = () => {
			const width = window.innerWidth;
			const height = window.innerHeight;
			renderer.setSize(width, height, false);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		};
		resize();
		window.addEventListener('resize', resize);

		let disposed = false;
		renderer.init().then(() => {
			if (disposed) return;
			renderer.setAnimationLoop(() => renderer.render(scene, camera));
		});

		// TSL inspector (ships with three.js) — attach via renderer.inspector
		// so the renderer drives begin()/finish() and FPS is computed per frame
		const inspector = new Inspector();
		renderer.inspector = inspector;

		return () => {
			disposed = true;
			inspector.dispose();
			renderer.setAnimationLoop(null);
			window.removeEventListener('resize', resize);
			geometry.dispose();
			material.dispose();
			renderer.dispose();
		};
	});
</script>

<div class="fixed inset-0 overflow-hidden bg-black">
	<canvas bind:this={canvas} class="h-full w-full"></canvas>
</div>
