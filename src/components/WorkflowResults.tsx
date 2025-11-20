import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface WorkflowResult {
  stepName: string;
  stepIndex: number;
  output: string;
  executionTime?: number;
}

interface WorkflowResultsProps {
  results: WorkflowResult[];
  onCopy?: (text: string) => void;
}

export const WorkflowResults = ({ results, onCopy }: WorkflowResultsProps) => {
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Result copied successfully"
    });
    onCopy?.(text);
  };

  const handleDownload = () => {
    const content = results.map(r => 
      `=== ${r.stepName} ===\n\n${r.output}\n\n`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-results-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Workflow results saved to file"
    });
  };

  if (results.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold">Workflow Results</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download All
        </Button>
      </div>

      {results.map((result, index) => (
        <Card key={index} className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge>{result.stepIndex + 1}</Badge>
                <h4 className="font-medium">{result.stepName}</h4>
              </div>
              <div className="flex items-center gap-2">
                {result.executionTime && (
                  <span className="text-xs text-muted-foreground">
                    {result.executionTime}ms
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(result.output)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-muted/50 rounded-md p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {result.output}
              </pre>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
