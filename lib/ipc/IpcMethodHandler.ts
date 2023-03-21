import * as cluster from 'cluster'
import { EventEmitter } from 'events';
import { arrayCompare, randomHash } from '../utils'
import { IpcMethodResult } from './IpcMethodResult'

export type ArgumentTypes<T> = T extends (... args: infer U ) => infer R ? U: never;
export type ThenArg<T> = T extends PromiseLike<infer U> ? U : T
export type AsObject<T> = {
  [K in keyof T]: (...a: ArgumentTypes<T[K]>) => Promise<
    IpcMethodResult<
      ThenArg<(ReturnType<T[K] extends (...args: any) => Promise<any> ? (T[K]) : never>)>
    >
  >
}

export type AsObjectFirstResult<T> = {
  [K in keyof T]: (...a: ArgumentTypes<T[K]>) => Promise<
    ThenArg<(ReturnType<T[K] extends (...args: any) => Promise<any> ? (T[K]) : never>)>
  >
}

export interface IpcInternalMessage {
  TOPICS: string[]
  ACTION: string
  PARAMS?: any[]
  MESSAGE_ID?: string
  WORKER?: number | string
  RESULT?: string
  value?: any
  error?: any
}

export interface IpcCallWaiter {
  reject: (error: any) => void
  resolve: (message: any) => void
  workerId: string | number
  messageId: string
}

export const MESSAGE_RESULT = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
}

export class IpcMethodHandler extends EventEmitter {
  protected waitedResponses: IpcCallWaiter[] = []

  constructor(
    public readonly topics: string[],
    public readonly receivers: {[name: string]: (...params: any[]) => Promise<any>} = {}
  ) {
    super()
    if (cluster.isMaster) {
      cluster.addListener('exit', this.handleWorkerExit)
      cluster.addListener('message', this.handleClusterIncomingMessage)
    } else {
      process.addListener('message', this.handleIncomingMessage)
    }
  }

  /**
   * Send message and wait for results
   */
  public async callWithResult<T>(action: string, ...params: any[]): Promise<IpcMethodResult<T>> {
    return this.sendCallWithResult(action, this.processes, ...params)
  }

  /**
   * Sends message
   */
  public call(action: string, ...params: any[]): IpcInternalMessage {
    const messageId = randomHash()
    return this.sendCall(action, this.processes, messageId, ...params)
  }

  /**
   * Get proxy object, where every each property you get will be returned
   * as method call to receiver layer. Use template to keep typings of your receiver on it.
   * Every each call on this method will result only with first valid results, and also the same for error.
   */
  public as<T>(targetProcesses?: (NodeJS.Process | cluster.Worker)[]): AsObjectFirstResult<T> {
    return this.asProxyHandler(targetProcesses, true)
  }

  /**
   * Get proxy object, where every each property you get will be returned
   * as method call to receiver layer. Use template to keep typeings of your receiver on it.
   *
   * Every each call will returns all posible results as array. If result is not valid, error will be thrown.
   */
  public asProxy<T>(targetProcesses?: (NodeJS.Process | cluster.Worker)[]): AsObject<T> {
    return this.asProxyHandler(targetProcesses, false)
  }

  /**
   * Reject all waiting calls - it's usefull when process is changed.
   */
  public rejectAllCalls() {
    this.waitedResponses.forEach(item => item.reject('MANUAL_REJECTED_ALL'))
  }

  /*******************************
   *
   * Internal methods
   *
   *******************************/

  /**
   * Get proxy object, where every each property you get will be returned
   * as method call to receiver layer. Use template to keep typeings of your receiver on it.
   */
   protected asProxyHandler<T>(targetProcesses?: (NodeJS.Process | cluster.Worker)[], useFirstResult?: boolean) {
    return new Proxy(this as any, {
      get: (target, propKey, receiver) => async (...args) => {
        const key = propKey.toString()
        if (key === 'then' || key === 'catch') {
					return undefined;
				}
        const result = await this.sendCallWithResult(key, targetProcesses ? targetProcesses : this.processes, ...args)
        if (useFirstResult) {
          return result.result
        } else {
          return result
        }
      },
    })
  }

