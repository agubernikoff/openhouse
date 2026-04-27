import {useState, useEffect} from 'react';

/**
 * @param {{
 *   selectedVariant: import('storefrontapi.generated').ProductFragment['selectedOrFirstAvailableVariant'];
 *   optionNumber: number;
 *   onChange: (file: File | null, url: string) => void;
 * }}
 */
export function ArtworkUpload({selectedVariant, optionNumber, onChange}) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (uploadedFile && isMounted) {
      const url = URL.createObjectURL(uploadedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [uploadedFile, isMounted]);

  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ];

  async function uploadFile(file) {
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload an image file (JPG, PNG, GIF, WebP) or PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploadError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('productId', selectedVariant?.product?.id || '');

      const response = await fetch('/api/upload', {method: 'POST', body: formData});
      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setUploadedFile(file);
      setUploadedFileUrl(data.url);
      onChange?.(file, data.url);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadedFileUrl('');
    setUploadError('');
    setPreviewUrl('');
    onChange?.(null, '');
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="product-options product-options-upload">
      <div className="product-options-header">
        <h5>
          <span className="option-bullet">●</span>
          <span className="option-number">{optionNumber}.</span> UPLOAD ARTWORK:{' '}
          {uploadedFile ? uploadedFile.name.toUpperCase() : 'NO FILE'}
        </h5>
        <span className="option-optional">OPTIONAL</span>
      </div>

      <div className="upload-container">
        <div
          className={`upload-preview ${isDragging ? 'dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!uploadedFile ? (
            <>
              <input
                type="file"
                id="artwork-upload"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
                onChange={handleFileSelect}
                disabled={isUploading}
                style={{display: 'none'}}
              />
              <label htmlFor="artwork-upload" className="upload-button">
                {isUploading ? 'UPLOADING...' : 'CHOOSE FILE'}
              </label>
              <p className="upload-hint">
                {isDragging ? 'Drop file here...' : 'Or drag and drop a file here'}
              </p>
              <p className="upload-hint">Accepted formats: JPG, PNG, PDF (Max 10MB)</p>
            </>
          ) : (
            <>
              {isMounted && uploadedFile.type.startsWith('image/') && previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Uploaded artwork preview"
                  className="upload-preview-image"
                />
              ) : uploadedFile.type.startsWith('image/') ? (
                <div
                  className="upload-preview-image"
                  style={{background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                />
              ) : (
                <div
                  className="upload-preview-image"
                  style={{
                    background: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    color: 'white',
                    borderRadius: '4px',
                  }}
                >
                  📄
                </div>
              )}
              <div className="upload-info">
                <p className="upload-filename">{uploadedFile.name}</p>
              </div>
              <button type="button" onClick={handleRemoveFile} className="upload-remove-button">
                Remove Artwork
              </button>
            </>
          )}
        </div>

        {uploadError && <p className="upload-error">{uploadError}</p>}
      </div>
    </div>
  );
}
