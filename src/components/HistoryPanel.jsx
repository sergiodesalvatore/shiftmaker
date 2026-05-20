import React, { useState, useMemo } from 'react';
import { Upload, Archive, Trash2, Award, Calendar } from 'lucide-react';
import { parseShiftFile } from '../utils/parser';

export default function HistoryPanel() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleFileProcess = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setLoading(true);
        const newSessions = [];

        try {
            for (const file of files) {
                let parsedData = null;
                if (file.name.endsWith('.json') || file.type === 'application/json') {
                    const text = await file.text();
                    const json = JSON.parse(text);
                    if (json.type === 'SHIFTMAKER_SESSION' || Array.isArray(json.shifts)) {
                        parsedData = json;
                    }
                } else {
                    parsedData = await parseShiftFile(file);
                }

                if (parsedData) {
                    newSessions.push({
                        id: Date.now() + Math.random().toString(),
                        fileName: file.name,
                        data: parsedData
                    });
                }
            }

            setSessions(prev => [...prev, ...newSessions]);
        } catch (error) {
            console.error(error);
            alert(`Errore durante il caricamento di alcuni file: ${error.message || error}`);
        } finally {
            setLoading(false);
            // Reset input
            e.target.value = null;
        }
    };

    const removeSession = (id) => {
        setSessions(prev => prev.filter(s => s.id !== id));
    };

    // Helpers for extracting holidays
    const getEaster = (year) => {
        const f = Math.floor, G = year % 19, C = f(year / 100);
        const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
        const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
        const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
        const L = I - J, month = 3 + f((L + 40) / 44), day = L + 28 - 31 * f(month / 4);
        return { month: month - 1, day };
    };

    const isItalianHoliday = (day, month, year) => {
        if (month === -1) return false;
        const fixed = ['1-0', '6-0', '25-3', '1-4', '2-5', '15-7', '1-10', '8-11', '25-11', '26-11'];
        if (fixed.includes(`${day}-${month}`)) return true;
        const easter = getEaster(year);
        const easterDate = new Date(year, easter.month, easter.day);
        easterDate.setDate(easterDate.getDate() + 1); // Pasquetta
        return day === easterDate.getDate() && month === easterDate.getMonth();
    };

    const getMonthYearFromFilename = (filename) => {
        const months = [['gennaio', 'gen'], ['febbraio', 'feb'], ['marzo', 'mar'], ['aprile', 'apr'], ['maggio', 'mag'], ['giugno', 'giu'], ['luglio', 'lug'], ['agosto', 'ago'], ['settembre', 'set'], ['ottobre', 'ott'], ['novembre', 'nov'], ['dicembre', 'dic']];
        const lower = filename.toLowerCase();
        let month = -1;
        for (let i = 0; i < months.length; i++) {
            if (months[i].some(m => lower.includes(m))) { month = i; break; }
        }
        const yearMatch = lower.match(/\b(20\d{2})\b/);
        const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
        return { month, year };
    };

    const aggregatedStats = useMemo(() => {
        const statsMap = new Map();

        sessions.forEach(session => {
            const { shifts } = session.data;
            if (!shifts) return;

            const { month, year } = getMonthYearFromFilename(session.fileName);

            const dayNames = new Map();
            shifts.forEach(s => {
                if (s.type === 'DAY_NAME') {
                    const norm = s.content.trim().toUpperCase().replace(/[^A-Z]/g, '');
                    const isWeekend = norm.startsWith('S') || norm.startsWith('D') || norm.startsWith('SAB') || norm.startsWith('DOM');
                    const dayNum = parseInt(s.day);
                    const isHoliday = isItalianHoliday(dayNum, month, year);
                    dayNames.set(s.day, { name: s.content, isFestivo: isWeekend || isHoliday });
                }
            });

            // Count every shift except DAY_NAME
            shifts.forEach(s => {
                if (s.type === 'DAY_NAME') return;

                const tokens = s.content.split(/\s+/);
                tokens.forEach(t => {
                    const clean = t.replace(/[()]/g, '');
                    if (clean.length >= 2 && clean === clean.toUpperCase()) {
                        if (!statsMap.has(clean)) {
                            statsMap.set(clean, {
                                person: clean, total: 0, weekend: 0,
                                ambulatorio: 0, sala: 0, ps: 0, reparto: 0, ferie: 0, altro: 0
                            });
                        }
                        const pStats = statsMap.get(clean);
                        pStats.total += 1;

                        if (s.type.startsWith('AMBULATORIO')) pStats.ambulatorio += 1;
                        else if (s.type.startsWith('SALA')) pStats.sala += 1;
                        else if (s.type.startsWith('PS')) pStats.ps += 1;
                        else if (s.type.startsWith('REPARTO') || s.type.startsWith('REP')) pStats.reparto += 1;
                        else if (s.type === 'FERIE') pStats.ferie += 1;
                        else pStats.altro += 1;

                        const dayInfo = dayNames.get(s.day);
                        if (dayInfo && dayInfo.isFestivo) {
                            pStats.weekend += 1;
                        }
                    }
                });
            });
        });

        // Convert to array and sort by weekend shifts descending, then total descending
        return Array.from(statsMap.values()).sort((a, b) => {
            if (b.weekend !== a.weekend) return b.weekend - a.weekend;
            return b.total - a.total;
        });
    }, [sessions]);

    return (
        <div style={{ padding: '0 1rem 2rem 1rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'var(--sys-color-on-surface)' }}>
                        Storico Turni
                    </h2>
                    <p style={{ color: 'var(--sys-color-outline)', margin: 0 }}>
                        Carica i file dei mesi precedenti per analizzare l'andamento e i turni festivi.
                    </p>
                </div>

                <div>
                    <input
                        type="file"
                        id="history-upload"
                        multiple
                        accept=".docx,.json,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/json"
                        style={{ display: 'none' }}
                        onChange={handleFileProcess}
                    />
                    <label
                        htmlFor="history-upload"
                        className="btn"
                        style={{
                            background: 'var(--sys-color-primary)',
                            color: 'var(--sys-color-on-primary)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Caricamento...' : (
                            <>
                                <Upload size={18} />
                                Aggiungi file
                            </>
                        )}
                    </label>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
                {/* LEFT COLUMN: Uploaded Files & Recommendations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--sys-color-outline-variant)' }}>
                            <div style={{ background: '#f3f4f6', padding: '8px', borderRadius: '50%', color: '#4b5563' }}>
                                <Archive size={20} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Mesi Caricati ({sessions.length})</h3>
                        </div>

                        {sessions.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--sys-color-outline)' }}>
                                Nessun file caricato.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {sessions.map(s => (
                                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--sys-color-surface)', border: '1px solid var(--sys-color-outline-variant)', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                            <Calendar size={16} color="var(--sys-color-primary)" />
                                            <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {s.fileName}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => removeSession(s.id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--sys-color-error)', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {sessions.length > 0 && aggregatedStats.length > 0 && (
                        <div className="card" style={{ border: '2px solid var(--sys-color-primary)', background: '#f0f9ff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                                <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '50%', color: '#0369a1' }}>
                                    <Award size={24} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0369a1' }}>Diritto di Riposo</h3>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--sys-color-on-surface-variant)', marginBottom: '1rem', lineHeight: '1.5' }}>
                                In base allo storico, questi medici hanno fatto più weekend e avrebbero la priorità per saltare il prossimo festivo.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {aggregatedStats.slice(0, 3).map((stat, i) => (
                                    <div key={stat.person} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'white', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: 'bold', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? '#fef08a' : '#f3f4f6', borderRadius: '50%', fontSize: '0.8rem', color: i === 0 ? '#854d0e' : '#4b5563' }}>
                                                {i + 1}
                                            </span>
                                            <span style={{ fontWeight: '600' }}>{stat.person}</span>
                                        </div>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#0369a1' }}>{stat.weekend} WE</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Aggregated Stats Table */}
                <div className="card" style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--sys-color-outline-variant)' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Classifica Turni (Merge di {sessions.length} Mesi)</h3>
                    </div>

                    {aggregatedStats.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--sys-color-outline)' }}>
                            Carica dei file per visualizzare le statistiche.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--sys-color-outline-variant)' }}>
                                    <th style={{ padding: '12px 16px', color: 'var(--sys-color-on-surface-variant)', fontWeight: '600' }}>Medico</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--sys-color-on-surface-variant)', fontWeight: '600', textAlign: 'right' }} title="Ambulatorio">Amb</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--sys-color-on-surface-variant)', fontWeight: '600', textAlign: 'right' }} title="Sala Operatoria">Sala</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--sys-color-on-surface-variant)', fontWeight: '600', textAlign: 'right' }} title="Pronto Soccorso">PS</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--sys-color-on-surface-variant)', fontWeight: '600', textAlign: 'right' }} title="Reparto">Rep</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--sys-color-on-surface-variant)', fontWeight: '600', textAlign: 'right' }} title="Altro (DH, Nora, ecc)">Altro</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--sys-color-on-surface-variant)', fontWeight: '600', textAlign: 'right' }} title="Ferie">Ferie</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--sys-color-on-surface-variant)', fontWeight: '600', textAlign: 'right' }}>Totale</th>
                                    <th style={{ padding: '12px 16px', color: '#0369a1', fontWeight: 'bold', textAlign: 'right' }} title="Sabati, Domeniche e Festivi">Festivi/WE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {aggregatedStats.map((stat, index) => (
                                    <tr key={stat.person} style={{ borderBottom: '1px solid var(--sys-color-outline-variant)', background: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{stat.person}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--sys-color-on-surface-variant)' }}>{stat.ambulatorio > 0 ? stat.ambulatorio : '-'}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--sys-color-on-surface-variant)' }}>{stat.sala > 0 ? stat.sala : '-'}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--sys-color-on-surface-variant)' }}>{stat.ps > 0 ? stat.ps : '-'}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--sys-color-on-surface-variant)' }}>{stat.reparto > 0 ? stat.reparto : '-'}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--sys-color-on-surface-variant)' }}>{stat.altro > 0 ? stat.altro : '-'}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--sys-color-on-surface-variant)' }}>{stat.ferie > 0 ? stat.ferie : '-'}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold' }}>{stat.total}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#0369a1' }}>{stat.weekend}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
