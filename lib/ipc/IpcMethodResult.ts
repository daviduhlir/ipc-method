/**
 * RPC call result
 */
export class IpcMethodResult<T> {
  constructor(public readonly allResults: { result?: T; error?: any }[]) {}

  public get results(): T[] {
    if (this.isValid) {
      return this.allResults.map(i => i.result)
    }
    throw new Error(this.firstError || 'Unknown error')
  }

  public get result(): T {
    if (this.isValid) {
      return this.firstResult
    }
    throw new Error(this.firstError || 'Unknown error')
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

  public get firstError(): string {
    return this.allResults.find(i => i?.error)?.error
  }

  public get allErrors(): string[] {
    return this.allResults.filter(i => i?.error).map(i => i.error)
  }
}
