import { ProtocolPayload } from "./../protocol/types";
import { ReceiveEventHandlers } from "./../p2p/types";
import { SubscribeEventHandlers } from "../pubsub";
import { CinderlinkClientEvents, CinderlinkClientInterface } from "../client";
import { SubLoggerInterface } from "../logger";
export type PluginEventPayloads<T extends Record<string, unknown> = Record<string, unknown>> = Record<keyof T, ProtocolPayload<T[keyof T]>>;
export type PluginEventHandler<T = unknown> = (payload: T) => void | Promise<void>;
export type PluginEventHandlers<Events extends PluginEventDef[keyof PluginEventDef] = PluginEventDef[keyof PluginEventDef]> = {
    [key in keyof Events]: PluginEventHandler<Events[key]>;
};
export interface PluginEventDef {
    send: PluginEventPayloads<Record<string, unknown>>;
    receive: PluginEventPayloads<Record<string, unknown>>;
    publish: PluginEventPayloads<Record<string, unknown>>;
    subscribe: PluginEventPayloads<Record<string, unknown>>;
    emit: PluginEventPayloads<Record<string, unknown>>;
}
export interface PluginBaseInterface<Events extends PluginEventDef = PluginEventDef, Client extends CinderlinkClientInterface<any> = CinderlinkClientInterface<any>> {
    id: string;
    logger: SubLoggerInterface;
    client: Client;
    started: boolean;
    start?(): Promise<void>;
    stop?(): Promise<void>;
    pubsub: SubscribeEventHandlers<Events>;
    p2p: ReceiveEventHandlers<Events>;
    coreEvents?: Partial<PluginEventHandlers<CinderlinkClientEvents["emit"]>>;
    pluginEvents?: PluginEventHandlers<Events["emit"]>;
}
export interface PluginInterface<Events extends PluginEventDef = PluginEventDef, PeerEvents extends PluginEventDef = PluginEventDef, Client extends CinderlinkClientInterface<any> = CinderlinkClientInterface<any>> extends PluginBaseInterface<Events, Client> {
    pluginEvents?: PluginEventHandlers<PeerEvents["emit"]>;
}
export default PluginInterface;
export type PluginConstructor<Events extends PluginEventDef = PluginEventDef, Client extends CinderlinkClientInterface<any> = CinderlinkClientInterface<any>, Options extends Record<string, unknown> = {}> = new (client: Client, options?: Options) => PluginInterface<Events, PluginEventDef, Client>;
