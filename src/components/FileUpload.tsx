import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile, onClear }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    multiple: false
  } as any);

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center gap-3
              ${isDragActive 
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 cursor-copy' 
                : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/30'}
            `}
          >
            <input {...getInputProps()} />
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Upload Materi</p>
              <p className="text-[10px] text-slate-400 font-medium">Klik atau drag PDF/Foto Catatan lo</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="selected"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-emerald-500 text-white rounded-lg flex items-center justify-center shrink-0">
              {selectedFile.type === 'application/pdf' ? <FileText className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate">{selectedFile.name}</p>
              <p className="text-[9px] text-emerald-600/60 font-black uppercase tracking-widest">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • SIAP DIRACIK
              </p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-2 hover:bg-emerald-500/10 text-emerald-600 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
