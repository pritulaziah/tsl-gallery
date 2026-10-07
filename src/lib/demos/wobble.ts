import {
	Mesh,
	MeshBasicNodeMaterial,
	PerspectiveCamera,
	Scene,
	SphereGeometry,
	WebGPURenderer
} from 'three/webgpu';
import { normalLocal, positionLocal, positionWorld, time } from 'three/tsl';

export interface WobbleDemoHandle {
	renderer: WebGPURenderer;
	start: () => void;
	stop: () => void;
	dispose: () => void;
}

export interface WobbleDemoOptions {
	/** Lighter render used inside cards: fewer segments, no AA, low-power GPU. */
	preview?: boolean;
}

/**
 * Animated wobble sphere built with TSL nodes.
 * Used both as a full-screen demo and as a card preview.
 */
export async function createWobbleDemo(
	canvas: HTMLCanvasElement,
	options: WobbleDemoOptions = {}
): Promise<WobbleDemoHandle> {
	const preview = options.preview ?? false;

	const renderer = new WebGPURenderer({
		canvas,
		antialias: !preview,
		powerPreference: preview ? 'low-power' : 'high-performance'
	});
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, preview ? 1.25 : 2));

	const scene = new Scene();
	const camera = new PerspectiveCamera(45, 1, 0.1, 100);
	camera.position.set(0, 0, 4);

	const segments = preview ? 48 : 128;
	const geometry = new SphereGeometry(1, segments, segments);

	const material = new MeshBasicNodeMaterial({ color: 0x38bdf8, wireframe: true });
	const wave = time.add(positionWorld.y).sin().mul(0.15);
	material.positionNode = positionLocal.add(normalLocal.mul(wave));

	const mesh = new Mesh(geometry, material);
	scene.add(mesh);

	const resize = () => {
		const width = canvas.clientWidth || 1;
		const height = canvas.clientHeight || 1;
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	};
	resize();

	const observer = new ResizeObserver(resize);
	observer.observe(canvas);

	// Throws if WebGPU is unavailable.
	await renderer.init();

	let running = false;
	const render = () => renderer.render(scene, camera);
	const start = () => {
		if (running) return;
		running = true;
		renderer.setAnimationLoop(render);
	};
	const stop = () => {
		running = false;
		renderer.setAnimationLoop(null);
	};

	return {
		renderer,
		start,
		stop,
		dispose: () => {
			stop();
			observer.disconnect();
			geometry.dispose();
			material.dispose();
			renderer.dispose();
		}
	};
}
