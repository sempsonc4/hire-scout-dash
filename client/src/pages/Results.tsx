import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Target, RefreshCw, Loader2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Components
import JobFilters, { JobFiltersState } from "@/components/JobFilters";
import JobsList, { Job } from "@/components/JobsList";
import ContactsList, { Contact } from "@/components/ContactsList";
import MessagePanel from "@/components/MessagePanel";

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

  // Current saved draft (if any) for selected job+contact
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

  // JWT from navigation state (run mode)
  const state = location.state as LocationState | null;
  const jwt = state?.jwt;
  const jwtExp = state?.exp;

  // Selected job/contact objects
  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;
  const selectedContact = contacts.find(c => c.id === selectedContactId) || null;

  // Check JWT expiry
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
    }
  }, [mode, jwt, jwtExp, navigate, toast]);

  // Fetch jobs using API
  const fetchJobs = useCallback(
    async (page: number = 1) => {
      setIsJobsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: JOBS_PER_PAGE.toString(),
        });

        if (runId) params.append("run_id", runId);
        if (filters.search) params.append("search", filters.search);
        if (filters.company) params.append("company", filters.company);
        if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.append("dateTo", filters.dateTo);
        if (filters.location) params.append("location", filters.location);
        if (filters.source) params.append("source", filters.source);
        if (filters.hasContacts) params.append("hasContacts", "true");

        const response = await fetch(`/api/jobs?${params}`);
        if (!response.ok) throw new Error("Failed to fetch jobs");

        const result = await response.json();
        const jobs: Job[] = result.data.map((job: any) => ({
          id: job.job_id,
          title: job.title || "",
          company: job.company_name || "",
          company_id: job.company_id || undefined,
          location: job.location || undefined,
          salary: job.salary || undefined,
          posted_at: job.posted_at || undefined,
          source: job.source || undefined,
          source_type: job.source_type || undefined,
          link: job.link || undefined,
          hasContacts: false, // We'll determine this when loading contacts
        }));

        setJobs(jobs);
        setTotalCount(result.total);
        setCurrentPage(page);

        if (jobs.length > 0 && !selectedJobId) {
          setSelectedJobId(jobs[0].id);
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
    [runId, filters, selectedJobId, toast]
  );

  // Load contacts for selected job
  const loadContactsForSelectedJob = useCallback(
    async (jobId: string) => {
      const job = jobs.find(j => j.id === jobId);
      if (!job?.company_id) {
        setContacts([]);
        return;
      }

      setContactsLoading(true);
      try {
        const response = await fetch(`/api/contacts?company_id=${job.company_id}`);
        if (!response.ok) throw new Error("Failed to fetch contacts");

        const result = await response.json();
        const contacts: Contact[] = result.data.map((contact: any) => ({
          id: contact.contact_id,
          name: contact.name || "Unknown",
          title: contact.title || undefined,
          email: contact.email || undefined,
          linkedin: contact.linkedin || undefined,
          phone: contact.phone || undefined,
          email_status: contact.email_status || undefined,
          company_id: contact.company_id || undefined,
        }));

        setContacts(contacts);
      } catch (err) {
        console.error("Error fetching contacts:", err);
        toast({
          title: "Error loading contacts",
          description: "Failed to load company contacts.",
          variant: "destructive",
        });
        setContacts([]);
      } finally {
        setContactsLoading(false);
      }
    },
    [jobs, toast]
  );

  // Check run status if in run mode
  useEffect(() => {
    if (mode !== "run" || !runId) {
      setRunStatus("completed");
      return;
    }

    const checkRunStatus = async () => {
      try {
        const response = await fetch(`/api/runs/${runId}`);
        if (!response.ok) throw new Error("Failed to fetch run status");

        const run = await response.json();
        const phase: RunPhase =
          run.status === "completed" ? "completed" :
          run.status === "failed" ? "failed" :
          run.status === "running" ? "running" : "loading";
        
        setRunStatus(phase);
      } catch (err) {
        console.error("Error checking run status:", err);
        setRunStatus("failed");
      }
    };

    checkRunStatus();
    
    // Poll for status updates every 5 seconds if still running
    const interval = setInterval(checkRunStatus, 5000);
    return () => clearInterval(interval);
  }, [mode, runId]);

  // Load jobs when filters change
  useEffect(() => {
    fetchJobs(1);
  }, [filters, mode, runId]);

  // Load contacts when selected job changes
  useEffect(() => {
    if (selectedJobId) {
      loadContactsForSelectedJob(selectedJobId);
    }
  }, [selectedJobId, loadContactsForSelectedJob]);

  // Generate message
  const handleGenerateMessage = async () => {
    if (!selectedJobId || !selectedContactId) return;

    setIsGeneratingMessage(true);
    try {
      const response = await fetch("/webhook/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: selectedContactId,
          job_id: selectedJobId,
          tone: "professional"
        }),
      });

      if (!response.ok) throw new Error("Failed to generate message");

      const result = await response.json();
      
      toast({
        title: "Message generated",
        description: "AI outreach message has been generated successfully.",
      });

      // Refresh draft
      setInitialDraft({
        message_id: result.message_id,
        subject: "Generated Subject",
        body: "Generated message body",
        status: "draft"
      });

    } catch (err) {
      console.error("Error generating message:", err);
      toast({
        title: "Generation failed",
        description: "Failed to generate message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleFiltersChange = (newFilters: JobFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    fetchJobs(page);
  };

  // Loading state for run mode
  if (mode === "run" && runStatus === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Loader2 className="h-8 w-8 animate-spin" />
              <div>
                <p className="font-medium">Loading search results...</p>
                <p className="text-sm text-gray-500">Setting up your job search</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {role ? `"${role}" Jobs` : companyQuery ? `${companyQuery} Jobs` : "Job Search Results"}
              </h1>
              {locationParam && (
                <p className="text-sm text-gray-600">in {locationParam}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {mode === "run" && (
              <Badge variant={runStatus === "completed" ? "default" : runStatus === "failed" ? "destructive" : "secondary"}>
                <Target className="h-3 w-3 mr-1" />
                {runStatus === "running" ? "Running" : runStatus === "failed" ? "Failed" : "Complete"}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchJobs(currentPage)}
              disabled={isJobsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isJobsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filters */}
          <div className="lg:col-span-3">
            <JobFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              companySuggestions={companySuggestions}
              sourceSuggestions={sourceSuggestions}
              isLoading={isJobsLoading}
            />
          </div>

          {/* Jobs List */}
          <div className="lg:col-span-1">
            <JobsList
              jobs={jobs}
              selectedJobId={selectedJobId}
              onJobSelect={setSelectedJobId}
              isLoading={isJobsLoading}
              currentPage={currentPage}
              totalCount={totalCount}
              totalPages={Math.ceil(totalCount / JOBS_PER_PAGE)}
              onPageChange={handlePageChange}
            />
          </div>

          {/* Contacts List */}
          <div className="lg:col-span-1">
            <ContactsList
              contacts={contacts}
              selectedContactId={selectedContactId}
              onContactSelect={setSelectedContactId}
              isLoading={contactsLoading}
              companyName={selectedJob?.company}
            />
          </div>

          {/* Message Panel */}
          <div className="lg:col-span-1">
            <MessagePanel
              selectedJob={selectedJob}
              selectedContact={selectedContact}
              initialDraft={initialDraft}
              onGenerateMessage={handleGenerateMessage}
              isGenerating={isGeneratingMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;