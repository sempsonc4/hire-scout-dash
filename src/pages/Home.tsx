import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Hash, Plus, X, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Search parameters
  const [searchParams, setSearchParams] = useState({
    title: "",
    exactTitle: false,
    location: "Minneapolis",
    maxResults: "10",
  });

  // Advanced filters
  const [filters, setFilters] = useState({
    keywords: { mode: "all" as "all" | "any", terms: [] as string[] },
    companies: [] as string[],
    locationType: "",
    jobType: [] as string[],
    datePosted: "",
    excludeTerms: [] as string[],
  });

  // Input states for tag inputs
  const [keywordInput, setKeywordInput] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  
  // Filter visibility state
  const [showFilters, setShowFilters] = useState(false);

  // Helper functions for managing filter arrays
  const addKeyword = useCallback(() => {
    const term = keywordInput.trim();
    if (term && !filters.keywords.terms.includes(term)) {
      setFilters(prev => ({
        ...prev,
        keywords: { ...prev.keywords, terms: [...prev.keywords.terms, term] }
      }));
      setKeywordInput("");
    }
  }, [keywordInput, filters.keywords.terms]);

  const removeKeyword = useCallback((index: number) => {
    setFilters(prev => ({
      ...prev,
      keywords: { ...prev.keywords, terms: prev.keywords.terms.filter((_, i) => i !== index) }
    }));
  }, []);

  const addCompany = useCallback(() => {
    const company = companyInput.trim();
    if (company && !filters.companies.includes(company)) {
      setFilters(prev => ({ ...prev, companies: [...prev.companies, company] }));
      setCompanyInput("");
    }
  }, [companyInput, filters.companies]);

  const removeCompany = useCallback((index: number) => {
    setFilters(prev => ({ ...prev, companies: prev.companies.filter((_, i) => i !== index) }));
  }, []);

  const addExcludeTerm = useCallback(() => {
    const term = excludeInput.trim();
    if (term && !filters.excludeTerms.includes(term)) {
      setFilters(prev => ({ ...prev, excludeTerms: [...prev.excludeTerms, term] }));
      setExcludeInput("");
    }
  }, [excludeInput, filters.excludeTerms]);

  const removeExcludeTerm = useCallback((index: number) => {
    setFilters(prev => ({ ...prev, excludeTerms: prev.excludeTerms.filter((_, i) => i !== index) }));
  }, []);

  const toggleJobType = useCallback((type: string) => {
    setFilters(prev => ({
      ...prev,
      jobType: prev.jobType.includes(type)
        ? prev.jobType.filter(t => t !== type)
        : [...prev.jobType, type]
    }));
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const makeSearchRequest = async () => {
    const payload = {
      title: searchParams.title.trim(),
      exact_title: searchParams.exactTitle,
      location: searchParams.location,
      max_results: Number(searchParams.maxResults) || 10,
      keywords: filters.keywords.terms.length > 0 ? { mode: filters.keywords.mode, terms: filters.keywords.terms } : undefined,
      companies: filters.companies.length > 0 ? filters.companies : undefined,
      location_type: filters.locationType || undefined,
      job_type: filters.jobType.length > 0 ? filters.jobType : undefined,
      date_window: filters.datePosted || undefined,
      exclude_terms: filters.excludeTerms.length > 0 ? filters.excludeTerms : undefined,
    };

    try {
      const response = await fetch("https://n8n.srv930021.hstgr.cloud/webhook/search/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...payload, user_id: user?.id }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Search request failed:", error);
      throw error;
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchParams.title.trim()) return;

    setIsLoading(true);
    try {
      const data = await makeSearchRequest();
      navigate(
        `/results?run_id=${encodeURIComponent(data.run_id)}&title=${encodeURIComponent(
          searchParams.title
        )}&location=${encodeURIComponent(searchParams.location)}`,
        {
          state: {
            searchParams,
            filters,
            runId: data.run_id,
            searchId: data.search_id,
          },
        }
      );
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewHistory = () => {
    navigate("/history");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-accent rounded-xl flex items-center justify-center">
                <Search className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Hire Scout</h1>
                <p className="text-sm text-slate-600">Automated Job Discovery & Outreach</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Search Jobs */}
          <Card className="shadow-professional-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Search Jobs
              </CardTitle>
              <CardDescription>Find jobs that match your criteria with advanced filtering options.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-6">
                {/* Main Search Bar */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Role/Title
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="title"
                        type="text"
                        placeholder="e.g., Software Engineer, Product Manager"
                        value={searchParams.title}
                        onChange={(e) => setSearchParams((prev) => ({ ...prev, title: e.target.value }))}
                        className="text-base flex-1"
                        required
                      />
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="exactTitle"
                          checked={searchParams.exactTitle}
                          onCheckedChange={(checked) => setSearchParams((prev) => ({ ...prev, exactTitle: !!checked }))}
                        />
                        <Label htmlFor="exactTitle" className="text-sm">Exact</Label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-sm font-medium flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Location
                      </Label>
                      <Input
                        id="location"
                        type="text"
                        placeholder="Minneapolis"
                        value={searchParams.location}
                        onChange={(e) => setSearchParams((prev) => ({ ...prev, location: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxResults" className="text-sm font-medium flex items-center gap-1">
                        <Hash className="w-4 h-4" />
                        Max Results
                      </Label>
                      <Input
                        id="maxResults"
                        type="number"
                        min="10"
                        max="500"
                        value={searchParams.maxResults}
                        onChange={(e) => setSearchParams((prev) => ({ ...prev, maxResults: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Show Filters Button */}
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2"
                  >
                    {showFilters ? (
                      <>
                        <X className="w-4 h-4" />
                        Hide Notice
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Show Filters
                      </>
                    )}
                  </Button>
                </div>

                {/* Advanced Filters Notice */}
                {showFilters && (
                  <div className="border-t pt-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-yellow-800">
                        <div className="w-5 h-5 bg-yellow-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold">!</span>
                        </div>
                        <span className="font-medium">Advanced Filters Not Implemented Yet</span>
                      </div>
                      <p className="text-yellow-700 text-sm mt-2">
                        The backend needs to be updated to support advanced filtering options. 
                        For now, you can search by role/title, location, and max results.
                      </p>
                    </div>
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={!searchParams.title.trim() || isLoading}>
                  {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
                  {isLoading ? "Searching..." : "Search Jobs"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Browse All Jobs */}
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Browse All Jobs */}
              <Card className="text-center shadow-professional-lg border-2 border-dashed">
                <CardContent className="py-8">
                  <div className="w-16 h-16 bg-gradient-accent rounded-xl flex items-center justify-center mx-auto mb-6">
                    <Search className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Browse All Jobs</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Explore all available job postings from previous searches across the platform.
                  </p>
                  <Button onClick={() => navigate("/results")} size="lg" className="px-8">
                    <Search className="w-5 h-5 mr-2" />
                    Browse Jobs
                  </Button>
                </CardContent>
              </Card>

              {/* Search History */}
              <Card className="text-center shadow-professional-lg border-2 border-dashed">
                <CardContent className="py-8">
                  <div className="w-16 h-16 bg-gradient-accent rounded-xl flex items-center justify-center mx-auto mb-6">
                    <Search className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Search History</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    View your previous searches and access their results, including job counts and contact discoveries.
                  </p>
                  <Button onClick={handleViewHistory} size="lg" className="px-8">
                    <Search className="w-5 h-5 mr-2" />
                    View History
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;