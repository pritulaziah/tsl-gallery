import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Inspector } from 'three/addons/inspector/Inspector.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';
import { uv } from 'three/tsl';
import {
	AmbientLight,
	DirectionalLight,
	FrontSide,
	MathUtils,
	Material,
	Mesh,
	MeshStandardNodeMaterial,
	PCFShadowMap,
	PerspectiveCamera,
	PlaneGeometry,
	Scene,
	SRGBColorSpace,
	Texture,
	TextureLoader,
	Vector3,
	WebGPURenderer
} from 'three/webgpu';
import modelUrl from '#lib/assets/fantasy_sakura.glb';
import floorColorUrl from '#lib/assets/floor-color.jpg';
import type { DemoHandle, DemoOptions } from './types';

/** Plain values exposed as debug fields in the Inspector's parameter group. */
interface ScarletParams {
	turbidity: number;
	rayleigh: number;
	mieCoefficient: number;
	mieDirectionalG: number;
	elevation: number;
	azimuth: number;
	cloudCoverage: number;
	cloudDensity: number;
	cloudElevation: number;
}

export interface ScarletDemoOptions extends DemoOptions {
	/**
	 * Inspector to attach. When provided, the demo also publishes its debug
	 * fields through `inspector.createParameters('Scarlet Effect')`.
	 */
	inspector?: Inspector | null;
}

export interface ScarletDemoHandle extends DemoHandle {
	renderer: WebGPURenderer;
}

/** Disposes the textures referenced by a material (map, normalMap, ...). */
function disposeMaterialTextures(material: Material) {
	for (const value of Object.values(material)) {
		if (value instanceof Texture) value.dispose();
	}
}

/**
 * Shadowed model on a TSL floor under a procedural sky. Ported from the
 * Three.js Journey exercise `11-tsl-post-processing`; the post-processing
 * chain is not part of the starter yet.
 */
export async function createScarletDemo(
	canvas: HTMLCanvasElement,
	options: ScarletDemoOptions = {}
): Promise<ScarletDemoHandle> {
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
	camera.position.set(5, 2.5, 2.5);

	// Controls stay off in card previews so they don't capture pointer events.
	const controls = preview ? null : new OrbitControls(camera, canvas);
	if (controls !== null) {
		controls.target.set(0, 1.25, 0);
		controls.enableDamping = true;
	}

	// Floor
	const floorTexture = new TextureLoader().load(floorColorUrl);
	floorTexture.colorSpace = SRGBColorSpace;

	const floorGeometry = new PlaneGeometry(10, 10);
	const floorMaterial = new MeshStandardNodeMaterial({ map: floorTexture, transparent: true });

	// Fade the floor out towards the edges of the texture.
	floorMaterial.opacityNode = uv().sub(0.5).length().smoothstep(0.5, 0.2);

	const floor = new Mesh(floorGeometry, floorMaterial);
	floor.rotation.x = -Math.PI * 0.5;
	floor.receiveShadow = true;
	scene.add(floor);

	// Model — `anvil.glb` is a placeholder until the final model arrives.
	const gltf = await new GLTFLoader().loadAsync(modelUrl);

	gltf.scene.traverse((child) => {
		if (!(child instanceof Mesh)) return;

		child.castShadow = true;
		child.receiveShadow = true;

		const materials = Array.isArray(child.material) ? child.material : [child.material];
		for (const material of materials) {
			material.side = FrontSide;
			material.shadowSide = FrontSide;
		}
	});

	gltf.scene.position.y = 0.001;
	scene.add(gltf.scene);

	// Sky
	const sky = new SkyMesh();
	sky.scale.setScalar(1000);
	scene.add(sky);

	const params: ScarletParams = {
		turbidity: 5.5,
		rayleigh: 1.25,
		mieCoefficient: 0.02,
		mieDirectionalG: 0.35,
		elevation: 0.4,
		azimuth: 100,
		cloudCoverage: 0.4,
		cloudDensity: 0.4,
		cloudElevation: 0.5
	};

	const sun = new Vector3();
	const skyChanged = () => {
		sky.turbidity.value = params.turbidity;
		sky.rayleigh.value = params.rayleigh;
		sky.mieCoefficient.value = params.mieCoefficient;
		sky.mieDirectionalG.value = params.mieDirectionalG;
		sky.cloudCoverage.value = params.cloudCoverage;
		sky.cloudDensity.value = params.cloudDensity;
		sky.cloudElevation.value = params.cloudElevation;

		const phi = MathUtils.degToRad(90 - params.elevation);
		const theta = MathUtils.degToRad(params.azimuth);

		sun.setFromSphericalCoords(1, phi, theta);
		sky.sunPosition.value.copy(sun);
	};
	skyChanged();

	// Lights
	const directionalLight = new DirectionalLight(0xffffff, 3);
	directionalLight.castShadow = true;
	directionalLight.position.set(2, 1, -0.75).normalize().multiplyScalar(10);
	directionalLight.shadow.camera.near = 0.01;
	directionalLight.shadow.camera.far = 30;
	directionalLight.shadow.radius = 5;
	directionalLight.shadow.normalBias = 0.1;
	scene.add(directionalLight);

	const ambientLight = new AmbientLight(0x859dff, 0.75);
	scene.add(ambientLight);

	let running = false;
	const render = () => {
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

		// Debug fields: Inspector → Parameters → "Scarlet Effect".
		const group = inspector.createParameters('Scarlet Effect');

		const skyFolder = group.addFolder('Sky').close();
		skyFolder.add(params, 'turbidity', 0, 20, 0.1).name('Turbidity').onChange(skyChanged);
		skyFolder.add(params, 'rayleigh', 0, 4, 0.001).name('Rayleigh').onChange(skyChanged);
		skyFolder
			.add(params, 'mieCoefficient', 0, 0.1, 0.001)
			.name('Mie Coefficient')
			.onChange(skyChanged);
		skyFolder
			.add(params, 'mieDirectionalG', 0, 1, 0.001)
			.name('Mie Directional G')
			.onChange(skyChanged);
		skyFolder.add(params, 'elevation', -10, 90, 0.1).name('Elevation').onChange(skyChanged);
		skyFolder.add(params, 'azimuth', -180, 180, 0.1).name('Azimuth').onChange(skyChanged);
		skyFolder
			.add(params, 'cloudCoverage', 0, 1, 0.01)
			.name('Cloud Coverage')
			.onChange(skyChanged);
		skyFolder.add(params, 'cloudDensity', 0, 1, 0.01).name('Cloud Density').onChange(skyChanged);
		skyFolder
			.add(params, 'cloudElevation', 0, 1, 0.01)
			.name('Cloud Elevation')
			.onChange(skyChanged);

		const lightsFolder = group.addFolder('Lights').close();
		lightsFolder.addColor(directionalLight, 'color').name('Directional Color');
		lightsFolder.add(directionalLight, 'intensity', 0, 5, 0.01).name('Directional Intensity');
		lightsFolder.addColor(ambientLight, 'color').name('Ambient Color');
		lightsFolder.add(ambientLight, 'intensity', 0, 5, 0.01).name('Ambient Intensity');
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
			gltf.scene.traverse((child) => {
				if (!(child instanceof Mesh)) return;

				child.geometry.dispose();

				const materials = Array.isArray(child.material) ? child.material : [child.material];
				for (const material of materials) {
					disposeMaterialTextures(material);
					material.dispose();
				}
			});
			sky.geometry.dispose();
			sky.material.dispose();
			renderer.dispose();
		}
	};
}
