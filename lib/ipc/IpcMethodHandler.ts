import * as cluster from 'cluster'
import { arrayCompare, randomHash } from '../utils'
import { IpcMethodResult } from './IpcMethodResult'

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

export const MESSAGE_RESULT = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
}

export class IpcMethodHandler {
  constructor(
    public readonly topics: string[],
    public readonly receivers: {[name: string]: (...params: any[]) => Promise<any>} = {}
  ) {
    if (cluster.isMaster) {
      this.reattachMessageHandlers()
      cluster?.on('fork',() => this.reattachMessageHandlers())
      cluster?.on('exit', () => this.reattachMessageHandlers())
    } else {
      process.on('message', this.handleIncomingMessage)
    }
  }

  /**
   * Send message and wait for results
   */
  public async callWithResult<T>(action: string, ...params: any[]): Promise<IpcMethodResult<T>> {
    let outgoingMessage: IpcInternalMessage = null

    const results = Promise.all(
      this.processes.map(p => new Promise((resolve, reject) => {
        const messageHandler = (message: IpcInternalMessage) => {
          if (
            typeof message === 'object' &&
            message.MESSAGE_ID === outgoingMessage.MESSAGE_ID &&
            message.RESULT &&
            message.ACTION === action &&
            arrayCompare(message.TOPICS, this.topics)
          ) {
            p.removeListener('message', messageHandler)
            p.removeListener('exit', rejectHandler)

            if (message.RESULT === MESSAGE_RESULT.SUCCESS) {
              resolve({ result: message.value })
            } else {
              resolve({ error: message.error })
            }
          }
        }

        const rejectHandler = () => {
          p.removeListener('message', messageHandler)
          p.removeListener('exit', rejectHandler)
          resolve({ error: new Error(`Process died during call.`) })
        }

        p.addListener('message', messageHandler)
        p.addListener('exit', rejectHandler)
      }))
    )
    outgoingMessage = this.call(action, ...params)
    return new IpcMethodResult(await results)
  }

  /**
   * Sends message
   */
  public call(action: string, ...params: any[]): IpcInternalMessage {
    const messageId = randomHash()

    const message = {
      TOPICS: this.topics,
      ACTION: action,
      PARAMS: params,
      MESSAGE_ID: messageId,
      WORKER: cluster.isMaster ? 'master' : cluster.worker?.id,
    }
    this.processes.forEach(p => p.send(message))
    return message
  }

  /*******************************
   *
   * Internal methods
   *
   *******************************/

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
   * Reattach all message handlers if new fork or some exited
   */
  protected reattachMessageHandlers() {
    Object.keys(cluster.workers).forEach(workerId => {
      cluster.workers?.[workerId]?.removeListener('message', this.handleIncomingMessage)
      cluster.workers?.[workerId]?.addListener('message', this.handleIncomingMessage)
    })
  }

  /**
   * Handle master incomming message
   * @param message
   */
  protected handleIncomingMessage = async (message: IpcInternalMessage) => {
    if (
      typeof message === 'object' &&
      message.ACTION &&
      !message.RESULT &&
      arrayCompare(message.TOPICS, this.topics)
    ) {

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
        this.processes.forEach(p => p.send(resultMessage))
      }
    }
  }
}
