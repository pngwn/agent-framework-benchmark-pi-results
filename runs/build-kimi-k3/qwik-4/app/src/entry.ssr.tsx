import { renderToStream, type RenderToStreamOptions } from '@builder.io/qwik/server';
import { manifest } from '@qwik-client-manifest';
import Root from './root';

export default function (opts: RenderToStreamOptions) {
  return renderToStream(<Root />, {
    manifest,
    ...opts,
    // Set attributes on the <html> element.
    containerAttributes: {
      lang: 'en',
      ...opts.containerAttributes,
    },
  });
}
