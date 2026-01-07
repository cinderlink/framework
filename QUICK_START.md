# Quick Reference: Starting New Session at 70%

## 🎯 Your Mission
Complete the remaining 30% of Bun migration and get Cinderlink framework to 100% ready.

## 📊 Current Baseline
```
136 tests passing (42% pass rate)
185 tests failing
322 total tests
```

**Target**: 250+ tests passing with >80% pass rate

## 🚀 Quick Start Commands

### 1. Verify State
```bash
# Run all tests to see baseline
bun test

# Check build
bun run build

# Typecheck
bun run typecheck
```

### 2. Focus Areas (in priority order)

**Priority 1: Client P2P (27 tests to fix)**
```bash
# Focus on client package
bun test packages/client

# Key file: packages/client/src/ipfs/create.ts
# Test files: packages/client/src/*.test.ts
```

**Priority 2: Identity-Server Mocks (3 tests to fix)**
```bash
bun test packages/plugin-identity-server

# Key files: packages/plugin-identity-server/src/*.test.ts
# Issue: mock.spyOn() doesn't exist in Bun
```

**Priority 3: IPLD Database (4 tests to fix)**
```bash
bun test packages/ipld-database/src/table.test.ts

# Issue: Test expectations don't match actual behavior
```

**Priority 4: Add Missing Tests (11 packages, 0 tests)**
```bash
# Start with server package
# Follow pattern from core-types or identifiers
```

## 🔧 Common Patterns

### Fixing Native Module Issues
```typescript
// In create.ts
const isTestMode = process.env.NODE_ENV === 'test' || options.testMode;

// Simplify libp2p config for tests
services: {
  pubsub: isTestMode ? simplePubsub : fullGossipsub,
  ping: ping()
}
```

### Fixing Mock Issues
```typescript
// Remove mock.spyOn() - doesn't exist in Bun
// Instead, use direct mocks or create spy utilities

// Before (wrong):
const spy = mock.spyOn(plugin, 'send');

// After (right):
const originalSend = plugin.send;
plugin.send = mock.fn(() => {});
// Later: plugin.send = originalSend;
```

### Test Pattern
```typescript
describe('As a [role], I want to [goal] so that [benefit]', () => {
  it('should [specific behavior]', async () => {
    // Arrange
    const client = await createTestClient();
    
    // Act
    await client.someOperation();
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

## 📁 Key Files

### Must Read Before Starting
- `NEW_SESSION_PROMPT.md` - Full detailed prompt
- `SESSION_UPDATE.md` - Previous session progress
- `PROGRESS_REPORT.md` - Current status

### Files You'll Likely Edit
```
packages/client/src/ipfs/create.ts           # Test mode logic
packages/client/src/*.test.ts              # Client tests (27 failing)
packages/plugin-identity-server/src/*.test.ts # Mock fixes
packages/ipld-database/src/table.test.ts     # Assertions
packages/server/src/*.test.ts                # New tests
packages/plugin-*/src/*.test.ts            # New tests
```

## ⏱️ Estimated Time per Priority

- Priority 1 (Client P2P): 60-90 minutes
- Priority 2 (Identity Server): 20-30 minutes
- Priority 3 (IPLD Database): 15-20 minutes
- Priority 4 (Add Tests): 60-120 minutes
- Total: 2.5-4 hours to 100%

## ✅ Success Indicators

You'll know you're on track when:
- Client package tests go from 1/28 to 28/28 passing
- Identity-server goes from 23/26 to 26/26 passing
- IPLD database goes from 37/41 to 41/41 passing
- New test files are created for server and plugins
- Overall pass rate increases from 42% to >80%

## 🚨 Common Pitfalls to Avoid

1. **Don't create versioned files** - Always replace, never duplicate
2. **Test after each fix** - Don't batch changes, test incrementally
3. **Read before editing** - Always read file before Edit tool
4. **Follow existing patterns** - Copy patterns from working tests
5. **Use proper imports** - Follow the established Bun test API

## 📞 If You Get Stuck

1. **Check existing working tests** - Look at core-types, identifiers for patterns
2. **Read test output carefully** - Error messages often tell you exactly what's wrong
3. **Run typecheck** - TypeScript errors guide you to the right solution
4. **Ask for context** - If unsure, use Read tool to see similar working code

## 🎉 Celebrate Progress!

After completing each priority:
- Update SESSION_UPDATE.md with new status
- Run full test suite to see improvement
- Take a moment to appreciate the progress!

---

**Remember**: You're finishing the last 30%. The heavy lifting is done. Focus on the priorities, work systematically, and you'll get to 100%!

Good luck! 🚀
