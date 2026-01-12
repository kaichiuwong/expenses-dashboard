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
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);

  const layout = useMemo(() => {
    // Don't limit height, use requested height to allow proper display
    const constrainedHeight = height;
    
    // Calculate node positions and dimensions
    const padding = 50;
    const nodeWidth = 24;
    const nodeGap = 8;
    
    // Calculate total values for each node from links
    const nodeValues = new Map<string, number>();
    links.forEach(link => {
      nodeValues.set(link.source, (nodeValues.get(link.source) || 0) + link.value);
      nodeValues.set(link.target, (nodeValues.get(link.target) || 0) + link.value);
    });
    
    // Separate nodes into three columns: negative (left), income (middle), positive (right)
    const incomeNode = nodes.find(n => n.id === 'income');
    const categoryNodes = nodes.filter(n => n.id !== 'income');
    
    // Calculate which categories are negative (expenses) vs positive (savings/income)
    // Negative categories: those that send to income (category -> income)
    const negativeCategories = categoryNodes.filter(n => 
      links.some(l => l.source === n.id && l.target === 'income')
    );
    
    // Positive categories: those that receive from income (income -> category)
    const positiveCategories = categoryNodes.filter(n => 
      links.some(l => l.source === 'income' && l.target === n.id)
    );
    
    // Calculate available height and total value
    const availableHeight = constrainedHeight - padding * 2;
    const totalValue = links.reduce((sum, link) => sum + link.value, 0);
    const totalIncome = links
      .filter(l => l.target === 'income')
      .reduce((sum, link) => sum + link.value, 0);
    
    const maxCategoryCount = Math.max(negativeCategories.length, positiveCategories.length);
    const averageNodeSpace = maxCategoryCount > 0 ? availableHeight / maxCategoryCount : availableHeight;
    const fontSize = averageNodeSpace < 40 ? 10 : averageNodeSpace < 60 ? 12 : 14;
    const valueTextSize = averageNodeSpace < 40 ? 8 : averageNodeSpace < 60 ? 10 : 12;
    
    // Position left nodes (negative/expense categories) - sorted by value
    const sortedNegativeNodes = negativeCategories
      .map(node => ({ node, value: nodeValues.get(node.id) || 0 }))
      .sort((a, b) => b.value - a.value);
    
    const totalNegativeHeight = sortedNegativeNodes.reduce((sum, { value }) => {
      return sum + Math.max((value / totalValue) * availableHeight * 0.8, 15);
    }, 0);
    
    const negativeGapHeight = (sortedNegativeNodes.length - 1) * nodeGap;
    let currentNegY = padding + (availableHeight - totalNegativeHeight - negativeGapHeight) / 2;
    
    const leftPositions = sortedNegativeNodes.map(({ node }) => {
      const value = nodeValues.get(node.id) || 0;
      const nodeHeight = Math.max((value / totalValue) * availableHeight * 0.8, 15);
      const position = {
        id: node.id,
        label: node.label,
        color: node.color,
        x: padding,
        y: currentNegY,
        width: nodeWidth,
        height: nodeHeight,
        value
      };
      currentNegY += nodeHeight + nodeGap;
      return position;
    });
    
    // Position middle node (income)
    const incomeValue = nodeValues.get('income') || 0;
    const incomeHeight = (incomeValue / totalValue) * availableHeight * 0.8;
    const middlePosition = incomeNode ? [{
      id: incomeNode.id,
      label: incomeNode.label,
      color: incomeNode.color,
      x: width / 2 - nodeWidth / 2,
      y: padding + (availableHeight - incomeHeight) / 2,
      width: nodeWidth,
      height: incomeHeight,
      value: incomeValue
    }] : [];
    
    // Position right nodes (positive/savings categories) - sorted by value
    const sortedPositiveNodes = positiveCategories
      .map(node => ({ node, value: nodeValues.get(node.id) || 0 }))
      .sort((a, b) => b.value - a.value);
    
    const totalPositiveHeight = sortedPositiveNodes.reduce((sum, { value }) => {
      return sum + Math.max((value / totalValue) * availableHeight * 0.8, 15);
    }, 0);
    
    const positiveGapHeight = (sortedPositiveNodes.length - 1) * nodeGap;
    let currentPosY = padding + (availableHeight - totalPositiveHeight - positiveGapHeight) / 2;
    
    const rightPositions = sortedPositiveNodes.map(({ node }) => {
      const value = nodeValues.get(node.id) || 0;
      const nodeHeight = Math.max((value / totalValue) * availableHeight * 0.8, 15);
      const position = {
        id: node.id,
        label: node.label,
        color: node.color,
        x: width - padding - nodeWidth,
        y: currentPosY,
        width: nodeWidth,
        height: nodeHeight,
        value
      };
      currentPosY += nodeHeight + nodeGap;
      return position;
    });
    
    const allPositions = [...leftPositions, ...middlePosition, ...rightPositions];
    
    // Track vertical position for each node's flows
    const nodeFlowY = new Map<string, number>();
    allPositions.forEach(node => {
      nodeFlowY.set(node.id, node.y);
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
        const sourceY = nodeFlowY.get(link.source) || sourceNode.y;
        const targetY = nodeFlowY.get(link.target) || targetNode.y;
        
        // Update flow positions for next link
        nodeFlowY.set(link.source, sourceY + linkHeight);
        nodeFlowY.set(link.target, targetY + linkHeight);
        
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
      valueTextSize,
      totalIncome
    };
  }, [nodes, links, width, height]);

  return (
    <svg width={width} height={height} className="overflow-visible" style={{ display: 'block' }}>
      {/* Draw links first (behind nodes) */}
      {layout.links.map((link, i) => {
        const percentage = (link!.value / layout.totalIncome) * 100;
        const isHovered = hoveredLinkIndex === i;
        
        return (
          <g key={`link-${i}`}>
            <path
              d={link!.path}
              fill={link!.color}
              opacity={isHovered ? 0.8 : 0.5}
              className="transition-opacity cursor-pointer"
              onMouseEnter={() => setHoveredLinkIndex(i)}
              onMouseLeave={() => setHoveredLinkIndex(null)}
            >
              <title>{`${link!.source} → ${link!.target}: $${link!.value.toFixed(2)}`}</title>
            </path>
            {isHovered && (
              <text
                x={width / 2}
                y={20}
                textAnchor="middle"
                className="fill-slate-700 dark:fill-slate-200 font-semibold"
                fontSize={13}
                style={{ pointerEvents: 'none' }}
              >
                <tspan className="fill-slate-600 dark:fill-slate-300">
                  {link!.target}: 
                </tspan>
                <tspan className="fill-slate-800 dark:fill-white" dx="5">
                  ${link!.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </tspan>
                <tspan className="fill-slate-500 dark:fill-slate-400" dx="5">
                  ({percentage.toFixed(1)}%)
                </tspan>
              </text>
            )}
          </g>
        );
      })}
      
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
            x={node.x < width / 3 ? node.x + node.width + 10 : node.x > width * 2/3 ? node.x - 10 : node.x + node.width / 2}
            y={node.x >= width / 3 && node.x <= width * 2/3 ? node.y - 10 : node.y + node.height / 2}
            textAnchor={node.x < width / 3 ? 'start' : node.x > width * 2/3 ? 'end' : 'middle'}
            dominantBaseline={node.x >= width / 3 && node.x <= width * 2/3 ? 'auto' : 'middle'}
            className="fill-slate-700 dark:fill-slate-300 font-medium"
            fontSize={layout.fontSize}
            style={{ pointerEvents: 'none' }}
          >
            {node.label}
          </text>
          {hoveredNodeId === node.id && (
            <text
              x={node.x < width / 3 ? node.x + node.width + 10 : node.x > width * 2/3 ? node.x - 10 : node.x + node.width / 2}
              y={node.x >= width / 3 && node.x <= width * 2/3 ? node.y + node.height + layout.fontSize + 8 : node.y + node.height / 2 + (layout.fontSize + 4)}
              textAnchor={node.x < width / 3 ? 'start' : node.x > width * 2/3 ? 'end' : 'middle'}
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

export default SankeyChart;
