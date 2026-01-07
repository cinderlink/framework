import { useState, useMemo } from 'react';
import { PanelContainer } from '../components/Layout/PanelContainer';
import { useKeyboard } from '@opentui/react';
import { FocusZone } from '../input';
import { Button } from '../components/Button';

interface DatabaseNode {
  path: string;
  content: unknown;
  schema?: string;
  previousContent?: unknown; // For diff view
}

interface DatabaseViewProps {
  colors: typeof import('../theme/colors').colors.dark;
  nodes: DatabaseNode[];
  currentPath: string;
  onNavigate: (path: string) => void;
  onExport: () => void;
}

type ViewMode = 'tree' | 'json' | 'diff';

export function DatabaseView({
  colors,
  nodes,
  currentPath,
  onNavigate,
  onExport,
}: DatabaseViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<'none' | 'search'>('none');

  const filteredNodes = useMemo(() =>
    searchTerm.length > 0
      ? nodes.filter(n => n.path.toLowerCase().includes(searchTerm.toLowerCase()))
      : nodes,
    [nodes, searchTerm]
  );

  // Get selected node for detail view
  const selectedNode = filteredNodes[selectedIndex];

  useKeyboard((...args: unknown[]) => {
    const key = (args[1] || args[0]) as { name?: string; ctrl?: boolean } | undefined;
    if (!key) return;

    // Exit search mode
    if (key.name === 'escape') {
      setFocusedInput('none');
      setExpandedNode(null);
      return;
    }

    // Don't process shortcuts while in input mode
    if (focusedInput !== 'none') return;

    // Actions
    if (key.name === 'e') onExport();
    if (key.name === '/') {
      setFocusedInput('search');
      return;
    }

    // View mode switching
    if (key.name === 't') setViewMode('tree');
    if (key.name === 'j') setViewMode('json');
    if (key.name === 'd') setViewMode('diff');

    // Navigation
    if (key.name === 'up') {
      if (key.ctrl) {
        // Navigate up in path
        const parts = currentPath.split('/').filter(Boolean);
        if (parts.length > 0) {
          parts.pop();
          onNavigate('/' + parts.join('/'));
        }
      } else {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      }
    }
    if (key.name === 'down') {
      setSelectedIndex(prev => Math.min(filteredNodes.length - 1, prev + 1));
    }

    // Expand/collapse node
    if (key.name === 'return' && selectedNode) {
      if (expandedNode === selectedNode.path) {
        setExpandedNode(null);
      } else {
        setExpandedNode(selectedNode.path);
      }
    }
  });

  return (
    <box style={{ flexDirection: 'column', padding: 1, flexGrow: 1 }}>
      {/* Header */}
      <box style={{ height: 2, marginBottom: 1 }}>
        <box style={{ flexDirection: 'row', alignItems: 'center' }}>
          <text fg={colors.accentGreen}>● </text>
          <text fg={colors.textPrimary}><b>Database Explorer</b></text>
          <text fg={colors.textSecondary}> | Mode: </text>
          <text fg={viewMode === 'tree' ? colors.accentGreen : colors.textSecondary}>
            [t]ree
          </text>
          <text fg={colors.textSecondary}> </text>
          <text fg={viewMode === 'json' ? colors.accentBlue : colors.textSecondary}>
            [j]son
          </text>
          <text fg={colors.textSecondary}> </text>
          <text fg={viewMode === 'diff' ? colors.accentYellow : colors.textSecondary}>
            [d]iff
          </text>
        </box>
      </box>

      {/* Path & Search */}
      <box style={{ height: 6, marginBottom: 1 }}>
        <PanelContainer title="Navigation" colors={colors}>
          <box style={{ flexDirection: 'column' }}>
            <box style={{ flexDirection: 'row', marginBottom: 1 }}>
              <text fg={colors.textSecondary}>Path: </text>
              <text fg={colors.accentBlue}>{currentPath || '/'}</text>
              <text fg={colors.textSecondary}> [Ctrl+Up] Go Up</text>
            </box>
            <box style={{ flexDirection: 'row' }}>
              <text fg={colors.textSecondary}>[/] Search: </text>
              {focusedInput === 'search' ? (
                <input
                  placeholder="Type to filter nodes..."
                  value={searchTerm}
                  onInput={setSearchTerm}
                  focused={focusedInput === 'search'}
                />
              ) : (
                <text fg={searchTerm ? colors.textPrimary : colors.textSecondary}>
                  {searchTerm || '(press / to search)'}
                </text>
              )}
            </box>
          </box>
        </PanelContainer>
      </box>

      {/* Main Content Area */}
      <box style={{ flexGrow: 1, flexDirection: 'row' }}>
        {/* Node List */}
        <box style={{ width: '40%', marginRight: 1 }}>
          <PanelContainer
            title={`Nodes (${filteredNodes.length})`}
            colors={colors}
            actions={<text fg={colors.textSecondary}>[Up/Down] Navigate [Enter] Expand</text>}
          >
            <scrollbox style={{ flexGrow: 1, flexDirection: 'column' }} showScrollIndicator={true}>
              {filteredNodes.length === 0 ? (
                <text fg={colors.textSecondary}>No nodes found.</text>
              ) : (
                filteredNodes.map((node, idx) => (
                  <DatabaseNodeItem
                    key={node.path}
                    node={node}
                    colors={colors}
                    isSelected={idx === selectedIndex}
                    isExpanded={expandedNode === node.path}
                  />
                ))
              )}
            </scrollbox>
          </PanelContainer>
        </box>

        {/* Detail View */}
        <box style={{ flexGrow: 1 }}>
          <PanelContainer
            title={expandedNode ? `Detail: ${expandedNode}` : 'Select a node'}
            colors={colors}
            actions={
              <FocusZone zone="db-actions" orderStart={200}>
                <box style={{ flexDirection: 'row' }}>
                  <Button
                    id="btn-export"
                    label="Export"
                    onClick={onExport}
                    zone="db-actions"
                    order={200}
                  />
                </box>
              </FocusZone>
            }
          >
            {expandedNode && selectedNode ? (
              <scrollbox style={{ flexGrow: 1, flexDirection: 'column' }} showScrollIndicator={true}>
                {viewMode === 'tree' && (
                  <TreeView content={selectedNode.content} colors={colors} />
                )}
                {viewMode === 'json' && (
                  <JsonView content={selectedNode.content} colors={colors} />
                )}
                {viewMode === 'diff' && (
                  <DiffView
                    oldContent={selectedNode.previousContent}
                    newContent={selectedNode.content}
                    colors={colors}
                  />
                )}
              </scrollbox>
            ) : (
              <box style={{ padding: 2, justifyContent: 'center' }}>
                <text fg={colors.textSecondary}>
                  Press [Enter] on a node to view details
                </text>
              </box>
            )}
          </PanelContainer>
        </box>
      </box>
    </box>
  );
}

