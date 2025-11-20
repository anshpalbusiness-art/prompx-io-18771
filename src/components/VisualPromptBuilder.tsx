import { useState } from "react";
import { Plus, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProFeatureGate } from "@/components/ProFeatureGate";

interface PromptBlock {
  id: string;
  type: "context" | "instruction" | "constraint" | "output";
  content: string;
  label: string;
}

interface VisualPromptBuilderProps {
  onPromptGenerated: (prompt: string) => void;
}

const BLOCK_TYPES = [
  { type: "context" as const, label: "Context", color: "bg-blue-100 dark:bg-blue-900" },
  { type: "instruction" as const, label: "Instruction", color: "bg-green-100 dark:bg-green-900" },
  { type: "constraint" as const, label: "Constraint", color: "bg-yellow-100 dark:bg-yellow-900" },
  { type: "output" as const, label: "Output Format", color: "bg-purple-100 dark:bg-purple-900" },
];

export const VisualPromptBuilder = ({ onPromptGenerated }: VisualPromptBuilderProps) => {
  const [blocks, setBlocks] = useState<PromptBlock[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addBlock = (type: PromptBlock["type"], label: string) => {
    const newBlock: PromptBlock = {
      id: `${type}-${Date.now()}`,
      type,
      label,
      content: "",
    };
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newBlocks = [...blocks];
    const draggedBlock = newBlocks[draggedIndex];
    newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(index, 0, draggedBlock);
    setBlocks(newBlocks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const generatePrompt = () => {
    const sections = blocks
      .filter((b) => b.content.trim())
      .map((b) => `${b.label}:\n${b.content}`)
      .join("\n\n");
    onPromptGenerated(sections);
  };

  return (
    <ProFeatureGate 
      feature="Visual Prompt Builder"
      requiredPlan="pro"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Visual Prompt Builder
            <Button
              onClick={generatePrompt}
              disabled={blocks.length === 0}
              size="sm"
            >
              Generate Prompt
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Block Buttons */}
          <div className="flex flex-wrap gap-2">
            {BLOCK_TYPES.map((bt) => (
              <Button
                key={bt.type}
                variant="outline"
                size="sm"
                onClick={() => addBlock(bt.type, bt.label)}
              >
                <Plus className="h-4 w-4 mr-1" />
                {bt.label}
              </Button>
            ))}
          </div>

          {/* Blocks */}
          <div className="space-y-3">
            {blocks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Add blocks above to start building your prompt
              </p>
            )}
            {blocks.map((block, index) => {
              const blockType = BLOCK_TYPES.find((bt) => bt.type === block.type);
              return (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 border rounded-lg ${blockType?.color} cursor-move`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="secondary">{block.label}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBlock(block.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder={`Enter ${block.label.toLowerCase()}...`}
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, e.target.value)}
                    className="bg-background"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </ProFeatureGate>
  );
};
