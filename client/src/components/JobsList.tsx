import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Job {
  id: string;
  title: string;
  company: string;
  company_id?: string;
  location?: string;
  salary?: string;
  posted_at?: string;
  source?: string;
  source_type?: string;
  link?: string;
  hasContacts?: boolean;
}

interface JobsListProps {
  jobs: Job[];
  selectedJobId: string | null;
  onJobSelect: (jobId: string) => void;
  isLoading?: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount: number;
}

const JobsList = ({
  jobs,
  selectedJobId,
  onJobSelect,
  isLoading = false,
  currentPage,
  totalPages,
  onPageChange,
  totalCount
}: JobsListProps) => {
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Date not available";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  };

  const getSourceBadge = (source?: string, sourceType?: string) => {
    const displaySource = sourceType || source || "Unknown";
    return (
      <Badge variant="outline" className="text-xs">
        {displaySource}
      </Badge>
    );
  };

  if (isLoading && jobs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Loading jobs...</div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No jobs found</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with count */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <div className="text-sm text-muted-foreground">
          {totalCount.toLocaleString()} job{totalCount !== 1 ? 's' : ''} found
        </div>
        {totalPages > 1 && (
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
        )}
      </div>

      {/* Jobs List - Scrollable */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 pr-4">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md mx-1",
                selectedJobId === job.id && "ring-2 ring-primary shadow-md"
              )}
              onClick={() => onJobSelect(job.id)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Title and Company */}
                  <div>
                    <h3 className="font-medium line-clamp-2 mb-1">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      <span>{job.company}</span>
                      {job.hasContacts && (
                        <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center">
                          <User className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {job.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{job.location}</span>
                      </div>
                    )}
                    {job.posted_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(job.posted_at)}</span>
                      </div>
                    )}
                  </div>
              
                  {/* Salary if available */}
                  {job.salary && (
                    <div className="text-sm font-medium text-green-600">
                      {job.salary}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      {getSourceBadge(job.source, job.source_type)}
                    </div>
                    {job.link && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        asChild
                      >
                        <a 
                          href={job.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Job
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              );
            })}
            {totalPages > 3 && (
              <>
                <span className="flex items-center px-2">...</span>
                <Button
                  variant={currentPage === totalPages ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(totalPages)}
                  className="w-8 h-8 p-0"
                >
                  {totalPages}
                </Button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default JobsList;
