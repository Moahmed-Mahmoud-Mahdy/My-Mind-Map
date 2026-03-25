import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { BrainCircuit, FileText, LogOut, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [mindMaps, setMindMaps] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'mindmaps'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const maps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by createdAt descending
      maps.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMindMaps(maps);
    }, (error) => {
      console.error("Error fetching mind maps:", error);
      toast.error("Failed to load mind maps");
    });

    return unsubscribe;
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'mindmaps', id));
      toast.success("Mind map deleted");
    } catch (error) {
      console.error("Error deleting mind map:", error);
      toast.error("Failed to delete mind map");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <BrainCircuit className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">MindMap AI</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {user?.photoURL && <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />}
            <span className="hidden sm:inline">{user?.displayName || user?.email}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Your Study Maps</h2>
            <p className="text-muted-foreground">Upload a PDF to generate a new mind map.</p>
          </div>
          <Button onClick={() => navigate('/new')} className="gap-2">
            <Plus className="w-4 h-4" />
            New Mind Map
          </Button>
        </div>

        {mindMaps.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed">
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold">No mind maps yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-2 mb-6">
              Get started by uploading a study PDF. Our AI will automatically extract key concepts and create a visual map.
            </p>
            <Button onClick={() => navigate('/new')}>Create your first map</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mindMaps.map((map) => (
              <Card key={map.id} className="hover:shadow-md transition-shadow group cursor-pointer" onClick={() => navigate(`/map/${map.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-2 text-lg">{map.title}</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity -mt-2 -mr-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(map.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <FileText className="w-4 h-4" />
                    <span className="truncate">{map.pdfName || 'Unknown PDF'}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Created {new Date(map.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
