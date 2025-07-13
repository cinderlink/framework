# Tutorial 02: Creating Your First Cinderlink App

In this tutorial, we'll build a simple decentralized note-taking application using Cinderlink. This app will allow users to create, store, and sync notes across devices using IPFS and P2P networking.

## Prerequisites

- Node.js 18+ or Bun installed
- Basic TypeScript knowledge
- Completed [Tutorial 01: Getting Started](./01-getting-started.md)

## Project Setup

First, create a new directory for your app:

```bash
mkdir my-notes-app
cd my-notes-app
bun init -y
```

Install the necessary Cinderlink packages:

```bash
bun add @cinderlink/client @cinderlink/core-types @cinderlink/ipld-database viem
bun add -d typescript @types/node
```

Create a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Creating the Notes Schema

First, let's define our data model using IPLD schemas. Create `src/schema.ts`:

```typescript
import { SchemaInterface } from '@cinderlink/core-types';
import { z } from 'zod';

// Define the Note schema using Zod
export const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
  syncedAt: z.number().optional()
});

// Create the IPLD schema
export const notesSchema: SchemaInterface = {
  version: 1,
  name: 'notes',
  encrypted: true, // Enable encryption for privacy
  tables: [
    {
      name: 'notes',
      schema: noteSchema,
      indexes: [
        { name: 'by_updated', fields: ['updatedAt'] },
        { name: 'by_tag', fields: ['tags'] }
      ]
    }
  ]
};
```

## Building the Notes Client

Create `src/notes-client.ts`:

```typescript
import { createClient, createIdentityFromSeed } from '@cinderlink/client';
import { CinderlinkClientInterface } from '@cinderlink/core-types';
import { privateKeyToAccount } from 'viem/accounts';
import { notesSchema, noteSchema } from './schema';
import { z } from 'zod';

type Note = z.infer<typeof noteSchema>;

export class NotesClient {
  private client: CinderlinkClientInterface;
  
  constructor(client: CinderlinkClientInterface) {
    this.client = client;
  }
  
  static async create(seedPhrase: string): Promise<NotesClient> {
    // Create identity from seed phrase
    const { did, address, resolutionResult } = await createIdentityFromSeed(seedPhrase);
    
    // Create the client
    const client = await createClient({
      did,
      address,
      addressVerification: resolutionResult,
      role: 'peer',
      schemas: [notesSchema]
    });
    
    return new NotesClient(client);
  }
  
  async start(): Promise<void> {
    await this.client.start();
    console.log(`Notes client started with DID: ${this.client.did.id}`);
  }
  
  async stop(): Promise<void> {
    await this.client.stop();
  }
  
  // Note CRUD operations
  async createNote(title: string, content: string, tags: string[] = []): Promise<Note> {
    const note: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const table = this.client.getSchema('notes').getTable('notes');
    await table.insert(note);
    
    return note;
  }
  
  async getNote(id: string): Promise<Note | null> {
    const table = this.client.getSchema('notes').getTable('notes');
    const result = await table.query().where('id', '=', id).first();
    return result || null;
  }
  
  async updateNote(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<Note | null> {
    const existing = await this.getNote(id);
    if (!existing) return null;
    
    const updated: Note = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };
    
    const table = this.client.getSchema('notes').getTable('notes');
    await table.update(id, updated);
    
    return updated;
  }
  
  async deleteNote(id: string): Promise<boolean> {
    const table = this.client.getSchema('notes').getTable('notes');
    await table.delete(id);
    return true;
  }
  
  async listNotes(options?: { 
    tag?: string; 
    limit?: number; 
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt';
    order?: 'asc' | 'desc';
  }): Promise<Note[]> {
    const table = this.client.getSchema('notes').getTable('notes');
    let query = table.query();
    
    if (options?.tag) {
      query = query.where('tags', 'contains', options.tag);
    }
    
    if (options?.sortBy) {
      query = query.orderBy(options.sortBy, options.order || 'desc');
    } else {
      query = query.orderBy('updatedAt', 'desc');
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return await query.all();
  }
  
  async searchNotes(searchTerm: string): Promise<Note[]> {
    const table = this.client.getSchema('notes').getTable('notes');
    const allNotes = await table.query().all();
    
    const term = searchTerm.toLowerCase();
    return allNotes.filter(note => 
      note.title.toLowerCase().includes(term) ||
      note.content.toLowerCase().includes(term) ||
      note.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }
  
  // Sync functionality
  async syncWithPeer(peerId: string): Promise<void> {
    // This would use the sync plugin in a real implementation
    console.log(`Syncing notes with peer: ${peerId}`);
    // Implementation would involve:
    // 1. Exchange latest update timestamps
    // 2. Send/receive changed notes
    // 3. Merge changes with conflict resolution
  }
  
  // Export/Import functionality
  async exportNotes(): Promise<string> {
    const notes = await this.listNotes();
    return JSON.stringify(notes, null, 2);
  }
  
  async importNotes(jsonData: string): Promise<number> {
    const notes = JSON.parse(jsonData) as Note[];
    const table = this.client.getSchema('notes').getTable('notes');
    
    let imported = 0;
    for (const note of notes) {
      try {
        await table.upsert(note);
        imported++;
      } catch (error) {
        console.error(`Failed to import note ${note.id}:`, error);
      }
    }
    
    return imported;
  }
}
```

## Creating the CLI Interface

