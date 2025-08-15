import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Target, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createJWTClient } from "@/lib/supabaseClient";
import type { Database } from "@/integrations/supabase/types";

// Components
import JobFilters, { JobFiltersState } from "@/components/JobFilters";
import JobsList, { Job } from "@/components/JobsList";
import ContactsList, { Contact } from "@/components/ContactsList";
import MessagePanel from "@/components/MessagePanel";

// DB Types
type RunRow = Database["public"]["Tables"]["runs"]["Row"];
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

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
  const mode = runId ? "run" : "browse";
  const role = searchParams.get("role") || "";
  const company = searchParams.get("company") || "";
  const locationParam = searchParams.get("location") || "";

  // State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<RunPhase>("loading");
  const [isJobsLoading, setIsJobsLoading] = useState(false);
  const [runData, setRunData] = useState<RunRow | null>(null);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  // Pagination and filtering
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

  // Data for filter suggestions
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [sourceSuggestions, setSourceSuggestions] = useState<string[]>([]);

  const supabaseRef = useRef<ReturnType<typeof createJWTClient> | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabaseRef["current"]>["channel"]> | null>(null);

  const state = location.state as LocationState | null;
  const jwt = state?.jwt;
  const jwtExp = state?.exp;

  // Get selected job and contact objects
  const selectedJob = jobs.find(job => job.id === selectedJobId) || null;
  const selectedContact = contacts.find(contact => contact.id === selectedContactId) || null;

  // Initialize Supabase client
  useEffect(() => {
    if (mode === "run" && jwt) {
      // JWT mode for run results
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
      
      client.auth.setSession({
        access_token: jwt,
        refresh_token: "",
      });
      client.realtime.setAuth(jwt);
    } else {
      // Regular mode for browse
      supabaseRef.current = supabase;
    }
  }, [mode, jwt, jwtExp, navigate, toast]);

  // Build query filters
  const buildQuery = useCallback((baseQuery: any) => {
    let query = baseQuery;

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
    }

    if (filters.company) {
      query = query.ilike('company_name', `%${filters.company}%`);
    }

    if (filters.dateFrom) {
      query = query.gte('posted_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('posted_at', filters.dateTo);
    }

    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters.source) {
      query = query.or(`source.ilike.%${filters.source}%,source_type.ilike.%${filters.source}%`);
    }

    if (filters.hasContacts) {
      query = query.not('company_id', 'is', null);
    }

    return query;
  }, [filters]);

  // Fetch jobs with pagination and filtering
  const fetchJobs = useCallback(async (page: number = 1) => {
    if (!supabaseRef.current) return;

    setIsJobsLoading(true);
    try {
      const offset = (page - 1) * JOBS_PER_PAGE;
      
      let baseQuery = supabaseRef.current
        .from('jobs')
        .select('*, companies!jobs_company_id_fkey(company_id, name)', { count: 'exact' });

      // Add run filter for run mode
      if (mode === "run" && runId) {
        baseQuery = baseQuery.eq('run_id', runId);
      }

      // Apply filters
      const query = buildQuery(baseQuery)
        .order('created_at', { ascending: false })
        .range(offset, offset + JOBS_PER_PAGE - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Map to Job format and check for contacts
      const mappedJobs: Job[] = await Promise.all(
        (data || []).map(async (row: any) => {
          let hasContacts = false;
          
          if (row.company_id) {
            const { count: contactCount } = await supabaseRef.current!
              .from('contacts')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', row.company_id);
            
            hasContacts = (contactCount || 0) > 0;
          }

          return {
            id: row.job_id,
            title: row.title || "",
            company: row.company_name || "",
            company_id: row.company_id,
            location: row.location || undefined,
            salary: row.salary || undefined,
            posted_at: row.posted_at || undefined,
            source: row.source || undefined,
            source_type: row.source_type || undefined,
            link: row.link || undefined,
            hasContacts
          };
        })
      );

      setJobs(mappedJobs);
      setTotalCount(count || 0);

      // Auto-select first job
      if (mappedJobs.length > 0 && !selectedJobId) {
        setSelectedJobId(mappedJobs[0].id);
      }

    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error loading jobs",
        description: "Failed to load job listings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsJobsLoading(false);
    }
  }, [mode, runId, buildQuery, selectedJobId, toast, supabaseRef]);

  // Fetch filter suggestions
  const fetchFilterSuggestions = useCallback(async () => {
    if (!supabaseRef.current) return;

    try {
      const [companiesRes, sourcesRes] = await Promise.all([
        supabaseRef.current
          .from('jobs')
          .select('company_name')
          .not('company_name', 'is', null)
          .limit(100),
        supabaseRef.current
          .from('jobs')
          .select('source, source_type')
          .limit(100)
      ]);

      if (companiesRes.data) {
        const uniqueCompanies = [...new Set(
          companiesRes.data.map(row => row.company_name).filter(Boolean)
        )].sort();
        setCompanySuggestions(uniqueCompanies);
      }

      if (sourcesRes.data) {
        const allSources = sourcesRes.data.flatMap(row => 
          [row.source, row.source_type].filter(Boolean)
        );
        const uniqueSources = [...new Set(allSources)].sort();
        setSourceSuggestions(uniqueSources);
      }
    } catch (error) {
      console.error('Error fetching filter suggestions:', error);
    }
  }, []);

  // Setup realtime subscriptions for run mode
  useEffect(() => {
    if (mode !== "run" || !runId || !supabaseRef.current) return;

    let cancelled = false;

    const setupRealtime = async () => {
      try {
        // Initial run data fetch
        const { data: runRow, error: runErr } = await supabaseRef.current!
          .from("runs")
          .select("*")
          .eq("run_id", runId)
          .single();

        if (cancelled) return;
        if (runErr) throw runErr;

        setRunData(runRow);
        const phase: RunPhase =
          runRow.status === "completed" ? "completed" : 
          runRow.status === "failed" ? "failed" : "running";
        setRunStatus(phase);

        // Setup realtime channel
        const channel = supabaseRef.current!.channel(`search-results-${runId}`);

        channel
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "runs", filter: `run_id=eq.${runId}` },
            (payload) => {
              const newRun = payload.new as RunRow;
              setRunData(newRun);
              const nextPhase: RunPhase =
                newRun.status === "completed" ? "completed" : 
                newRun.status === "failed" ? "failed" : "running";
              setRunStatus(nextPhase);
            }
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "jobs", filter: `run_id=eq.${runId}` },
            () => {
              // Refetch jobs when new ones arrive
              fetchJobs(currentPage);
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch (err: any) {
        console.error("Error setting up realtime:", err);
        toast({
          title: "Error loading results",
          description: err.message || "Failed to load search results.",
          variant: "destructive",
        });
        setRunStatus("failed");
      }
    };

    setupRealtime();

    return () => {
      cancelled = true;
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [mode, runId, fetchJobs, currentPage, toast]);

  // Fetch jobs when page or filters change
  useEffect(() => {
    if (supabaseRef.current) {
      fetchJobs(currentPage);
    }
  }, [fetchJobs, currentPage]);

  // Fetch filter suggestions on mount
  useEffect(() => {
    fetchFilterSuggestions();
  }, [fetchFilterSuggestions]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Fetch contacts when job is selected
  useEffect(() => {
    if (!selectedJobId || !supabaseRef.current) return;

    const fetchContacts = async () => {
      setContactsLoading(true);
      setContacts([]);
      setSelectedContactId(null);

      try {
        const job = jobs.find(j => j.id === selectedJobId);
        if (!job?.company_id) {
          console.log('No company_id found for job:', job);
          return;
        }

        console.log('Fetching contacts for company_id:', job.company_id);
        const { data: contactsData, error } = await supabaseRef.current!
          .from('contacts')
          .select('*')
          .eq('company_id', job.company_id);

        if (error) throw error;

        console.log('Contacts data received:', contactsData);
        const mappedContacts: Contact[] = (contactsData || []).map((contact: ContactRow) => ({
          id: contact.contact_id,
          name: contact.name || 'Unknown',
          title: contact.title || undefined,
          email: contact.email || undefined,
          linkedin: contact.linkedin || undefined,
          phone: contact.phone || undefined,
          email_status: contact.email_status || undefined
        }));

        setContacts(mappedContacts);

        // Auto-select first contact
        if (mappedContacts.length > 0) {
          setSelectedContactId(mappedContacts[0].id);
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
        toast({
          title: "Error loading contacts",
          description: "Failed to load contact information.",
          variant: "destructive",
        });
      } finally {
        setContactsLoading(false);
      }
    };

    fetchContacts();
  }, [selectedJobId, jobs, toast, supabaseRef]);

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: JobFiltersState) => {
    setFilters(newFilters);
  };

  // Handle job selection
  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  // Handle contact selection
  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);
  };

  // Handle AI message generation (placeholder)
  const handleGenerateMessage = async (contactId: string, jobId: string) => {
    setIsGeneratingMessage(true);
    try {
      // Placeholder - will implement webhook call later
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Message generated",
        description: "AI message has been generated successfully.",
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate AI message.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const totalPages = Math.ceil(totalCount / JOBS_PER_PAGE);

  // Header content based on mode
  const getHeaderContent = () => {
    if (mode === "run") {
      const searchType = role ? "Role Search" : company ? "Company Search" : "Search";
      const searchQuery = role || company || "";
      
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchJobs(currentPage)}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Browse All Jobs</h1>
            <p className="text-sm text-muted-foreground">
              Explore all available positions with advanced filtering
            </p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>
            {getHeaderContent()}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
          {/* Jobs Column */}
          <div className="lg:col-span-4 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle>Jobs</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                <JobFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  companySuggestions={companySuggestions}
                  sourceSuggestions={sourceSuggestions}
                  isLoading={isJobsLoading}
                />
                <div className="flex-1">
                  <JobsList
                    jobs={jobs}
                    selectedJobId={selectedJobId}
                    onJobSelect={handleJobSelect}
                    isLoading={isJobsLoading}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalCount={totalCount}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contacts Column */}
          <div className="lg:col-span-4">
            <ContactsList
              contacts={contacts}
              selectedContactId={selectedContactId}
              onContactSelect={handleContactSelect}
              isLoading={contactsLoading}
              companyName={selectedJob?.company}
            />
          </div>

          {/* Messages Column */}
          <div className="lg:col-span-4">
            <MessagePanel
              selectedContact={selectedContact}
              selectedJob={selectedJob}
              onGenerateMessage={handleGenerateMessage}
              isGenerating={isGeneratingMessage}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Results;