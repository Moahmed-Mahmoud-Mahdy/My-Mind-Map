import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Save, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function MindMapViewer() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchMindMap = async () => {
      if (!id || !user) return;
      
      try {
        const docRef = doc(db, 'mindmaps', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.userId !== user.uid) {
            toast.error("You don't have permission to view this mind map");
            navigate('/');
            return;
          }
          
          setTitle(data.title);
          setNodes(JSON.parse(data.nodes || '[]'));
          setEdges(JSON.parse(data.edges || '[]'));
        } else {
          toast.error("Mind map not found");
          navigate('/');
        }
      } catch (error) {
        console.error("Error fetching mind map:", error);
        toast.error("Failed to load mind map");
      } finally {
        setLoading(false);
      }
    };

    fetchMindMap();
  }, [id, user, navigate, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleSave = async () => {
    if (!id || !user) return;
    
    setSaving(true);
    try {
      const docRef = doc(db, 'mindmaps', id);
      await updateDoc(docRef, {
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
      });
      toast.success("Mind map saved successfully");
    } catch (error) {
      console.error("Error saving mind map:", error);
      toast.error("Failed to save mind map");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold truncate max-w-md">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Layout
          </Button>
        </div>
      </header>

      <main className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          attributionPosition="bottom-right"
        >
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          <Background color="#ccc" gap={16} />
          <Panel position="top-left" className="bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-sm border text-xs text-slate-500">
            Drag nodes to rearrange. Scroll to zoom.
          </Panel>
        </ReactFlow>
      </main>
    </div>
  );
}
