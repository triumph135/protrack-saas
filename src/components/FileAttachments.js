// src/components/FileAttachments.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, File, Trash2, Download, Edit, Save, X, 
  FileText, Image, AlertCircle, Loader2 
} from 'lucide-react';
import { fileUploadService } from '../lib/fileUploadService';

const FileAttachments = ({ 
  entityType, 
  entityId, 
  tenantId, 
  userId, 
  canEdit = true,
  className = '' 
}) => {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [editingDescription, setEditingDescription] = useState(null);
  const [newDescription, setNewDescription] = useState('');
  
  const fileInputRef = useRef(null);

  // Set context and load attachments
  useEffect(() => {
    if (tenantId && userId && entityId) {
      fileUploadService.setContext(tenantId, userId);
      loadAttachments();
    }
  }, [tenantId, userId, entityId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fileUploadService.getAttachments(entityType, entityId);
      setAttachments(data);
    } catch (err) {
      setError('Failed to load attachments: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (files) => {
    if (!canEdit) return;
    
    Array.from(files).forEach(file => {
      uploadFile(file);
    });
  };

  const uploadFile = async (file, description = '') => {
    try {
      setUploading(true);
      setError('');
      
      const attachment = await fileUploadService.uploadFile(
        file, 
        entityType, 
        entityId, 
        description
      );
      
      // Add to local state
      setAttachments(prev => [attachment, ...prev]);
      
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      await fileUploadService.deleteAttachment(attachmentId);
      setAttachments(prev => prev.filter(att => att.id !== attachmentId));
    } catch (err) {
      setError('Delete failed: ' + err.message);
    }
  };

  const handleDownload = async (attachment) => {
    try {
      const url = await fileUploadService.getFileUrl(attachment.storage_path);
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      setError('Download failed: ' + err.message);
    }
  };

  const handleDescriptionUpdate = async (attachmentId) => {
    try {
      const updated = await fileUploadService.updateAttachment(attachmentId, newDescription);
      setAttachments(prev => prev.map(att => 
        att.id === attachmentId ? { ...att, description: updated.description } : att
      ));
      setEditingDescription(null);
      setNewDescription('');
    } catch (err) {
      setError('Update failed: ' + err.message);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-4 h-4 text-blue-500" />;
    }
    if (fileType === 'application/pdf') {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    return <File className="w-4 h-4 text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700">
          Attachments ({attachments.length})
        </h4>
        {canEdit && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Upload Area */}
      {canEdit && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Uploading...</span>
            </div>
          ) : (
            <div className="text-gray-600">
              <Upload className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG, GIF, WebP, PDF, TIFF (max 10MB)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.tiff"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Attachments List */}
      {loading ? (
        <div className="flex items-center justify-center py-4 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading attachments...
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          No attachments yet
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getFileIcon(attachment.file_type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {attachment.file_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({formatFileSize(attachment.file_size)})
                      </span>
                    </div>
                    
                    {/* Description */}
                    {editingDescription === attachment.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                          placeholder="Add description..."
                          className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleDescriptionUpdate(attachment.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Save className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingDescription(null);
                            setNewDescription('');
                          }}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">
                          {attachment.description || 'No description'}
                        </span>
                        {canEdit && (
                          <button
                            onClick={() => {
                              setEditingDescription(attachment.id);
                              setNewDescription(attachment.description || '');
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-1">
                      Uploaded {new Date(attachment.created_at).toLocaleDateString()} 
                      {attachment.uploaded_by_user?.name && ` by ${attachment.uploaded_by_user.name}`}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="text-gray-400 hover:text-blue-600 p-1"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => handleDelete(attachment.id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileAttachments;