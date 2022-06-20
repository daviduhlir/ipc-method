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
