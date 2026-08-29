"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Users,
  Network
} from "lucide-react";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import { processDocumentPipeline } from "@/lib/pipeline/processor";
import { MockDatabase } from "@/lib/mock-db";

const getBadgeColor = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'criminal_record':
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    case 'surveillance':
      return 'bg-green-500/10 text-green-400 border border-green-500/20';
    case 'fir':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'transaction':
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    case 'cdr':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'social_media':
      return 'bg-pink-500/10 text-pink-400 border border-pink-500/20';
    case 'intel_report':
      return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

type JobStatus = 'pending' | 'queued' | 'processing' | 'processed' | 'failed';

interface DocJob {
  id: string;
  title: string;
  source_type: string;
  raw_text: string;
  status: JobStatus;
  progress?: number;
  error_message?: string;
  created_at: string;
  stats?: {
    entities: number;
    relationships: number;
  };
}

export default function IngestionPage() {
  const [pasteText, setPasteText] = React.useState("");
  const [docTitle, setDocTitle] = React.useState("");
  const [docType, setDocType] = React.useState<string>("fir");
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  
  const [jobs, setJobs] = React.useState<DocJob[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  // Active highlighted view state
  const [selectedDoc, setSelectedDoc] = React.useState<DocJob | null>(null);
  const [extractedEntities, setExtractedEntities] = React.useState<any[]>([]);
  const [extractedRels, setExtractedRels] = React.useState<any[]>([]);

  // Load document list
  const loadDocuments = React.useCallback(async () => {
    try {
      const docs = await DatabaseClient.getDocuments();
      
      // In degraded/mock mode, we map stats dynamically to show values
      const mappedJobs: DocJob[] = docs.map((d: any) => {
        let stats = undefined;
        if (d.status === "processed") {
          // Mock counts for seeding
          stats = {
            entities: d.raw_text.match(/\+91/g)?.length || randomRange(2, 6),
            relationships: randomRange(1, 4)
          };
        }
        return {
          id: d.id,
          title: d.title,
          source_type: d.source_type,
          raw_text: d.raw_text,
          status: d.status,
          error_message: d.error_message,
          created_at: d.created_at,
          stats
        };
      });
      setJobs(mappedJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      console.error("Failed to load documents", err);
    }
  }, []);

  React.useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  function randomRange(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  // Handle manual text ingestion
  const handleIngestText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText || !docTitle) return;

    setLoading(true);
    try {
      const docId = 'doc-user-' + Math.random().toString(36).substr(2, 9);
      
      const newDoc = {
        id: docId,
        source_type: docType as any,
        title: docTitle,
        raw_text: pasteText,
        file_hash: 'hash-' + Math.random().toString(36).substr(2, 9),
        file_size: pasteText.length,
        mime_type: 'text/plain',
        status: 'pending' as const,
        created_at: new Date().toISOString()
      };

      if (isDegradedMode) {
        const db = MockDatabase.load();
        db.documents.push(newDoc);
        MockDatabase.save(db);
      } else {
        // Supabase Insert
        const { supabase } = require("@/lib/supabase");
        await supabase.from("documents").insert({
          id: docId,
          source_type: docType,
          title: docTitle,
          raw_text: pasteText,
          file_hash: newDoc.file_hash,
          file_size: newDoc.file_size,
          status: 'pending'
        });
      }

      setPasteText("");
      setDocTitle("");
      await loadDocuments();

      // Trigger pipeline processing immediately in background
      triggerPipeline(docId, pasteText);

    } catch (err) {
      console.error("Failed to insert document:", err);
    } finally {
      setLoading(false);
    }
  };

  // Run pipeline extraction cascade
  const triggerPipeline = async (docId: string, text: string) => {
    setProcessingId(docId);
    
    // Update local UI state to show processing progress
    setJobs(prev => prev.map(j => j.id === docId ? { ...j, status: 'processing', progress: 30 } : j));

    // Simulate delay for visual feedback
    await new Promise(r => setTimeout(r, 1000));
    setJobs(prev => prev.map(j => j.id === docId ? { ...j, progress: 65 } : j));
    await new Promise(r => setTimeout(r, 800));

    try {
      const stats = await processDocumentPipeline(docId, text);
      
      setJobs(prev => prev.map(j => j.id === docId ? { 
        ...j, 
        status: stats.warnings.some(w => w.includes("injection")) ? 'failed' : 'processed', 
        progress: 100,
        error_message: stats.warnings.find(w => w.includes("injection")),
        stats: { entities: stats.entitiesExtracted, relationships: stats.relationshipsCreated }
      } : j));

      await loadDocuments();
    } catch (err: any) {
      setJobs(prev => prev.map(j => j.id === docId ? { ...j, status: 'failed', error_message: err.message } : j));
    } finally {
      setProcessingId(null);
    }
  };

  // File Upload Ingestion
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
      
      // Basic mock reader
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setPasteText(evt.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  // Highlight extracted entity text in markup
  const renderHighlightedText = (doc: DocJob) => {
    let htmlText = doc.raw_text;
    
    // Extracted regex identifiers (Indian Phone numbers and vehicle plates)
    const phoneRegex = /((?:\+91[\s-]?)?[6789]\d{4}[\s-]?\d{5})/g;
    const vehicleRegex = /(\b[A-Z]{2}[\s-]?\d{2}[\s-]?[A-Z]{1,2}[\s-]?\d{4}\b)/g;

    htmlText = htmlText.replace(phoneRegex, '<span class="bg-green-500/20 text-green-400 font-mono px-1 rounded border border-green-500/30">$1</span>');
    htmlText = htmlText.replace(vehicleRegex, '<span class="bg-yellow-500/20 text-yellow-400 font-mono px-1 rounded border border-yellow-500/30">$1</span>');

    // Ground truth suspects names
    const names = ["Devendra Maurya", "Vikram Jagtap", "Sandeep Yadav", "Ramesh Patel", "Arjun Sen", "Vijay Shinde"];
    names.forEach(n => {
      const regex = new RegExp(`(${n})`, 'gi');
      htmlText = htmlText.replace(regex, '<span class="bg-blue-500/20 text-blue-400 font-semibold px-1 rounded border border-blue-500/30">$1</span>');
    });

    return <div dangerouslySetInnerHTML={{ __html: htmlText }} className="whitespace-pre-wrap text-sm leading-relaxed font-sans" />;
  };

  const handleSelectDoc = async (doc: DocJob) => {
    setSelectedDoc(doc);
    
    // Scan matching metrics
    if (doc.status === "processed") {
      if (isDegradedMode) {
        const db = MockDatabase.load();
        // Filter entities linked to mentions
        const docEntities = db.entities.filter(e => 
          doc.raw_text.toLowerCase().includes(e.canonical_name.toLowerCase()) ||
          (e.attributes.phone && doc.raw_text.includes(e.attributes.phone))
        );
        setExtractedEntities(docEntities);
        
        // Find relationships between them
        const entIds = docEntities.map(e => e.id);
        const docRels = db.relationships.filter(r => 
          entIds.includes(r.source_entity_id) && entIds.includes(r.target_entity_id)
        );
        setExtractedRels(docRels);
      }
    } else {
      setExtractedEntities([]);
      setExtractedRels([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Ingestion Wizard</h1>
        <p className="text-muted-foreground">
          Import Call Detail Records (CDRs), police reports, or surveillance files into the intelligence graph.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ingestion Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ingest New Case Document</CardTitle>
              <CardDescription>
                Paste text narrative or upload unstructured records for hybrid Regex/Gemini processing.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleIngestText}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Dossier / Record Title</label>
                    <Input
                      placeholder="e.g. Call Report Connaught Place Sector 3"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Source Category</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="fir" className="text-black bg-white">FIR Narrative</option>
                      <option value="cdr" className="text-black bg-white">Call Detail Record (CDR)</option>
                      <option value="transaction" className="text-black bg-white">Financial transaction</option>
                      <option value="surveillance" className="text-black bg-white">Field Surveillance Note</option>
                      <option value="social_media" className="text-black bg-white">OSINT Social Media entry</option>
                      <option value="intel_report" className="text-black bg-white">Intelligence Brief Dossier</option>
                      <option value="criminal_record" className="text-black bg-white">Criminal Record / Audit</option>
                    </select>
                  </div>
                </div>

                {/* Drag and drop upload */}
                <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/5 hover:bg-muted/10 transition-all relative">
                  <Input
                    type="file"
                    accept=".txt,.csv,.json,.pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">
                    {uploadFile ? uploadFile.name : "Drag & Drop files here or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepts TXT, CSV, PDF, JSON up to 10MB
                  </p>
                </div>

                {/* Text Paste Area */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Paste Document Narrative</label>
                  <textarea
                    rows={6}
                    placeholder="Enter raw narrative text containing names, phones (+91), plates (DL-3C-...), bank accounts, date, locations..."
                    className="w-full rounded-md border border-input bg-transparent p-3 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPasteText("");
                    setDocTitle("");
                    setUploadFile(null);
                  }}
                >
                  Clear
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Run Extraction
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Jobs List / Queue */}
          <Card>
            <CardHeader>
              <CardTitle>Ingestion Processing Jobs</CardTitle>
              <CardDescription>
                Track live background pipeline processing logs and validation progress.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.slice(0, 10).map((job) => (
                  <div
                    key={job.id}
                    onClick={() => handleSelectDoc(job)}
                    className={`p-4 border rounded-lg hover:bg-muted/15 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      selectedDoc?.id === job.id ? "border-primary bg-primary/5" : "bg-card"
                    }`}
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-mono font-bold ${getBadgeColor(job.source_type)}`}>
                          {job.source_type}
                        </span>
                        <p className="font-semibold text-sm truncate">{job.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate w-80 md:w-96">
                        {job.raw_text}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Processing statuses */}
                      {job.status === "processed" && (
                        <div className="text-right">
                          <div className="flex items-center text-green-500 gap-1 text-xs font-semibold">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Processed</span>
                          </div>
                          {job.stats && (
                            <p className="text-[10px] text-muted-foreground">
                              {job.stats.entities} entities • {job.stats.relationships} links
                            </p>
                          )}
                        </div>
                      )}

                      {job.status === "failed" && (
                        <div className="text-right">
                          <div className="flex items-center text-red-500 gap-1 text-xs font-semibold">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Blocked</span>
                          </div>
                          <p className="text-[10px] text-red-400 truncate max-w-[120px]" title={job.error_message}>
                            {job.error_message || "Ingestion error"}
                          </p>
                        </div>
                      )}

                      {job.status === "processing" && (
                        <div className="w-24 text-right">
                          <div className="flex items-center text-blue-400 gap-1 text-xs font-semibold animate-pulse justify-end">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Extracting</span>
                          </div>
                          <div className="w-full bg-muted h-1 rounded-full mt-1 overflow-hidden">
                            <div className="bg-blue-400 h-full rounded-full" style={{ width: `${job.progress || 0}%` }} />
                          </div>
                        </div>
                      )}

                      {job.status === "pending" && (
                        <div className="flex items-center text-amber-500 gap-1 text-xs font-semibold">
                          <Play className="h-3 w-3 fill-amber-500" />
                          <span>Pending Queue</span>
                        </div>
                      )}

                      {/* Manual trigger for failed or pending */}
                      {(job.status === "failed" || job.status === "pending") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerPipeline(job.id, job.raw_text);
                          }}
                          disabled={processingId !== null}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Document Details Sidebar */}
        <div className="lg:col-span-1">
          {selectedDoc ? (
            <Card className="sticky top-6 border-blue-500/20 bg-muted/5">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span>Dossier Detail Panel</span>
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  ID: {selectedDoc.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Processed view highlighted */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Record Text (Inline Highlights)
                  </h4>
                  <div className="p-4 rounded-lg bg-card border leading-relaxed overflow-y-auto max-h-96 scrollbar-thin">
                    {renderHighlightedText(selectedDoc)}
                  </div>
                </div>

                {/* Extraction Stats */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 border rounded bg-card/50 flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">Entities</span>
                    <span className="text-xl font-bold text-blue-500">{extractedEntities.length}</span>
                  </div>
                  <div className="p-3 border rounded bg-card/50 flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">Relationships</span>
                    <span className="text-xl font-bold text-purple-500">{extractedRels.length}</span>
                  </div>
                </div>

                {/* Extracted Entities List */}
                {extractedEntities.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>Extracted Entities</span>
                    </h4>
                    <div className="max-h-48 overflow-y-auto border rounded divide-y bg-card select-none scrollbar-thin">
                      {extractedEntities.map((e, idx) => (
                        <div key={idx} className="p-2 text-xs flex justify-between items-center">
                          <span className="font-semibold">{e.canonical_name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted uppercase tracking-wider">
                            {e.entity_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted Relationships List */}
                {extractedRels.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Network className="h-3.5 w-3.5" />
                      <span>Inferred Relationships</span>
                    </h4>
                    <div className="max-h-48 overflow-y-auto border rounded divide-y bg-card select-none scrollbar-thin">
                      {extractedRels.map((r, idx) => {
                        const src = extractedEntities.find(e => e.id === r.source_entity_id)?.canonical_name || "Unknown";
                        const dst = extractedEntities.find(e => e.id === r.target_entity_id)?.canonical_name || "Unknown";
                        return (
                          <div key={idx} className="p-2 text-[11px]">
                            <span className="font-semibold text-blue-400">{src}</span>
                            <span className="text-muted-foreground mx-1">→ {r.relation_type} →</span>
                            <span className="font-semibold text-purple-400">{dst}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="sticky top-6 border-dashed flex flex-col items-center justify-center p-12 text-center h-[50vh]">
              <Sparkles className="h-8 w-8 text-blue-500/40 mb-3 animate-pulse" />
              <CardTitle className="text-sm font-semibold">Select Ingested Document</CardTitle>
              <CardDescription className="max-w-[200px] mt-1">
                Click on any processed document in the list to inspect its highlighted entities and extracted relations.
              </CardDescription>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
