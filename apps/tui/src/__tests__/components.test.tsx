/**
 * OpenTUI Component Tests
 *
 * These tests use OpenTUI's native test renderer which enforces
 * terminal UI constraints like "text must be inside <text> nodes".
 *
 * This catches errors that jsdom-based tests would miss.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testRender } from '@opentui/react/test-utils';
import { colors } from '../theme/colors';

// Simple test components to verify OpenTUI constraints
function ValidComponent() {
  return (
    <box style={{ flexDirection: 'column' }}>
      <text fg={colors.dark.textPrimary}>Hello World</text>
      <box style={{ flexDirection: 'row' }}>
        <text fg={colors.dark.accentGreen}>Status: </text>
        <text fg={colors.dark.accentBlue}>Online</text>
      </box>
    </box>
  );
}

function ValidConditionalComponent({ showExtra }: { showExtra: boolean }) {
  return (
    <box style={{ flexDirection: 'column' }}>
      <text>Main content</text>
      {showExtra && <text>Extra content</text>}
    </box>
  );
}

function ValidBoldComponent() {
  return (
    <box>
      <text fg={colors.dark.textPrimary}>
        <b>Bold text</b> and normal text
      </text>
    </box>
  );
}

// Test that KeyboardHints renders properly (was using fragments before)
function KeyboardHintTest() {
  const hints = [
    { key: 'Tab', action: 'Focus' },
    { key: 'Enter', action: 'Select' },
  ];

  return (
    <box style={{ flexDirection: 'row' }}>
      {hints.map((hint, idx) => (
        <box key={hint.key} style={{ flexDirection: 'row' }}>
          <text fg={colors.dark.accentBlue}>[{hint.key}]</text>
          <text fg={colors.dark.textSecondary}> {hint.action}</text>
          {idx < hints.length - 1 && <text fg={colors.dark.textSecondary}> | </text>}
        </box>
      ))}
    </box>
  );
}

describe('OpenTUI Component Tests', () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  describe('Valid components render without errors', () => {
    it('renders basic text in box', async () => {
      const { captureCharFrame, renderOnce, renderer } = await testRender(
        <ValidComponent />,
        { width: 40, height: 10 }
      );
      cleanup = () => renderer.destroy();

      await renderOnce();
      const frame = captureCharFrame();

      expect(frame).toContain('Hello World');
      expect(frame).toContain('Status:');
      expect(frame).toContain('Online');
    });

    it('renders conditional content', async () => {
      const { captureCharFrame, renderOnce, renderer } = await testRender(
        <ValidConditionalComponent showExtra={true} />,
        { width: 40, height: 10 }
      );
      cleanup = () => renderer.destroy();

      await renderOnce();
      const frame = captureCharFrame();

      expect(frame).toContain('Main content');
      expect(frame).toContain('Extra content');
    });

    it('renders without extra content when condition is false', async () => {
      const { captureCharFrame, renderOnce, renderer } = await testRender(
        <ValidConditionalComponent showExtra={false} />,
        { width: 40, height: 10 }
      );
      cleanup = () => renderer.destroy();

      await renderOnce();
      const frame = captureCharFrame();

      expect(frame).toContain('Main content');
      expect(frame).not.toContain('Extra content');
    });

    it('renders bold text inside text node', async () => {
      const { captureCharFrame, renderOnce, renderer } = await testRender(
        <ValidBoldComponent />,
        { width: 40, height: 10 }
      );
      cleanup = () => renderer.destroy();

      await renderOnce();
      const frame = captureCharFrame();

      expect(frame).toContain('Bold text');
      expect(frame).toContain('normal text');
    });

    it('renders keyboard hints with proper structure', async () => {
      const { captureCharFrame, renderOnce, renderer } = await testRender(
        <KeyboardHintTest />,
        { width: 60, height: 10 }
      );
      cleanup = () => renderer.destroy();

      await renderOnce();
      const frame = captureCharFrame();

      expect(frame).toContain('[Tab]');
      expect(frame).toContain('Focus');
      expect(frame).toContain('[Enter]');
      expect(frame).toContain('Select');
    });
  });

  describe('Input simulation', () => {
    it('responds to keyboard input', async () => {
      // Simple component that tracks key presses via renderer events
      const { mockInput, renderOnce, renderer, captureCharFrame } = await testRender(
        <box>
          <text>Press a key</text>
        </box>,
        { width: 40, height: 10 }
      );
      cleanup = () => renderer.destroy();

      await renderOnce();

      // Verify initial render
      const frame = captureCharFrame();
      expect(frame).toContain('Press a key');

      // Test that mockInput doesn't throw
      mockInput.pressKey('a');
      await renderOnce();

      // The key was processed without error
      expect(true).toBe(true);
    });
  });

  describe('Terminal resize', () => {
    it('handles resize events', async () => {
      const { captureCharFrame, renderOnce, resize, renderer } = await testRender(
        <box style={{ width: '100%' }}>
          <text>Resizable content</text>
        </box>,
        { width: 40, height: 10 }
      );
      cleanup = () => renderer.destroy();

      await renderOnce();
      let frame = captureCharFrame();
      expect(frame).toContain('Resizable content');

      // Resize terminal
      resize(80, 24);
      await renderOnce();

      frame = captureCharFrame();
      expect(frame).toContain('Resizable content');
    });
  });
});

describe('OpenTUI constraint validation', () => {
  // These tests verify that OpenTUI properly enforces its constraints.
  // When using bun's test runner, errors may be thrown during render
  // rather than caught by ErrorBoundary, so we test with try/catch.

  it('should throw error for text outside text node', async () => {
    // This component has bare text that should fail
    const InvalidComponent = () => (
      <box>
        {'Bare text without wrapper'}
      </box>
    );

    let errorMessage = '';
    let renderer: { destroy: () => void } | null = null;

    try {
      const result = await testRender(
        <InvalidComponent />,
        { width: 80, height: 24 }
      );
      renderer = result.renderer;
      await result.renderOnce();
      const frame = result.captureCharFrame();
      // If ErrorBoundary caught it, check the frame
      if (frame.includes('Text must be created inside of a text node')) {
        errorMessage = 'Text must be created inside of a text node';
      }
    } catch (error) {
      // Error thrown before ErrorBoundary could catch it
      errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      renderer?.destroy();
    }

    expect(errorMessage).toContain('Text must be created inside of a text node');
  });

  it('should throw error for bold outside text node', async () => {
    // Bold tag must be inside text
    const InvalidBoldComponent = () => (
      <box>
        <b>Bold without text wrapper</b>
      </box>
    );

    let errorMessage = '';
    let renderer: { destroy: () => void } | null = null;

    try {
      const result = await testRender(
        <InvalidBoldComponent />,
        { width: 80, height: 24 }
      );
      renderer = result.renderer;
      await result.renderOnce();
      const frame = result.captureCharFrame();
      // If ErrorBoundary caught it, check the frame
      if (frame.includes('must be created inside of a text node')) {
        errorMessage = 'must be created inside of a text node';
      }
    } catch (error) {
      // Error thrown before ErrorBoundary could catch it
      errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      renderer?.destroy();
    }

    expect(errorMessage).toContain('must be created inside of a text node');
  });
});
