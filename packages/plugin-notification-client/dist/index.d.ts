import * as _candor_core_types from '@candor/core-types';
import { PluginEventDef, PluginInterface, CandorClientInterface, TableRow, TableDefinition } from '@candor/core-types';
import { SocialClientEvents } from '@candor/plugin-social-client';

type NotificationPayload = {
    id: string;
    type: string;
    title: string;
    body: string;
    dismissed: boolean;
    createdAt: number;
    read?: boolean;
    link?: string;
    metaData?: Record<string, unknown>;
};
interface NotificationClientEvents extends PluginEventDef {
    send: {};
    receive: {};
    publish: {};
    subscribe: {};
    emit: {
        "/notification/connection": NotificationPayload;
    };
}

declare class NotificationClientPlugin implements PluginInterface<NotificationClientEvents> {
    client: CandorClientInterface<NotificationClientEvents | SocialClientEvents>;
    options: Record<string, unknown>;
    id: string;
    ready: boolean;
    loggerTag: string;
    constructor(client: CandorClientInterface<NotificationClientEvents | SocialClientEvents>, options?: Record<string, unknown>);
    p2p: {};
    pubsub: {};
    start(): Promise<void>;
    get db(): _candor_core_types.SchemaInterface;
    table<Row extends TableRow = TableRow>(name: string): _candor_core_types.TableInterface<Row, _candor_core_types.TableDefinition<Row>>;
    stop(): Promise<void>;
}

declare const NotificationSchemaDef: Record<string, TableDefinition>;
declare function loadNotificationSchema(client: CandorClientInterface<any>): Promise<void>;

export { NotificationClientEvents, NotificationClientPlugin, NotificationPayload, NotificationSchemaDef, NotificationClientPlugin as default, loadNotificationSchema };
