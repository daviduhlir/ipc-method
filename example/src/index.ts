import { IpcMethodHandler } from '@david.uhlir/ipc-method'
import * as cluster from 'cluster'

const masterReceiver = {
  testMaster: async () => console.log(process.pid, 'Hello in master'),
}

const workerReceiver = {
  testWorker: async () => console.log(process.pid, 'Hello in fork'),
}

/**
 * Start test
 */
;(async function() {
  if (cluster.isMaster) {
    cluster.fork()
    const handler = new IpcMethodHandler(['test-topic'], masterReceiver)
    await handler.as<typeof workerReceiver>().testWorker()
  } else {
    const handler = new IpcMethodHandler(['test-topic'], workerReceiver)
    await handler.as<typeof masterReceiver>().testMaster()
  }
})()
