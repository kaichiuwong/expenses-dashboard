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
    // For source nodes, sum outgoing links; for target nodes, sum incoming links
    // For middle nodes (income), use incoming links only to avoid double counting
    const nodeValues = new Map<string, number>();
    links.forEach(link => {
      // Only add to source value (outgoing)
      nodeValues.set(link.source, (nodeValues.get(link.source) || 0) + link.value);
      // Only add to target value if it's not the income node (to avoid double counting)
      if (link.target !== 'income') {
        nodeValues.set(link.target, (nodeValues.get(link.target) || 0) + link.value);
      }
    });
    
    // For the income node, calculate both incoming and outgoing to use the max
    const incomeIncoming = links
      .filter(l => l.target === 'income')
      .reduce((sum, link) => sum + link.value, 0);
    const incomeOutgoing = links
      .filter(l => l.source === 'income')
      .reduce((sum, link) => sum + link.value, 0);
    const incomeValue = Math.max(incomeIncoming, incomeOutgoing);
    if (incomeValue > 0) {
      nodeValues.set('income', incomeValue);
    }
    
    // Separate nodes into three columns: income sources (left), total income (middle), expenses & savings (right)
    const incomeNode = nodes.find(n => n.id === 'income');
    const categoryNodes = nodes.filter(n => n.id !== 'income');
    
    // Income source categories: those that send to income (category -> income)
    const incomeSourceCategories = categoryNodes.filter(n => 
      links.some(l => l.source === n.id && l.target === 'income')
    );
    
    // Right side nodes: those that receive from income (income -> category)
    const rightNodes = categoryNodes.filter(n => 
      links.some(l => l.source === 'income' && l.target === n.id)
    );
    
    // Separate right nodes into savings (above) and expenses (below)
    const savingsNodes = rightNodes.filter(n => n.id === 'SAVINGS');
    const expenseNodes = rightNodes.filter(n => n.id !== 'SAVINGS');
    
    // Calculate available height and total value
    const availableHeight = constrainedHeight - padding * 2;
    const totalValue = links.reduce((sum, link) => sum + link.value, 0);
    const totalIncome = links
      .filter(l => l.target === 'income')
      .reduce((sum, link) => sum + link.value, 0);
    
    const maxCategoryCount = Math.max(incomeSourceCategories.length, rightNodes.length);
    const averageNodeSpace = maxCategoryCount > 0 ? availableHeight / maxCategoryCount : availableHeight;
    const fontSize = averageNodeSpace < 40 ? 10 : averageNodeSpace < 60 ? 12 : 14;
    const valueTextSize = averageNodeSpace < 40 ? 8 : averageNodeSpace < 60 ? 10 : 12;
    
    // Position left nodes (income source categories) - sorted by value
    const sortedIncomeSourceNodes = incomeSourceCategories
      .map(node => ({ node, value: nodeValues.get(node.id) || 0 }))
      .sort((a, b) => b.value - a.value);
    
    const totalIncomeSourceHeight = sortedIncomeSourceNodes.reduce((sum, { value }) => {
      return sum + Math.max((value / totalValue) * availableHeight * 0.8, 15);
    }, 0);
    
    const incomeSourceGapHeight = (sortedIncomeSourceNodes.length - 1) * nodeGap;
    let currentIncomeSourceY = padding + (availableHeight - totalIncomeSourceHeight - incomeSourceGapHeight) / 2;
    
    const leftPositions = sortedIncomeSourceNodes.map(({ node }) => {
      const value = nodeValues.get(node.id) || 0;
      const nodeHeight = Math.max((value / totalValue) * availableHeight * 0.8, 15);
      const position = {
        id: node.id,
        label: node.label,
        color: node.color,
        x: padding,
        y: currentIncomeSourceY,
        width: nodeWidth,
        height: nodeHeight,
        value
      };
      currentIncomeSourceY += nodeHeight + nodeGap;
      return position;
    });
    
    // Position middle node (income) - value already calculated above
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
    
    // Position right nodes - savings above, expenses below
    const sortedSavingsNodes = savingsNodes
      .map(node => ({ node, value: nodeValues.get(node.id) || 0 }))
      .sort((a, b) => b.value - a.value);
    
    const sortedExpenseNodes = expenseNodes
      .map(node => ({ node, value: nodeValues.get(node.id) || 0 }))
      .sort((a, b) => b.value - a.value);
    
    const totalSavingsHeight = sortedSavingsNodes.reduce((sum, { value }) => {
      return sum + Math.max((value / totalValue) * availableHeight * 0.8, 15);
    }, 0);
    
    const totalExpenseHeight = sortedExpenseNodes.reduce((sum, { value }) => {
      return sum + Math.max((value / totalValue) * availableHeight * 0.8, 15);
    }, 0);
    
    const savingsGapHeight = Math.max(sortedSavingsNodes.length - 1, 0) * nodeGap;
    const expenseGapHeight = Math.max(sortedExpenseNodes.length - 1, 0) * nodeGap;
    const middleGap = (sortedSavingsNodes.length > 0 && sortedExpenseNodes.length > 0) ? nodeGap * 3 : 0;
    
    const totalRightHeight = totalSavingsHeight + savingsGapHeight + middleGap + totalExpenseHeight + expenseGapHeight;
    let currentRightY = padding + (availableHeight - totalRightHeight) / 2;
    
    // Position savings nodes first (top)
    const rightSavingsPositions = sortedSavingsNodes.map(({ node }) => {
      const value = nodeValues.get(node.id) || 0;
      const nodeHeight = Math.max((value / totalValue) * availableHeight * 0.8, 15);
      const position = {
        id: node.id,
        label: node.label,
        color: node.color,
        x: width - padding - nodeWidth,
        y: currentRightY,
        width: nodeWidth,
        height: nodeHeight,
        value
      };
      currentRightY += nodeHeight + nodeGap;
      return position;
    });
    
    // Add middle gap between savings and expenses
    currentRightY += middleGap - nodeGap;
    
    // Position expense nodes (bottom)
    const rightExpensePositions = sortedExpenseNodes.map(({ node }) => {
      const value = nodeValues.get(node.id) || 0;
      const nodeHeight = Math.max((value / totalValue) * availableHeight * 0.8, 15);
      const position = {
        id: node.id,
        label: node.label,
        color: node.color,
        x: width - padding - nodeWidth,
        y: currentRightY,
        width: nodeWidth,
        height: nodeHeight,
        value
      };
      currentRightY += nodeHeight + nodeGap;
      return position;
    });
    
    const rightPositions = [...rightSavingsPositions, ...rightExpensePositions];
    
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
        
        // Calculate link height proportional to BOTH source and target nodes
        // Use the source node's height as reference for outgoing flow
        const sourceNodeValue = nodeValues.get(link.source) || 0;
        const sourceLinkHeightRatio = sourceNodeValue > 0 ? link.value / sourceNodeValue : 0;
        const sourceLinkHeight = sourceNode.height * sourceLinkHeightRatio;
        
        // Use the target node's height as reference for incoming flow
        const targetNodeValue = nodeValues.get(link.target) || 0;
        const targetLinkHeightRatio = targetNodeValue > 0 ? link.value / targetNodeValue : 0;
        const targetLinkHeight = targetNode.height * targetLinkHeightRatio;
        
        // Use the average to ensure smooth transitions
        const linkHeight = Math.max((sourceLinkHeight + targetLinkHeight) / 2, 2);
        
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
