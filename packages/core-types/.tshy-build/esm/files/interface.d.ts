export interface FilesInterface {
    upload(file: ArrayBuffer): Promise<string | undefined>;
    download(cid: string): Promise<Buffer | undefined>;
}
