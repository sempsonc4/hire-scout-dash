import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Mail,
  Phone,
  Linkedin,
  Copy,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createJWTClient } from "@/lib/supabaseClient";
import type { Database } from "@/integrations/supabase/types";

// Types for UI
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  datePosted?: string;
  source?: string;
  url?: string;
}

type RunPhase = "loading" | "running" | "completed" | "failed";

// Database types
type RunRow = Database['public']['Tables']['runs']['Row'];
type JobRow = Database['public']['Tables']['jobs']['Row'];

type LocationState = { 
  jwt?: string; 
  exp?: number;
  searchId?: string;
};

// Mock contacts/messages (placeholder)
const mockContacts: Record<
  string,
  Array<{
    id: string;
    name: string;
    title: string;
    email?: string;
    linkedin?: string;
    phone?: string;
    verified: "verified" | "unverified" | "pending";
  }>
> = {
  "1": [
    {
      id: "c1",
      name: "Sarah Johnson",
      title: "VP of Engineering",
      email: "sarah.johnson@techcorp.com",
      linkedin: "https://linkedin.com/in/sarahjohnson",
      phone: "+1 (555) 123-4567",
      verified: "verified",
    },
    {
      id: "c2",
      name: "Mike Chen",
      title: "Senior Hiring Manager",
      email: "mike.chen@techcorp.com",
      linkedin: "https://linkedin.com/in/mikechen",
      verified: "unverified",
    },
  ],
  "2": [
    {
      id: "c3",
      name: "Jessica Brown",
      title: "CTO",
      email: "jessica@startupxyz.com",
      linkedin: "https://linkedin.com/in/jessicabrown",
      verified: "verified",
    },
  ],
  "3": [
    {
      id: "c4",
      name: "David Wilson",
      title: "Director of Engineering",
      email: "david.wilson@bigtech.com",
      linkedin: "https://linkedin.com/in/davidwilson",
      phone: "+1 (555) 987-6543",
      verified: "pending",
    },
  ],
};

const mockMessages: Record<string, { subject: string; body: string }> = {
  c1: {
    subject: "Exploring Senior Software Engineer Opportunity at TechCorp",
    body: `Hi Sarah,

I hope this message finds you well. I came across the Senior Software Engineer position at TechCorp and was immediately drawn to your innovative approach to software development.

With my 5+ years of experience in full-stack development and passion for scalable solutions, I believe I could contribute significantly to your team's continued success.

Would you be available for a brief conversation about this opportunity?

Best regards`,
  },
  c2: {
    subject: "Senior Software Engineer Role - Let's Connect",
    body: `Hello Mike,

I'm reaching out regarding the Senior Software Engineer position at TechCorp. Your team's reputation for technical excellence aligns perfectly with my career aspirations.

I'd love to discuss how my background in modern web technologies could benefit your engineering initiatives.

Looking forward to connecting!

Best`,
  },
};

