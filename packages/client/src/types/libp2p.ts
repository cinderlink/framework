import type { TypedEventTarget } from "@libp2p/interface";

/**
 * Interface for libp2p pubsub service
 */
export interface PubSubService extends TypedEventTarget<Record<string, CustomEvent>> {
  subscribe(topic: string): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  publish(topic: string, data: Uint8Array): Promise<number>;
  getTopics(): string[];
  getSubscribers(topic: string): string[];
}

/**
 * Type for pubsub message events
 */
export interface PubsubMessageEvent {
  detail: {
    topic: string;
    data: Uint8Array;
    from: string;
    sequenceNumber: bigint;
    signature?: Uint8Array;
    key?: Uint8Array;
  };
}