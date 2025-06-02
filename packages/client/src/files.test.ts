// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CID } from 'multiformats/cid';
import { Files } from './files'; // Assuming Files is exported from files.ts
import { CinderlinkClientInterface, PluginEventDef, LoggerInterface } from '@cinderlink/core-types'; // Adjust path as needed

// Mock @helia/unixfs
const mockHeliaUnixFs = {
  addBytes: vi.fn(),
  cat: vi.fn(),
};
vi.mock('@helia/unixfs', () => ({
  unixfs: vi.fn(() => mockHeliaUnixFs),
}));

// Mock Logger
const mockLogger: Partial<LoggerInterface> = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  module: vi.fn(() => mockLogger as LoggerInterface), // Chainable
  submodule: vi.fn(() => mockLogger as LoggerInterface), // Chainable
};

describe('Files', () => {
  let files: Files<PluginEventDef>;
  let mockClient: Partial<CinderlinkClientInterface<PluginEventDef>>;

  beforeEach(() => {
    // Reset mocks before each test
    mockHeliaUnixFs.addBytes.mockReset();
    mockHeliaUnixFs.cat.mockReset();

    mockClient = {
      ipfs: {
        pins: {
          // Return a new async generator each time it's called
          add: vi.fn().mockImplementation(async function*() { yield 'pin-add-confirmation'; }),
        },
      } as any,
      logger: mockLogger as LoggerInterface,
    };
    files = new Files(mockClient as CinderlinkClientInterface<PluginEventDef>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('upload', () => {
    it('should upload a small file, pin it, and return its CID', async () => {
      const fileContent = new Uint8Array([1, 2, 3, 4, 5]);
      const mockCid = CID.parse('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');
      mockHeliaUnixFs.addBytes.mockResolvedValue(mockCid);

      const cidString = await files.upload(fileContent.buffer as ArrayBuffer);

      expect(mockHeliaUnixFs.addBytes).toHaveBeenCalledWith(fileContent);
      expect(mockClient.ipfs!.pins!.add).toHaveBeenCalledWith(mockCid);
      expect(cidString).toBe(mockCid.toString());
    });

    it('should upload an empty file', async () => {
      const fileContent = new Uint8Array([]);
      // Standard CID for an empty file (raw codec, sha2-256)
      const mockCid = CID.parse('bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku');
      mockHeliaUnixFs.addBytes.mockResolvedValue(mockCid);

      const cidString = await files.upload(fileContent.buffer as ArrayBuffer);

      expect(mockHeliaUnixFs.addBytes).toHaveBeenCalledWith(fileContent);
      expect(mockClient.ipfs!.pins!.add).toHaveBeenCalledWith(mockCid);
      expect(cidString).toBe(mockCid.toString());
    });

    it('should throw a TypeError if data is undefined', async () => {
      await expect(files.upload(undefined as any)).rejects.toThrow(TypeError);
    });

    it('should throw a TypeError if data is null', async () => {
      await expect(files.upload(null as any)).rejects.toThrow(TypeError);
    });
  });

  describe('download', () => {
    it('should download an existing file and return its content', async () => {
      const mockCidString = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      const mockFileContent = new Uint8Array([1, 2, 3, 4, 5]);

      // Mock fs.cat to be an async generator
      mockHeliaUnixFs.cat.mockImplementation(async function*() {
        yield mockFileContent;
      });

      const downloadedContent = await files.download(mockCidString);

      expect(mockHeliaUnixFs.cat).toHaveBeenCalledWith(CID.parse(mockCidString));
      expect(downloadedContent).toBeInstanceOf(Buffer);
      expect(Buffer.from(downloadedContent!)).toEqual(Buffer.from(mockFileContent));
    });

    it('should return undefined or throw for a non-existent CID', async () => {
      const nonExistentCidString = 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku';

      // Mock fs.cat to simulate not found (empty async generator or throw)
      mockHeliaUnixFs.cat.mockImplementation(async function*() {
        // Yield nothing for not found
      });
      // Or mockHeliaUnixFs.cat.mockRejectedValue(new Error("Not found"));

      const downloadedContent = await files.download(nonExistentCidString);
      // Based on current files.ts, it will return an empty Buffer if cat yields nothing.
      // If cat throws, then download would throw.
      expect(mockHeliaUnixFs.cat).toHaveBeenCalledWith(CID.parse(nonExistentCidString));
      expect(downloadedContent).toBeInstanceOf(Buffer);
      expect(downloadedContent!.length).toBe(0); // Correct if cat yields nothing
    });

    it('should throw an error if fs.cat throws for a non-existent CID', async () => {
      const nonExistentCidString = 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku';
      const catError = new Error("Not found");
      mockHeliaUnixFs.cat.mockImplementation(async function*() {
        throw catError;
      });

      await expect(files.download(nonExistentCidString)).rejects.toThrow(catError);
      expect(mockHeliaUnixFs.cat).toHaveBeenCalledWith(CID.parse(nonExistentCidString));
    });
  });
});
