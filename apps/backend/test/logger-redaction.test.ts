import { Writable } from 'node:stream';

import { buildApp } from '../src/app.js';

function captureStream(): { lines: string[]; stream: Writable } {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  return { lines, stream };
}

describe('request logger redaction', () => {
  // Fastify's default req/res serializers already drop headers, but a custom
  // log call (e.g. logging an error or a raw object) can still leak a session
  // cookie or bearer token. The redact config strips those keys wherever they
  // surface in a logged object.
  it('removes cookie, authorization and set-cookie headers from logged objects', async () => {
    const { lines, stream } = captureStream();
    const app = await buildApp({
      appOrigin: 'http://localhost',
      checkDatabase: async () => undefined,
      logger: { stream },
    });
    const fastify = app.getHttpAdapter().getInstance();

    fastify.log.info(
      {
        headers: {
          authorization: 'Bearer s3cret-token',
          cookie: 'sid=s3cret-cookie',
          'set-cookie': 'sid=brand-new-secret',
        },
      },
      'inbound request',
    );
    await app.close();

    const out = lines.join('\n');
    // Guard against a vacuous pass: the line must actually reach our stream.
    expect(out).toContain('inbound request');
    expect(out).not.toContain('s3cret-token');
    expect(out).not.toContain('s3cret-cookie');
    expect(out).not.toContain('brand-new-secret');
  });
});
