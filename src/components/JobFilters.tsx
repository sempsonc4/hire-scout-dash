import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface JobFiltersState {
  search: string;
  company: string;
  dateFrom: string;
  dateTo: string;
  location: string;
  source: string;
  hasContacts: boolean;
}

interface JobFiltersProps {
  filters: JobFiltersState;
  onFiltersChange: (filters: JobFiltersState) => void;
  companySuggestions: string[];
  sourceSuggestions: string[];
  isLoading?: boolean;
}

const JobFilters = ({ 
  filters, 
  onFiltersChange, 
  companySuggestions, 
  sourceSuggestions,
  isLoading = false 
}: JobFiltersProps) => {
  const { toast } = useToast();
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof JobFiltersState, value: string | boolean) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      company: "",
      dateFrom: "",
      dateTo: "",
      location: "",
      source: "",
      hasContacts: false,
    });
    toast({
      title: "Filters cleared",
      description: "All filters have been reset.",
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    key !== 'hasContacts' ? Boolean(value) : value === true
  );

  return (
    <div className="space-y-4">
      {/* Search and Toggle */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title or company..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
            disabled={isLoading}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex-shrink-0"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              Active
            </Badge>
          )}
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Company Filter */}
              <div className="space-y-2">
                <Label>Company</Label>
                <Select
                  value={filters.company}
                  onValueChange={(value) => updateFilter('company', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All companies</SelectItem>
                    {companySuggestions.map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Posted From
                </Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Posted To
                </Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="City, State or Remote"
                  value={filters.location}
                  onChange={(e) => updateFilter('location', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Source */}
              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={filters.source}
                  onValueChange={(value) => updateFilter('source', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All sources</SelectItem>
                    {sourceSuggestions.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Has Contacts Toggle */}
              <div className="space-y-2">
                <Label>Contact Availability</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={filters.hasContacts}
                    onCheckedChange={(checked) => updateFilter('hasContacts', checked)}
                    disabled={isLoading}
                  />
                  <Label className="text-sm">Has contacts</Label>
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear all filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobFilters;