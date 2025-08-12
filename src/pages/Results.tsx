import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types for UI
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  datePosted?: string;
  source?: string;   // Company Site | Job Board | Recruiting Agency | Other
  url?: string;
}

type RunPhase = "loading" | "running" | "completed" | "failed";

// n8n GET response types
interface N8nRunRow {
  run_id: string;
  status: "running" | "completed" | "failed";
  stop_reason?: string | null;
  stats?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

interface N8nJobRow {
  job_id: string;
  title?: string | null;
  company_name?: string | null;
  location?: string | null;
  schedule_type?: string | null;
  salary?: string | null;
  source?: string | null;
  source_type?: string | null;
  link?: string | null;
  posted_at?: string | null;  // 'YYYY-MM-DD' or null
  scraped_at?: string | null;
  updated_at?: string | null;
}

interface N8nResultsPayload {
  run: N8nRunRow | null;
  jobs: N8nJobRow[];
}

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
  const { toast } = useToast();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [messageData, setMessageData] = useState({ subject: "", body: "" });
  const [runStatus, setRunStatus] = useState<RunPhase>("loading");
  const [isPolling, setIsPolling] = useState(false);

  const runId = searchParams.get("run_id") || "";
  const role = searchParams.get("role") || "";
  const location = searchParams.get("location") || "";
  const isDemo = searchParams.get("demo") === "true";

  // Map DB rows -> UI jobs
  const mapRowsToJobs = (rows: N8nJobRow[]): Job[] =>
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

  // Poll for results with simple GET (no custom headers)
  const pollResults = async () => {
    if (!runId || isPolling) return;

    // Demo fallback if the Home page flagged CORS failure
    if (isDemo) {
      setRunStatus("running");
      setTimeout(() => {
        const mockJobs: Job[] = [
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
        setJobs(mockJobs);
        setRunStatus("completed");
      }, 1500);
      return;
    }

    setIsPolling(true);
    try {
      const resp = await fetch(
        `https://n8n.srv930021.hstgr.cloud/webhook-test/5ab7ac89-e65e-4dd5-9865-98ea15f47bf8/runs/${encodeURIComponent(
          runId
        )}/results`
      );

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const payload: N8nResultsPayload = await resp.json();

      const statusFromRun =
        payload?.run?.status === "running" ||
        payload?.run?.status === "completed" ||
        payload?.run?.status === "failed"
          ? payload.run.status
          : ("completed" as RunPhase);

      // Update jobs incrementally so users see streaming/partial results
      const mapped = mapRowsToJobs(payload?.jobs ?? []);
      setJobs(mapped);
      setRunStatus(statusFromRun);

      // Stop polling if finished or failed
      if (statusFromRun !== "running") {
        setIsPolling(false);
        if (statusFromRun === "failed") {
          toast({
            title: "Search Failed",
            description:
              (payload?.run?.stop_reason as string) ||
              "The job search failed. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        setIsPolling(false);
      }
    } catch (err) {
      console.error("Polling error:", err);
      setIsPolling(false);
      setRunStatus("failed");
      toast({
        title: "Error fetching results",
        description:
          "We couldn't fetch results from the server. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Kick off initial poll
  useEffect(() => {
    if (runId) {
      setRunStatus("loading");
      pollResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // Continue polling while running/loading
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (runStatus === "running" || runStatus === "loading") {
      interval = setInterval(pollResults, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runStatus, runId]);

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
    // TODO: wire to backend AI compose when available
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
                  {role} • {location} •{" "}
                  {runStatus === "completed"
                    ? `${jobs.length} results`
                    : runStatus === "running" || runStatus === "loading"
                    ? "Searching..."
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
                  <p className="text-sm">Searching for jobs...</p>
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
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No jobs found</p>
                </div>
              ) : (
                jobs.map((job) => (
                  <Card
                    key={job.id}
                    className={`cursor-pointer transition-all hover:shadow-professional-sm ${
                      selectedJob === job.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedJob(job.id)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-sm">{job.title}</h3>
                          {getSourceBadge(job.source)}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Building2 className="w-3 h-3" />
                          {job.company}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </div>
                          {job.datePosted && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {job.datePosted}
                            </div>
                          )}
                        </div>
                        {job.salary && (
                          <div className="flex items-center gap-1 text-xs text-accent font-medium">
                            <DollarSign className="w-3 h-3" />
                            {job.salary}
                          </div>
                        )}
                        {job.url && (
                          <div className="pt-1">
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View posting <ExternalLink className="w-3 h-3" />
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

          {/* Contacts Panel */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Contacts ({currentContacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 p-4">
              {selectedJob ? (
                currentContacts.length > 0 ? (
                  currentContacts.map((contact) => (
                    <Card
                      key={contact.id}
                      className={`cursor-pointer transition-all hover:shadow-professional-sm ${
                        selectedContact === contact.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedContact(contact.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">{contact.name}</h3>
                            {getVerificationBadge(contact.verified)}
                          </div>
                          <p className="text-sm text-muted-foreground">{contact.title}</p>
                          <div className="space-y-1">
                            {contact.email && (
                              <div className="flex items-center gap-2 text-xs">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                <span className="font-mono">{contact.email}</span>
                              </div>
                            )}
                            {contact.linkedin && (
                              <div className="flex items-center gap-2 text-xs">
                                <Linkedin className="w-3 h-3 text-muted-foreground" />
                                <span className="text-primary">LinkedIn Profile</span>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-2 text-xs">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <span className="font-mono">{contact.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No contacts found for this company</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Select a job to view contacts</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Panel */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4" />
                AI Generated Message
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4 p-4">
              {selectedContact ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject Line</label>
                    <Input
                      value={messageData.subject}
                      onChange={(e) => setMessageData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Subject line..."
                    />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <Textarea
                      value={messageData.body}
                      onChange={(e) => setMessageData(prev => ({ ...prev, body: e.target.value }))}
                      placeholder="Your personalized message will appear here..."
                      className="min-h-[300px] resize-none"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Button
                      onClick={handleRegenerateMessage}
                      variant="outline"
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate Message
                    </Button>
                    
                    <Button
                      onClick={handleCopyMessage}
                      variant="default"
                      className="w-full"
                      disabled={!messageData.subject || !messageData.body}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy to Clipboard
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                  <div>
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Select a contact to generate a message</p>
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
