import type { CID } from "multiformats/cid";
import type { CinderlinkClientInterface } from "@cinderlink/core-types";

/**
 * Remote Pinning Manager for Cinderlink
 * 
 * This uses the standard Helia pins API which is transparently backed by
 * remote pinning when configured with @helia/remote-pinning
 */
export class RemotePinningManager {
  constructor(private client: CinderlinkClientInterface) {}

  /**
   * Add a CID to remote pinning service
   * @param cid - The content identifier to pin remotely
   * @param options - Pinning options
   */
  async addRemotePin(
    cid: CID,
    options?: {
      metadata?: Record<string, string>;
    }
  ): Promise<void> {
    // When using @helia/remote-pinning, the regular pins API transparently
    // handles remote pinning
    for await (const pinnedCid of this.client.ipfs.pins.add(cid, {
      metadata: options?.metadata,
    })) {
      // The remote pinning API only yields the root CID
      console.log('Pinned remotely:', pinnedCid.toString());
    }
  }

  /**
   * Remove a CID from remote pinning service
   * @param cid - The content identifier to unpin remotely
   */
  async removeRemotePin(cid: CID): Promise<void> {
    // Use the regular pins API which handles remote unpinning
    for await (const unpinnedCid of this.client.ipfs.pins.rm(cid)) {
      console.log('Unpinned remotely:', unpinnedCid.toString());
    }
  }

  /**
   * List remote pins
   * @param options - List options
   */
  async listRemotePins(): Promise<Array<{ cid: CID; metadata?: Record<string, string> }>> {
    const pins: Array<{ cid: CID; metadata?: Record<string, string> }> = [];
    
    // List all pins (includes remote pins when configured)
    for await (const pin of this.client.ipfs.pins.ls()) {
      pins.push({
        cid: pin.cid,
        metadata: pin.metadata as Record<string, string>,
      });
    }

    return pins;
  }

  /**
   * Check if a CID is pinned remotely
   * @param cid - The content identifier to check
   */
  async isPinned(cid: CID): Promise<boolean> {
    try {
      for await (const pin of this.client.ipfs.pins.ls({ cid })) {
        if (pin.cid.equals(cid)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get pinning service status
   * This is a placeholder - actual implementation would depend on the
   * remote pinning service configuration
   */
  async getServiceStatus(): Promise<{ configured: boolean; serviceName?: string }> {
    // Check if remote pinning is configured by looking for remotePins property
    const configured = !!this.client.ipfs.remotePins;
    
    return {
      configured,
      serviceName: configured ? 'Remote Pinning Service' : undefined,
    };
  }
}
