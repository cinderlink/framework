export interface FilesInterface {
  uploadToIPFS(file: ArrayBuffer): Promise<string | undefined>;
  readFromIPFS(cid: string): Promise<Buffer | undefined>;
}
