import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react';
import clsx from 'clsx';
import { useApp } from '../contexts/AppContext';

interface ChatHistoryUploadProps {
  groupId: string;
  groupName: string;
  onUploadSuccess: () => void;
  onClose: () => void;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  message?: string;
  stats?: {
    messagesProcessed: number;
    messagesInserted: number;
  };
}

export function ChatHistoryUpload({ groupId, groupName, onUploadSuccess, onClose }: ChatHistoryUploadProps) {
  const { uploadChatHistory } = useApp();
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file) return;

    // Validate file type (accept text files)
    if (!file.type.startsWith('text/') && !file.name.endsWith('.txt')) {
      setUploadState({
        status: 'error',
        message: 'Please upload a text file (.txt) containing WhatsApp chat export.'
      });
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setUploadState({
        status: 'error',
        message: 'File size too large. Please upload files smaller than 50MB.'
      });
      return;
    }

    setUploadState({ status: 'uploading', message: 'Uploading and processing chat history...' });

    try {
      // Read file content
      const content = await file.text();

      // Upload via Electron IPC
      const result = await uploadChatHistory(groupId, content);

      setUploadState({
        status: 'success',
        message: 'Chat history uploaded successfully!',
        stats: {
          messagesProcessed: result.messagesProcessed,
          messagesInserted: result.messagesInserted,
        }
      });
      onUploadSuccess();
    } catch (error) {
      setUploadState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to upload chat history.'
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upload Chat History</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Group Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">Uploading history for:</div>
          <div className="font-medium text-gray-900 truncate">{groupName}</div>
          <div className="text-xs text-gray-500 font-mono">{groupId}</div>
        </div>

        {/* Instructions */}
        {uploadState.status === 'idle' && (
          <div className="mb-4 text-sm text-gray-600 space-y-2">
            <div className="font-medium">How to export WhatsApp chat:</div>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Open WhatsApp on your phone</li>
              <li>Go to the group chat</li>
              <li>Tap the group name at the top</li>
              <li>Scroll down and tap "Export Chat"</li>
              <li>Choose "Without Media"</li>
              <li>Save/Share the text file to your computer</li>
            </ol>
          </div>
        )}

        {/* Upload Area */}
        {uploadState.status === 'idle' && (
          <>
            <div
              className={clsx(
                'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
                dragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-600 mb-2">
                Drop your WhatsApp chat export file here, or click to browse
              </div>
              <div className="text-sm text-gray-500">
                Supports .txt files up to 50MB
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}

        {/* Upload Status */}
        {uploadState.status === 'uploading' && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-gray-600">{uploadState.message}</div>
          </div>
        )}

        {uploadState.status === 'success' && (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <div className="text-green-600 font-medium mb-4">{uploadState.message}</div>
            {uploadState.stats && (
              <div className="bg-green-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Messages processed:</span>
                  <span className="font-medium">{uploadState.stats.messagesProcessed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Messages inserted:</span>
                  <span className="font-medium">{uploadState.stats.messagesInserted}</span>
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              className="mt-4 btn btn-primary w-full"
            >
              Done
            </button>
          </div>
        )}

        {uploadState.status === 'error' && (
          <div className="text-center py-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <div className="text-red-600 font-medium mb-4">{uploadState.message}</div>
            <div className="space-x-3">
              <button
                onClick={() => setUploadState({ status: 'idle' })}
                className="btn btn-secondary"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Warning */}
        {uploadState.status === 'idle' && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-xs text-yellow-800">
              <strong>Note:</strong> Uploading chat history will import all messages from the file.
              This may take a few moments for large chat files. Only text messages are supported.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}