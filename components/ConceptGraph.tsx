
import React, { useCallback, useEffect } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  ConnectionLineType,
  MarkerType
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { Concept, Dependency } from '../core/concept/schema';

// --- Graph Layout Logic ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 80;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: 'TB' }); // Top to Bottom

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });

  return { nodes, edges };
};

interface ConceptGraphProps {
  concepts: Concept[];
  dependencies: Dependency[];
  onConceptSelect: (id: string) => void;
  userStates: Record<string, any>; // Pass user states to color nodes
}

export const ConceptGraph: React.FC<ConceptGraphProps> = ({ concepts, dependencies, onConceptSelect, userStates }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    // Transform Canonical Data to ReactFlow Elements
    const flowNodes: Node[] = concepts.map(c => ({
      id: c.id,
      data: { label: c.name, level: c.level },
      position: { x: 0, y: 0 },
      style: { 
        background: userStates[c.id]?.is_confused ? '#fee2e2' : '#fff', // Red background if confused
        border: userStates[c.id]?.is_confused ? '2px solid #ef4444' : '1px solid #777',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold',
        textAlign: 'center',
        width: 172,
        fontSize: '12px'
      }
    }));

    const flowEdges: Edge[] = dependencies.map((d, i) => ({
      id: `e-${i}`,
      source: d.to,   // In graph viz, "requires" usually points UP or FROM the requirement. 
                      // Here: A requires B. Arrow B -> A. 
                      // Wait, let's stick to standard flow: Logic flows from dependency TO dependent?
                      // Actually, if A requires B, you must learn B first. B -> A.
                      // Let's assume schema `from` is dependency, `to` is dependent.
                      // Adjust based on schema provided: Dependency { from, to }. 
                      // If `from` requires `to`, then Arrow should likely be `to` -> `from` (prerequisite flow).
      target: d.from, 
      type: 'smoothstep',
      label: d.type,
      labelStyle: { fill: '#888', fontSize: 10 },
      animated: d.type === 'requires',
      style: { stroke: '#b1b1b7' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    }));

    const layouted = getLayoutedElements(flowNodes, flowEdges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [concepts, dependencies, userStates, setNodes, setEdges]);

  const onNodeClick = useCallback((event: any, node: Node) => {
    onConceptSelect(node.id);
  }, [onConceptSelect]);

  return (
    <div className="w-full h-full bg-gray-50 border-r border-gray-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#aaa" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
};
