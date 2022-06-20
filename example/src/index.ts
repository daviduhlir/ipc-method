import { IpcMethodHandler } from '@david.uhlir/ipc-method'
import * as cluster from 'cluster'


if (cluster.isMaster) {
  cluster.fork()
} else {


}
