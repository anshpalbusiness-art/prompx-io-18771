// Recent files storage utility
export interface RecentFile {
    id: string;
    name: string;
    size: number;
    type: string;
    timestamp: number;
    // Store base64 for small files (images, sketches)
    dataUrl?: string;
    // For cloud files
    cloudUrl?: string;
    cloudSource?: 'google' | 'onedrive';
}

const RECENT_FILES_KEY = 'promptx_recent_files';
const MAX_RECENT_FILES = 20;
const MAX_FILE_SIZE_FOR_STORAGE = 5 * 1024 * 1024; // 5MB

export const recentFilesStorage = {
    // Get all recent files
    getRecentFiles: (): RecentFile[] => {
        try {
            const stored = localStorage.getItem(RECENT_FILES_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading recent files:', error);
            return [];
        }
    },

    // Add a file to recent files
    addRecentFile: async (file: File): Promise<void> => {
        try {
            const recentFiles = recentFilesStorage.getRecentFiles();

            const recentFile: RecentFile = {
                id: `${Date.now()}_${file.name}`,
                name: file.name,
                size: file.size,
                type: file.type,
                timestamp: Date.now(),
            };

            // For cloud files, store the URL
            if ((file as any).cloudUrl) {
                recentFile.cloudUrl = (file as any).cloudUrl;
                recentFile.cloudSource = (file as any).cloudSource;
            }
            // For images and small files, store as data URL
            else if (file.type.startsWith('image/') && file.size <= MAX_FILE_SIZE_FOR_STORAGE) {
                const dataUrl = await fileToDataUrl(file);
                recentFile.dataUrl = dataUrl;
            }

            // Remove duplicates (same name and size)
            const filtered = recentFiles.filter(
                f => !(f.name === file.name && f.size === file.size)
            );

            // Add to front and limit size
            const updated = [recentFile, ...filtered].slice(0, MAX_RECENT_FILES);

            localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Error saving recent file:', error);
        }
    },

    // Remove a file from recent files
    removeRecentFile: (id: string): void => {
        try {
            const recentFiles = recentFilesStorage.getRecentFiles();
            const updated = recentFiles.filter(f => f.id !== id);
            localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Error removing recent file:', error);
        }
    },

    // Clear all recent files
    clearRecentFiles: (): void => {
        try {
            localStorage.removeItem(RECENT_FILES_KEY);
        } catch (error) {
            console.error('Error clearing recent files:', error);
        }
    }
};

// Helper to convert File to data URL
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Helper to convert data URL back to File
export const dataUrlToFile = (dataUrl: string, fileName: string, mimeType: string): File => {
    const arr = dataUrl.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], fileName, { type: mimeType });
};