const Results = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [messageData, setMessageData] = useState({ subject: "", body: "" });
  const [runStatus, setRunStatus] = useState<RunPhase>("loading");
  const [runData, setRunData] = useState<RunRow | null>(null);

  const supabaseClient = useRef<ReturnType<typeof createJWTClient> | null>(null);
  const realtimeChannel = useRef<any>(null);

  const runId = searchParams.get("run_id") || "";
  const role = searchParams.get("role") || "";
  const loc = searchParams.get("location") || "";
  const isDemo = searchParams.get("demo") === "true";

  // Map DB rows -> UI jobs
  const mapRowsToJobs = (rows: JobRow[]): Job[] =>
    rows.map((r) => ({
      id: r.job_id,
      title: r.title ?? "",
      company: r.company_name ?? "",
      location: r.location ?? "",
      salary: r.salary ?? undefined,
      datePosted: r.posted_at ?? undefined,
      source: r.source_type ?? r.source ?? undefined,
      url: r.link ?? undefined,
    }));

  // Initialize Supabase client with JWT and fetch initial data
  useEffect(() => {
    if (isDemo) {
      // Demo mode
      const demoJobs: Job[] = [
        {
          id: "1",
          title: "Senior Power BI Developer",
          company: "TechCorp Inc.",
          location: "Minneapolis, MN",
          salary: "$95,000 - $120,000",
          datePosted: "2025-03-28",
          source: "Company Site",
          url: "https://example.com/job/1",
        },
        {
          id: "2",
          title: "Business Intelligence Analyst",
          company: "DataFlow Solutions",
          location: "Remote",
          salary: "$80,000 - $100,000",
          datePosted: "2025-03-24",
          source: "Job Board",
          url: "https://example.com/job/2",
        },
      ];
      setJobs(demoJobs);
      setRunStatus("completed");
      return;
    }

    if (!runId) {
      setRunStatus("failed");
      return;
    }

    const state = location.state as LocationState | null;
    const jwt = state?.jwt;

    if (!jwt) {
      toast({
        title: "Access token missing",
        description: "Please start a new search to view results.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // Check if JWT is expired
    if (state?.exp && Date.now() / 1000 > state.exp) {
      toast({
        title: "Session expired",
        description: "Please start a new search to view results.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // Create Supabase client with JWT
    supabaseClient.current = createJWTClient(jwt);

    // Fetch initial data and set up realtime
    const initializeData = async () => {
      try {
        // Fetch run data
        const { data: runData, error: runError } = await supabaseClient.current!
          .from('runs')
          .select('*')
          .eq('run_id', runId)
          .single();

        if (runError) throw runError;

        setRunData(runData);
        setRunStatus(runData.status === 'completed' ? 'completed' : runData.status === 'failed' ? 'failed' : 'running');

        // Fetch jobs
        const { data: jobsData, error: jobsError } = await supabaseClient.current!
          .from('jobs')
          .select('*')
          .eq('run_id', runId);

        if (jobsError) throw jobsError;

        setJobs(mapRowsToJobs(jobsData || []));

        // Set up realtime subscriptions
        setupRealtime();

      } catch (error: any) {
        console.error('Error fetching initial data:', error);
        toast({
          title: "Error loading results",
          description: error.message || "Failed to load search results.",
          variant: "destructive",
        });
        setRunStatus("failed");
      }
    };

    initializeData();

    return () => {
      if (realtimeChannel.current) {
        supabaseClient.current?.removeChannel(realtimeChannel.current);
      }
    };
  }, [runId, location.state, isDemo, navigate, toast]);

  const setupRealtime = () => {
    if (!supabaseClient.current || !runId) return;

    console.log('Setting up realtime subscriptions for run_id:', runId);

    realtimeChannel.current = supabaseClient.current
      .channel('search-results')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'runs',
          filter: `run_id=eq.${runId}`
        },
        (payload) => {
          const newRun = payload.new as RunRow;
          console.log('Received run update:', newRun);
          setRunData(newRun);
          setRunStatus(
            newRun.status === 'completed' ? 'completed' : 
            newRun.status === 'failed' ? 'failed' : 'running'
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
          filter: `run_id=eq.${runId}`
        },
        (payload) => {
          const newJob = payload.new as JobRow;
          console.log('Received new job:', newJob);
          setJobs(prev => {
            const exists = prev.some(job => job.id === newJob.job_id);
            if (exists) return prev;
            return [...prev, ...mapRowsToJobs([newJob])];
          });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to realtime updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error');
        }
      });

    // Also poll for updates as a fallback
    const pollInterval = setInterval(async () => {
      if (runStatus === 'completed' || runStatus === 'failed') {
        clearInterval(pollInterval);
        return;
      }
      
      await fetchLatestJobs();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  };

  // Auto-select first job
  useEffect(() => {
    if (jobs.length > 0 && !selectedJob) {
      setSelectedJob(jobs[0].id);
    }
  }, [jobs, selectedJob]);

  // Manage mock contacts selection
  useEffect(() => {
    if (selectedJob) {
      const contacts = mockContacts[selectedJob] || [];
      if (contacts.length > 0 && !selectedContact) {
        setSelectedContact(contacts[0].id);
      } else if (contacts.length === 0) {
        setSelectedContact(null);
      }
    }
  }, [selectedJob, selectedContact]);

  // Load mock message for selected contact
  useEffect(() => {
    if (selectedContact && mockMessages[selectedContact]) {
      setMessageData(mockMessages[selectedContact]);
    } else {
      setMessageData({ subject: "", body: "" });
    }
  }, [selectedContact]);

  // Function to fetch latest jobs as fallback
  const fetchLatestJobs = async () => {
    if (!supabaseClient.current || !runId) return;

    try {
      const { data: jobsData, error } = await supabaseClient.current
        .from('jobs')
        .select('*')
        .eq('run_id', runId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs:', error);
        return;
      }

      const newJobs = mapRowsToJobs(jobsData || []);
      setJobs(prev => {
        // Only update if we have new jobs
        if (newJobs.length !== prev.length) {
          console.log(`Updated jobs: ${prev.length} -> ${newJobs.length}`);
          return newJobs;
        }
        return prev;
      });
    } catch (error) {
      console.error('Error in fetchLatestJobs:', error);
    }
  };

  const handleCopyMessage = () => {
    const fullMessage = `Subject: ${messageData.subject}\n\n${messageData.body}`;
    navigator.clipboard.writeText(fullMessage);
    toast({
      title: "Message copied to clipboard",
      description: "You can now paste it into your email client.",
    });
  };

  const handleRegenerateMessage = () => {
    toast({
      title: "Message regenerated",
      description: "AI has generated a new personalized message.",
    });
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge variant="verified" className="ml-2">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case "unverified":
        return (
          <Badge variant="unverified" className="ml-2">
            <XCircle className="w-3 h-3 mr-1" />
            Unverified
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="warning" className="ml-2">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  const getSourceBadge = (source?: string) => (source ? <Badge variant="source">{source}</Badge> : null);

  const currentContacts = selectedJob ? mockContacts[selectedJob] || [] : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                New Search
              </Button>
              <div>
                <h1 className="text-lg font-semibold">Search Results</h1>
                <p className="text-sm text-muted-foreground">
                  {role} • {loc} •{" "}
                  {runStatus === "completed"
                    ? `${jobs.length} results`
                    : runStatus === "running" || runStatus === "loading"
                    ? "Processing..."
                    : "Failed"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
          {/* Jobs Panel */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {runStatus === "running" || runStatus === "loading" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Building2 className="w-4 h-4" />
                )}
                Jobs ({jobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 p-4">
              {runStatus === "loading" || runStatus === "running" ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Processing results...</p>
                  <p className="text-xs mt-1">This may take a few moments</p>
                </div>
              ) : runStatus === "failed" ? (
                <div className="text-center py-8 text-muted-foreground">
                  <XCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
                  <p className="text-sm">Search failed</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/")}>
                    Try Again
                  </Button>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No results found</p>
                  <p className="text-xs mt-1">Try adjusting your search criteria</p>
                </div>
              ) : (
                jobs.map((job) => (
                  <Card
                    key={job.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedJob === job.id ? "ring-2 ring-primary shadow-md" : ""
                    }`}
                    onClick={() => setSelectedJob(job.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-sm leading-tight">{job.title}</h3>
                        {getSourceBadge(job.source)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Building2 className="w-3 h-3" />
                        <span>{job.company}</span>
                      </div>
                      {job.location && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <MapPin className="w-3 h-3" />
                          <span>{job.location}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {job.salary && (
                            <div className="flex items-center gap-1 text-xs">
                              <DollarSign className="w-3 h-3 text-green-600" />
                              <span className="text-green-600 font-medium">{job.salary}</span>
                            </div>
                          )}
                          {job.datePosted && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>{job.datePosted}</span>
                            </div>
                          )}
                        </div>
                        {job.url && (
                          <Button variant="ghost" size="sm" asChild className="h-6 px-2">
                            <a href={job.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Contacts Panel */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Contacts ({currentContacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 p-4">
              {!selectedJob ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Select a job to view contacts</p>
                </div>
              ) : currentContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No contacts found for this position</p>
                  <p className="text-xs mt-1">Contact discovery in progress...</p>
                </div>
              ) : (
                currentContacts.map((contact) => (
                  <Card
                    key={contact.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedContact === contact.id ? "ring-2 ring-primary shadow-md" : ""
                    }`}
                    onClick={() => setSelectedContact(contact.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-sm">{contact.name}</h3>
                          <p className="text-xs text-muted-foreground">{contact.title}</p>
                        </div>
                        {getVerificationBadge(contact.verified)}
                      </div>

                      <Separator className="my-2" />

                      <div className="space-y-1">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-xs">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-xs">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{contact.phone}</span>
                          </div>
                        )}
                        {contact.linkedin && (
                          <div className="flex items-center gap-2 text-xs">
                            <Linkedin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground">LinkedIn Profile</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Message Panel */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4" />
                AI-Generated Message
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4">
              {!selectedContact ? (
                <div className="text-center py-8 text-muted-foreground flex-1 flex items-center justify-center">
                  <div>
                    <Mail className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Select a contact to generate a message</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Subject</label>
                    <Input
                      value={messageData.subject}
                      onChange={(e) => setMessageData((prev) => ({ ...prev, subject: e.target.value }))}
                      placeholder="Email subject..."
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2 flex-1 flex flex-col">
                    <label className="text-xs font-medium text-muted-foreground">Message</label>
                    <Textarea
                      value={messageData.body}
                      onChange={(e) => setMessageData((prev) => ({ ...prev, body: e.target.value }))}
                      placeholder="AI-generated personalized message will appear here..."
                      className="flex-1 min-h-[200px] text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={handleRegenerateMessage} className="flex-1">
                      <RefreshCw className="w-3 h-3 mr-2" />
                      Regenerate
                    </Button>
                    <Button size="sm" onClick={handleCopyMessage} className="flex-1">
                      <Copy className="w-3 h-3 mr-2" />
                      Copy Message
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Results;