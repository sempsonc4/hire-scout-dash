import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Copy, 
  RefreshCw, 
  Wand2, 
  Loader2,
  CheckCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Contact } from "./ContactsList";
import type { Job } from "./JobsList";

interface MessagePanelProps {
  selectedContact: Contact | null;
  selectedJob: Job | null;
  onGenerateMessage?: (contactId: string, jobId: string) => Promise<void>;
  isGenerating?: boolean;
}

const MessagePanel = ({
  selectedContact,
  selectedJob,
  onGenerateMessage,
  isGenerating = false
}: MessagePanelProps) => {
  const { toast } = useToast();
  const [messageData, setMessageData] = useState({
    subject: "",
    body: ""
  });

  // Generate placeholder message when contact/job changes
  React.useEffect(() => {
    if (selectedContact && selectedJob) {
      const firstName = selectedContact.name.split(' ')[0];
      setMessageData({
        subject: `Exploring opportunities at ${selectedJob.company}`,
        body: `Hi ${firstName},

I hope this message finds you well. I came across the ${selectedJob.title} role at ${selectedJob.company} and was immediately drawn to your team's work.

With my background and passion for the field, I believe I could contribute significantly to your continued success.

Would you be available for a brief conversation about this opportunity?

Best regards`
      });
    } else {
      setMessageData({ subject: "", body: "" });
    }
  }, [selectedContact, selectedJob]);

  const handleCopyMessage = () => {
    const fullMessage = `Subject: ${messageData.subject}\n\n${messageData.body}`;
    navigator.clipboard.writeText(fullMessage);
    toast({
      title: "Message copied",
      description: "The message has been copied to your clipboard.",
    });
  };

  const handleGenerateMessage = async () => {
    if (!selectedContact || !selectedJob || !onGenerateMessage) {
      // Placeholder behavior for now
      setMessageData({
        subject: `Re: ${selectedJob?.title} opportunity at ${selectedJob?.company}`,
        body: `(Placeholder) Personalized outreach will appear here.

This AI-generated message would be tailored based on:
- Contact: ${selectedContact?.name} (${selectedContact?.title})
- Job: ${selectedJob?.title} at ${selectedJob?.company}
- Company insights and personalization

Coming soon: Real AI message generation!`
      });
      
      toast({
        title: "AI Message Generated",
        description: "A placeholder message has been generated. Real AI integration coming soon!",
      });
      return;
    }

    try {
      await onGenerateMessage(selectedContact.id, selectedJob.id);
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate AI message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateMessage = () => {
    handleGenerateMessage();
  };

  if (!selectedContact || !selectedJob) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            AI Message
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a contact</h3>
            <p className="text-muted-foreground text-sm">
              Choose a job and contact to generate a personalized outreach message.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          AI Message
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          To: {selectedContact.name} • {selectedJob.title} at {selectedJob.company}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generate Button */}
        <Button
          onClick={handleGenerateMessage}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4 mr-2" />
          )}
          {isGenerating ? "Generating..." : "Generate AI Message"}
        </Button>

        <Separator />

        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={messageData.subject}
            onChange={(e) => setMessageData(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="Email subject line"
          />
        </div>

        {/* Message Body */}
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={messageData.body}
            onChange={(e) => setMessageData(prev => ({ ...prev, body: e.target.value }))}
            placeholder="Your personalized message will appear here..."
            className="min-h-[300px] resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCopyMessage}
            disabled={!messageData.subject && !messageData.body}
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          
          <Button
            variant="outline"
            onClick={handleRegenerateMessage}
            disabled={isGenerating}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
        </div>

        {/* Contact Info Summary */}
        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="font-medium">Contact Information:</div>
            {selectedContact.email && (
              <div>Email: {selectedContact.email}</div>
            )}
            {selectedContact.linkedin && (
              <div>LinkedIn: Available</div>
            )}
            {selectedContact.title && (
              <div>Title: {selectedContact.title}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MessagePanel;