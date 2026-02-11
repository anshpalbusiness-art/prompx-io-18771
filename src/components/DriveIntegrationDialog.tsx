import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HardDrive, Cloud, ExternalLink, Plus, Key } from 'lucide-react';
import { toast } from 'sonner';

interface DriveIntegrationDialogProps {
    open: boolean;
    onClose: () => void;
    onFileSelect: (fileName: string, fileUrl: string, source: 'google' | 'onedrive') => void;
}

export const DriveIntegrationDialog: React.FC<DriveIntegrationDialogProps> = ({
    open,
    onClose,
    onFileSelect
}) => {
    const [googleFileUrl, setGoogleFileUrl] = useState('');
    const [googleFileName, setGoogleFileName] = useState('');
    const [onedriveFileUrl, setOnedriveFileUrl] = useState('');
    const [onedriveFileName, setOnedriveFileName] = useState('');

    const handleGoogleDriveSubmit = () => {
        if (!googleFileName.trim() || !googleFileUrl.trim()) {
            toast.error('Please enter both file name and URL');
            return;
        }

        onFileSelect(googleFileName, googleFileUrl, 'google');
        setGoogleFileName('');
        setGoogleFileUrl('');
        onClose();
    };

    const handleOneDriveSubmit = () => {
        if (!onedriveFileName.trim() || !onedriveFileUrl.trim()) {
            toast.error('Please enter both file name and URL');
            return;
        }

        onFileSelect(onedriveFileName, onedriveFileUrl, 'onedrive');
        setOnedriveFileName('');
        setOnedriveFileUrl('');
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[560px] bg-white dark:bg-[#0a0a0a] border-zinc-200 dark:border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <HardDrive className="w-5 h-5" />
                        Connect Cloud Storage
                    </DialogTitle>
                    <DialogDescription className="text-zinc-600 dark:text-zinc-400">
                        Link files from Google Drive or OneDrive to your message
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="google" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="google" className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4" />
                            Google Drive
                        </TabsTrigger>
                        <TabsTrigger value="onedrive" className="flex items-center gap-2">
                            <Cloud className="w-4 h-4" />
                            OneDrive
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="google" className="space-y-4 mt-4">

                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="google-file-name" className="text-sm font-medium mb-1.5 block">
                                    File Name
                                </Label>
                                <Input
                                    id="google-file-name"
                                    placeholder="e.g., Project Spec.pdf"
                                    value={googleFileName}
                                    onChange={(e) => setGoogleFileName(e.target.value)}
                                    className="bg-zinc-50 dark:bg-white/5"
                                />
                            </div>

                            <div>
                                <Label htmlFor="google-file-url" className="text-sm font-medium mb-1.5 block">
                                    Shareable Link
                                </Label>
                                <Input
                                    id="google-file-url"
                                    placeholder="https://drive.google.com/file/d/..."
                                    value={googleFileUrl}
                                    onChange={(e) => setGoogleFileUrl(e.target.value)}
                                    className="bg-zinc-50 dark:bg-white/5"
                                />
                            </div>

                            <p className="text-xs text-zinc-500 dark:text-zinc-500">
                                Copy the shareable link from Google Drive and paste it here
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleGoogleDriveSubmit}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add File
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="onedrive" className="space-y-4 mt-4">

                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="onedrive-file-name" className="text-sm font-medium mb-1.5 block">
                                    File Name
                                </Label>
                                <Input
                                    id="onedrive-file-name"
                                    placeholder="e.g., Meeting Notes.docx"
                                    value={onedriveFileName}
                                    onChange={(e) => setOnedriveFileName(e.target.value)}
                                    className="bg-zinc-50 dark:bg-white/5"
                                />
                            </div>

                            <div>
                                <Label htmlFor="onedrive-file-url" className="text-sm font-medium mb-1.5 block">
                                    Shareable Link
                                </Label>
                                <Input
                                    id="onedrive-file-url"
                                    placeholder="https://1drv.ms/..."
                                    value={onedriveFileUrl}
                                    onChange={(e) => setOnedriveFileUrl(e.target.value)}
                                    className="bg-zinc-50 dark:bg-white/5"
                                />
                            </div>

                            <p className="text-xs text-zinc-500 dark:text-zinc-500">
                                Copy the shareable link from OneDrive and paste it here
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleOneDriveSubmit}
                                className="bg-violet-600 hover:bg-violet-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add File
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
