import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, Building2, Users, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type SearchHistoryItem = {
  search_id: string;
  query: string;
  location: string;
  params: any;
  search_created_at: string;
  run_id: string;
  status: string;
  stats: any;
  current_workflow: string;
  workflow_status: any;
  run_created_at: string;
  run_updated_at: string;
  total_jobs: number;
  unique_companies: number;
  total_contacts: number;
};

const SearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSearchHistory();
  }, [user]);

  const fetchSearchHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("v_user_search_history")
        .select("*")
        .order("search_created_at", { ascending: false });

      if (error) throw error;
      setSearchHistory(data || []);
    } catch (error) {
      console.error("Error fetching search history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = (searchId: string, query: string, location: string) => {
    navigate(`/results?search_id=${searchId}&role=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      running: { variant: "default" as const, text: "Running" },
      completed: { variant: "default" as const, text: "Completed" },
      failed: { variant: "destructive" as const, text: "Failed" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.running;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (searchHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No search history found. Start your first search to see results here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search History
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {searchHistory.map((item) => (
          <Card key={item.search_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{item.query}</h3>
                    {getStatusBadge(item.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(item.search_created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Search className="h-4 w-4" />
                      {item.location}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      <span>{item.total_jobs} jobs</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      <span>{item.unique_companies} companies</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{item.total_contacts} contacts</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleViewResults(item.search_id, item.query, item.location)}
                  className="flex items-center gap-2"
                >
                  View Results
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SearchHistory;
