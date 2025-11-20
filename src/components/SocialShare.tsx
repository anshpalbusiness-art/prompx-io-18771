import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Share2, Twitter, Linkedin, Send, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface SocialShareProps {
  title: string;
  description: string;
  url?: string;
}

const SocialShare = ({ title, description, url }: SocialShareProps) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || window.location.href;
  const shareText = `${title}\n\n${description}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank", "width=600,height=400");
  };

  const shareToLinkedIn = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, "_blank", "width=600,height=400");
  };

  const shareToTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, "_blank", "width=600,height=400");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share This Prompt</DialogTitle>
          <DialogDescription>
            Share your amazing prompt with the community
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] hover:border-[#1DA1F2]"
              onClick={shareToTwitter}
            >
              <Twitter className="w-5 h-5" />
              Share on X (Twitter)
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] hover:border-[#0A66C2]"
              onClick={shareToLinkedIn}
            >
              <Linkedin className="w-5 h-5" />
              Share on LinkedIn
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 hover:bg-[#0088cc]/10 hover:text-[#0088cc] hover:border-[#0088cc]"
              onClick={shareToTelegram}
            >
              <Send className="w-5 h-5" />
              Share on Telegram
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
          
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SocialShare;
