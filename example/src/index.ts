import { IpcMethodHandler } from '@david.uhlir/ipc-method'
import * as cluster from 'cluster'

const masterReceiver = {
  testMaster: async () => {
    console.log('Hello in master')
  }
}

if (cluster.isMaster) {
  cluster.fork()

  const handler = new IpcMethodHandler(['test-topic'], masterReceiver)
  handler.call('testWorker')

} else {

  const handler = new IpcMethodHandler(['test-topic'], {
    testWorker: async () => console.log('Hello in fork')
  })

  handler.as<typeof masterReceiver>().testMaster()

}
