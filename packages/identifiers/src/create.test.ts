import { describe, it, expect } from 'bun:test';
import { createSeed, createDID } from './create';

describe('As a developer creating decentralized identities', () => {
  it('I want to create a deterministic seed from a string so my identities are reproducible', async () => {
    const seed1 = await createSeed('test-seed');
    const seed2 = await createSeed('test-seed');
    
    expect(seed1).toEqual(seed2);
    expect(seed1).toHaveLength(32);
  });

  it('I want to create different seeds for different inputs so my identities are unique', async () => {
    const seed1 = await createSeed('test-seed-1');
    const seed2 = await createSeed('test-seed-2');
    
    expect(seed1).not.toEqual(seed2);
  });

  it('I want to create a DID from a seed to get a decentralized identity', async () => {
    const seed = await createSeed('test-did-creation');
    const did = await createDID(seed);
    
    expect(did).toBeDefined();
    expect(did.id).toMatch(/^did:key:z[1-9A-HJ-NP-Za-km-z]+$/);
    expect(typeof did.authenticate).toBe('function');
    expect(typeof did.createJWS).toBe('function');
    expect(typeof did.createJWE).toBe('function');
  });

  it('I want to create deterministic DIDs from the same seed so they can be recovered', async () => {
    const seed = await createSeed('deterministic-test');
    const did1 = await createDID(seed);
    const did2 = await createDID(seed);
    
    expect(did1.id).toBe(did2.id);
  });

  it('I want to create different DIDs from different seeds so I have unique identities', async () => {
    const seed1 = await createSeed('seed-1');
    const seed2 = await createSeed('seed-2');
    const did1 = await createDID(seed1);
    const did2 = await createDID(seed2);
    
    expect(did1.id).not.toBe(did2.id);
  });
});
