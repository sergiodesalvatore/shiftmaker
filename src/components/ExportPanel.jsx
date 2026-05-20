import React, { useState, useMemo } from 'react';
import { CalendarDays, Download, AlertCircle, Eye } from 'lucide-react';
import { getPreviewShifts, downloadICSFile } from '../utils/calendar';

export default function ExportPanel({ shifts, people }) {
    const currentDate = new Date();
    let defaultMonth = currentDate.getMonth() + 2; 
    let defaultYear = currentDate.getFullYear();
    if (defaultMonth > 12) {
        defaultMonth = 1;
        defaultYear += 1;
    }

    const [selectedPerson, setSelectedPerson] = useState(people && people.length > 0 ? people[0] : '');
    const [month, setMonth] = useState(defaultMonth);
    const [year, setYear] = useState(defaultYear);

    const previewShifts = useMemo(() => {
        if (!selectedPerson) return [];
        return getPreviewShifts(shifts, selectedPerson, parseInt(month), parseInt(year));
    }, [shifts, selectedPerson, month, year]);

    const handleExport = () => {
        if (previewShifts.length === 0) {
            alert(`Nessun turno trovato per ${selectedPerson} in questo mese.`);
            return;
        }
        downloadICSFile(previewShifts, selectedPerson, parseInt(month), parseInt(year));
    };

    const months = [
        "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
        "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
    ];

    return (
        <div style={{ padding: '0 1rem 2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'var(--sys-color-on-surface)' }}>
                    Esporta su Google Calendar
                </h2>
                <p style={{ color: 'var(--sys-color-outline)', margin: 0 }}>
                    Genera un file <strong>.ics</strong> per aggiungere in massa tutti i turni di un medico direttamente sul tuo calendario.
                </p>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                
                <div style={{ display: 'flex', gap: '10px', background: '#eff6ff', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', color: '#1e3a8a' }}>
                    <AlertCircle size={24} style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>
                        I file dei turni originali non contengono l'anno e il mese esatto. <strong>Seleziona il mese e l'anno corretti qui sotto</strong> per assegnare le giuste date ai turni prima di esportarli.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--sys-color-on-surface)' }}>Medico</label>
                        <select 
                            className="input-base" 
                            style={{ width: '100%', padding: '10px' }}
                            value={selectedPerson}
                            onChange={(e) => setSelectedPerson(e.target.value)}
                        >
                            {!selectedPerson && <option value="">-- Seleziona --</option>}
                            {people.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="form-group" style={{ flex: 2 }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--sys-color-on-surface)' }}>Mese</label>
                            <select 
                                className="input-base" 
                                style={{ width: '100%', padding: '10px' }}
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                            >
                                {months.map((m, i) => (
                                    <option key={i} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--sys-color-on-surface)' }}>Anno</label>
                            <input 
                                type="number" 
                                className="input-base" 
                                style={{ width: '100%', padding: '10px' }}
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {selectedPerson && (
            <div className="card" style={{ marginBottom: '2rem' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', borderBottom: '1px solid var(--sys-color-outline-variant)', paddingBottom: '0.5rem' }}>
                     <Eye size={20} color="var(--sys-color-primary)" />
                     <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--sys-color-on-surface)' }}>Anteprima Turni Trovati ({previewShifts.length})</h3>
                 </div>

                 {previewShifts.length === 0 ? (
                     <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--sys-color-outline)' }}>
                         Nessun turno trovato per {selectedPerson}.
                     </div>
                 ) : (
                     <>
                        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--sys-color-outline-variant)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: '#f9fafb', position: 'sticky', top: 0, zIndex: 1 }}>
                                    <tr>
                                        <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--sys-color-outline-variant)' }}>Giorno</th>
                                        <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--sys-color-outline-variant)' }}>Codice Letto</th>
                                        <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--sys-color-outline-variant)' }}>Evento Calendario</th>
                                        <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--sys-color-outline-variant)' }}>Orario</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewShifts.map((sh, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{sh.day} {months[month-1]}</td>
                                            <td style={{ padding: '8px 12px', color: 'var(--sys-color-outline)' }}>{sh.type}</td>
                                            <td style={{ padding: '8px 12px', fontWeight: '500', color: 'var(--sys-color-primary)' }}>{sh.summary}</td>
                                            <td style={{ padding: '8px 12px' }}>{sh.startHour}:00 - {sh.endHour}:00</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button 
                                onClick={handleExport}
                                style={{
                                    background: 'var(--sys-color-primary)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                <Download size={20} />
                                Conferma e Scarica Calendario (.ics)
                            </button>
                        </div>
                     </>
                 )}
            </div>
            )}
            
            <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--sys-color-on-surface)', marginBottom: '0.5rem' }}>Come importarlo in Google/Apple Calendar:</h3>
                <ol style={{ color: 'var(--sys-color-on-surface-variant)', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
                    <li>Verifica che i turni in anteprima siano corretti.</li>
                    <li>Clicca sul pulsante blu per scaricare il file <strong>.ics</strong>.</li>
                    <li>Fai <strong>doppio click</strong> sul file scaricato per aprirlo nel calendario del tuo Mac/iPhone. Ti chiederà se vuoi "Aggiungere i {previewShifts.length} eventi".</li>
                    <li><i>Se usi solo Google Calendar da PC Windows</i>: vai su Calendar {'>'} Rotella {'>'} Impostazioni {'>'} Importazione {'>'} Seleziona il file.</li>
                </ol>
            </div>
        </div>
    );
}
