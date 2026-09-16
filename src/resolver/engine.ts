import { v4 } from 'uuid';
import browser from 'webextension-polyfill'
import type { PlainCommandRequest } from '../config/config';
import { browserSearchEngineURL } from './resolver';

export function buildSearchEngineCommandRequest(name: string): PlainCommandRequest {
	return {
		id: v4(),
		name: name,
		url: browserSearchEngineURL,
		query: {
			"engine": name
		}
	}

}

export function getBrowserSearchEngineName(req: PlainCommandRequest): string {
	const query = req.query
	if (req.url === browserSearchEngineURL && typeof query?.engine === "string") {
		return query.engine
	}
	return ""
}

export async function browserSearchEngineToCommandRequests(): Promise<PlainCommandRequest[]> {
	const searchEngines = await browser.search.get()
	return searchEngines.map(se => {
		return buildSearchEngineCommandRequest(se.name)
	})
}
