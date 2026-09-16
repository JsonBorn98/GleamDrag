
import MenuElement from './menu.svelte';
import { ProxyEventType, type MenuInterface, type ShowMenuOptions } from '../types';
import { MessageTarget } from '../helper';
import { rootLog } from '../../utils/log';
import { LogLevel } from '../../config/config';

const log = rootLog.subLogger(LogLevel.VVV, "menu")
// Must match the tag in <svelte:options customElement> in menu.svelte.
const tag = "gleamdrag-menu"


class MenuImpl extends MessageTarget implements MenuInterface {

	elem: MenuElement & HTMLElement

	constructor() {
		super(ProxyEventType.Menu)
		// The .svelte module self-registers the element via
		// <svelte:options customElement={{ tag }}> (customElements.define
		// runs at module import time, Svelte 5 shape).
		this.elem = document.createElement(tag) as HTMLElement & MenuElement
		this.elem.setAttribute("style", this.computeStyle(0, 0, 0, 0));
	}


	show(opts: ShowMenuOptions) {
		log.V("show menu: ", opts)
		// Svelte 5 mount gate: box and show() are component exports and only
		// exist once mounted (see indicator.ts for the full rationale); the
		// whole positioning body reads box, so it all defers past the mount.
		!this.elem.parentElement && document.body.append(this.elem)
		queueMicrotask(() => {
			if (!this.elem.isConnected) return
			const [width, height] = this.elem.box

			const x = opts.position.x - width / 2
			const y = opts.position.y - height / 2

			this.elem.setAttribute("style", this.computeStyle(x, y, width, height));
			this.elem.show(opts)
		})
	}

	hide() {
		if (!this.elem.parentElement) {
			return
		}
		log.V("hide menu")
		// reset() is a component export — it only exists on the element
		// once mounted (Svelte 5 mounts in a microtask after
		// connectedCallback). A hide racing the pending mount skips it: the
		// menu was never shown, so there is no selection to clear. remove()
		// stays synchronous — Svelte 3 parity: hide() returns with the
		// element out of the DOM.
		if (this.elem.reset) {
			this.elem.reset()
		}
		this.elem.remove()
	}

	computeStyle(x: number, y: number, width: number, height: number) {
		const style = `position: absolute;
		left: ${x}px;
		top: ${y}px;
		z-index: 2147483647;
		width: ${width}px;
		height: ${height}px;
		user-select: none;
	`
		return style
	}
}

export const menuImpl = new MenuImpl()