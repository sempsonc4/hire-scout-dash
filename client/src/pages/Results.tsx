import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Target, RefreshCw, Loader2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createJWTClient } from "@/lib/supabaseClient";

// Components
import JobFilters, { JobFiltersState } from "@/components/JobFilters";
import JobsList, { Job } from "@/components/JobsList";
import ContactsList, { Contact } from "@/components/ContactsList";
import MessagePanel from "@/components/MessagePanel";

// ---- Local view row types (aligned to v_jobs_read_plus) ----
type JobReadRow = {
  job_id: string;
  run_id: string | null;
  title: string | null;
  company_name: string | null;
  company_id: string | null;
  company_id_resolved: string | null;
  location: string | null;
  salary: string | null;
  posted_at: string | null;
  source: string | null;
  source_type: string | null;
  link: string | null;
  created_at: string | null;
  contact_count: number | null;
};

type ContactReadRow = {
  contact_id: string;
  company_id: string | null;
  name: string | null;
  title: string | null;
  email: string | null;
  email_status: string | null;
  linkedin: string | null;
  phone: string | null;
  created_at: string | null;
};

type RunPhase = "loading" | "running" | "completed" | "failed";

type LocationState = {
  jwt?: string;
  exp?: number;
  searchId?: string;
};

const JOBS_PER_PAGE = 20;

