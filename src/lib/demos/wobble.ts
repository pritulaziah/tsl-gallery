import {
	Color,
	Mesh,
	MeshBasicNodeMaterial,
	PerspectiveCamera,
	Scene,
	SphereGeometry,
	WebGPURenderer
} from 'three/webgpu';
import { normalLocal, positionLocal, positionWorld, time, uniform } from 'three/tsl';
import type { Inspector } from 'three/addons/inspector/Inspector.js';

/** Plain values exposed as debug fields in the Inspector's parameter group. */
interface WobbleParams {
	amplitude: number;
	frequency: number;
	speed: number;
	color: Color;
	wireframe: boolean;
}

export interface WobbleDemoHandle {
	renderer: WebGPURenderer;
	start: () => void;
	stop: () => void;
	dispose: () => void;
}

export interface WobbleDemoOptions {
	/** Lighter render used inside cards: fewer segments, no AA, low-power GPU. */
	preview?: boolean;
	/**
	 * Inspector to attach. When provided, the demo also publishes its debug
	 * fields through `inspector.createParameters('Wobble')`.
	 */
	inspector?: Inspector | null;
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
	const inspector = options.inspector ?? null;

	const renderer = new WebGPURenderer({
		canvas,
		antialias: !preview,
		powerPreference: preview ? 'low-power' : 'high-performance'
	});
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, preview ? 1.25 : 2));

	const scene = new Scene();
	const camera = new PerspectiveCamera(45, 1, 0.1, 100);
	camera.position.set(0, 0, 4);

	const params: WobbleParams = {
		amplitude: 0.15,
		frequency: 1,
		speed: 1,
		color: new Color(0x38bdf8),
		wireframe: true
	};

	const segments = preview ? 48 : 128;
	const geometry = new SphereGeometry(1, segments, segments);

	const material = new MeshBasicNodeMaterial({ wireframe: params.wireframe });

	// Uniforms mirror `params`, so the Inspector edits the shader live.
	const amplitude = uniform(params.amplitude);
	const frequency = uniform(params.frequency);
	const speed = uniform(params.speed);
	const baseColor = uniform(params.color);

	// .toVar('name') names the value in the generated WGSL/GLSL.
	const phase = time.mul(speed).add(positionWorld.y.mul(frequency)).toVar('phase');
	const wave = phase.sin().mul(amplitude).toVar('wave');
	const offset = normalLocal.mul(wave).toVar('offset');
	const wobblePosition = positionLocal.add(offset).toVar('wobblePosition');

	// .debug() prints the code generated for this node to the console; three.js
	// also mirrors it into Inspector → Console. Kept out of card previews.
	// Note: @types/three has no chaining on DebugNode, so .debug() must come last.
	material.positionNode = inspector !== null ? wobblePosition.debug() : wobblePosition;

	// .toInspector('name') registers the value in Inspector → Viewer, where it
	// is previewed live (drag Base Color in the parameter group to see it).
	material.colorNode = baseColor.toInspector('Base Color');

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

	if (inspector !== null) {
		renderer.inspector = inspector;

		// Debug fields: Inspector → Parameters → "Wobble".
		const group = inspector.createParameters('Wobble');

		group.add(params, 'amplitude', 0, 0.5, 0.001).name('Amplitude').onChange((value) => {
			amplitude.value = value;
		});

		group.add(params, 'frequency', 0, 4, 0.01).name('Frequency').onChange((value) => {
			frequency.value = value;
		});

		group.add(params, 'speed', 0, 4, 0.01).name('Speed').onChange((value) => {
			speed.value = value;
		});

		group.add(params, 'wireframe').name('Wireframe').onChange((value) => {
			material.wireframe = value;
		});

		// `params.color` is the same Color instance the uniform reads, so the
		// picker writes straight through to the shader.
		group.addColor(params, 'color').name('Base Color');
	}

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
