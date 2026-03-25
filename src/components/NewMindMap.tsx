import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { UploadCloud, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { GoogleGenAI, Type } from '@google/genai';

// Set worker path for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function NewMindMap() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Please select a valid PDF file');
        return;
      }
      setFile(selectedFile);
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    // Limit to first 20 pages to avoid massive token usage
    const numPages = Math.min(pdf.numPages, 20);
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  };

  const generateMindMap = async () => {
    if (!file || !user) return;
    
    setLoading(true);
    try {
      setProgress('Extracting text from PDF...');
      const text = await extractTextFromPdf(file);
      
      if (!text.trim()) {
        throw new Error("Could not extract any text from the PDF.");
      }

      setProgress('Analyzing content with AI...');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Analyze the following text extracted from a study PDF and create a mind map structure.
      Identify the main central topic, key subtopics, and important details.
      Return the result as a JSON object with a 'title' (string) and a 'nodes' array.
      Each node should have an 'id' (string), 'label' (string), and an optional 'parentId' (string) pointing to its parent node.
      The central topic should have no parentId.
      Keep labels concise (1-5 words). Limit to max 30 nodes for readability.
      
      Text:
      ${text.substring(0, 30000)} // Limit text to avoid token limits
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "The main title of the mind map" },
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    parentId: { type: Type.STRING }
                  },
                  required: ["id", "label"]
                }
              }
            },
            required: ["title", "nodes"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) throw new Error("Failed to generate mind map");
      
      const data = JSON.parse(resultText);
      
      setProgress('Building visual map...');
      
      // Convert to React Flow format
      const rfNodes: any[] = [];
      const rfEdges: any[] = [];
      
      // Simple layout algorithm (radial or tree)
      // For simplicity, we'll just position them in a grid and let a layout engine handle it later if needed,
      // or just give them basic positions.
      
      let yOffset = 0;
      data.nodes.forEach((node: any, index: number) => {
        const isRoot = !node.parentId;
        
        rfNodes.push({
          id: node.id,
          type: isRoot ? 'input' : 'default',
          data: { label: node.label },
          position: { x: isRoot ? 250 : (index % 3) * 200, y: isRoot ? 50 : 150 + (Math.floor(index / 3) * 100) },
          style: isRoot ? { background: '#f8fafc', border: '2px solid #3b82f6', fontWeight: 'bold' } : {}
        });
        
        if (node.parentId) {
          rfEdges.push({
            id: `e-${node.parentId}-${node.id}`,
            source: node.parentId,
            target: node.id,
            animated: true,
          });
        }
      });

      setProgress('Saving to database...');
      const mindmapId = crypto.randomUUID();
      const mindmapData = {
        id: mindmapId,
        userId: user.uid,
        title: data.title || file.name.replace('.pdf', ''),
        pdfName: file.name,
        nodes: JSON.stringify(rfNodes),
        edges: JSON.stringify(rfEdges),
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'mindmaps', mindmapId), mindmapData);
      
      toast.success('Mind map generated successfully!');
      navigate(`/map/${mindmapId}`);
      
    } catch (error) {
      console.error("Error generating mind map:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate mind map");
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/')} className="gap-2 -ml-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create New Mind Map</CardTitle>
            <CardDescription>
              Upload a study PDF and our AI will extract the key concepts into an interactive mind map.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div 
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${file ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'}`}
              onClick={() => !loading && fileInputRef.current?.click()}
              style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="application/pdf" 
                className="hidden" 
                disabled={loading}
              />
              
              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-lg text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  {!loading && (
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="mt-2">
                      Remove File
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-slate-100 p-3 rounded-full">
                    <UploadCloud className="w-8 h-8 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium text-lg text-slate-900">Click to upload PDF</p>
                    <p className="text-sm text-slate-500">Maximum file size: 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-medium text-slate-600 animate-pulse">{progress}</p>
              </div>
            )}

            <Button 
              className="w-full h-12 text-lg" 
              disabled={!file || loading} 
              onClick={generateMindMap}
            >
              {loading ? 'Generating...' : 'Generate Mind Map'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
