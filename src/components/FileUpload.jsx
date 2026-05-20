import React, { useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';

export default function FileUpload({ onFileProcess }) {
    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.json') || file.type === "application/json" ||
                file.name.endsWith('.docx') || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                onFileProcess(file);
            } else {
                alert("Per favore carica un file .docx o .json");
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileProcess(e.target.files[0]);
        }
    }

    return (
        <div
            className="file-upload-zone"
            style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                border: '2px dashed var(--sys-color-outline-variant)',
                borderRadius: 'var(--sys-shape-corner-large)',
                backgroundColor: 'var(--sys-color-surface)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem',
                transition: 'all 0.2s ease'
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('fileInput').click()}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--sys-color-primary)';
                e.currentTarget.style.backgroundColor = 'var(--sys-color-primary-container)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--sys-color-outline-variant)';
                e.currentTarget.style.backgroundColor = 'var(--sys-color-surface)';
            }}
        >
            <input
                id="fileInput"
                type="file"
                accept=".docx,.json"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
            />
            <div style={{
                background: 'var(--sys-color-primary-container)',
                color: 'var(--sys-color-on-primary-container)',
                padding: '1.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.5rem'
            }}>
                <Upload size={48} strokeWidth={1.5} />
            </div>
            <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600 }}>Carica il file dei turni</h3>
                <p style={{ margin: 0, color: 'var(--sys-color-outline)', fontSize: '0.875rem' }}>
                    Trascina qui il file .docx, .json o clicca per selezionarlo
                </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', color: 'var(--sys-color-primary)', fontSize: '0.875rem', fontWeight: 500 }}>
                <FileText size={16} />
                <span>Supporta formato Word (.docx) e Sessione (.json)</span>
            </div>
        </div>
    );
}
