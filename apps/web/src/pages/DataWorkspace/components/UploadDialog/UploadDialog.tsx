/**
 * UploadDialog Component
 * 
 * Handles file upload with drag & drop
 */

import { useState, useRef, useCallback } from 'react';
import { useDataStore, type FileType } from '../../../../stores/dataStore';
import { Modal, Button } from '../../../../components/ui';
import styles from './UploadDialog.module.css';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadResult {
  name: string;
  success: boolean;
  error?: string;
  rowCount?: number;
}

export function UploadDialog({ isOpen, onClose }: UploadDialogProps) {
  const { addFile, updateFile, setUploading, isUploading, uploadProgress } = useDataStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const detectFileType = (fileName: string): FileType => {
    const name = fileName.toLowerCase();
    if (name.includes('population') || name.includes('pop')) return 'population';
    if (name.includes('mortality') || name.includes('death')) return 'mortality';
    if (name.includes('fertility') || name.includes('birth')) return 'fertility';
    if (name.includes('migration') || name.includes('migr')) return 'migration';
    if (name.endsWith('.geojson') || name.endsWith('.json')) return 'geojson';
    return 'unknown';
  };

  const processFile = async (file: File): Promise<UploadResult> => {
    const fileType = detectFileType(file.name);
    
    // Add file to store with processing status
    const fileId = addFile({
      name: file.name,
      type: fileType,
      size: file.size,
      status: 'processing',
    });

    try {
      const text = await file.text();
      
      // Parse CSV to get row count and columns
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      const headers = lines[0]?.split(',').map((h) => h.trim()) || [];
      const rowCount = Math.max(0, lines.length - 1);
      
      // Get first 5 rows for preview
      const preview = lines.slice(1, 6).map((line) => 
        line.split(',').map((cell) => cell.trim())
      );

      // Update file with parsed data
      updateFile(fileId, {
        status: 'ready',
        rowCount,
        columns: headers,
        preview,
      });

      return {
        name: file.name,
        success: true,
        rowCount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      updateFile(fileId, {
        status: 'error',
        error: errorMessage,
      });

      return {
        name: file.name,
        success: false,
        error: errorMessage,
      };
    }
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setResults([]);
    setUploading(true, 0);

    const newResults: UploadResult[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setCurrentFile(file.name);
      setUploading(true, Math.round(((i) / fileArray.length) * 100));

      const result = await processFile(file);
      newResults.push(result);
    }

    setResults(newResults);
    setUploading(false, 100);
    setCurrentFile(null);
  }, [addFile, updateFile, setUploading]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleReset = () => {
    setResults([]);
    setCurrentFile(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Files"
      size="md"
    >
      {isUploading ? (
        <div className={styles.processing}>
          <div className={styles.processingIcon}>⏳</div>
          <div className={styles.processingTitle}>Processing files...</div>
          <div className={styles.processingFile}>{currentFile}</div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : results.length > 0 ? (
        <div>
          <div className={styles.results}>
            {results.map((result, i) => (
              <div 
                key={i} 
                className={`${styles.resultItem} ${result.success ? styles.success : styles.error}`}
              >
                <span className={styles.resultIcon}>
                  {result.success ? '✅' : '❌'}
                </span>
                <div className={styles.resultInfo}>
                  <div className={styles.resultName}>{result.name}</div>
                  {result.success ? (
                    <div className={styles.resultMeta}>{result.rowCount?.toLocaleString()} rows</div>
                  ) : (
                    <div className={styles.resultError}>{result.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.footer}>
            <Button variant="secondary" onClick={handleReset}>
              Upload More
            </Button>
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className={styles.dropzoneIcon}>📁</div>
          <div className={styles.dropzoneTitle}>
            Drop files here or click to browse
          </div>
          <div className={styles.dropzoneSubtitle}>
            Supports CSV, GeoJSON, and other data files
          </div>
          <div className={styles.dropzoneHint}>
            Population, Mortality, Fertility, Migration data
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className={styles.fileInput}
            multiple
            accept=".csv,.json,.geojson"
            onChange={handleFileInput}
          />
        </div>
      )}
    </Modal>
  );
}
