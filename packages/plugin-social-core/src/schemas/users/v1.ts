import { z } from '@cinderlink/schema-registry';

export const schema = z.object({
  id: z.number(),
  uid: z.string(),
  did: z.string(),
  username: z.string(),
  encryptionKey: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type UserV1 = z.infer<typeof schema>;