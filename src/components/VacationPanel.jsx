import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Calendar, User, Palmtree, Plus, X } from 'lucide-react';

export default function VacationPanel({ people = [], vacationData, onUpdateVacationData }) {
    // Use ONLY the exact list of allowed doctors for summer vacations
    const ALLOWED_DOCTORS = ['BON', 'BUR', 'COS', 'DES', 'DON', 'FUM', 'INV', 'LAM', 'MAG', 'MAS', 'OGG', 'PAS', 'RUS', 'RUZ', 'SAL', 'SAN', 'SES'];
    const activePeople = ALLOWED_DOCTORS;

    const data = vacationData || { requests: [], baseRequired: 5, exceptions: [] };
    const year = new Date().getFullYear();

    const [selectedPerson, setSelectedPerson] = useState(activePeople[0] || '');
    const [newException, setNewException] = useState({ date: '', required: 4 });
    const [editingReq, setEditingReq] = useState(null);
    const [bottomActiveMonth, setBottomActiveMonth] = useState(5); // Default to June (5)

    const handleInlineReqChange = (dateStr, newVal) => {
        const val = parseInt(newVal);
        let updatedExceptions = data.exceptions.filter(e => e.date !== dateStr);
        if (!isNaN(val) && val !== data.baseRequired) {
            updatedExceptions.push({ date: dateStr, required: val });
        }
        onUpdateVacationData({ ...data, exceptions: updatedExceptions });
    };

    const handleToggleVacation = (dateStr) => {
        if (!selectedPerson) return;
        
        // Find if already requested
        const existingIdx = data.requests.findIndex(r => r.person === selectedPerson && r.date === dateStr);
        let updatedRequests = [...data.requests];
        
        if (existingIdx >= 0) {
            updatedRequests.splice(existingIdx, 1);
        } else {
            updatedRequests.push({ person: selectedPerson, date: dateStr, id: Math.random().toString(36).substr(2, 9) });
        }
        onUpdateVacationData({ ...data, requests: updatedRequests });
    };

    const handleAddException = () => {
        if (!newException.date) return;
        const updatedExceptions = [...data.exceptions.filter(e => e.date !== newException.date), newException];
        onUpdateVacationData({ ...data, exceptions: updatedExceptions });
        setNewException({ date: '', required: 4 });
    };

    const handleRemoveException = (date) => {
        const updatedExceptions = data.exceptions.filter(e => e.date !== date);
        onUpdateVacationData({ ...data, exceptions: updatedExceptions });
    };

    const handleBaseRequiredChange = (val) => {
        onUpdateVacationData({ ...data, baseRequired: parseInt(val) || 0 });
    };

    const months = [
        { name: 'Giugno', num: 5, days: 30 },
        { name: 'Luglio', num: 6, days: 31 },
        { name: 'Agosto', num: 7, days: 31 },
        { name: 'Settembre', num: 8, days: 30 }
    ];

    const calendarData = useMemo(() => {
        const result = [];
        months.forEach(month => {
            const monthDays = [];
            const startOffset = (new Date(year, month.num, 1).getDay() + 6) % 7; // 0 = Mon, 6 = Sun
            
            for (let d = 1; d <= month.days; d++) {
                const dateStr = `${year}-${String(month.num + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dateObj = new Date(year, month.num, d);
                
                const onVacation = data.requests.filter(req => req.date === dateStr).map(req => req.person);
                
                const exception = data.exceptions.find(e => e.date === dateStr);
                const required = exception ? exception.required : data.baseRequired;
                
                const available = activePeople.length - onVacation.length;
                const deficit = available < required;
                const dayOfWeek = dateObj.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase();
                const isWeekend = dayOfWeek === 'SAB' || dayOfWeek === 'DOM' || dayOfWeek === 'SA' || dayOfWeek === 'DO';

                monthDays.push({
                    day: d, dateStr, dayOfWeek, isWeekend, required, available, onVacation, deficit
                });
            }
            result.push({ ...month, daysData: monthDays, startOffset });
        });
        return result;
    }, [data, activePeople, year]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ color: 'var(--sys-color-on-surface)', margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Palmtree size={20} />
                    Pianificazione Ferie ({year})
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Medici Totali:</span>
                    <span style={{ background: 'var(--sys-color-primary-container)', color: 'var(--sys-color-on-primary-container)', padding: '4px 12px', borderRadius: '100px', fontWeight: 'bold' }}>{activePeople.length}</span>
                </div>
            </div>

            {/* Fabbisogno Config Bar */}
            <div style={{ display: 'flex', gap: '1.5rem', background: 'var(--sys-color-surface)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--sys-color-outline-variant)', marginBottom: '1rem', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Medici base necessari/giorno:</label>
                    <input type="number" min="1" max={activePeople.length} style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--sys-color-outline)' }} value={data.baseRequired} onChange={e => handleBaseRequiredChange(e.target.value)} />
                </div>
                
                <div style={{ width: '1px', background: 'var(--sys-color-outline-variant)' }}></div>
                
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Eccezioni (es. Ferragosto):</span>
                        <input type="date" className="input-base" style={{ padding: '2px 8px' }} value={newException.date} onChange={e => setNewException({...newException, date: e.target.value})} min={`${year}-06-01`} max={`${year}-09-30`} />
                        <input type="number" min="1" max={activePeople.length} className="input-base" style={{ width: '60px', padding: '2px 8px' }} value={newException.required} onChange={e => setNewException({...newException, required: parseInt(e.target.value)})} />
                        <button className="btn btn-secondary" onClick={handleAddException} style={{ padding: '2px 8px', height: 'auto' }}>Aggiungi</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {data.exceptions.map(e => (
                            <span key={e.date} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--sys-color-surface-variant)', padding: '2px 8px', borderRadius: '100px', fontSize: '0.75rem' }}>
                                {new Date(e.date).toLocaleDateString('it-IT')}: <strong>{e.required}</strong>
                                <button onClick={() => handleRemoveException(e.date)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--sys-color-on-surface-variant)' }}><X size={12}/></button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', height: '580px', overflow: 'hidden', flexShrink: 0 }}>
                {/* CALENDARIO FERIE MEDICO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {activePeople.map(p => (
                            <button key={p} onClick={() => setSelectedPerson(p)} style={{
                                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', border: 'none',
                                background: selectedPerson === p ? 'var(--sys-color-primary)' : 'var(--sys-color-surface-variant)',
                                color: selectedPerson === p ? 'white' : 'var(--sys-color-on-surface)'
                            }}>
                                {selectedPerson === p && <User size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />}
                                {p}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {selectedPerson ? calendarData.map(month => (
                            <div key={month.name} style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--sys-color-outline-variant)', padding: '1rem' }}>
                                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--sys-color-primary)' }}>{month.name}</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                                    {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--sys-color-outline)' }}>{d}</div>)}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                    {Array.from({ length: month.startOffset }).map((_, i) => <div key={`blank-${i}`}></div>)}
                                    {month.daysData.map(day => {
                                        const isVacation = day.onVacation.includes(selectedPerson);
                                        return (
                                            <button key={day.dateStr} onClick={() => handleToggleVacation(day.dateStr)} style={{
                                                aspectRatio: '1', borderRadius: '6px', border: isVacation ? '1px solid var(--sys-color-primary)' : '1px solid var(--sys-color-outline-variant)',
                                                background: isVacation ? '#f0fdfa' : (day.isWeekend ? '#f9fafb' : 'white'),
                                                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.1s', position: 'relative'
                                            }}>
                                                <span style={{ fontSize: '0.875rem', fontWeight: isVacation ? 'bold' : 'normal', color: isVacation ? 'var(--sys-color-primary)' : 'inherit' }}>{day.day}</span>
                                                {isVacation && <Palmtree size={12} color="var(--sys-color-primary)" style={{ position: 'absolute', bottom: '4px' }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--sys-color-outline)' }}>Seleziona un medico per inserire le ferie</div>
                        )}
                    </div>
                </div>

                {/* ANALISI COPERTURA GLOBALE */}
                <div style={{ background: 'var(--sys-color-surface)', borderRadius: '12px', border: '1px solid var(--sys-color-outline-variant)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--sys-color-outline-variant)', background: 'var(--sys-color-surface-variant)' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--sys-color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={18} />
                            Analisi Copertura (Tutti i medici)
                        </h3>
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                        {calendarData.map(month => (
                            <div key={`analisi-${month.name}`} style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--sys-color-on-surface)' }}>{month.name}</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {month.daysData.map(day => (
                                        <div key={day.dateStr} style={{ 
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '4px 8px', borderRadius: '4px',
                                            background: day.deficit ? '#fef2f2' : (day.isWeekend ? '#f9fafb' : 'white'),
                                            borderLeft: day.deficit ? '3px solid var(--sys-color-error)' : '3px solid transparent'
                                        }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span style={{ width: '20px', fontWeight: 'bold', fontSize: '0.875rem' }}>{day.day}</span>
                                                <span style={{ width: '30px', color: 'var(--sys-color-outline)', fontSize: '0.75rem' }}>{day.dayOfWeek}</span>
                                                {day.onVacation.length > 0 && (
                                                    <span style={{ color: 'var(--sys-color-primary)', fontSize: '0.75rem' }}>🌴 {day.onVacation.join(', ')}</span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.875rem' }}>
                                                <span style={{ color: day.deficit ? 'var(--sys-color-error)' : 'var(--sys-color-success)', fontWeight: 'bold' }}>
                                                    Disp: {day.available}
                                                </span>
                                                {editingReq === day.dateStr ? (
                                                    <input 
                                                        autoFocus
                                                        type="number" 
                                                        min="1" 
                                                        max={people.length}
                                                        defaultValue={day.required}
                                                        onBlur={(e) => { handleInlineReqChange(day.dateStr, e.target.value); setEditingReq(null); }}
                                                        onKeyDown={(e) => { if(e.key === 'Enter') { handleInlineReqChange(day.dateStr, e.target.value); setEditingReq(null); } }}
                                                        style={{ width: '45px', padding: '0 4px', fontSize: '0.875rem', borderRadius: '4px', border: '1px solid var(--sys-color-primary)', textAlign: 'center' }}
                                                    />
                                                ) : (
                                                    <span 
                                                        style={{ color: 'var(--sys-color-outline)', cursor: 'pointer', textDecoration: 'underline dashed', textUnderlineOffset: '2px' }}
                                                        onClick={() => setEditingReq(day.dateStr)}
                                                        title="Clicca per modificare il fabbisogno per questo giorno"
                                                    >
                                                        (Req: {day.required})
                                                    </span>
                                                )}
                                                {day.deficit ? <AlertTriangle size={14} color="var(--sys-color-error)" /> : <CheckCircle size={14} color="var(--sys-color-success)" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* PROSPETTO DISPONIBILITÀ MENSILE IN BASSO */}
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--sys-color-outline-variant)', paddingTop: '1.5rem', flexShrink: 0 }}>
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--sys-color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={20} />
                    Prospetto Medici Disponibili per Giorno (Mese per Mese)
                </h3>
                
                {/* Tabs dei Mesi */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {months.map(m => (
                        <button 
                            key={m.num}
                            onClick={() => setBottomActiveMonth(m.num)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                background: bottomActiveMonth === m.num ? 'var(--sys-color-primary)' : 'var(--sys-color-surface-variant)',
                                color: bottomActiveMonth === m.num ? 'white' : 'var(--sys-color-on-surface)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {m.name}
                        </button>
                    ))}
                </div>

                {/* Tabella di Dettaglio */}
                {(() => {
                    const activeMonthData = calendarData.find(m => m.num === bottomActiveMonth);
                    if (!activeMonthData) return null;

                    return (
                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--sys-color-outline-variant)', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', minWidth: '700px' }}>
                                <thead style={{ background: 'var(--sys-color-surface-variant)', color: 'var(--sys-color-on-surface-variant)' }}>
                                    <tr>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', width: '90px', fontSize: '0.8rem' }}>Giorno</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'center', width: '120px', fontSize: '0.8rem' }}>Copertura (D/R)</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.8rem' }}>Medici Disponibili (Dettaglio Strutturati e CLP)</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', width: '220px', fontSize: '0.8rem' }}>In Ferie</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeMonthData.daysData.map(day => {
                                        const STRUTTURATI = ['COS', 'RUS', 'SES', 'OGG', 'BUR', 'DON', 'PAS', 'MAS', 'SAN', 'RUZ', 'MAG', 'FUM', 'DES', 'LAM'];
                                        const CLP = ['BON', 'SAL', 'INV'];

                                        const availableDocs = activePeople.filter(p => !day.onVacation.includes(p));
                                        const availStrutturati = availableDocs.filter(doc => STRUTTURATI.includes(doc));
                                        const availClp = availableDocs.filter(doc => CLP.includes(doc));

                                        const ferieStrutturati = day.onVacation.filter(doc => STRUTTURATI.includes(doc));
                                        const ferieClp = day.onVacation.filter(doc => CLP.includes(doc));

                                        const isDeficit = day.deficit;

                                        return (
                                            <tr key={day.dateStr} style={{ 
                                                borderBottom: '1px solid var(--sys-color-outline-variant)',
                                                background: day.isWeekend ? '#fef2f2' : 'white'
                                            }}>
                                                {/* Giorno */}
                                                <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>
                                                    <span style={{ color: day.isWeekend ? 'var(--sys-color-error)' : 'inherit', fontSize: '0.8rem' }}>
                                                        {String(day.day).padStart(2, '0')} {day.dayOfWeek}
                                                    </span>
                                                </td>

                                                {/* Stato Copertura */}
                                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '100px', fontWeight: 'bold', fontSize: '0.75rem',
                                                        background: isDeficit ? '#fde8e8' : '#e6f4ea',
                                                        color: isDeficit ? '#c53030' : '#137333'
                                                    }}>
                                                        {day.available}/{day.required}
                                                    </div>
                                                </td>

                                                {/* Medici Disponibili */}
                                                <td style={{ padding: '6px 8px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--sys-color-outline)', minWidth: '105px' }}>
                                                                Strutturati ({availStrutturati.length}):
                                                            </span>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                                                {availStrutturati.map(doc => (
                                                                    <span key={doc} style={{ background: '#e8f0fe', color: '#1a73e8', padding: '1px 5px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                                        {doc}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--sys-color-outline)', minWidth: '105px' }}>
                                                                CLP ({availClp.length}):
                                                            </span>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                                                {availClp.map(doc => (
                                                                    <span key={doc} style={{ background: '#e6f4ea', color: '#137333', padding: '1px 5px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                                        {doc}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* In Ferie */}
                                                <td style={{ padding: '6px 8px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        {ferieStrutturati.length > 0 && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                                                                <span style={{ color: 'var(--sys-color-outline)', fontWeight: 'bold', minWidth: '32px' }}>Str:</span>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                                                    {ferieStrutturati.map(doc => (
                                                                        <span key={doc} style={{ background: '#fce8e6', color: '#c5221f', padding: '1px 5px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 'bold', textDecoration: 'line-through' }}>
                                                                            {doc}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {ferieClp.length > 0 && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                                                                <span style={{ color: 'var(--sys-color-outline)', fontWeight: 'bold', minWidth: '32px' }}>CLP:</span>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                                                    {ferieClp.map(doc => (
                                                                        <span key={doc} style={{ background: '#fce8e6', color: '#c5221f', padding: '1px 5px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 'bold', textDecoration: 'line-through' }}>
                                                                            {doc}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {day.onVacation.length === 0 && (
                                                            <span style={{ color: 'var(--sys-color-outline)', fontSize: '0.7rem', fontStyle: 'italic' }}>Nessuno</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