/**
 * Tree View - Hierarchical display of data
 */
function TreeView({
  content,
  colors,
  depth = 0,
}: {
  content: unknown;
  colors: typeof import('../theme/colors').colors.dark;
  depth?: number;
}) {
  const indent = '  '.repeat(depth);

  if (content === null) {
    return <text fg={colors.accentRed}>{indent}<i>null</i></text>;
  }

  if (content === undefined) {
    return <text fg={colors.textSecondary}>{indent}<i>undefined</i></text>;
  }

  if (typeof content === 'string') {
    return <text fg={colors.accentGreen}>{indent}"{content}"</text>;
  }

  if (typeof content === 'number') {
    return <text fg={colors.accentBlue}>{indent}{content}</text>;
  }

  if (typeof content === 'boolean') {
    return <text fg={colors.accentYellow}>{indent}{content.toString()}</text>;
  }

  if (Array.isArray(content)) {
    return (
      <box style={{ flexDirection: 'column' }}>
        <text fg={colors.textSecondary}>{indent}[</text>
        {content.map((item, idx) => (
          <box key={idx} style={{ flexDirection: 'row' }}>
            <text fg={colors.textSecondary}>{indent}  {idx}: </text>
            <TreeView content={item} colors={colors} depth={depth + 1} />
          </box>
        ))}
        <text fg={colors.textSecondary}>{indent}]</text>
      </box>
    );
  }

  if (typeof content === 'object') {
    const entries = Object.entries(content as Record<string, unknown>);
    return (
      <box style={{ flexDirection: 'column' }}>
        <text fg={colors.textSecondary}>{indent}{'{'}</text>
        {entries.map(([key, value]) => (
          <box key={key} style={{ flexDirection: 'column' }}>
            <box style={{ flexDirection: 'row' }}>
              <text fg={colors.accentBlue}>{indent}  {key}: </text>
              {typeof value !== 'object' || value === null ? (
                <TreeView content={value} colors={colors} depth={0} />
              ) : null}
            </box>
            {typeof value === 'object' && value !== null && (
              <TreeView content={value} colors={colors} depth={depth + 2} />
            )}
          </box>
        ))}
        <text fg={colors.textSecondary}>{indent}{'}'}</text>
      </box>
    );
  }

  return <text fg={colors.textSecondary}>{indent}{String(content)}</text>;
}

