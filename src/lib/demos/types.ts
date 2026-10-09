/** Lifecycle contract every demo factory returns. */
export interface DemoHandle {
	start: () => void;
	stop: () => void;
	dispose: () => void;
}

/** Options every demo factory accepts. */
export interface DemoOptions {
	/** Lighter render used inside cards: no AA, low-power GPU. */
	preview?: boolean;
}

/** Renders a demo into `canvas`; imported lazily by the gallery. */
export type DemoFactory = (canvas: HTMLCanvasElement, options?: DemoOptions) => Promise<DemoHandle>;
