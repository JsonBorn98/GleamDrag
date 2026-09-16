import { mount } from "svelte";
import App from "../../options/options.svelte";

function setup() {
	// Svelte 5: components are functions; mount() replaces new App({ target }).
	mount(App, { target: document.body })
}

if (document.readyState !== "loading") {
	setup()
} else {
	document.addEventListener("DOMContentLoaded", () => {
		setup()
	});
}
