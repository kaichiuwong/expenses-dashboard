import React, { useMemo, useState } from 'react';

interface SankeyNode {
  id: string;
  label: string;
  color?: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color?: string;
}

interface SankeyChartProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width?: number;
  height?: number;
}

export const SankeyChart: React.FC<SankeyChartProps> = ({ 
  nodes, 
  links, 
  width = 800, 
  height = 400 
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const layout = useMemo(() => {
    // Don't limit height, use requested height to allow proper display
    const constrainedHeight = height;
    
    // Calculate node positions and dimensions
    const padding = 50;
    const nodeWidth = 24;
    const nodeGap = 8;
    
    // Separate nodes into source (income) and target (categories) columns
    const sourceNodes = nodes.filter(n => !links.some(l => l.target === n.id));
    const targetNodes = nodes.filter(n => !links.some(l => l.source === n.id));
    
    // Calculate total values for each node
    const nodeValues = new Map<string, number>();
    links.forEach(link => {
      nodeValues.set(link.source, (nodeValues.get(link.source) || 0) + link.value);
      nodeValues.set(link.target, (nodeValues.get(link.target) || 0) + link.value);
    });
    
    const totalValue = Math.max(...Array.from(nodeValues.values()));
    const availableHeight = constrainedHeight - padding * 2;
    
    // Calculate dynamic text size based on number of nodes and available space
    const targetNodeCount = targetNodes.length;
    const averageNodeSpace = targetNodeCount > 0 ? availableHeight / targetNodeCount : availableHeight;
    const textSizeClass = averageNodeSpace < 40 ? 'text-xs' : averageNodeSpace < 60 ? 'text-sm' : 'text-base';
    const fontSize = averageNodeSpace < 40 ? 10 : averageNodeSpace < 60 ? 12 : 14;
    const valueTextSize = averageNodeSpace < 40 ? 8 : averageNodeSpace < 60 ? 10 : 12;
    
    // Position source nodes (left side)
    const sourcePositions = sourceNodes.map((node, i) => {
      const value = nodeValues.get(node.id) || 0;
      const nodeHeight = (value / totalValue) * availableHeight * 0.8;
      return {
        id: node.id,
        label: node.label,
        color: node.color,
        x: padding,
        y: padding + (availableHeight - nodeHeight) / 2,
        width: nodeWidth,
        height: nodeHeight,
        value
      };
    });
    
    // Position target nodes (right side) - sorted by value for better visual layout
    const sortedTargetNodes = targetNodes
      .map(node => ({ node, value: nodeValues.get(node.id) || 0 }))
      .sort((a, b) => b.value - a.value);
    
    const totalTargetHeight = sortedTargetNodes.reduce((sum, { value }) => {
      return sum + Math.max((value / totalValue) * availableHeight * 0.8, 15);
    }, 0);
    
    const totalGapHeight = (sortedTargetNodes.length - 1) * nodeGap;
    let currentY = padding + (availableHeight - totalTargetHeight - totalGapHeight) / 2;
    
    const targetPositions = sortedTargetNodes.map(({ node }) => {
      const value = nodeValues.get(node.id) || 0;
      const nodeHeight = Math.max((value / totalValue) * availableHeight * 0.8, 15);
      const position = {
        id: node.id,
        label: node.label,
        color: node.color,
        x: width - padding - nodeWidth,
        y: currentY,
        width: nodeWidth,
        height: nodeHeight,
        value
      };
      currentY += nodeHeight + nodeGap;
      return position;
    });
    
    const allPositions = [...sourcePositions, ...targetPositions];
    
    // Track vertical position for each source node's outgoing flows
    const sourceFlowY = new Map<string, number>();
    sourcePositions.forEach(node => {
      sourceFlowY.set(node.id, node.y);
    });
    
    // Track vertical position for each target node's incoming flows
    const targetFlowY = new Map<string, number>();
    targetPositions.forEach(node => {
      targetFlowY.set(node.id, node.y);
    });
    
    // Create link paths - sorted by value to stack flows properly
    const linkPaths = links
      .sort((a, b) => b.value - a.value)
      .map(link => {
        const sourceNode = allPositions.find(n => n.id === link.source);
        const targetNode = allPositions.find(n => n.id === link.target);
        
        if (!sourceNode || !targetNode) return null;
        
        // Calculate link height based on value
        const linkHeight = Math.max((link.value / totalValue) * availableHeight * 0.8, 2);
        
        // Get current flow positions
        const sourceY = sourceFlowY.get(link.source) || sourceNode.y;
        const targetY = targetFlowY.get(link.target) || targetNode.y;
        
        // Update flow positions for next link
        sourceFlowY.set(link.source, sourceY + linkHeight);
        targetFlowY.set(link.target, targetY + linkHeight);
        
        // Calculate positions for the bezier curve
        const x0 = sourceNode.x + sourceNode.width;
        const y0 = sourceY;
        const x1 = targetNode.x;
        const y1 = targetY;
        
        // Control points for smooth curve
        const cx = (x0 + x1) / 2;
        
        return {
          source: link.source,
          target: link.target,
          value: link.value,
          color: link.color || targetNode.color || '#94a3b8',
          path: `
            M ${x0} ${y0}
            C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}
            L ${x1} ${y1 + linkHeight}
            C ${cx} ${y1 + linkHeight}, ${cx} ${y0 + linkHeight}, ${x0} ${y0 + linkHeight}
            Z
          `,
          linkHeight
        };
      }).filter(Boolean);
    
    return {
      nodes: allPositions,
      links: linkPaths,
      fontSize,
      valueTextSize
    };
  }, [nodes, links, width, height]);

  return (
    <svg width={width} height={height} className="overflow-visible" style={{ display: 'block' }}>
      {/* Draw links first (behind nodes) */}
      {layout.links.map((link, i) => (
        <g key={`link-${i}`}>
          <path
            d={link!.path}
            fill={link!.color}
            opacity={0.5}
            className="transition-opacity hover:opacity-80"
          >
            <title>{`${link!.source} → ${link!.target}: $${link!.value.toFixed(2)}`}</title>
          </path>
        </g>
      ))}
      
      {/* Draw nodes */}
      {layout.nodes.map((node, i) => (
        <g 
          key={`node-${i}`}
          onMouseEnter={() => setHoveredNodeId(node.id)}
          onMouseLeave={() => setHoveredNodeId(null)}
          className="cursor-pointer"
        >
          <rect
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            fill={node.color || '#64748b'}
            rx={4}
            className="transition-colors"
          >
            <title>{`${node.label}: $${node.value.toFixed(2)}`}</title>
          </rect>
          <text
            x={node.x < width / 2 ? node.x + node.width + 10 : node.x - 10}
            y={node.y + node.height / 2}
            textAnchor={node.x < width / 2 ? 'start' : 'end'}
            dominantBaseline="middle"
            className="fill-slate-700 dark:fill-slate-300 font-medium"
            fontSize={layout.fontSize}
            style={{ pointerEvents: 'none' }}
          >
            {node.label}
          </text>
          {hoveredNodeId === node.id && (
            <text
              x={node.x < width / 2 ? node.x + node.width + 10 : node.x - 10}
              y={node.y + node.height / 2 + (layout.fontSize + 4)}
              textAnchor={node.x < width / 2 ? 'start' : 'end'}
              dominantBaseline="middle"
              className="fill-slate-500 dark:fill-slate-400"
              fontSize={layout.valueTextSize}
            >
              ${node.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};
