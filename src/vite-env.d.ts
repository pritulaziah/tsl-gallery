/// <reference types="vite/client" />

// `.glb` is not part of vite/client's asset declarations, so it needs its own.
declare module '*.glb' {
	const url: string;
	export default url;
}
