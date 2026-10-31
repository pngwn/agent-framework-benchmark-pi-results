import { gracile } from '@gracile/gracile/plugin';
import { defineConfig } from 'vite';

export default defineConfig({
	resolve: {
		dedupe: ['lit', 'lit-html', '@lit-labs/ssr', '@lit-labs/ssr-client'],
	},
	plugins: [gracile({ output: 'server' })],
});
