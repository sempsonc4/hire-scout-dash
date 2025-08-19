import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Copy, Wand2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Contact } from "./ContactsList";
import type { Job } from "./JobsList";

interface MessagePanelProps {
  selectedContact: Contact | null;
  selectedJob: Job | null;
  onGenerateMessage?: (contactId: string, jobId: string) => Promise<any>;
  isGenerating?: boolean;
}

const MessagePanel = ({
  selectedContact,
  selectedJob,
  onGenerateMessage,
  isGenerating = false
}: MessagePanelProps) => {
  const { toast } = useToast();

  // Start empty; we'll only populate after AI returns content
  const [messageData, setMessageData] = useState({
    subject: "",
    body: "",
    channel: "email" as "email" | "linkedin",
  });

  const [generatedMessage, setGeneratedMessage] = useState<any>(null);

  // When contact/job changes, clear message fields so the user knows
  // they must click "Generate Message"
  useEffect(() => {
    if (selectedContact && selectedJob) {
      setMessageData({ subject: "", body: "", channel: "email" });
      setGeneratedMessage(null);
    } else {
      setMessageData({ subject: "", body: "", channel: "email" });
      setGeneratedMessage(null);
    }
  }, [selectedContact, selectedJob]);

  const handleCopyMessage = () => {
    const fullMessage =
      messageData.channel === "email"
        ? `Subject: ${messageData.subject}\n\n${messageData.body}`
        : messageData.body;
    navigator.clipboard.writeText(fullMessage);
    toast({
      title: "Message copied",
      description: "The message has been copied to your clipboard.",
    });
  };

  const handleGenerateMessage = async () => {
    if (!selectedContact || !selectedJob || !onGenerateMessage) return;

    try {
      const result = await onGenerateMessage(selectedContact.id, selectedJob.id);
      if (result) {
        setGeneratedMessage(result);
        setMessageData({
          subject:
            result.subject ||
            `Re: ${selectedJob.title} opportunity`,
          body: result.body || "",
          // We’re ignoring channel logic overall; default to email if not present
          channel: result.channel || "email",
        });

        toast({
          title: "Message generated",
          description: "AI message generated successfully.",
        });
      }
    } catch {
      // Parent likely handles error toasts/logging
    }
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
          To: {selectedContact.name} • {selectedJob.title} at{" "}
          {"company" in selectedJob ? (selectedJob as any).company : selectedJob.company_name}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generate Button */}
        <Button
          onClick={handleGenerateMessage}
          disabled={isGenerating || !selectedContact || !selectedJob}
          className="w-full"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4 mr-2" />
          )}
          {isGenerating ? "Generating..." : "Generate Message"}
        </Button>

        <Separator />

        {/* Subject (Email only) */}
        {messageData.channel === "email" && (
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={messageData.subject}
              onChange={(e) =>
                setMessageData((prev) => ({ ...prev, subject: e.target.value }))
              }
              placeholder="Email subject line"
            />
          </div>
        )}

        {/* Message Body */}
        <div className="space-y-2">
          <Label htmlFor="message">
            {messageData.channel === "email" ? "Message" : "LinkedIn Message"}
          </Label>
          <Textarea
            id="message"
            value={messageData.body}
            onChange={(e) =>
              setMessageData((prev) => ({ ...prev, body: e.target.value }))
            }
            placeholder={`Your personalized ${messageData.channel} message will appear here...`}
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
        </div>

        {/* Generated Message Metadata */}
        {generatedMessage && (
          <div className="pt-4 border-t">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="font-medium">Message Details:</div>
              {generatedMessage.tone && <div>Tone: {generatedMessage.tone}</div>}
              {generatedMessage.status && (
                <div>Status: {generatedMessage.status}</div>
              )}
              {generatedMessage.template_version && (
                <div>Template: {generatedMessage.template_version}</div>
              )}
            </div>
          </div>
        )}

        {/* Contact Info Summary */}
        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="font-medium">Contact Information:</div>
            {selectedContact.email && <div>Email: {selectedContact.email}</div>}
            {selectedContact.linkedin && <div>LinkedIn: Available</div>}
            {selectedContact.title && <div>Title: {selectedContact.title}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MessagePanel;
