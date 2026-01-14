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
    
    // Calculate node positions and dimensions - minimal padding for mobile
    const horizontalPadding = width < 500 ? 8 : width < 700 ? 20 : 40;
    const verticalPadding = width < 500 ? 4 : width < 700 ? 8 : 15;
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
    // Use max for node height, but always use incoming for percentage calculations
    const incomeValue = Math.max(incomeIncoming, incomeOutgoing);
    const actualIncome = incomeIncoming; // Always use actual incoming for percentages
    if (incomeValue > 0) {
      nodeValues.set('income', incomeValue);
    }
    
    // Four column layout: income sources (col 1) -> total income (col 2) -> savings & total expenses (col 3) -> expense categories (col 4)
    const incomeNode = nodes.find(n => n.id === 'income');
    const categoryNodes = nodes.filter(n => n.id !== 'income');
    
    // Column 1: Income source categories (those that send to income)
    const incomeSourceCategories = categoryNodes.filter(n => 
      links.some(l => l.source === n.id && l.target === 'income')
    );
    
    // Column 3 & 4 nodes: those that receive from income (income -> category)
    const rightNodes = categoryNodes.filter(n => 
      links.some(l => l.source === 'income' && l.target === n.id)
    );
    
    // Separate into savings and expenses
    const savingsNodes = rightNodes.filter(n => n.id === 'SAVINGS');
    const expenseNodes = rightNodes.filter(n => n.id !== 'SAVINGS');
    
    // Calculate available height and total value
    const availableHeight = constrainedHeight - verticalPadding * 2;
    const totalValue = links.reduce((sum, link) => sum + link.value, 0);
    // Use actual incoming income for percentage calculations
    const totalIncome = actualIncome;
    
    // Calculate total expenses value
    const totalExpensesValue = expenseNodes.reduce((sum, node) => {
      return sum + (nodeValues.get(node.id) || 0);
    }, 0);
    
    const maxCategoryCount = Math.max(incomeSourceCategories.length, expenseNodes.length);
    const averageNodeSpace = maxCategoryCount > 0 ? availableHeight / maxCategoryCount : availableHeight;
    const fontSize = averageNodeSpace < 40 ? 10 : averageNodeSpace < 60 ? 12 : 14;
    const valueTextSize = averageNodeSpace < 40 ? 8 : averageNodeSpace < 60 ? 10 : 12;
    
    // Column 1: Position income source categories - sorted by value
    const sortedIncomeSourceNodes = incomeSourceCategories
      .map(node => ({ node, value: nodeValues.get(node.id) || 0 }))
      .sort((a, b) => b.value - a.value);
    
    const totalIncomeSourceHeight = sortedIncomeSourceNodes.reduce((sum, { value }) => {
      return sum + Math.max((value / totalValue) * availableHeight * 0.8, 15);
    }, 0);
    
    const incomeSourceGapHeight = (sortedIncomeSourceNodes.length - 1) * nodeGap;
    let currentIncomeSourceY = verticalPadding;
    
    const col1Positions = sortedIncomeSourceNodes.map(({ node }) => {
      const value = nodeValues.get(node.id) || 0;
      const nodeHeight = Math.max((value / totalValue) * availableHeight * 0.8, 15);
      const position = {
        id: node.id,
        label: node.label,
        color: node.color,
        x: horizontalPadding,
        y: currentIncomeSourceY,
        width: nodeWidth,
        height: nodeHeight,
        value,
        type: 'income' as const
      };
      currentIncomeSourceY += nodeHeight + nodeGap;
      return position;
    });
    
    // Column 2: Total Income node
    const incomeHeight = (incomeValue / totalValue) * availableHeight * 0.8;
    const col2Position = incomeNode ? [{
      id: incomeNode.id,
      label: incomeNode.label,
      color: incomeNode.color,
      x: horizontalPadding + (width - horizontalPadding * 2) * 0.33 - nodeWidth / 2,
      y: verticalPadding,
      width: nodeWidth,
      height: incomeHeight,
      value: actualIncome, // Use actual income for display, not the max
      type: 'total' as const
    }] : [];
    
    // Column 3: Savings and Total Expenses nodes
    const col3Positions: any[] = [];
    
    // Calculate heights for column 3
    const savingsValue = savingsNodes.reduce((sum, node) => sum + (nodeValues.get(node.id) || 0), 0);
    const savingsHeight = savingsValue > 0 ? (savingsValue / incomeValue) * incomeHeight : 0;
    
    // Total Expenses height must equal incoming flow from Total Income
    // This ensures left incoming flow height = node height = right outgoing flow sum
    const totalExpensesHeight = totalExpensesValue > 0 && incomeValue > 0 
      ? (totalExpensesValue / incomeValue) * incomeHeight 
      : 0;
    
    const col3Gap = savingsHeight > 0 && totalExpensesHeight > 0 ? nodeGap * 3 : 0;
    const col3TotalHeight = savingsHeight + col3Gap + totalExpensesHeight;
    let currentCol3Y = verticalPadding;
    
    // Add Savings node if it exists
    if (savingsValue > 0) {
      col3Positions.push({
        id: 'SAVINGS',
        label: 'SAVINGS',
        color: savingsNodes[0]?.color || '#10b981',
        x: horizontalPadding + (width - horizontalPadding * 2) * 0.66 - nodeWidth / 2,
        y: currentCol3Y,
        width: nodeWidth,
        height: savingsHeight,
        value: savingsValue,
        type: 'savings' as const
      });
      currentCol3Y += savingsHeight + col3Gap;
    }
    
    // Store Total Expenses Y position for column 4 constraint
    const totalExpensesY = currentCol3Y;
    
    // Add Total Expenses node if there are expenses
    if (totalExpensesValue > 0) {
      col3Positions.push({
        id: 'total-expenses',
        label: 'Total Expenses',
        color: '#ef4444',
        x: horizontalPadding + (width - horizontalPadding * 2) * 0.66 - nodeWidth / 2,
        y: currentCol3Y,
        width: nodeWidth,
        height: totalExpensesHeight,
        value: totalExpensesValue,
        type: 'total-expenses' as const
      });
    }
    
    // Column 4: Individual expense categories - sorted by value
    // Calculate this AFTER column 3 to use Total Expenses Y position as constraint
    const sortedExpenseNodes = expenseNodes
      .map(node => ({ node, value: nodeValues.get(node.id) || 0 }))
      .sort((a, b) => b.value - a.value);
    
    const expenseNodeHeights = sortedExpenseNodes.map(({ node, value }) => ({
      node,
      value,
      height: Math.max((value / totalValue) * availableHeight * 0.8, 15)
    }));
    
    const totalExpenseCategoriesHeight = expenseNodeHeights.reduce((sum, { height }) => sum + height, 0);
    
    const expenseGapHeight = Math.max(sortedExpenseNodes.length - 1, 0) * nodeGap;
    // Constrain column 4 starting Y to not be higher than Total Expenses Y
    const centeredCol4Y = verticalPadding;
    let currentCol4Y = Math.max(centeredCol4Y, totalExpensesY);
    
    const col4Positions = expenseNodeHeights.map(({ node, value, height }) => {
      const position = {
        id: node.id,
        label: node.label,
        color: node.color,
        x: width - horizontalPadding - nodeWidth,
        y: currentCol4Y,
        width: nodeWidth,
        height: height,
        value,
        type: 'expense' as const
      };
      currentCol4Y += height + nodeGap;
      return position;
    });
    
    const allPositions = [...col1Positions, ...col2Position, ...col3Positions, ...col4Positions];
    
    // Create modified links for 4-column layout:
    // 1. Keep income source -> total income links as-is
    // 2. Create total income -> savings link
    // 3. Create total income -> total expenses link
    // 4. Create total expenses -> individual expense category links
    const modifiedLinks: typeof links = [];
    
    // Column 1 to Column 2: Income sources -> Total Income (unchanged)
    links.forEach(link => {
      if (link.target === 'income') {
        modifiedLinks.push(link);
      }
    });
    
    // Column 2 to Column 3: Total Income -> Savings
    if (savingsValue > 0) {
      modifiedLinks.push({
        source: 'income',
        target: 'SAVINGS',
        value: savingsValue,
        color: savingsNodes[0]?.color || '#10b981'
      });
    }
    
    // Column 2 to Column 3: Total Income -> Total Expenses
    if (totalExpensesValue > 0) {
      modifiedLinks.push({
        source: 'income',
        target: 'total-expenses',
        value: totalExpensesValue,
        color: '#ef4444'
      });
    }
    
    // Column 3 to Column 4: Total Expenses -> Individual expense categories
    expenseNodes.forEach(node => {
      const value = nodeValues.get(node.id) || 0;
      if (value > 0) {
        modifiedLinks.push({
          source: 'total-expenses',
          target: node.id,
          value: value,
          color: node.color
        });
      }
    });
    
    // Recalculate nodeValues based on modified links for accuracy
    const updatedNodeValues = new Map<string, number>();
    modifiedLinks.forEach(link => {
      // Track outgoing values
      updatedNodeValues.set(link.source, (updatedNodeValues.get(link.source) || 0) + link.value);
      // Track incoming values for non-income nodes
      if (link.target !== 'income') {
        updatedNodeValues.set(link.target, (updatedNodeValues.get(link.target) || 0) + link.value);
      }
    });
    // Keep income value and ensure total-expenses matches exactly
    updatedNodeValues.set('income', incomeValue);
    updatedNodeValues.set('total-expenses', totalExpensesValue);
    
    // Track vertical position for each node's flows - separate for outgoing and incoming
    const nodeOutgoingY = new Map<string, number>();
    const nodeIncomingY = new Map<string, number>();
    allPositions.forEach(node => {
      nodeOutgoingY.set(node.id, node.y);
      nodeIncomingY.set(node.id, node.y);
    });
    
    // Group links by source to process them together
    const linksBySource = new Map<string, typeof modifiedLinks>();
    modifiedLinks.forEach(link => {
      if (!linksBySource.has(link.source)) {
        linksBySource.set(link.source, []);
      }
      linksBySource.get(link.source)!.push(link);
    });
    
    // Sort links within each source group by target Y position
    linksBySource.forEach((sourceLinks, source) => {
      sourceLinks.sort((a, b) => {
        const targetA = allPositions.find(n => n.id === a.target);
        const targetB = allPositions.find(n => n.id === b.target);
        return (targetA?.y || 0) - (targetB?.y || 0);
      });
    });
    
    // Flatten back to single array
    const sortedLinks: typeof modifiedLinks = [];
    linksBySource.forEach(sourceLinks => {
      sortedLinks.push(...sourceLinks);
    });
    
    // Create link paths
    const linkPaths = sortedLinks
      .map(link => {
        const sourceNode = allPositions.find(n => n.id === link.source);
        const targetNode = allPositions.find(n => n.id === link.target);
        
        if (!sourceNode || !targetNode) return null;
        
        // Calculate link height at SOURCE based on source node's proportion
        const sourceNodeValue = updatedNodeValues.get(link.source) || 0;
        const sourceLinkHeight = sourceNodeValue > 0 ? (link.value / sourceNodeValue) * sourceNode.height : 2;
        
        // Calculate link height at TARGET based on target node's proportion
        const targetNodeValue = updatedNodeValues.get(link.target) || 0;
        const targetLinkHeight = targetNodeValue > 0 ? (link.value / targetNodeValue) * targetNode.height : 2;
        
        // Get current flow positions - use outgoing for source, incoming for target
        const sourceY = nodeOutgoingY.get(link.source) || sourceNode.y;
        const targetY = nodeIncomingY.get(link.target) || targetNode.y;
        
        // Update flow positions for next link - separate tracking for outgoing and incoming
        nodeOutgoingY.set(link.source, sourceY + sourceLinkHeight);
        nodeIncomingY.set(link.target, targetY + targetLinkHeight);
        
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
            L ${x1} ${y1 + targetLinkHeight}
            C ${cx} ${y1 + targetLinkHeight}, ${cx} ${y0 + sourceLinkHeight}, ${x0} ${y0 + sourceLinkHeight}
            Z
          `,
          linkHeight: sourceLinkHeight
        };
      }).filter(Boolean);
    
    // Calculate actual content height based on positioned nodes
    const maxNodeBottom = allPositions.reduce((max, node) => {
      return Math.max(max, node.y + node.height);
    }, 0);
    const actualContentHeight = maxNodeBottom + verticalPadding;
    
    return {
      nodes: allPositions,
      links: linkPaths,
      fontSize,
      valueTextSize,
      totalIncome,
      actualHeight: actualContentHeight
    };
  }, [nodes, links, width, height]);

  return (
    <svg width={width} height={layout.actualHeight} className="overflow-visible" style={{ display: 'block' }}>
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
          {(() => {
            const labelText = node.type === 'total-expenses' ? 'Total Expenses' : node.label;
            const percentage = `(${((node.value / layout.totalIncome) * 100).toFixed(2)}%)`;
            const fullText = `${labelText} ${percentage}`;
            const isMobile = width < 500;
            const isColumn1 = node.x < width * 0.25;
            const isColumn4 = node.x > width * 0.75;
            const isColumn2or3 = node.x >= width * 0.25 && node.x <= width * 0.75;
            const minHeightForVertical = 60; // Minimum height to show vertical text
            const showVertical = isMobile && node.height >= minHeightForVertical;
            
            if (showVertical) {
              // Vertical text inside node for mobile
              return (
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white font-medium"
                  fontSize={layout.fontSize}
                  style={{ pointerEvents: 'none' }}
                  writingMode="vertical-rl"
                  transform={`rotate(180, ${node.x + node.width / 2}, ${node.y + node.height / 2})`}
                >
                  {fullText}
                </text>
              );
            } else {
              // Horizontal text - inside nodes on mobile for columns 1 & 4, outside for desktop
              const mobileColumn1 = isMobile && isColumn1;
              const mobileColumn4 = isMobile && isColumn4;
              
              return (
                <text
                  x={
                    mobileColumn1 ? node.x + node.width - 5 :      // Mobile: inside, near right edge
                    mobileColumn4 ? node.x + 5 :                    // Mobile: inside, near left edge
                    isColumn1 ? node.x + node.width + 10 :         // Desktop: outside right
                    isColumn4 ? node.x - 10 :                       // Desktop: outside left
                    node.x + node.width / 2                         // Columns 2 & 3: center
                  }
                  y={
                    isColumn2or3 ? node.y - 10 : node.y + node.height / 2
                  }
                  textAnchor={
                    mobileColumn1 ? 'end' :                         // Mobile column 1: align right
                    mobileColumn4 ? 'start' :                       // Mobile column 4: align left
                    isColumn1 ? 'start' :                           // Desktop column 1: align left
                    isColumn4 ? 'end' :                             // Desktop column 4: align right
                    'middle'                                        // Columns 2 & 3: center
                  }
                  dominantBaseline={
                    isColumn2or3 ? 'auto' : 'middle'
                  }
                  className={
                    mobileColumn1 || mobileColumn4 
                      ? 'fill-white font-medium' 
                      : 'fill-slate-700 dark:fill-slate-300 font-medium'
                  }
                  fontSize={layout.fontSize}
                  style={{ pointerEvents: 'none' }}
                >
                  {fullText}
                </text>
              );
            }
          })()}
          {hoveredNodeId === node.id && (
            <text
              x={
                node.x < width * 0.25 ? node.x + node.width + 10 :
                node.x > width * 0.75 ? node.x - 10 :
                node.x + node.width / 2
              }
              y={
                node.x >= width * 0.25 && node.x <= width * 0.75 ? 
                  node.y + node.height + layout.fontSize + 8 :
                  node.y + node.height / 2 + (layout.fontSize + 4)
              }
              textAnchor={
                node.x < width * 0.25 ? 'start' :
                node.x > width * 0.75 ? 'end' :
                'middle'
              }
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
