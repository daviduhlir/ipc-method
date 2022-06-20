# IPC Method calling

Helper to send message over IPC as calling of methods. IpcMethodHandler is class thas provides both directions of communications.
Receiver in this case is object, where keys are name of actions, what is posible to call from other handlers. All connected handlers must be on same topics (arrays of topics must be same) to connect them together.

This is complete example with one fork and master process.
```ts
import { IpcMethodHandler } from '@david.uhlir/ipc-method'
import * as cluster from 'cluster'


if (cluster.isMaster) {
  cluster.fork()

  const handler = new IpcMethodHandler(['test-topic'], {
    testMaster: async () => console.log('Hello in master')
  })
  handler.call('testWorker')

} else {

  const handler = new IpcMethodHandler(['test-topic'], {
    testWorker: async () => console.log('Hello in fork')
  })
  handler.call('testMaster')

}

```

ISC