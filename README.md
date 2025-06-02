# IPC Method calling

Helper to send message over IPC as calling of methods. IpcMethodHandler is class thas provides both directions of communications.
Receiver in this case is object, where keys are name of actions, what is posible to call from other handlers. All connected handlers must be on same topics (arrays of topics must be same) to connect them together. Every each call will returns IpcMethodResult, which allows you to handle multiple results (as receivers can be more than one).

This is complete example with one fork and master process.
```ts
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
  if (!cluster.isWorker) {
    cluster.fork()
    const handler = new IpcMethodHandler(['test-topic'], masterReceiver)
    await handler.as<typeof workerReceiver>().testWorker()
  } else {
    const handler = new IpcMethodHandler(['test-topic'], workerReceiver)
    await handler.as<typeof masterReceiver>().testMaster()
  }
})()
```

ISC