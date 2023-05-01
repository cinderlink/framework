import { SocialSetting } from "@cinderlink/plugin-social-core";
import SocialClientPlugin from "../plugin";
import { SubLoggerInterface } from "@cinderlink/core-types";

export class SocialSettings {
  logger: SubLoggerInterface;
  constructor(private plugin: SocialClientPlugin) {
    this.logger = plugin.logger.submodule("settings");
  }

  get table() {
    const schema = this.plugin.client.getSchema("social");
    if (!schema) {
      this.logger.error(`social schema not loaded`);
      throw new Error("social schema not loaded");
    }
    const table = schema.getTable<SocialSetting>("settings");
    if (!table) {
      this.logger.error(`social settings table not loaded`);
      throw new Error("social settings table not loaded");
    }
    return table;
  }

  async all() {
    return this.table.query().select().execute();
  }

  async bulkSet(settings: SocialSetting[]) {
    return Promise.all(
      settings.map((setting) =>
        this.table.upsert({ key: setting.key }, setting)
      )
    );
  }

  async get(key: string) {
    const row = (
      await this.table.query().where("key", "=", key).select().execute()
    ).first();
    return row?.value;
  }

  async exists(key: string) {
    const row = (
      await this.table.query().where("key", "=", key).select().execute()
    ).first();
    return !!row;
  }

  async set({
    key,
    section,
    value,
  }: {
    key: string;
    section: string;
    value: unknown;
  }) {
    return this.table.upsert({ key }, { section, value });
  }

  async delete(key: string) {
    return this.table.query().where("key", "=", key).delete().execute();
  }

  async clear() {
    return this.table.query().delete().execute();
  }

  async getSection(section: string) {
    return this.table.query().where("section", "=", section).select().execute();
  }

  async clearSection(section: string) {
    return this.table.query().where("section", "=", section).delete().execute();
  }
}
