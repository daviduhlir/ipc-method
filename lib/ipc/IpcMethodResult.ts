/**
 * RPC call result
 */
export class IpcMethodResult<T> {
  constructor(
    public readonly results: {result?: T; error?: any}[],
  ) {}

  public get result(): T {
    if (this.isValid) {
      return this.firstResult
    }
    throw new Error(this.firstError)
  }

  public get isValid(): boolean {
    return !!this.firstResult
  }

  public get firstResult(): T | undefined {
    return this.results.find(i => !i?.error)?.result
  }

  public get allResults(): T[] {
    return this.results.filter(i => !i?.error).map(i => i.result)
  }

  public get firstError(): string {
    return this.results.find(i => i?.error)?.error
  }

  public get allErrors(): string[] {
    return this.results.filter(i => i?.error).map(i => i.error)
  }
}