import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Inspector } from 'three/addons/inspector/Inspector.js';
import {
	mix,
	mx_noise_float,
	mx_worley_noise_float_2d,
	mx_worley_noise_float_3d,
	parallaxUV,
	time,
	uniform,
	uv,
	vec3
} from 'three/tsl';
import {
	CircleGeometry,
	Color,
	Mesh,
	MeshBasicNodeMaterial,
	Node,
	PCFShadowMap,
	PerspectiveCamera,
	PlaneGeometry,
	Scene,
	SRGBColorSpace,
	TextureLoader,
	Timer,
	WebGPURenderer
} from 'three/webgpu';
import floorColorUrl from '#lib/assets/floor-color.jpg';
import type { DemoHandle, DemoOptions } from './types';

/** Plain values exposed as debug fields in the Inspector's parameter group. */
interface LilyPondParams {
	parallaxDepth: number;
	causticsScale: number;
	causticsSpeed: number;
	causticsPower: number;
	deepColor: Color;
	causticsColor: Color;
	foamScale: number;
	foamSpeed: number;
	foamThreshold: number;
	foamColor: Color;
	lilyPadScale: number;
	lilyPadThreshold: number;
	lilyPadColorA: Color;
	lilyPadColorB: Color;
	floorFadeInner: number;
	floorFadeOuter: number;
	wireframe: boolean;
}

export interface LilyPondDemoOptions extends DemoOptions {
	/**
	 * Inspector to attach. When provided, the demo also publishes its debug
	 * fields through `inspector.createParameters('Lily Pond')`.
	 */
	inspector?: Inspector | null;
}

export interface LilyPondDemoHandle extends DemoHandle {
	renderer: WebGPURenderer;
}

/**
 * Procedural pond built with TSL noise: caustics, foam and lily pads on a
 * circular water surface above a textured floor that fades towards its edges.
 * Ported from the Three.js Journey exercise `76-tsl-patterns`.
 */
