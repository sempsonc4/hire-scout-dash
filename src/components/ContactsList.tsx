import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, 
  Mail, 
  Linkedin, 
  Phone, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink 
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Contact {
  id: string;
  name: string;
  title?: string;
  email?: string;
  linkedin?: string;
  phone?: string;
  email_status?: string;
  company_id?: string;
}

interface ContactsListProps {
  contacts: Contact[];
  selectedContactId: string | null;
  onContactSelect: (contactId: string) => void;
  isLoading?: boolean;
  companyName?: string;
}

const ContactsList = ({
  contacts,
  selectedContactId,
  onContactSelect,
  isLoading = false,
  companyName
}: ContactsListProps) => {
  
  const getVerificationBadge = (status?: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "unverified":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending":
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Contacts
          {companyName && (
            <span className="text-sm font-normal text-muted-foreground">
              at {companyName}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No contacts found</h3>
            <p className="text-muted-foreground text-sm">
              No contact information available for this company.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <Card
                key={contact.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-sm",
                  selectedContactId === contact.id && "ring-2 ring-primary"
                )}
                onClick={() => onContactSelect(contact.id)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Name and Title */}
                    <div>
                      <h4 className="font-medium">{contact.name}</h4>
                      {contact.title && (
                        <p className="text-sm text-muted-foreground">{contact.title}</p>
                      )}
                    </div>

                    {/* Contact Methods */}
                    <div className="space-y-2">
                      {contact.email && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                          {getVerificationBadge(contact.email_status)}
                        </div>
                      )}

                      {contact.linkedin && (
                        <div className="flex items-center gap-2 text-sm">
                          <Linkedin className="w-4 h-4 text-muted-foreground" />
                          <Button
                            variant="link"
                            className="h-auto p-0 text-sm text-blue-600 hover:text-blue-700 font-normal"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(contact.linkedin, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            LinkedIn Profile
                          </Button>
                        </div>
                      )}

                      {contact.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContactsList;