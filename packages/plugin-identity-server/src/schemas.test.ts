import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import { 
  identityServerSchemas,
  identityResolveRequestSchema,
  identityResolveResponseSchema,
  identitySetRequestSchema,
  identitySetResponseSchema
} from './schemas';

describe('Identity Server Schemas', () => {
  describe('individual schema validation', () => {
    describe('identityResolveRequestSchema', () => {
      it('should validate correct resolve request', () => {
        const validRequest = {
          timestamp: Date.now(),
          requestId: 'req-123',
          since: 0
        };

        const result = identityResolveRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validRequest);
      });

      it('should reject request without required fields', () => {
        const invalidRequest = {
          timestamp: Date.now()
          // Missing requestId and since
        };

        const result = identityResolveRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('should reject request with invalid timestamp', () => {
        const invalidRequest = {
          timestamp: 'not-a-number',
          requestId: 'req-123',
          since: 0
        };

        const result = identityResolveRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('should reject request with invalid since', () => {
        const invalidRequest = {
          timestamp: Date.now(),
          requestId: 'req-123',
          since: 'not-a-number'
        };

        const result = identityResolveRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });
    });

    describe('identityResolveResponseSchema', () => {
      it('should validate successful resolve response', () => {
        const validResponse = {
          timestamp: Date.now(),
          requestId: 'req-123',
          cid: 'bafkreiabc123',
          doc: { name: 'Test User', avatar: 'https://example.com/avatar.png' }
        };

        const result = identityResolveResponseSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validResponse);
      });

      it('should validate error response', () => {
        const errorResponse = {
          timestamp: Date.now(),
          requestId: 'req-123',
          error: 'Identity not found'
        };

        const result = identityResolveResponseSchema.safeParse(errorResponse);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(errorResponse);
      });

      it('should validate minimal response', () => {
        const minimalResponse = {
          timestamp: Date.now(),
          requestId: 'req-123'
        };

        const result = identityResolveResponseSchema.safeParse(minimalResponse);
        expect(result.success).toBe(true);
      });

      it('should accept complex doc structure', () => {
        const complexResponse = {
          timestamp: Date.now(),
          requestId: 'req-123',
          cid: 'bafkreiabc123',
          doc: {
            name: 'Complex User',
            profile: {
              bio: 'A complex user profile',
              links: ['https://example.com', 'https://twitter.com/user'],
              preferences: {
                theme: 'dark',
                notifications: true
              }
            }
          }
        };

        const result = identityResolveResponseSchema.safeParse(complexResponse);
        expect(result.success).toBe(true);
      });
    });

    describe('identitySetRequestSchema', () => {
      it('should validate correct set request', () => {
        const validRequest = {
          timestamp: Date.now(),
          requestId: 'req-456',
          cid: 'bafkreiabc123',
          buffer: 'base64encodeddata'
        };

        const result = identitySetRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validRequest);
      });

      it('should validate request without buffer', () => {
        const requestWithoutBuffer = {
          timestamp: Date.now(),
          requestId: 'req-456',
          cid: 'bafkreiabc123'
        };

        const result = identitySetRequestSchema.safeParse(requestWithoutBuffer);
        expect(result.success).toBe(true);
      });

      it('should reject request without cid', () => {
        const invalidRequest = {
          timestamp: Date.now(),
          requestId: 'req-456'
          // Missing cid
        };

        const result = identitySetRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('should reject request with non-string cid', () => {
        const invalidRequest = {
          timestamp: Date.now(),
          requestId: 'req-456',
          cid: 123 // Should be string
        };

        const result = identitySetRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });
    });

    describe('identitySetResponseSchema', () => {
      it('should validate successful set response', () => {
        const successResponse = {
          timestamp: Date.now(),
          requestId: 'req-456',
          success: true
        };

        const result = identitySetResponseSchema.safeParse(successResponse);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(successResponse);
      });

      it('should validate error response', () => {
        const errorResponse = {
          timestamp: Date.now(),
          requestId: 'req-456',
          success: false,
          error: 'Failed to store identity'
        };

        const result = identitySetResponseSchema.safeParse(errorResponse);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(errorResponse);
      });

      it('should reject response without success field', () => {
        const invalidResponse = {
          timestamp: Date.now(),
          requestId: 'req-456'
          // Missing success field
        };

        const result = identitySetResponseSchema.safeParse(invalidResponse);
        expect(result.success).toBe(false);
      });

      it('should reject response with non-boolean success', () => {
        const invalidResponse = {
          timestamp: Date.now(),
          requestId: 'req-456',
          success: 'true' // Should be boolean
        };

        const result = identitySetResponseSchema.safeParse(invalidResponse);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('complete schema definition', () => {
    it('should have correct structure', () => {
      expect(identityServerSchemas).toHaveProperty('send');
      expect(identityServerSchemas).toHaveProperty('receive');
      expect(identityServerSchemas).toHaveProperty('publish');
      expect(identityServerSchemas).toHaveProperty('subscribe');
      expect(identityServerSchemas).toHaveProperty('emit');
    });

    it('should have correct send schemas', () => {
      expect(identityServerSchemas.send).toHaveProperty('/identity/resolve/response');
      expect(identityServerSchemas.send).toHaveProperty('/identity/set/response');
      
      expect(identityServerSchemas.send['/identity/resolve/response']).toBe(identityResolveResponseSchema);
      expect(identityServerSchemas.send['/identity/set/response']).toBe(identitySetResponseSchema);
    });

    it('should have correct receive schemas', () => {
      expect(identityServerSchemas.receive).toHaveProperty('/identity/set/request');
      expect(identityServerSchemas.receive).toHaveProperty('/identity/resolve/request');
      
      expect(identityServerSchemas.receive['/identity/set/request']).toBe(identitySetRequestSchema);
      expect(identityServerSchemas.receive['/identity/resolve/request']).toBe(identityResolveRequestSchema);
    });

    it('should have empty publish, subscribe, and emit schemas', () => {
      expect(Object.keys(identityServerSchemas.publish)).toHaveLength(0);
      expect(Object.keys(identityServerSchemas.subscribe)).toHaveLength(0);
      expect(Object.keys(identityServerSchemas.emit)).toHaveLength(0);
    });
  });

  describe('schema compatibility', () => {
    it('should validate request/response pairs', () => {
      const requestId = 'test-123';
      const timestamp = Date.now();

      // Set request/response pair
      const setRequest = {
        timestamp,
        requestId,
        cid: 'bafkreiabc123'
      };

      const setResponse = {
        timestamp: timestamp + 100,
        requestId,
        success: true
      };

      expect(identitySetRequestSchema.safeParse(setRequest).success).toBe(true);
      expect(identitySetResponseSchema.safeParse(setResponse).success).toBe(true);

      // Resolve request/response pair
      const resolveRequest = {
        timestamp,
        requestId,
        since: 0
      };

      const resolveResponse = {
        timestamp: timestamp + 100,
        requestId,
        cid: 'bafkreiabc123'
      };

      expect(identityResolveRequestSchema.safeParse(resolveRequest).success).toBe(true);
      expect(identityResolveResponseSchema.safeParse(resolveResponse).success).toBe(true);
    });

    it('should handle edge case values', () => {
      const edgeCases = {
        timestamp: 0,
        requestId: '',
        since: 0,
        cid: '',
        success: false,
        error: '',
        doc: {},
        buffer: ''
      };

      // Test minimal valid requests
      const minimalSetRequest = {
        timestamp: edgeCases.timestamp,
        requestId: edgeCases.requestId,
        cid: edgeCases.cid
      };

      const minimalResolveRequest = {
        timestamp: edgeCases.timestamp,
        requestId: edgeCases.requestId,
        since: edgeCases.since
      };

      expect(identitySetRequestSchema.safeParse(minimalSetRequest).success).toBe(true);
      expect(identityResolveRequestSchema.safeParse(minimalResolveRequest).success).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should validate typical identity operations', () => {
      // Typical set identity flow
      const setRequest = {
        timestamp: 1704067200000,
        requestId: 'set-alice-identity-2024',
        cid: 'bafkreihvq5yrfy3tpz5zhfcdfqx7okjhgfhwp4n3ez6y5k3jzm4hqwe',
        buffer: 'eyJuYW1lIjoiQWxpY2UiLCJhdmF0YXIiOiJodHRwczovL2V4YW1wbGUuY29tL2FsaWNlLnBuZyJ9'
      };

      const setSuccessResponse = {
        timestamp: 1704067201000,
        requestId: 'set-alice-identity-2024',
        success: true
      };

      const setErrorResponse = {
        timestamp: 1704067201000,
        requestId: 'set-alice-identity-2024',
        success: false,
        error: 'Invalid CID format'
      };

      expect(identitySetRequestSchema.safeParse(setRequest).success).toBe(true);
      expect(identitySetResponseSchema.safeParse(setSuccessResponse).success).toBe(true);
      expect(identitySetResponseSchema.safeParse(setErrorResponse).success).toBe(true);

      // Typical resolve identity flow
      const resolveRequest = {
        timestamp: 1704067300000,
        requestId: 'resolve-alice-identity-2024',
        since: 1704067200000
      };

      const resolveSuccessResponse = {
        timestamp: 1704067301000,
        requestId: 'resolve-alice-identity-2024',
        cid: 'bafkreihvq5yrfy3tpz5zhfcdfqx7okjhgfhwp4n3ez6y5k3jzm4hqwe',
        doc: {
          name: 'Alice',
          avatar: 'https://example.com/alice.png',
          bio: 'Decentralized identity enthusiast',
          created: 1704067200000
        }
      };

      const resolveNotFoundResponse = {
        timestamp: 1704067301000,
        requestId: 'resolve-alice-identity-2024',
        error: 'Identity not found'
      };

      expect(identityResolveRequestSchema.safeParse(resolveRequest).success).toBe(true);
      expect(identityResolveResponseSchema.safeParse(resolveSuccessResponse).success).toBe(true);
      expect(identityResolveResponseSchema.safeParse(resolveNotFoundResponse).success).toBe(true);
    });
  });
});