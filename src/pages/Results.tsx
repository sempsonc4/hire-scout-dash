import { useState, useEffect, useRef, useCallback } from "react";
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

// UI Types
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

interface Contact {
  id: string;
  name: string;
  title: string;
  email?: string;
  linkedin?: string;
  phone?: string;
  verified?: string;
}

type RunPhase = "loading" | "running" | "completed" | "failed";

// DB Types
type RunRow = Database["public"]["Tables"]["runs"]["Row"];
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];

type LocationState = {
  jwt?: string;
  exp?: number;
  searchId?: string;
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [messageData, setMessageData] = useState({ subject: "", body: "" });
  const [runStatus, setRunStatus] = useState<RunPhase>("loading");
  const [runData, setRunData] = useState<RunRow | null>(null);
  const [contactsLoading, setContactsLoading] = useState(false);

  const supabaseRef = useRef<ReturnType<typeof createJWTClient> | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabaseRef["current"]>["channel"]> | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const statusRef = useRef<RunPhase>("loading"); // keeps latest status for logs

  const runId = searchParams.get("run_id") || "";
  const role = searchParams.get("role") || "";
  const loc = searchParams.get("location") || "";
  const isDemo = searchParams.get("demo") === "true";

  const state = location.state as LocationState | null;
  const jwt = state?.jwt;
  const jwtExp = state?.exp;

  // Helpers
  const mapRowsToJobs = useCallback((rows: JobRow[]): Job[] => {
    return rows.map((r) => ({
      id: r.job_id,
      title: r.title ?? "",
      company: r.company_name ?? "",
      location: r.location ?? "",
      salary: r.salary ?? undefined,
      datePosted: r.posted_at ?? undefined,
      source: r.source_type ?? r.source ?? undefined,
      url: r.link ?? undefined,
    }));
  }, []);

  const upsertJobsInState = useCallback((incoming: JobRow[] | JobRow) => {
    const list = Array.isArray(incoming) ? incoming : [incoming];
    setJobs((prev) => {
      const byId = new Map(prev.map((j) => [j.id, j]));
      for (const row of list) {
        const j = mapRowsToJobs([row])[0];
        byId.set(j.id, { ...(byId.get(j.id) || {}), ...j });
      }
      const next = Array.from(byId.values());
      return next;
    });
  }, [mapRowsToJobs]);

  // DEMO shortcut
  useEffect(() => {
    if (!isDemo) return;
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
  }, [isDemo]);

  // Initialize client + load first data + realtime
  useEffect(() => {
    if (isDemo) return;

    if (!runId) {
      setRunStatus("failed");
      return;
    }

    if (!jwt) {
      toast({
        title: "Access token missing",
        description: "Please start a new search to view results.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    if (jwtExp && Date.now() / 1000 > jwtExp) {
      toast({
        title: "Session expired",
        description: "Please start a new search to view results.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        // Create client and set auth for both REST & Realtime
        const client = createJWTClient(jwt);
        supabaseRef.current = client;

        await client.auth.setSession({
          access_token: jwt,
          refresh_token: "",
        });
        client.realtime.setAuth(jwt);

        // Initial fetch
        const [{ data: runRow, error: runErr }, { data: jobsRows, error: jobsErr }] = await Promise.all([
          client.from("runs").select("*").eq("run_id", runId).single(),
          client.from("jobs").select("*").eq("run_id", runId).order("updated_at", { ascending: false }),
        ]);

        if (cancelled) return;

        if (runErr) throw runErr;
        setRunData(runRow);
        const phase: RunPhase =
          runRow.status === "completed" ? "completed" : runRow.status === "failed" ? "failed" : "running";
        setRunStatus(phase);
        statusRef.current = phase;

        if (jobsErr) throw jobsErr;
        setJobs(mapRowsToJobs(jobsRows || []));

        // Realtime subscriptions
        const channel = client.channel(`search-results-${runId}`);

        channel
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "runs", filter: `run_id=eq.${runId}` },
            (payload) => {
              const newRun = payload.new as RunRow;
              setRunData(newRun);
              const nextPhase: RunPhase =
                newRun.status === "completed" ? "completed" : newRun.status === "failed" ? "failed" : "running";
              setRunStatus(nextPhase);
              statusRef.current = nextPhase;
            }
          )
          .on(
            "postgres_changes",
            // Listen to BOTH inserts and updates (upserts may fire UPDATE)
            { event: "*", schema: "public", table: "jobs", filter: `run_id=eq.${runId}` },
            (payload) => {
              const row = payload.new as JobRow;
              upsertJobsInState(row);
            }
          )
          .subscribe((status) => {
            console.log("Realtime subscription status:", status);
            if (status === "CHANNEL_ERROR") {
              console.error("Realtime subscription error");
            }
          });

        channelRef.current = channel;
      } catch (err: any) {
        console.error("Error initializing results page:", err);
        toast({
          title: "Error loading results",
          description: err.message || "Failed to load search results.",
          variant: "destructive",
        });
        setRunStatus("failed");
        statusRef.current = "failed";
      }
    };

    init();

    return () => {
      cancelled = true;
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, jwt, jwtExp, isDemo, navigate, toast]);

  // Polling fallback that respects *current* runStatus
  useEffect(() => {
    if (isDemo) return;
    if (!supabaseRef.current || !runId) return;

    // only poll while running/loading
    if (runStatus === "completed" || runStatus === "failed") {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    const tick = async () => {
      try {
        const { data, error } = await supabaseRef.current!
          .from("jobs")
          .select("*")
          .eq("run_id", runId)
          .order("updated_at", { ascending: false });

        if (error) {
          if ((error as any).code === "PGRST303") {
            console.warn("JWT expired — stopping polling");
            toast({
              title: "Session expired",
              description: "Please start a new search to refresh access.",
              variant: "destructive",
            });
            setRunStatus("failed");
            statusRef.current = "failed";
          } else {
            console.error("Error fetching jobs:", error);
          }
          return;
        }

        // Merge/Upsert
        upsertJobsInState(data || []);
      } catch (e) {
        console.error("Error in polling tick:", e);
      }
    };

    // kick once, then every 5s
    tick();
    const id = window.setInterval(tick, 5000);
    pollTimerRef.current = id;

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isDemo, runId, runStatus, upsertJobsInState, toast]);

  // Auto-select first job
  useEffect(() => {
    if (jobs.length > 0 && !selectedJob) {
      setSelectedJob(jobs[0].id);
    }
  }, [jobs, selectedJob]);

  // Fetch contacts when job is selected
  useEffect(() => {
    if (!selectedJob || !supabaseRef.current || !runId || isDemo) return;

    const fetchContacts = async () => {
      setContactsLoading(true);
      setContacts([]);
      setSelectedContact(null);

      try {
        const selectedJobData = jobs.find(j => j.id === selectedJob);
        if (!selectedJobData) return;

        // Query by company name to find contacts
        const { data: companiesData, error: companiesError } = await supabaseRef.current!
          .from('companies')
          .select('company_id')
          .ilike('name', selectedJobData.company);

        if (companiesError) throw companiesError;

        if (companiesData && companiesData.length > 0) {
          const companyIds = companiesData.map(c => c.company_id);
          
          const { data: contactsData, error: contactsError } = await supabaseRef.current!
            .from('contacts')
            .select('*')
            .in('company_id', companyIds);

          if (contactsError) throw contactsError;

          const mappedContacts = (contactsData || []).map((contact: ContactRow) => ({
            id: contact.contact_id,
            name: contact.name || 'Unknown',
            title: contact.title || '',
            email: contact.email || undefined,
            linkedin: contact.linkedin || undefined,
            phone: contact.phone || undefined,
            verified: contact.email_status || 'unverified'
          }));

          setContacts(mappedContacts);
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setContactsLoading(false);
      }
    };

    fetchContacts();
  }, [selectedJob, jobs, runId, isDemo]);

  // Auto-select first contact
  useEffect(() => {
    if (contacts.length > 0 && !selectedContact) {
      setSelectedContact(contacts[0].id);
    } else if (contacts.length === 0) {
      setSelectedContact(null);
    }
  }, [contacts, selectedContact]);

  // Generate placeholder message when contact is selected
  useEffect(() => {
    if (selectedContact && contacts.length > 0) {
      const contact = contacts.find(c => c.id === selectedContact);
      if (contact) {
        const selectedJobData = jobs.find(j => j.id === selectedJob);
        setMessageData({
          subject: `Exploring opportunities at ${selectedJobData?.company || 'your company'}`,
          body: `Hi ${contact.name.split(' ')[0]},

I hope this message finds you well. I came across the ${selectedJobData?.title || 'position'} role at ${selectedJobData?.company || 'your company'} and was immediately drawn to your team's work.

With my background and passion for the field, I believe I could contribute significantly to your continued success.

Would you be available for a brief conversation about this opportunity?

Best regards`
        });
      }
    } else {
      setMessageData({ subject: "", body: "" });
    }
  }, [selectedContact, contacts, selectedJob, jobs]);

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

  const getSourceBadge = (source?: string) =>
    source ? <Badge variant="source">{source}</Badge> : null;

  const handleGenerateMessage = async () => {
    if (!selectedContact || !selectedJob) return;
    
    // Placeholder for now - will call webhook later
    toast({
      title: "Generate Outreach Message",
      description: "Message generation feature coming soon!",
    });
  };

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
          {/* Jobs Panel - Scrollable */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                {(runStatus === "running" || runStatus === "loading") ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Building2 className="w-4 h-4" />
                )}
                Jobs ({jobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 p-4 min-h-0">
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => navigate("/")}
                  >
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
                        <h3 className="font-medium text-sm leading-tight">
                          {job.title}
                        </h3>
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
                              <DollarSign className="w-3 h-3" />
                              <span className="font-medium">{job.salary}</span>
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
                {contactsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
                Contacts ({contacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 p-4">
              {!selectedJob ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Select a job to view contacts</p>
                </div>
              ) : contactsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Fetching contacts for {jobs.find(j => j.id === selectedJob)?.company}...</p>
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No contacts found for this position</p>
                  <p className="text-xs mt-1">Contact discovery in progress...</p>
                </div>
              ) : (
                contacts.map((contact) => (
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
                          <p className="text-xs text-muted-foreground">
                            {contact.title}
                          </p>
                        </div>
                        {(() => {
                          switch (contact.verified) {
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
                        })()}
                      </div>

                      <Separator className="my-2" />

                      <div className="space-y-1">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-xs">
                            <Mail className="w-3 h-3" />
                            <span className="text-muted-foreground">{contact.email}</span>
                            {contact.verified === "verified" ? (
                              <div className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle className="w-3 h-3" />
                                <span className="text-xs">Verified</span>
                              </div>
                            ) : contact.verified === "unverified" ? (
                              <div className="flex items-center gap-1 text-red-500">
                                <XCircle className="w-3 h-3" />
                                <span className="text-xs">Not verified</span>
                              </div>
                            ) : null}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-xs">
                            <Phone className="w-3 h-3" />
                            <span className="text-muted-foreground">{contact.phone}</span>
                          </div>
                        )}
                        {contact.linkedin && (
                          <div className="flex items-center gap-2 text-xs">
                            <Linkedin className="w-3 h-3" />
                            <a 
                              href={contact.linkedin} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              LinkedIn Profile
                            </a>
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
                  <Button 
                    onClick={handleGenerateMessage}
                    className="w-full"
                  >
                    Generate Outreach Message
                  </Button>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Subject
                    </label>
                    <Input
                      value={messageData.subject}
                      onChange={(e) =>
                        setMessageData((prev) => ({ ...prev, subject: e.target.value }))
                      }
                      placeholder="Email subject..."
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2 flex-1 flex flex-col">
                    <label className="text-xs font-medium text-muted-foreground">
                      Message
                    </label>
                    <Textarea
                      value={messageData.body}
                      onChange={(e) =>
                        setMessageData((prev) => ({ ...prev, body: e.target.value }))
                      }
                      placeholder="AI-generated personalized message will appear here..."
                      className="flex-1 min-h-[200px] text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateMessage}
                      className="flex-1"
                    >
                      <RefreshCw className="w-3 h-3 mr-2" />
                      Regenerate
                    </Button>
                    <Button size="sm" onClick={() => {
                      const fullMessage = `Subject: ${messageData.subject}\n\n${messageData.body}`;
                      navigator.clipboard.writeText(fullMessage);
                      toast({
                        title: "Message copied to clipboard",
                        description: "You can now paste it into your email client.",
                      });
                    }} className="flex-1">
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
