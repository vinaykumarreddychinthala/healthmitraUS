'use client';

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface Document {
    name: string;
    url: string;
}

export default function DownloadDocsButton({ documents = [] }: { documents?: Document[] }) {
    const [downloading, setDownloading] = useState(false);

    const downloadFile = async (url: string, name: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) {
            // Fallback: Open in new tab
            window.open(url, '_blank');
        }
    };

    const handleDownloadAll = async () => {
        if (!documents || documents.length === 0) {
            toast.error('No documents to download');
            return;
        }

        setDownloading(true);
        toast.info(`Starting download of ${documents.length} document(s)...`);

        try {
            // Download files sequentially to prevent browser from blocking popups/multiple downloads
            for (let i = 0; i < documents.length; i++) {
                const doc = documents[i];
                if (doc.url) {
                    await downloadFile(doc.url, doc.name);
                    // Slight delay to prevent issues
                    await new Promise(resolve => setTimeout(resolve, 400));
                }
            }
            toast.success('All documents downloaded successfully!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to download some documents');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Button
            className="w-full"
            variant="secondary"
            disabled={downloading || documents.length === 0}
            onClick={handleDownloadAll}
        >
            <Download size={16} className="mr-2" />
            {downloading ? 'Downloading...' : 'Download All Docs'}
        </Button>
    );
}
