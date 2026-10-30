import { copyFile, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';

await mkdir(new URL('../public/', import.meta.url), { recursive: true });
const source = new URL('../node_modules/htmx.org/dist/htmx.min.js', import.meta.url);
const target = new URL('../public/htmx.min.js', import.meta.url);
await access(source, constants.R_OK);
await copyFile(source, target);
console.log('Copied htmx to public/htmx.min.js');
