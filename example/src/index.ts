import * as cluster from 'cluster'
import { ActiveBuilds } from './ActiveBuilds'

const masterReceiver = {
  testMaster: async () => {
    console.log(process.pid, 'Hello in master')
    return ['master', Date.now()]
  },
}

const workerReceiver = {
  testWorker: async () => {
    console.log(process.pid, 'Hello in fork')
    return ['worker', Date.now()]
  },
}

/**
 * Start test
 */
;(async function() {

  if (!cluster.default.isWorker) {
    console.log('Master', process.pid)
    console.log(await ActiveBuilds.setBuild({
      id: '123',
    }))
    cluster.default.fork()
    cluster.default.fork()
    cluster.default.fork()
    cluster.default.fork()
    //const handler = new IpcMethodHandler(['test-topic'], masterReceiver)
    //console.log('Master -> Fork', await handler.as<typeof workerReceiver>().testWorker())
  } else {
    console.log('Fork', process.pid)
    console.log(await ActiveBuilds.getBuilds())
    //const handler = new IpcMethodHandler(['test-topic'], workerReceiver)
    //console.log('Fork -> Master',await handler.as<typeof masterReceiver>().testMaster())
  }
})()
