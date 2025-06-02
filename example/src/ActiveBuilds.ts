import { IpcMethodHandler, IpcPublicPromiseMethodsObject } from '@david.uhlir/ipc-method'
import * as cluster from 'cluster'

export interface Build {
  id: string
  failedErrorMessage?: string
}

export const ActiveBuildsInitializator = Symbol()

/**
 * Internal storage for master
 */
class ActiveBuildsStorage {
  protected activeBuilds: { [buildId: string]: Build } = {}

  async setBuild(build: Build): Promise<Build> {
    this.activeBuilds[build.id] = build
    return build
  }

  async getBuild(id: string): Promise<Build> {
    return this.activeBuilds[id]
  }

  async getBuilds(): Promise<{ [buildId: string]: Build }> {
    return this.activeBuilds
  }

  async removeBuild(id: string): Promise<void> {
    delete this.activeBuilds[id]
  }

  async check(): Promise<boolean> {
    return true
  }
}

/**
 * Active builds manager supporting run in clusters
 */
export class ActiveBuilds {
  protected static storage: IpcPublicPromiseMethodsObject<ActiveBuildsStorage>

  /**
   * Add or update build in storage
   */
  static async setBuild(build: Build): Promise<Build> {
    return ActiveBuilds.storage.setBuild(build)
  }

  /**
   * Get build by id from cache
   */
  static async getBuild(id: string): Promise<Build> {
    return ActiveBuilds.storage.getBuild(id)
  }

  /**
   * Get all builds from cache
   */
  static async getBuilds(): Promise<{ [buildId: string]: Build }> {
    return ActiveBuilds.storage.getBuilds()
  }

  /**
   * Remove build from cache
   */
  static async removeBuild(id: string): Promise<void> {
    return ActiveBuilds.storage.removeBuild(id)
  }

  /**
   * Internal initializator
   */
  static [ActiveBuildsInitializator](): void {
    if (ActiveBuilds.storage) {
      return
    }

    if (!cluster.default.isWorker) {
      ActiveBuilds.storage = new ActiveBuildsStorage()
      new IpcMethodHandler(['shared-cache-topic'], ActiveBuilds.storage)
    } else {
      const handler = new IpcMethodHandler(['shared-cache-topic'])
      ActiveBuilds.storage = handler.as<ActiveBuildsStorage>()

      // check if master is attached
      let storageExist = false
      ActiveBuilds.storage
        .check()
        .then(response => (storageExist = response))
        .catch(() => (storageExist = false))
      setTimeout(() => {
        if (storageExist !== true) {
          console.error(
            `BUILD SERVER MIDDLEWARE ERROR: Probably run in cluster fork without master code attached! Please add "initMaster()" into master worker.`,
          )
        }
      }, 500)
    }
  }
}

ActiveBuilds[ActiveBuildsInitializator]()
