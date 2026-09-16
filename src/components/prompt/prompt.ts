import { MessageTarget } from '../helper';
import { ProxyEventType, type PromptInterface } from '../types';
import PromptElement from './prompt.svelte';

// Must match the tag in <svelte:options customElement> in prompt.svelte.
const tag = "gleamdrag-prompt"

export class PromptImpl extends MessageTarget implements PromptInterface {

	elem: HTMLElement & PromptElement

	constructor() {
		super(ProxyEventType.Prompt)
		// The .svelte module self-registers the element via
		// <svelte:options customElement={{ tag }}> (customElements.define
		// runs at module import time, Svelte 5 shape).
		this.elem = document.createElement(tag) as HTMLElement & PromptElement;
	}

	show(text: string) {
		// Svelte 5 custom elements mount in a microtask after
		// connectedCallback; defer the exported-method call past the mount
		// (see indicator.ts for the full rationale).
		!this.elem.parentElement && document.body.append(this.elem);
		queueMicrotask(() => {
			this.elem.isConnected && this.elem.show(text)
		});
	}

	hide() {
		this.elem.remove()
	}
}

export const promptImpl = new PromptImpl()