/**
 * JSON View - Syntax highlighted JSON display
 * Uses OpenTUI's code component for syntax highlighting
 */
function JsonView({
  content,
  colors,
}: {
  content: unknown;
  colors: typeof import('../theme/colors').colors.dark;
}) {
  const jsonString = JSON.stringify(content, null, 2);

  // Use OpenTUI's code component for syntax highlighting
  return (
    <box style={{ flexDirection: 'column' }}>
      <code language="json" content={jsonString} />
    </box>
  );
}

/**
 * Diff View - Show changes between old and new content
 * Uses OpenTUI's diff component
 */
function DiffView({
  oldContent,
  newContent,
  colors,
}: {
  oldContent: unknown;
  newContent: unknown;
  colors: typeof import('../theme/colors').colors.dark;
}) {
  const oldJson = JSON.stringify(oldContent ?? {}, null, 2);
  const newJson = JSON.stringify(newContent, null, 2);

  if (!oldContent) {
    return (
      <box style={{ flexDirection: 'column', padding: 1 }}>
        <text fg={colors.textSecondary}>
          <i>No previous version available for comparison</i>
        </text>
        <box style={{ marginTop: 1 }}>
          <text fg={colors.accentGreen}>Current content:</text>
        </box>
        <code language="json" content={newJson} />
      </box>
    );
  }

  // Use OpenTUI's diff component
  return (
    <box style={{ flexDirection: 'column' }}>
      <diff
        oldContent={oldJson}
        newContent={newJson}
        mode="unified"
        showLineNumbers={true}
      />
    </box>
  );
}

/**
 * Node item in the list
 */
function DatabaseNodeItem({
  node,
  colors,
  isSelected,
  isExpanded,
}: {
  node: DatabaseNode;
  colors: typeof import('../theme/colors').colors.dark;
  isSelected: boolean;
  isExpanded: boolean;
}) {
  const name = node.path.split('/').pop() || node.path;
  const contentType = Array.isArray(node.content)
    ? `Array[${node.content.length}]`
    : typeof node.content === 'object' && node.content !== null
      ? `Object{${Object.keys(node.content as object).length}}`
      : typeof node.content;

  return (
    <box
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 1,
        border: true,
        borderColor: isSelected ? colors.accentBlue : colors.border,
        backgroundColor: isSelected ? colors.panelBackground : undefined,
        marginBottom: 1,
      }}
    >
      <box style={{ flexDirection: 'column' }}>
        <box style={{ flexDirection: 'row' }}>
          {isSelected && <text fg={colors.accentBlue}>{'> '}</text>}
          <text fg={isExpanded ? colors.accentGreen : colors.textPrimary}>
            <b>{name}</b>
          </text>
        </box>
        <box style={{ flexDirection: 'row', marginTop: 1 }}>
          <text fg={colors.textSecondary}>{contentType}</text>
          {node.schema && (
            <box style={{ flexDirection: 'row' }}>
              <text fg={colors.textSecondary}> | </text>
              <text fg={colors.accentYellow}>{node.schema}</text>
            </box>
          )}
        </box>
      </box>
      <box>
        {isExpanded && <text fg={colors.accentGreen}>◆</text>}
      </box>
    </box>
  );
}
