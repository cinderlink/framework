import { SchemaDef, TableDefinition } from "@candor/core-types";
import { ThresholdOwnedData, ThresholdPeerData } from "./types";

export const ThresholdSchema: SchemaDef = {
  schemaId: "threshold",
  tables: {
    owndData: {
      schemaId: "threshold",
      encrypted: true,
      indexes: {
        name: {
          unique: true,
          fields: ["name"],
        },
      },
      aggregate: {},
      searchOptions: {
        fields: ["name", "cid", "did"],
      },
      rollup: 1000,
      schema: {
        id: "ownKeys",
        type: "object",
        properties: {
          cid: {
            type: "string",
          },
          name: {
            type: "string",
          },
          threshold: {
            type: "number",
          },
          peers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                did: {
                  type: "string",
                },
                chunk: {
                  type: "number",
                },
                status: {
                  type: "boolean",
                },
                createdAt: {
                  type: "number",
                },
                validUntil: {
                  type: "number",
                },
                lastConfirmedAt: {
                  type: "number",
                },
              },
            },
          },
          data: {
            type: "array",
            items: {
              type: "number",
            },
          },
        },
      },
    } as TableDefinition<ThresholdOwnedData>,
    peerData: {
      schemaId: "threshold",
      encrypted: true,
      indexes: {
        cid: {
          unique: true,
          fields: ["cid"],
        },
        validUntil: {
          unique: false,
          fields: ["validUntil"],
        },
      },
      aggregate: {},
      searchOptions: {
        fields: ["cid", "did"],
      },
      rollup: 1000,
      schema: {
        id: "peerData",
        type: "object",
        properties: {
          cid: {
            type: "string",
          },
          did: {
            type: "string",
          },
          data: {
            type: "array",
            items: {
              type: "number",
            },
          },
          createdAt: {
            type: "number",
          },
          validUntil: {
            type: "number",
          },
        },
      },
    } as TableDefinition<ThresholdPeerData>,
  },
};
