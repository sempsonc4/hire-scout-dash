import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Target, MapPin, Hash, Loader2, Building2, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    role: "",
    location: "Minneapolis, MN",
    maxResults: "100",
  });
  const [companySearch, setCompanySearch] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);

  const makeSearchRequest = async (retryCount = 0) => {
    const params = {
      location: searchParams.location,
      max_results: Number(searchParams.maxResults) || 100,
      max_pages: 10,
      absolute_max_results: 200,
      enable_safeguards: true,
    };

    const form = new URLSearchParams();
    form.append("query", searchParams.role.trim());
    form.append("params", JSON.stringify(params));

    const res = await fetch("/webhook/search/start", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const responseText = await res.text();
    
    if (!res.ok) {
      throw new Error(`Start failed (${res.status}): ${responseText || res.statusText}`);
    }

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // If we get HTML instead of JSON and haven't retried yet, try once more
      if (responseText.includes('<!DOCTYPE html>') && retryCount < 1) {
        console.warn(`Received HTML response, retrying... (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return makeSearchRequest(retryCount + 1);
      }
      console.error("Response was not JSON:", responseText.substring(0, 200));
      throw new Error(`Invalid response format. Expected JSON but received: ${responseText.substring(0, 100)}...`);
    }

    return data;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchParams.role.trim()) return;

    setIsLoading(true);

    try {
      const data = await makeSearchRequest();
      
      // Expect { run_id, search_id, supabase_jwt, exp }
      if (!data.run_id || !data.supabase_jwt) {
        throw new Error("Backend did not return run_id and supabase_jwt");
      }

      // Navigate to results with JWT
      navigate(
        `/results?run_id=${encodeURIComponent(data.run_id)}&role=${encodeURIComponent(
          searchParams.role
        )}&location=${encodeURIComponent(searchParams.location)}`,
        { 
          state: { 
            jwt: data.supabase_jwt, 
            exp: data.exp,
            searchId: data.search_id 
          } 
        }
      );
    } catch (err: any) {
      console.error("Search failed:", err);
      toast({
        title: "Search Failed",
        description: err?.message || "Unable to start job search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companySearch.trim()) return;

    setCompanyLoading(true);

    try {
      const res = await fetch("/webhook/company-search/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: companySearch.trim() }),
      });

      const responseText = await res.text();
      
      if (!res.ok) {
        throw new Error(`Company search failed (${res.status}): ${responseText || res.statusText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Response was not JSON:", responseText.substring(0, 200));
        throw new Error(`Invalid response format. Expected JSON but received: ${responseText.substring(0, 100)}...`);
      }
      
      if (!data.run_id || !data.supabase_jwt) {
        throw new Error("Backend did not return run_id and supabase_jwt");
      }

      navigate(
        `/results?run_id=${encodeURIComponent(data.run_id)}&company=${encodeURIComponent(companySearch)}`,
        { 
          state: { 
            jwt: data.supabase_jwt, 
            exp: data.exp,
            searchId: data.search_id 
          } 
        }
      );
    } catch (err: any) {
      console.error("Company search failed:", err);
      toast({
        title: "Company Search Failed",
        description: err?.message || "Unable to start company search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleBrowseAll = () => {
    navigate('/results?mode=browse');
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">RecruiterPro</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto mb-8">
          {/* Role-based Search */}
          <Card className="shadow-professional-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Search by Role
              </CardTitle>
              <CardDescription>Find jobs that match your target role and location.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">
                    Role or Keywords
                  </Label>
                  <Input
                    id="role"
                    type="text"
                    placeholder="e.g., Software Engineer, Product Manager"
                    value={searchParams.role}
                    onChange={(e) => setSearchParams((prev) => ({ ...prev, role: e.target.value }))}
                    className="text-base"
                    required
                  />
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
                      placeholder="City, State"
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

                <Button type="submit" size="lg" className="w-full" disabled={!searchParams.role.trim() || isLoading}>
                  {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
                  {isLoading ? "Searching..." : "Search Jobs"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Company-based Search */}
          <Card className="shadow-professional-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-accent" />
                Find Jobs at Company
              </CardTitle>
              <CardDescription>Discover all available positions at a specific company.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompanySearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium">
                    Company Name
                  </Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="e.g., Microsoft, Google, Apple"
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    className="text-base"
                    required
                  />
                </div>

                <div className="h-[120px] flex items-end">
                  <Button type="submit" size="lg" className="w-full" disabled={!companySearch.trim() || companyLoading}>
                    {companyLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Building2 className="w-5 h-5 mr-2" />}
                    {companyLoading ? "Searching..." : "Find Company Jobs"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Browse All Jobs */}
        <div className="max-w-4xl mx-auto">
          <Card className="text-center shadow-professional-lg border-2 border-dashed">
            <CardContent className="py-8">
              <div className="w-16 h-16 bg-gradient-secondary rounded-xl flex items-center justify-center mx-auto mb-6">
                <List className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Browse All Jobs</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Explore all available positions in our database with advanced filtering options and real-time updates.
              </p>
              <Button onClick={handleBrowseAll} size="lg" className="px-8">
                <List className="w-5 h-5 mr-2" />
                View All Jobs
              </Button>
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
};

export default Home;