  /**
   * Sends call message
   */
  protected sendCall(action: string, targetProcesses: (NodeJS.Process | cluster.Worker)[], messageId: string, ...params: any[]): IpcInternalMessage {
    const message = {
      TOPICS: this.topics,
      ACTION: action,
      PARAMS: params,
      MESSAGE_ID: messageId,
      WORKER: cluster.isMaster ? 'master' : cluster.worker?.id,
    }
    targetProcesses.forEach(p => p.send(message))
    return message
  }

 /**
  * Send message and wait for results
  */
  protected async sendCallWithResult<T>(action: string, targetProcesses: (NodeJS.Process | cluster.Worker)[], ...params: any[]): Promise<IpcMethodResult<T>> {
    const messageId = randomHash()

    const results = Promise.all(
      targetProcesses.map(p => new Promise((resolve, reject) => {

        const workerId = (p instanceof cluster.Worker) ? p.id : 'master'

        this.waitedResponses.push({
          resolve: (message: IpcInternalMessage) => {
            this.waitedResponses = this.waitedResponses.filter(i => !(i.messageId === messageId && i.workerId === workerId))
            if (message.RESULT === MESSAGE_RESULT.SUCCESS) {
              resolve({ result: message.value })
            } else {
              resolve({ error: message.error })
            }
          },
          reject: () => {
            this.waitedResponses = this.waitedResponses.filter(i => !(i.messageId === messageId && i.workerId === workerId))
            resolve({ error: new Error(`Call was rejected, process probably died during call, or rejection was called.`) })
          },
          messageId,
          workerId,
        })

      }))
    )
    this.sendCall(action, targetProcesses, messageId, ...params)
    return new IpcMethodResult(await results)
  }

  /**
   * Get all avaliable processes
   */
  protected get processes(): (NodeJS.Process | cluster.Worker)[] {
    if (cluster.isWorker) {
      return [process]
    } else {
      return Object.keys(cluster.workers).reduce((acc, workerId) => [...acc, cluster.workers?.[workerId]], [])
    }
  }

  /**
   * handlee worker exited
   */
  protected handleWorkerExit = (worker: cluster.Worker) => {

  }

  protected handleClusterIncomingMessage = async (worker: cluster.Worker, message: any) => {
    if (worker) {
      return this.handleIncomingMessage(message, worker.id)
    }
  }

  /**
   * Handle master incomming message
   * @param message
   */
  protected handleIncomingMessage = async (message: IpcInternalMessage, workerId: string | number = 'master') => {
    if (typeof message === 'object' && message.ACTION && arrayCompare(message.TOPICS, this.topics) && message.WORKER) {
      // standart IPC call
      if (!message.RESULT) {
        let value = null
        let error = null
        try {
          if (typeof this.receivers[message.ACTION] !== 'function') {
            throw new Error('METHOD_NOT_FOUND')
          }
          value = await this.receivers[message.ACTION](...(message.PARAMS || []))
        } catch(e) {
          error = e.toString()
        }

        if (message.MESSAGE_ID) {
          const resultMessage: IpcInternalMessage = {
            TOPICS: message.TOPICS,
            ACTION: message.ACTION,
            MESSAGE_ID: message.MESSAGE_ID,
            RESULT: error ? MESSAGE_RESULT.ERROR : MESSAGE_RESULT.SUCCESS,
            error,
            value,
          }

          if (workerId === 'master') {
            process.send(resultMessage)
          } else {
            cluster.workers[workerId].send(resultMessage)
          }
        }
      }
    // Result from IPC call
    } else if (message.MESSAGE_ID) {
      const foundItem = this.waitedResponses.find(item => item.messageId === message.MESSAGE_ID && item.workerId === workerId)
      if (foundItem) {
        foundItem.resolve(message)
      }
    }
  }
}
