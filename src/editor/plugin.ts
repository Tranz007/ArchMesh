import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { openSourceFile, type EditorPreference } from './open-source.js';

const MAX_BODY_BYTES = 8 * 1024;

async function readJsonBody(request: IncomingMessage) {
  let body = '';
  for await (const chunk of request) {
    body += String(chunk);
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new Error('Request body is too large.');
  }
  return JSON.parse(body || '{}') as { path?: unknown };
}

function writeJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

export function sourceEditorPlugin(projectRoot: string, editor: EditorPreference = 'auto'): Plugin {
  return {
    name: 'archmesh-source-editor',
    configureServer(server) {
      server.middlewares.use('/__archmesh/open-source', async (request, response) => {
        if (request.method !== 'POST') {
          response.setHeader('Allow', 'POST');
          writeJson(response, 405, { error: 'Method not allowed.' });
          return;
        }

        try {
          const body = await readJsonBody(request);
          if (typeof body.path !== 'string' || !body.path.trim()) {
            writeJson(response, 400, { error: 'A project-relative source path is required.' });
            return;
          }

          const result = await openSourceFile({
            projectRoot,
            relativePath: body.path,
            editor,
          });

          writeJson(response, 200, {
            ok: true,
            editor: result.editor,
            path: body.path,
          });
        } catch (error) {
          writeJson(response, 400, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
    },
  };
}
