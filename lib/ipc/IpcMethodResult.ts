import { IpcErrorHandler } from '../utils/IpcErrorHandler'
/**
 * RPC call result
 */
export class IpcMethodResult<T> {
  constructor(public readonly allResults: { result?: T; error?: any }[]) {}

  public get results(): T[] {
    if (this.isValid) {
      return this.allResults.map(i => i.result)
    }
    throw IpcErrorHandler.deserializeError(this.firstError || 'Unknown error')
  }

  public get result(): T {
    if (this.isValid) {
      return this.firstResult
    }
    throw IpcErrorHandler.deserializeError(this.firstError || 'Unknown error')
  }

  public get isValid(): boolean {
    return !!this.allResults.find(i => !i?.error)
  }

  public get firstResult(): T | undefined {
    return this.allResults.find(i => !i?.error)?.result
  }

  public get allValidResults(): T[] {
    return this.allResults.filter(i => !i?.error).map(i => i.result)
  }

  public get firstError(): string | Record<string, any> {
    return this.allResults.find(i => i?.error)?.error
  }

  public get allErrors(): (string | Record<string, any>)[] {
    return this.allResults.filter(i => i?.error).map(i => i.error)
  }
}
