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
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types for API responses
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  datePosted?: string;
  source?: string;
  description?: string;
  url?: string;
}

interface RunResult {
  run_id: string;
  status: "running" | "completed" | "failed";
  jobs: Job[];
  total_jobs?: number;
  message?: string;
}

// Mock contacts and messages data (keeping these as placeholders for now)
const mockContacts = {
  "1": [
    {
      id: "c1",
      name: "Sarah Johnson",
      title: "VP of Engineering", 
      email: "sarah.johnson@techcorp.com",
      linkedin: "https://linkedin.com/in/sarahjohnson",
      phone: "+1 (555) 123-4567",
      verified: "verified"
    },
    {
      id: "c2", 
      name: "Mike Chen",
      title: "Senior Hiring Manager",
      email: "mike.chen@techcorp.com",
      linkedin: "https://linkedin.com/in/mikechen",
      verified: "unverified"
    }
  ],
  "2": [
    {
      id: "c3",
      name: "Jessica Brown", 
      title: "CTO",
      email: "jessica@startupxyz.com",
      linkedin: "https://linkedin.com/in/jessicabrown",
      verified: "verified"
    }
  ],
  "3": [
    {
      id: "c4",
      name: "David Wilson",
      title: "Director of Engineering",
      email: "david.wilson@bigtech.com", 
      linkedin: "https://linkedin.com/in/davidwilson",
      phone: "+1 (555) 987-6543",
      verified: "pending"
    }
  ]
};

const mockMessages = {
  "c1": {
    subject: "Exploring Senior Software Engineer Opportunity at TechCorp",
    body: "Hi Sarah,\n\nI hope this message finds you well. I came across the Senior Software Engineer position at TechCorp and was immediately drawn to your innovative approach to software development.\n\nWith my 5+ years of experience in full-stack development and passion for scalable solutions, I believe I could contribute significantly to your team's continued success.\n\nWould you be available for a brief conversation about this opportunity?\n\nBest regards"
  },
  "c2": {
    subject: "Senior Software Engineer Role - Let's Connect",
    body: "Hello Mike,\n\nI'm reaching out regarding the Senior Software Engineer position at TechCorp. Your team's reputation for technical excellence aligns perfectly with my career aspirations.\n\nI'd love to discuss how my background in modern web technologies could benefit your engineering initiatives.\n\nLooking forward to connecting!\n\nBest"
  }
};

const Results = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [messageData, setMessageData] = useState({ subject: "", body: "" });
  const [runStatus, setRunStatus] = useState<"loading" | "running" | "completed" | "failed">("loading");
  const [isPolling, setIsPolling] = useState(false);

  const runId = searchParams.get("run_id") || "";
  const role = searchParams.get("role") || "";
  const location = searchParams.get("location") || "";
  const isDemo = searchParams.get("demo") === "true";

  // Poll for results with simple GET request (no custom headers)
  const pollResults = async () => {
    if (!runId || isPolling) return;
    
    // Demo mode with mock data
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
            datePosted: "2 days ago",
            source: "Company Site",
            description: "Join our data analytics team..."
          },
          {
            id: "2", 
            title: "Business Intelligence Analyst",
            company: "DataFlow Solutions",
            location: "Remote",
            salary: "$80,000 - $100,000", 
            datePosted: "1 week ago",
            source: "Job Board",
            description: "Build interactive dashboards..."
          }
        ];
        setJobs(mockJobs);
        setRunStatus("completed");
      }, 2000);
      return;
    }
    
    setIsPolling(true);
    try {
      // Use simple GET request without custom headers
      const response = await fetch(`https://n8n.srv930021.hstgr.cloud/webhook-test/runs/${runId}/results`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: RunResult = await response.json();
      
      setRunStatus(data.status);
      
      if (data.status === "completed" && data.jobs) {
        setJobs(data.jobs);
        setIsPolling(false);
      } else if (data.status === "failed") {
        setIsPolling(false);
        toast({
          title: "Search Failed",
          description: data.message || "The job search failed. Please try again.",
          variant: "destructive"
        });
      }
      // If status is "running", continue polling
      
    } catch (error) {
      console.error("Failed to poll results:", error);
      setIsPolling(false);
      setRunStatus("failed");
      toast({
        title: "Error fetching results",
        description: "Unable to fetch search results. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Start polling when component mounts
  useEffect(() => {
    if (runId) {
      pollResults();
    }
  }, [runId]);

  // Continue polling every 3 seconds if status is running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (runStatus === "running" || runStatus === "loading") {
      interval = setInterval(() => {
        pollResults();
      }, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [runStatus, runId]);

  useEffect(() => {
    if (jobs.length > 0 && !selectedJob) {
      setSelectedJob(jobs[0].id);
    }
  }, [jobs, selectedJob]);

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
      description: "You can now paste it into your email client."
    });
  };

  const handleRegenerateMessage = () => {
    toast({
      title: "Message regenerated",
      description: "AI has generated a new personalized message."
    });
    // In real implementation, this would call the backend API
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="verified" className="ml-2"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case "unverified": 
        return <Badge variant="unverified" className="ml-2"><XCircle className="w-3 h-3 mr-1" />Unverified</Badge>;
      case "pending":
        return <Badge variant="warning" className="ml-2"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return null;
    }
  };

  const getSourceBadge = (source: string) => {
    return <Badge variant="source">{source}</Badge>;
  };

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
                  {role} • {location} • {runStatus === "completed" ? `${jobs.length} results` : runStatus === "running" || runStatus === "loading" ? "Searching..." : "Failed"}
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
                          {job.source && getSourceBadge(job.source)}
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
