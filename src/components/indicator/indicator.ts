
import IndicatorElement from './indicator.svelte';
import { ProxyEventType, type IndicatorInterface } from '../types';
import type { Position } from '../../types';
import { MessageTarget } from '../helper';



// Must match the tag in <svelte:options customElement> in indicator.svelte.
const tag = "gleamdrag-indicator"
const style = `position: absolute;
	left: 0;
	top: 0;
	pointer-events: none;
	z-index: 2147483647;
`
class IndicatorImpl extends MessageTarget implements IndicatorInterface {
	elem: IndicatorElement & HTMLElement
	constructor() {
		super(ProxyEventType.Indicator)
		// The .svelte module self-registers the element via
		// <svelte:options customElement={{ tag }}> (customElements.define
		// runs at module import time, Svelte 5 shape).
		this.elem = document.createElement(tag) as typeof this.elem;
		this.elem.setAttribute("style", style);
	}

	show(radius: number, pos: Position) {
		// Svelte 5 custom elements mount the component in a microtask after
		// connectedCallback; exported methods only exist on the element once
		// mounted (prototype getters read the mounted instance). Appending
		// first and deferring the call one microtask keeps the mount ahead of
		// the call (microtask FIFO); Svelte 3 mounted eagerly in the
		// constructor, so this restores call-before-append parity.
		!this.elem.parentElement && document.body.append(this.elem)
		queueMicrotask(() => {
			this.elem.isConnected && this.elem.show(radius, pos)
		})
	}

	hide() {
		this.elem.remove()
	}
}

export const indicatorImpl = new IndicatorImpl()