Now let's create a simple CLI to interact with our notes app. Create `src/cli.ts`:

```typescript
import { NotesClient } from './notes-client';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function main() {
  console.log('Welcome to Cinderlink Notes!');
  
  // Get or generate seed phrase
  let seedPhrase = process.env.NOTES_SEED_PHRASE;
  if (!seedPhrase) {
    seedPhrase = await question('Enter seed phrase (or press enter to generate new): ');
    if (!seedPhrase) {
      // In production, use a proper seed phrase generator
      seedPhrase = 'demo seed phrase ' + Math.random().toString(36);
      console.log(`Generated seed phrase: ${seedPhrase}`);
      console.log('Save this to access your notes later!');
    }
  }
  
  // Create and start the client
  const client = await NotesClient.create(seedPhrase);
  await client.start();
  
  // Main command loop
  let running = true;
  while (running) {
    console.log('\nCommands: create, list, view, update, delete, search, export, quit');
    const command = await question('> ');
    
    try {
      switch (command.toLowerCase()) {
        case 'create': {
          const title = await question('Title: ');
          const content = await question('Content: ');
          const tagsStr = await question('Tags (comma-separated): ');
          const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()) : [];
          
          const note = await client.createNote(title, content, tags);
          console.log(`Created note: ${note.id}`);
          break;
        }
        
        case 'list': {
          const notes = await client.listNotes({ limit: 10 });
          if (notes.length === 0) {
            console.log('No notes found.');
          } else {
            console.log('\nYour notes:');
            notes.forEach(note => {
              console.log(`- [${note.id.slice(0, 8)}] ${note.title} (${new Date(note.updatedAt).toLocaleDateString()})`);
            });
          }
          break;
        }
        
        case 'view': {
          const id = await question('Note ID: ');
          const note = await client.getNote(id);
          if (note) {
            console.log(`\nTitle: ${note.title}`);
            console.log(`Tags: ${note.tags.join(', ')}`);
            console.log(`Created: ${new Date(note.createdAt).toLocaleString()}`);
            console.log(`Updated: ${new Date(note.updatedAt).toLocaleString()}`);
            console.log(`\nContent:\n${note.content}`);
          } else {
            console.log('Note not found.');
          }
          break;
        }
        
        case 'update': {
          const id = await question('Note ID: ');
          const note = await client.getNote(id);
          if (!note) {
            console.log('Note not found.');
            break;
          }
          
          console.log('Leave blank to keep current value');
          const title = await question(`Title [${note.title}]: `);
          const content = await question(`Content [current content]: `);
          const tagsStr = await question(`Tags [${note.tags.join(', ')}]: `);
          
          const updates: any = {};
          if (title) updates.title = title;
          if (content) updates.content = content;
          if (tagsStr !== '') updates.tags = tagsStr.split(',').map(t => t.trim());
          
          await client.updateNote(id, updates);
          console.log('Note updated.');
          break;
        }
        
        case 'delete': {
          const id = await question('Note ID: ');
          const confirm = await question('Are you sure? (y/n): ');
          if (confirm.toLowerCase() === 'y') {
            await client.deleteNote(id);
            console.log('Note deleted.');
          }
          break;
        }
        
        case 'search': {
          const term = await question('Search term: ');
          const results = await client.searchNotes(term);
          if (results.length === 0) {
            console.log('No notes found.');
          } else {
            console.log(`\nFound ${results.length} notes:`);
            results.forEach(note => {
              console.log(`- [${note.id.slice(0, 8)}] ${note.title}`);
            });
          }
          break;
        }
        
        case 'export': {
          const data = await client.exportNotes();
          const filename = `notes-export-${Date.now()}.json`;
          require('fs').writeFileSync(filename, data);
          console.log(`Exported to ${filename}`);
          break;
        }
        
        case 'quit':
        case 'exit':
          running = false;
          break;
          
        default:
          console.log('Unknown command.');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
  
  // Clean up
  await client.stop();
  rl.close();
}

main().catch(console.error);
```

## Running Your App

Create a `package.json` script to run your app:

```json
{
  "scripts": {
    "start": "bun run src/cli.ts",
    "dev": "bun --watch src/cli.ts"
  }
}
```

Now you can run your notes app:

```bash
bun start
```

## Next Steps

Congratulations! You've built your first Cinderlink application. Here are some ideas to extend it:

1. **Add Peer Sync**: Implement the `syncWithPeer` method using Cinderlink's sync plugin
2. **Web Interface**: Create a web UI using your favorite framework
3. **Mobile App**: Use React Native with Cinderlink's client library
4. **Collaboration**: Add real-time collaboration features using pubsub
5. **Attachments**: Store file attachments using IPFS

## Key Concepts Learned

- **Identity Creation**: Using DIDs for decentralized identity
- **Schema Definition**: Creating type-safe data models with Zod
- **IPLD Database**: Storing and querying encrypted data
- **Client API**: Using the Cinderlink client for P2P functionality

## What's Next?

- [Tutorial 03: P2P Communication](./03-p2p-communication.md) - Learn about direct peer messaging
- [Tutorial 04: Data Synchronization](./04-data-synchronization.md) - Implement robust data sync
- [Tutorial 05: Plugin Development](./05-plugin-development.md) - Create custom plugins
- [Plugin Development Guide](../guides/plugin-development.md) - Deep dive into plugin architecture