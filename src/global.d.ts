import { Mocha } from 'mocha'

type EnvVariable = {
	commitId: string
	date: string
	nodeVersion: string
	buildToolVersion: string
	os: string
	webSocketServer: string
	profile: string
	target: string
	testSuite: string
}

export declare global {
	export const __ENV: EnvVariable
	export const __BUILD_PROFILE: 'prod' | 'debug'
	export const chrome: any
	export const Mocha: Mocha
}
