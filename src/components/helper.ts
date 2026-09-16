import { rootLog } from "../utils/log";
import type { GenericFunction } from "./types";

export class Stub {

	eventName: string

	constructor(eventName: string) {
		this.eventName = eventName
	}

	forwardMessage(msg: GenericFunction) {
		window.dispatchEvent(new CustomEvent(this.eventName, { detail: JSON.stringify(msg) }))
	}
}

export class MessageTarget {

	event: string

	constructor(event: string) {
		this.event = event
		globalThis.addEventListener(this.event, (event: Event) => {
			this.onMessage(JSON.parse((event as CustomEvent<string>).detail) as any as GenericFunction)
		})
	}

	onMessage(msg: GenericFunction) {
		const fn = (this as Record<string, any>)[msg.name]
		if (typeof fn !== 'function') {
			rootLog.E("method %s not found", msg.name)
			return
		}
		fn.apply(this, msg.args);
	}
}

