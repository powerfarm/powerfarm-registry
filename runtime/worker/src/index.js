import { WorkerEntrypoint } from 'cloudflare:workers';
import { issueFixedRuntimeToken, resolveCurrentOccupancy } from './core.mjs';

export class HeartimeRuntimeTokenPort extends WorkerEntrypoint {
  async issueRuntimeToken(request) {
    return issueFixedRuntimeToken({ request, subjectRef: 'pf.runtime.heartime', env: this.env });
  }
}

export class ProcessWriterRuntimeTokenPort extends WorkerEntrypoint {
  async issueRuntimeToken(request) {
    return issueFixedRuntimeToken({ request, subjectRef: 'pf.runtime.process-writer', env: this.env });
  }
}

export class RegistryOccupancyPort extends WorkerEntrypoint {
  async resolveCurrentOccupancy(request) {
    return resolveCurrentOccupancy({ request, env: this.env });
  }
}

export default {
  async fetch() { return new Response('Not found', { status: 404 }); },
};
