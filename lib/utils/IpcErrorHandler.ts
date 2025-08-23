export interface IpcErrorSerializer<T> {
  key: string
  instance: T
  serialize: (error: Error) => Record<string, any>
  deserialize: (error: Record<string, any>) => T
}

export class IpcErrorHandler {
  protected static knownErrors: IpcErrorSerializer<any>[] = []
  public static setKnownErrors(serializers: IpcErrorSerializer<any>[]) {
    this.knownErrors = serializers
  }

  public static serializeError(error: any): Record<string, any> {
    if (typeof error === 'string') {
      return { __errorSerialized: true, key: 'Error', data: { message: error, name: 'Error' } }
    }
    const known = this.knownErrors.find(i => error instanceof i.instance)
    return {
      __errorSerialized: true,
      key: known?.key || 'Error',
      data: known ? known.serialize(error) : { message: error?.message || error.toString(), name: error?.name || 'Error' },
    }
  }

  public static deserializeError(error: Record<string, any> | string): Error {
    if (typeof error === 'string') {
      return new Error(error)
    }
    const known = this.knownErrors.find(i => error.key === i.key)
    if (known) {
      return known.deserialize(error.data)
    }
    return new Error(error?.data?.message || error.toString())
  }
}
