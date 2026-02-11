import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, FileIcon, ImageIcon, Trash2, X, HardDrive, Cloud } from 'lucide-react';
import { recentFilesStorage, RecentFile, dataUrlToFile } from '@/lib/recentFilesStorage';
import { toast } from 'sonner';

interface RecentFilesDialogProps {
    open: boolean;
    onClose: () => void;
    onFileSelect: (file: File) => void;
}

export const RecentFilesDialog: React.FC<RecentFilesDialogProps> = ({
    open,
    onClose,
    onFileSelect
}) => {
    const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

    useEffect(() => {
        if (open) {
            loadRecentFiles();
        }
    }, [open]);

    const loadRecentFiles = () => {
        const files = recentFilesStorage.getRecentFiles();
        setRecentFiles(files);
    };

    const handleFileClick = (recentFile: RecentFile) => {
        try {
            let file: File;

            // Cloud file
            if (recentFile.cloudUrl) {
                const displayName = `${recentFile.name} (${recentFile.cloudSource === 'google' ? 'Google Drive' : 'OneDrive'})`;
                file = new File([], displayName, { type: 'text/plain' });
                (file as any).cloudUrl = recentFile.cloudUrl;
                (file as any).cloudSource = recentFile.cloudSource;
            }
            // File with stored data
            else if (recentFile.dataUrl) {
                file = dataUrlToFile(recentFile.dataUrl, recentFile.name, recentFile.type);
            }
            // Regular file reference (no data stored)
            else {
                toast.error('This file is no longer available. Please upload it again.');
                return;
            }

            onFileSelect(file);
            toast.success(`Attached: ${recentFile.name}`);
            onClose();
        } catch (error) {
            console.error('Error selecting recent file:', error);
            toast.error('Failed to attach file');
        }
    };

    const handleRemoveFile = (id: string, event: React.MouseEvent) => {
        event.stopPropagation();
        recentFilesStorage.removeRecentFile(id);
        loadRecentFiles();
        toast.success('Removed from recent files');
    };

    const handleClearAll = () => {
        recentFilesStorage.clearRecentFiles();
        loadRecentFiles();
        toast.success('Cleared all recent files');
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    };

    const formatTimestamp = (timestamp: number): string => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const getFileIcon = (recentFile: RecentFile) => {
        if (recentFile.cloudUrl) {
            return recentFile.cloudSource === 'google' ? HardDrive : Cloud;
        }
        if (recentFile.type.startsWith('image/')) {
            return ImageIcon;
        }
        return FileIcon;
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[600px] bg-white dark:bg-[#0a0a0a] border-zinc-200 dark:border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Recent Files
                    </DialogTitle>
                    <DialogDescription className="text-zinc-600 dark:text-zinc-400">
                        Quickly reattach recently uploaded files and media
                    </DialogDescription>
                </DialogHeader>

                {recentFiles.length === 0 ? (
                    <div className="py-12 text-center">
                        <Clock className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                        <p className="text-zinc-500 dark:text-zinc-400">No recent files</p>
                        <p className="text-sm text-zinc-400 dark:text-zinc-600 mt-1">
                            Upload files to see them here
                        </p>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="max-h-[400px] pr-4">
                            <div className="space-y-2">
                                {recentFiles.map((file) => {
                                    const Icon = getFileIcon(file);
                                    return (
                                        <div
                                            key={file.id}
                                            onClick={() => handleFileClick(file)}
                                            className="group flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-white/10"
                                        >
                                            {/* Thumbnail or Icon */}
                                            {file.dataUrl && file.type.startsWith('image/') ? (
                                                <img
                                                    src={file.dataUrl}
                                                    alt={file.name}
                                                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                                    <Icon className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                                                </div>
                                            )}

                                            {/* File Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">
                                                    {file.name}
                                                </p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    {formatFileSize(file.size)} • {formatTimestamp(file.timestamp)}
                                                </p>
                                            </div>

                                            {/* Remove Button */}
                                            <button
                                                onClick={(e) => handleRemoveFile(file.id, e)}
                                                className="opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                                                title="Remove from recent"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>

                        {/* Footer Actions */}
                        <div className="flex justify-between items-center pt-4 border-t border-zinc-200 dark:border-white/10">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearAll}
                                className="text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear All
                            </Button>
                            <Button variant="ghost" onClick={onClose}>
                                Close
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};
