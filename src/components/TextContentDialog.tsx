import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { FileText, Plus } from 'lucide-react';

interface TextContentDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (text: string) => void;
}

export const TextContentDialog: React.FC<TextContentDialogProps> = ({ open, onClose, onSave }) => {
    const [text, setText] = useState('');

    const handleSave = () => {
        if (text.trim()) {
            onSave(text);
            setText('');
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-[600px] border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                Add Text Content
                            </DialogTitle>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            Content <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                            placeholder="Paste your text content here..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="min-h-[200px] resize-y bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                        />
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-end gap-3 rounded-b-lg">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!text.trim()}
                        className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Content
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