const Results = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Mode detection
  const runId = searchParams.get("run_id");
  const mode: "run" | "browse" = runId ? "run" : "browse";

  // Optional display hints from URL
  const role = searchParams.get("role") || "";
  const companyQuery = searchParams.get("company") || "";
  const locationParam = searchParams.get("location") || "";

  // State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<RunPhase>("loading");
  const [isJobsLoading, setIsJobsLoading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  // NEW: the current saved draft (if any) for selected job+contact
  const [initialDraft, setInitialDraft] = useState<any | null>(null);

  // Pagination & filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<JobFiltersState>({
    search: "",
    company: "",
    dateFrom: "",
    dateTo: "",
    location: "",
    source: "",
    hasContacts: false,
  });

  // Suggestions for filters
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [sourceSuggestions, setSourceSuggestions] = useState<string[]>([]);

  // Supabase client (JWT in run mode, anon otherwise)
  const supabaseRef = useRef<ReturnType<typeof createJWTClient> | typeof supabase | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabaseRef["current"]>["channel"]> | null>(null);

  // JWT from navigation state (run mode)
  const state = location.state as LocationState | null;
  const jwt = state?.jwt;
  const jwtExp = state?.exp;

  // Selected job/contact objects
  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;
  const selectedContact = contacts.find(c => c.id === selectedContactId) || null;

  // Initialize Supabase client
  useEffect(() => {
    if (mode === "run" && jwt) {
      if (jwtExp && Date.now() / 1000 > jwtExp) {
        toast({
          title: "Session expired",
          description: "Please start a new search to view results.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      const client = createJWTClient(jwt);
      supabaseRef.current = client;
      client.auth.setSession({ access_token: jwt, refresh_token: "" });
      client.realtime.setAuth(jwt);
    } else {
      supabaseRef.current = supabase;
    }
  }, [mode, jwt, jwtExp, navigate, toast]);

  // Build query with filters for v_jobs_read_plus
  const buildJobViewQuery = useCallback((base: any) => {
    let q = base;

    if (filters.search) {
      q = q.or(`title.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
    }
    if (filters.company) {
      q = q.ilike("company_name", `%${filters.company}%`);
    }
    if (filters.dateFrom) {
      q = q.gte("posted_at", filters.dateFrom);
    }
    if (filters.dateTo) {
      q = q.lte("posted_at", filters.dateTo);
    }
    if (filters.location) {
      q = q.ilike("location", `%${filters.location}%`);
    }
    if (filters.source) {
      q = q.or(`source.ilike.%${filters.source}%,source_type.ilike.%${filters.source}%`);
    }
    if (filters.hasContacts) {
      q = q.gt("contact_count", 0);
    }

    return q;
  }, [filters]);

  // Fetch jobs from v_jobs_read_plus (paged)
  const fetchJobs = useCallback(
    async (page: number = 1) => {
      if (!supabaseRef.current) return;
      setIsJobsLoading(true);
      try {
        const offset = (page - 1) * JOBS_PER_PAGE;

        let base = supabaseRef.current
          .from("v_jobs_read_plus" as any)
          .select("*", { count: "exact" });

        if (mode === "run" && runId) {
          base = base.eq("run_id", runId);
        }

        const query = buildJobViewQuery(base)
          .order("posted_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .range(offset, offset + JOBS_PER_PAGE - 1);

        const { data, error, count } = await query as {
          data: JobReadRow[] | null;
          error: any;
          count: number | null;
        };

        if (error) throw error;

        const mapped: Job[] = (data || []).map((row) => ({
          id: row.job_id,
          title: row.title || "",
          company: row.company_name || "",
          company_id: row.company_id_resolved || row.company_id || undefined,
          location: row.location || undefined,
          salary: row.salary || undefined,
          posted_at: row.posted_at || undefined,
          source: row.source || undefined,
          source_type: row.source_type || undefined,
          link: row.link || undefined,
          hasContacts: (row.contact_count || 0) > 0,
        }));

        setJobs(mapped);
        setTotalCount(count || 0);

        if (mapped.length > 0 && !selectedJobId) {
          setSelectedJobId(mapped[0].id);
        }
      } catch (err) {
        console.error("Error fetching jobs:", err);
        toast({
          title: "Error loading jobs",
          description: "Failed to load job listings. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsJobsLoading(false);
      }
    },
    [mode, runId, buildJobViewQuery, selectedJobId, toast]
  );

  // Suggestions (companies, sources) from v_jobs_read_plus
  const fetchFilterSuggestions = useCallback(async () => {
    if (!supabaseRef.current) return;
    try {
      const [{ data: compData }, { data: srcData }] = await Promise.all([
        supabaseRef.current.from("v_jobs_read_plus" as any).select("company_name").not("company_name", "is", null).limit(200),
        supabaseRef.current.from("v_jobs_read_plus" as any).select("source, source_type").limit(200),
      ]);

      if (compData) {
        const uniq = [...new Set((compData as any[]).map(r => r.company_name).filter(Boolean) as string[])].sort();
        setCompanySuggestions(uniq);
      }
      if (srcData) {
        const all = (srcData as any[])
          .flatMap(r => [r.source, r.source_type].filter(Boolean) as string[]);
        const uniq = [...new Set(all)].sort();
        setSourceSuggestions(uniq);
      }
    } catch (err) {
      console.error("Error fetching filter suggestions:", err);
    }
  }, []);

  // Realtime: listen to base tables; refetch page on changes during a run
  useEffect(() => {
    if (mode !== "run" || !runId || !supabaseRef.current) return;

    let cancelled = false;

    const setup = async () => {
      try {
        const { data: runRow, error } = await supabaseRef.current
          .from("runs")
          .select("*")
          .eq("run_id", runId)
          .single();

        if (cancelled) return;
        if (error) throw error;

        const phase: RunPhase =
          runRow.status === "completed" ? "completed" :
          runRow.status === "failed" ? "failed" : "running";
        setRunStatus(phase);

        const ch = supabaseRef.current.channel(`results-${runId}`);

        ch.on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "runs", filter: `run_id=eq.${runId}` },
          payload => {
            const newStatus = (payload.new as any).status as string;
            const phase: RunPhase =
              newStatus === "completed" ? "completed" :
              newStatus === "failed" ? "failed" : "running";
            setRunStatus(phase);
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "jobs", filter: `run_id=eq.${runId}` },
          () => fetchJobs(currentPage)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "company_jobs" },
          () => fetchJobs(currentPage)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "contacts" },
          () => {
            fetchJobs(currentPage);
            if (selectedJobId) {
              loadContactsForSelectedJob(selectedJobId);
            }
          }
        )
        .subscribe();

        channelRef.current = ch;
      } catch (err: any) {
        console.error("Realtime setup failed:", err);
        toast({
          title: "Error loading results",
          description: err.message || "Failed to load search results.",
          variant: "destructive",
        });
        setRunStatus("failed");
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [mode, runId, currentPage, fetchJobs, selectedJobId, toast]);

  // Fetch jobs on mount / page / filters changes
  useEffect(() => {
    if (supabaseRef.current) fetchJobs(currentPage);
  }, [fetchJobs, currentPage]);

  // Suggestions once
  useEffect(() => {
    fetchFilterSuggestions();
  }, [fetchFilterSuggestions]);

  // Reset paging when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Load contacts for a given job (from v_contacts_read)
  const loadContactsForSelectedJob = useCallback(
    async (jobId: string) => {
      if (!supabaseRef.current) return;
      setContactsLoading(true);
      setContacts([]);
      setSelectedContactId(null);

      try {
        const job = jobs.find(j => j.id === jobId);
        if (!job?.company_id) {
          setContactsLoading(false);
          return;
        }

        const { data, error } = await supabaseRef.current
          .from("v_contacts_read" as any)
          .select("*")
          .eq("company_id", job.company_id)
          .order("title", { ascending: true });

        if (error) throw error;

        const mapped: Contact[] = ((data as any) || []).map((r: any) => ({
          id: r.contact_id,
          name: r.name || "Unknown",
          title: r.title || undefined,
          email: r.email || undefined,
          linkedin: r.linkedin || undefined,
          phone: r.phone || undefined,
          email_status: r.email_status || undefined,
          company_id: r.company_id || undefined,
        }));

        setContacts(mapped);
        if (mapped.length > 0) setSelectedContactId(mapped[0].id);
      } catch (err) {
        console.error("Error loading contacts:", err);
        toast({
          title: "Error loading contacts",
          description: "Failed to load contact information.",
          variant: "destructive",
        });
      } finally {
        setContactsLoading(false);
      }
    },
    [jobs, toast]
  );

  // React to job selection
  useEffect(() => {
    if (selectedJobId) loadContactsForSelectedJob(selectedJobId);
  }, [selectedJobId, loadContactsForSelectedJob]);

  // NEW: Load existing draft for the selected contact+job
  useEffect(() => {
    const fetchDraft = async () => {
      if (!supabaseRef.current || !selectedContactId || !selectedJobId) {
        setInitialDraft(null);
        return;
      }
      try {
        const { data, error } = await supabaseRef.current
          .from("outreach_messages" as any)
          .select("message_id, subject, body, preview_text, tone, template_version, variant, channel, status, updated_at")
          .eq("contact_id", selectedContactId)
          .eq("job_id", selectedJobId)
          .eq("status", "draft")
          .order("updated_at", { ascending: false })
          .limit(1);

        if (error) throw error;
        setInitialDraft((data && data.length > 0) ? data[0] : null);
      } catch (err) {
        console.error("Error loading existing draft:", err);
        setInitialDraft(null);
      }
    };

    fetchDraft();
  }, [selectedContactId, selectedJobId]);

  // Handlers
  const handlePageChange = (page: number) => setCurrentPage(page);
  const handleFiltersChange = (f: JobFiltersState) => setFilters(f);
  const handleJobSelect = (jobId: string) => setSelectedJobId(jobId);
  const handleContactSelect = (contactId: string) => setSelectedContactId(contactId);

  // Message generator using n8n webhook (unchanged)
  const handleGenerateMessage = async (contactId: string, jobId: string) => {
    setIsGeneratingMessage(true);
    try {
      const contact = contacts.find(c => c.id === contactId);
      const job = jobs.find(j => j.id === jobId);

      const response = await fetch("https://n8n.srv930021.hstgr.cloud/webhook/message/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          job_id: jobId,
          company_id: contact?.company_id || job?.company_id,
          channel: "email",
          tone: "professional",
        }),
      });

      if (!response.ok) throw new Error(response.statusText);
      const webhookResult = await response.json();
      if (!webhookResult.ok || !webhookResult.message_id) throw new Error("Invalid webhook response");

      const { data: messageData, error } = await supabaseRef.current!
        .from('outreach_messages' as any)
        .select('message_id, contact_id, job_id, company_id, subject, body, preview_text, tone, template_version, variant, status, updated_at')
        .eq('message_id', webhookResult.message_id)
        .single();

      if (error) throw new Error(`Failed to fetch message: ${error.message}`);
      if (!messageData) throw new Error("Generated message not found");

      // Optional: refresh initialDraft to reflect latest saved version
      setInitialDraft(messageData);

      toast({
        title: "Message generated",
        description: "AI outreach message has been generated successfully.",
      });

      return messageData;
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate AI message.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  // Header content
  const header = (() => {
    if (mode === "run") {
      const searchType = role ? "Role Search" : companyQuery ? "Company Search" : "Search";
      const searchQuery = role || companyQuery || "";
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{searchType} Results</h1>
            <p className="text-sm text-muted-foreground">
              {searchQuery} {locationParam && `• ${locationParam}`}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant={runStatus === "completed" ? "secondary" : runStatus === "failed" ? "destructive" : "default"}>
              {runStatus === "loading" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {runStatus.charAt(0).toUpperCase() + runStatus.slice(1)}
            </Badge>
            {runStatus === "running" && (
              <Button variant="outline" size="sm" onClick={() => fetchJobs(currentPage)}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
          <Target className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Browse All Jobs</h1>
          <p className="text-sm text-muted-foreground">Explore all available positions with advanced filtering</p>
        </div>
      </div>
    );
  })();

  const totalPages = Math.ceil(totalCount / JOBS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/")} className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>
            {header}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-12rem)]">
          {/* Jobs Column */}
          <div className="lg:col-span-4 flex flex-col">
            <Card className="flex-1 flex flex-col shadow-professional-md">
              <CardHeader className="pb-4 border-b bg-muted/20">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Jobs
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4 p-0">
                <div className="p-4 border-b">
                  <JobFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    companySuggestions={companySuggestions}
                    sourceSuggestions={sourceSuggestions}
                    isLoading={isJobsLoading}
                  />
                </div>
                <div className="flex-1 overflow-hidden px-4 pb-4">
                  <JobsList
                    jobs={jobs}
                    selectedJobId={selectedJobId}
                    onJobSelect={setSelectedJobId}
                    isLoading={isJobsLoading}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalCount={totalCount}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contacts Column */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="flex-1 overflow-hidden">
              <ContactsList
                contacts={contacts}
                selectedContactId={selectedContactId}
                onContactSelect={setSelectedContactId}
                isLoading={contactsLoading}
                companyName={selectedJob?.company}
              />
            </div>
          </div>

          {/* Message Column */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="flex-1 overflow-hidden">
              <MessagePanel
                selectedContact={selectedContact}
                selectedJob={selectedJob}
                onGenerateMessage={handleGenerateMessage}
                isGenerating={isGeneratingMessage}
                initialDraft={initialDraft}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Results;
