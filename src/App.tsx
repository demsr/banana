import { useState, useCallback } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  type OnConnectEnd,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AiNode, ImageNode } from "./nodes/nodes";
import { nanoid } from "nanoid";

const initialNodes: Node[] = [
  {
    id: nanoid(),
    type: "imageNode",
    position: { x: 0, y: 0 },
    data: { label: "Node 1" },
  },
];

const initialEdges: Edge[] = [];

const nodeTypes = { imageNode: ImageNode, aiNode: AiNode };

function App() {
  return (
    <ReactFlowProvider>
      <AICanvas />
    </ReactFlowProvider>
  );
}

const AICanvas = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const { screenToFlowPosition } = useReactFlow();

  const onNodesChange: OnNodesChange = useCallback(
    (changes) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    []
  );
  const onConnect: OnConnect = useCallback((params) => {
    console.log(params);
    setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot));
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (!connectionState.isValid && connectionState.fromNode) {
        const id = nanoid();
        const { clientX, clientY } =
          "changedTouches" in event ? event.changedTouches[0] : event;
        const newNode: Node = {
          id,
          type: "aiNode",
          position: screenToFlowPosition({
            x: clientX,
            y: clientY,
          }),
          data: {
            label: `Node ${id}`,
            image: null,
            prompt: "",
          },
          origin: [0.5, 0],
        };

        setNodes((nds) => [...nds, newNode]);
        setEdges((eds) =>
          eds.concat({
            id,
            source: connectionState.fromNode!.id,
            target: id,
          })
        );
      }
    },
    [screenToFlowPosition]
  );

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        fitView
      >
        <Background
          bgColor="#e2e8f0"
          className="bg-slate-400"
          color="#90a1b9"
          variant={BackgroundVariant.Dots}
        />
        <Controls />
        <MenuBar />
      </ReactFlow>
    </div>
  );
};

const MenuBar = () => {
  return (
    <div className="absolute bottom-2 left-1/2  bg-white rounded-full -translate-x-1/2 p-2 drop-shadow-slate-400 drop-shadow-2xl">
      <button className="p-2 rounded-full">Add Image Node</button>
    </div>
  );
};

export default App;
