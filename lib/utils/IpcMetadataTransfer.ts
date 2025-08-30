export class IpcMetadataTransfer {
  public static async createMetadata(): Promise<any> {
    return null
  }
  public static async callWithMetadata(metadata: any, fn: () => Promise<any>): Promise<any> {
    return fn()
  }
}