export async function createLilyPondDemo(
	canvas: HTMLCanvasElement,
	options: LilyPondDemoOptions = {}
): Promise<LilyPondDemoHandle> {
	const preview = options.preview ?? false;
	const inspector = options.inspector ?? null;

	const renderer = new WebGPURenderer({
		canvas,
		antialias: !preview,
		powerPreference: preview ? 'low-power' : 'high-performance'
	});
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, preview ? 1.25 : 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = PCFShadowMap;
	renderer.setClearColor(0x111111);

	const scene = new Scene();
	const camera = new PerspectiveCamera(35, 1, 0.1, 100);
	camera.position.set(1.25, 2, 4);

	// Controls stay off in card previews so they don't capture pointer events.
	const controls = preview ? null : new OrbitControls(camera, canvas);
	if (controls !== null) {
		controls.target.set(0, 0, 0);
		controls.enableDamping = true;
	}

	const params: LilyPondParams = {
		parallaxDepth: 0.5,
		causticsScale: 6,
		causticsSpeed: 0.3,
		causticsPower: 6,
		deepColor: new Color(0x1b3956),
		causticsColor: new Color(0x11eeff),
		foamScale: 5,
		foamSpeed: 0.1,
		foamThreshold: 0.05,
		foamColor: new Color(0xe5f7ff),
		lilyPadScale: 4,
		lilyPadThreshold: 0.2,
		lilyPadColorA: new Color(0xd7e689),
		lilyPadColorB: new Color(0x329a89),
		floorFadeInner: 0.2,
		floorFadeOuter: 0.5,
		wireframe: false
	};

	// Uniforms mirror `params`, so the Inspector edits the shader live.
	const parallaxDepth = uniform(params.parallaxDepth);
	const causticsScale = uniform(params.causticsScale);
	const causticsSpeed = uniform(params.causticsSpeed);
	const causticsPower = uniform(params.causticsPower);
	const deepColor = uniform(params.deepColor);
	const causticsColor = uniform(params.causticsColor);
	const foamScale = uniform(params.foamScale);
	const foamSpeed = uniform(params.foamSpeed);
	const foamThreshold = uniform(params.foamThreshold);
	const foamColor = uniform(params.foamColor);
	const lilyPadScale = uniform(params.lilyPadScale);
	const lilyPadThreshold = uniform(params.lilyPadThreshold);
	const lilyPadColorA = uniform(params.lilyPadColorA);
	const lilyPadColorB = uniform(params.lilyPadColorB);
	const floorFadeInner = uniform(params.floorFadeInner);
	const floorFadeOuter = uniform(params.floorFadeOuter);

	// Floor
	const floorTexture = new TextureLoader().load(floorColorUrl);
	floorTexture.colorSpace = SRGBColorSpace;

	const floorGeometry = new PlaneGeometry(10, 10);
	const floorMaterial = new MeshBasicNodeMaterial({ map: floorTexture, transparent: true });

	// Fade the floor out towards the edges of the texture.
	floorMaterial.opacityNode = uv()
		.sub(0.5)
		.length()
		.smoothstep(floorFadeOuter, floorFadeInner);

	const floor = new Mesh(floorGeometry, floorMaterial);
	floor.rotation.x = -Math.PI * 0.5;
	floor.receiveShadow = true;
	scene.add(floor);

	// Water surface: caustics mixed with foam and lily pads.
	const geometry = new CircleGeometry(2, 32);
	const material = new MeshBasicNodeMaterial({ wireframe: params.wireframe });

	// .toVar('name') names the value in the generated WGSL/GLSL.
	const depthUv = (parallaxUV(uv(), parallaxDepth) as Node<'vec2'>).xy;
	const causticsInput = vec3(depthUv.mul(causticsScale), time.mul(causticsSpeed));
	const causticsNoise = mx_worley_noise_float_3d(causticsInput)
		.pow(causticsPower)
		.toVar('causticsNoise');
	const depthColor = mix(deepColor, causticsColor, causticsNoise).toVar('depthColor');

	const foamInput = vec3(uv().mul(foamScale), time.mul(foamSpeed));
	const foamNoise = mx_noise_float(foamInput).toVar('foamNoise');
	const foamMask = foamNoise.abs().step(foamThreshold).oneMinus().toVar('foamMask');

	const lilyPadInput = vec3(uv().mul(lilyPadScale), 0);
	const lilyPadNoise = mx_worley_noise_float_2d(lilyPadInput).pow(2).toVar('lilyPadNoise');
	const lilyPadMask = lilyPadNoise.step(lilyPadThreshold).oneMinus().toVar('lilyPadMask');
	const lilyPadColor = mix(lilyPadColorA, lilyPadColorB, lilyPadNoise.div(lilyPadThreshold)).toVar(
		'lilyPadColor'
	);

	let final = mix(depthColor, foamColor, foamMask);
	final = mix(final, lilyPadColor, lilyPadMask);
	const finalColor = final.toVar('finalColor');

	// .debug() prints the code generated for this node to the console; three.js
	// also mirrors it into Inspector → Console. .toInspector('name') registers
	// the value in Inspector → Viewer, where it is previewed live.
	// Note: @types/three drops the node extensions on DebugNode, so .debug()
	// must come last and the result needs a cast to fit `colorNode`.
	material.colorNode =
		inspector !== null
			? (finalColor.toInspector('Final Color').debug() as unknown as Node<'vec3'>)
			: finalColor;

	const mesh = new Mesh(geometry, material);
	mesh.rotation.x = -Math.PI * 0.5;
	mesh.position.y = 0.01;
	scene.add(mesh);

	const timer = new Timer();

	let running = false;
	const render = () => {
		timer.update();
		controls?.update();
		renderer.render(scene, camera);
	};

	const resize = () => {
		const width = canvas.clientWidth || 1;
		const height = canvas.clientHeight || 1;
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		if (preview && running) render();
	};
	resize();

	const observer = new ResizeObserver(resize);
	observer.observe(canvas);

	await renderer.init();

	if (inspector !== null) {
		renderer.inspector = inspector;

		// Debug fields: Inspector → Parameters → "Lily Pond".
		const group = inspector.createParameters('Lily Pond');

		const caustics = group.addFolder('Caustics');
		caustics
			.add(params, 'causticsScale', 1, 20, 0.1)
			.name('Scale')
			.onChange((value) => {
				causticsScale.value = value;
			});
		caustics
			.add(params, 'causticsSpeed', 0, 2, 0.01)
			.name('Speed')
			.onChange((value) => {
				causticsSpeed.value = value;
			});
		caustics
			.add(params, 'causticsPower', 1, 12, 0.1)
			.name('Power')
			.onChange((value) => {
				causticsPower.value = value;
			});
		caustics
			.add(params, 'parallaxDepth', 0, 2, 0.01)
			.name('Parallax Depth')
			.onChange((value) => {
				parallaxDepth.value = value;
			});
		// `params.deepColor` is the same Color instance the uniform reads, so
		// the pickers write straight through to the shader.
		caustics.addColor(params, 'deepColor').name('Deep Color');
		caustics.addColor(params, 'causticsColor').name('Caustics Color');

		const foam = group.addFolder('Foam');
		foam
			.add(params, 'foamScale', 1, 20, 0.1)
			.name('Scale')
			.onChange((value) => {
				foamScale.value = value;
			});
		foam
			.add(params, 'foamSpeed', 0, 2, 0.01)
			.name('Speed')
			.onChange((value) => {
				foamSpeed.value = value;
			});
		foam
			.add(params, 'foamThreshold', 0.01, 0.5, 0.001)
			.name('Threshold')
			.onChange((value) => {
				foamThreshold.value = value;
			});
		foam.addColor(params, 'foamColor').name('Color');

		const lilyPads = group.addFolder('Lily Pads');
		lilyPads
			.add(params, 'lilyPadScale', 1, 20, 0.1)
			.name('Scale')
			.onChange((value) => {
				lilyPadScale.value = value;
			});
		lilyPads
			.add(params, 'lilyPadThreshold', 0.01, 0.5, 0.001)
			.name('Threshold')
			.onChange((value) => {
				lilyPadThreshold.value = value;
			});
		lilyPads.addColor(params, 'lilyPadColorA').name('Color A');
		lilyPads.addColor(params, 'lilyPadColorB').name('Color B');

		const floorFolder = group.addFolder('Floor');
		floorFolder
			.add(params, 'floorFadeInner', 0, 0.5, 0.01)
			.name('Fade Inner')
			.onChange((value) => {
				floorFadeInner.value = value;
			});
		floorFolder
			.add(params, 'floorFadeOuter', 0, 0.7, 0.01)
			.name('Fade Outer')
			.onChange((value) => {
				floorFadeOuter.value = value;
			});

		group.add(params, 'wireframe').name('Wireframe').onChange((value) => {
			material.wireframe = value;
		});
	}

	const start = () => {
		if (running) return;
		running = true;
		if (preview) render();
		else renderer.setAnimationLoop(render);
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
			controls?.dispose();
			floorTexture.dispose();
			floorGeometry.dispose();
			floorMaterial.dispose();
			geometry.dispose();
			material.dispose();
			renderer.dispose();
		}
	};
}
