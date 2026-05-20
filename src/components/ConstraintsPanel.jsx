import React, { useState } from 'react';
import { Stethoscope, Calendar, Ban, CheckCircle, Eraser, Trash2, User } from 'lucide-react';
import { KNOWN_PEOPLE, WEEKDAYS } from '../utils/constants';

// Helper for alignment
const getStartOffsetForMonth = (days) => {
    if (!days || days.length === 0) return 0;

    // Try to find the first unambiguous day index
    for (const d of days) {
        let index = -1;
        const norm = d.name.trim().toUpperCase().replace(/[^A-Z]/g, '');
        if (norm === 'L' || norm.startsWith('LUN')) index = 0;
        else if (norm.startsWith('MA') || (norm === 'M' && days.length === 1)) index = 1; // Fallback for M if only 1 day
        else if (norm.startsWith('ME')) index = 2;
        else if (norm === 'G' || norm.startsWith('GIO')) index = 3;
        else if (norm === 'V' || norm.startsWith('VEN')) index = 4;
        else if (norm === 'S' || norm.startsWith('SAB') || norm.startsWith('SA')) index = 5;
        else if (norm === 'D' || norm.startsWith('DOM') || norm.startsWith('DO')) index = 6;

        // Don't match exact 'M' as it's ambiguous (Martedì vs Mercoledì), keep searching
        if (norm === 'M' && index === -1) continue;

        // If we found a unique day, calculate the offset for day 1
        if (index !== -1) {
            let startOffset = (index - (d.num - 1)) % 7;
            if (startOffset < 0) startOffset += 7;
            return startOffset;
        }
    }

    // Fallback: If we couldn't find any clear day, and the first day is 'M'
    const firstDayNorm = days[0].name.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (firstDayNorm === 'M') {
        if (days.length > 1) {
            const secondNorm = days[1].name.trim().toUpperCase().replace(/[^A-Z]/g, '');
            if (secondNorm === 'M') return 1; // M, M -> Martedì
            if (secondNorm === 'G') return 2; // M, G -> Mercoledì
        }
        return 1; // Default to Martedì if we have no clue
    }

    return 0;
};

// Helper to init stats object
const PRIVATE_STUDIO_PRESETS = [
    { person: 'BUR', days: ['V'] },
    { person: 'BON', days: ['L', 'ME'] },
    { person: 'INV', days: ['L'] },
    { person: 'DES', days: ['L'] },
    { person: 'FUM', days: ['L'] },
    { person: 'DON', days: ['ME', 'V'] },
    { person: 'MAS', days: ['MA', 'G'] },
    { person: 'OGG', days: ['L', 'G'] },
    { person: 'MAG', days: ['MA', 'G'] },
    { person: 'PAS', days: ['ME'] },
    { person: 'SES', days: ['G'] },
];

export default function ConstraintsPanel({ constraints, onUpdate, days = [] }) {
    const [selectedPerson, setSelectedPerson] = useState(KNOWN_PEOPLE[0] || '');
    // Tool state: { type: 'UNAV'|'PREF'|'ERASER', slot: 'ALL'|'AM'|'PM' }
    const [constraintTool, setConstraintTool] = useState({ type: 'UNAV', slot: 'ALL' });

    // Generic Modal State
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: '',
        message: '',
        onConfirm: null
    });

    // Calculate grid padding
    const startOffset = getStartOffsetForMonth(days);
    const blanks = Array.from({ length: startOffset });

    // Helper to toggle weekly recurring constraint
    const toggleRecurring = (day, slot) => {
        if (!selectedPerson) return;
        const current = constraints[selectedPerson] || {};
        const recurring = current.recurring || [];
        const existsIndex = recurring.findIndex(r => r.day === day && r.slot === slot);

        let newRecurring;
        if (existsIndex >= 0) {
            newRecurring = [...recurring];
            newRecurring.splice(existsIndex, 1);
        } else {
            newRecurring = [...recurring, { day, slot, id: Date.now() + Math.random() }];
        }
        onUpdate(selectedPerson, { ...current, recurring: newRecurring });
    };

    // Load Private Studio Presets
    const promptLoadPrivateStudios = () => {
        setConfirmModal({
            show: true,
            title: 'Conferma Caricamento',
            message: `Vuoi caricare i turni di studio privato predefiniti? \nQuesto aggiungerà i turni pomeridiani ricorrenti per i medici selezionati.`,
            onConfirm: () => {
                PRIVATE_STUDIO_PRESETS.forEach(preset => {
                    const current = constraints[preset.person] || {};
                    let recurring = current.recurring || [];

                    preset.days.forEach(day => {
                        const exists = recurring.some(r => r.day === day && r.slot === 'PM');
                        if (!exists) {
                            recurring.push({ day, slot: 'PM', id: Date.now() + Math.random() });
                        }
                    });

                    onUpdate(preset.person, { ...current, recurring });
                });
                setConfirmModal(prev => ({ ...prev, show: false }));
            }
        });
    };

    // Clear all constraints for the selected person
    const promptClearAllConstraints = () => {
        if (!selectedPerson) return;
        setConfirmModal({
            show: true,
            title: 'Conferma Reset',
            message: `Sei sicuro di voler cancellare TUTTE le preferenze e indisponibilità per ${selectedPerson}?`,
            onConfirm: () => {
                const current = constraints[selectedPerson] || {};
                onUpdate(selectedPerson, { ...current, unavailable: [], preferences: [] });
                setConfirmModal(prev => ({ ...prev, show: false }));
            }
        });
    };

    // Helper to apply constraints to a specific day
    const toggleDate = (dayNum) => {
        if (!selectedPerson) return;
        const current = constraints[selectedPerson] || {};
        let unavailable = [...(current.unavailable || [])];
        let preferences = [...(current.preferences || [])];

        // ALWAYS Remove any existing constraint for this day first
        unavailable = unavailable.filter(u => u.day != dayNum);
        preferences = preferences.filter(p => p.day != dayNum);

        // If tool is explicitly set and NOT eraser, add the new constraint
        if (constraintTool && constraintTool.type !== 'ERASER') {
            const newRule = { day: dayNum, slot: constraintTool.slot, id: Date.now() };

            if (constraintTool.type === 'UNAV') {
                unavailable.push(newRule);
            } else if (constraintTool.type === 'PREF') {
                preferences.push(newRule);
            }
        }

        onUpdate(selectedPerson, { ...current, unavailable, preferences });
    };

    const getDayConstraints = (dayNum) => {
        if (!selectedPerson) return null;
        const c = constraints[selectedPerson] || {};
        const unav = c.unavailable?.find(u => u.day == dayNum);
        if (unav) return { type: 'UNAV', slot: unav.slot };
        const pref = c.preferences?.find(p => p.day == dayNum);
        if (pref) return { type: 'PREF', slot: pref.slot };
        return null;
    };

    const isRecurringSelected = (day, slot) => {
        if (!selectedPerson) return false;
        const c = constraints[selectedPerson] || {};
        return c.recurring?.some(r => r.day === day && r.slot === slot);
    };

    const ToolButton = ({ type, slot, label, icon }) => {
        const isActive = constraintTool && constraintTool.type === type && constraintTool.slot === slot;
        let baseColor = 'var(--sys-color-outline)';
        let activeBg = 'var(--sys-color-surface)';
        let activeBorder = 'var(--sys-color-outline-variant)';

        if (type === 'UNAV') {
            baseColor = 'var(--sys-color-error)';
            activeBg = '#fef2f2'; // Red-50
            activeBorder = baseColor;
        } else if (type === 'PREF') {
            baseColor = 'var(--sys-color-success)';
            activeBg = '#f0fdf4'; // Green-50
            activeBorder = baseColor;
        } else if (type === 'ERASER') {
            baseColor = 'var(--sys-color-on-surface)';
            activeBg = '#f3f4f6'; // Gray-100
            activeBorder = baseColor;
        }

        return (
            <button
                onClick={() => setConstraintTool({ type, slot })}
                style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '8px 12px',
                    borderRadius: 'var(--sys-shape-corner-medium)',
                    border: isActive ? `2px solid ${activeBorder}` : '1px solid var(--sys-color-outline-variant)',
                    background: isActive ? activeBg : 'white',
                    cursor: 'pointer',
                    minWidth: '60px',
                    opacity: (constraintTool && !isActive) ? 0.7 : 1,
                    transition: 'all 0.2s',
                    transform: isActive ? 'translateY(-2px)' : 'none',
                    boxShadow: isActive ? 'var(--sys-elevation-1)' : 'none'
                }}
            >
                <div style={{ marginBottom: '4px', color: isActive ? baseColor : 'var(--sys-color-on-surface)' }}>{icon}</div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--sys-color-on-surface)', textTransform: 'uppercase' }}>{label}</span>
            </button>
        );
    };

    return (
        <div style={{ padding: '0 1rem 2rem 1rem', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>

            {/* Generic Confirm Modal */}
            {confirmModal.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
                    <div style={{
                        background: 'white', padding: '1.5rem', borderRadius: '16px',
                        width: '90%', maxWidth: '400px',
                        boxShadow: 'var(--sys-elevation-3)',
                        border: '1px solid var(--sys-color-outline-variant)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', color: 'var(--sys-color-primary)' }}>
                            <Stethoscope size={24} />
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>{confirmModal.title}</h3>
                        </div>
                        <p style={{ color: 'var(--sys-color-on-surface-variant)', marginBottom: '1.5rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                            {confirmModal.message}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--sys-color-outline-variant)',
                                    background: 'white', color: 'var(--sys-color-on-surface)', fontWeight: '600', cursor: 'pointer'
                                }}
                            >
                                Annulla
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                                    background: 'var(--sys-color-primary)', color: 'var(--sys-color-on-primary)', fontWeight: '600', cursor: 'pointer'
                                }}
                            >
                                Conferma
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header / Person Selection */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 1.5rem 0', color: 'var(--sys-color-on-surface)' }}>Vincoli & Preferenze</h2>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {KNOWN_PEOPLE.map(p => (
                        <button
                            key={p}
                            onClick={() => setSelectedPerson(p)}
                            className="btn"
                            style={{
                                padding: '6px 16px',
                                background: selectedPerson === p ? 'var(--sys-color-primary)' : 'var(--sys-color-surface)',
                                color: selectedPerson === p ? 'var(--sys-color-on-primary)' : 'var(--sys-color-on-surface)',
                                border: selectedPerson === p ? 'none' : '1px solid var(--sys-color-outline-variant)',
                                boxShadow: selectedPerson === p ? 'var(--sys-elevation-1)' : 'none'
                            }}
                        >
                            {selectedPerson === p && <User size={14} />}
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {selectedPerson ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>

                    {/* LEFT COLUMN: Recurring Studio */}
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid var(--sys-color-outline-variant)', paddingBottom: '1rem' }}>
                            <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '50%', color: '#0369a1' }}>
                                <Stethoscope size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Studio Privato</h3>
                                <div style={{ fontSize: '0.85rem', color: 'var(--sys-color-outline)' }}>Turni fissi settimanali</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <button
                                onClick={promptLoadPrivateStudios}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    background: 'var(--sys-color-secondary-container)',
                                    color: 'var(--sys-color-on-secondary-container)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Stethoscope size={16} />
                                Carica Studi Privati
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {WEEKDAYS.map(day => (
                                <div key={day} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '8px', transition: 'background 0.2s' }}>
                                    <span style={{ fontWeight: '600', width: '40px', color: 'var(--sys-color-on-surface)' }}>{day}</span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {['AM', 'PM'].map(slot => {
                                            const active = isRecurringSelected(day, slot);
                                            return (
                                                <button
                                                    key={slot}
                                                    onClick={() => toggleRecurring(day, slot)}
                                                    style={{
                                                        padding: '6px 16px',
                                                        borderRadius: '8px',
                                                        border: active ? '1px solid var(--sys-color-error)' : '1px solid var(--sys-color-outline-variant)',
                                                        background: active ? '#fef2f2' : 'white',
                                                        color: active ? 'var(--sys-color-error)' : 'var(--sys-color-outline)',
                                                        fontWeight: '600',
                                                        fontSize: '0.8rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        minWidth: '60px'
                                                    }}
                                                >
                                                    {slot}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Calendar Grid */}
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--sys-color-outline-variant)', paddingBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: '#dcfce7', padding: '8px', borderRadius: '50%', color: '#15803d' }}>
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Disponibilità Mensile</h3>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--sys-color-outline)' }}>Clicca sui giorni per applicare lo strumento</div>
                                </div>
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div style={{
                            display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--sys-color-background)',
                            borderRadius: 'var(--sys-shape-corner-medium)', marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <ToolButton type="UNAV" slot="ALL" label="NO Tutto" icon={<Ban size={18} />} />
                                <ToolButton type="UNAV" slot="AM" label="NO Matt" icon={<Ban size={18} />} />
                                <ToolButton type="UNAV" slot="PM" label="NO Pom" icon={<Ban size={18} />} />
                            </div>
                            <div style={{ width: '1px', height: '32px', background: 'var(--sys-color-outline-variant)', margin: '0 8px' }}></div>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <ToolButton type="PREF" slot="ALL" label="SI Tutto" icon={<CheckCircle size={18} />} />
                                <ToolButton type="PREF" slot="AM" label="SI Matt" icon={<CheckCircle size={18} />} />
                                <ToolButton type="PREF" slot="PM" label="SI Pom" icon={<CheckCircle size={18} />} />
                            </div>
                            <div style={{ width: '1px', height: '32px', background: 'var(--sys-color-outline-variant)', margin: '0 8px' }}></div>
                            <ToolButton type="ERASER" slot="ALL" label="Cancella" icon={<Eraser size={18} />} />

                            <div style={{ flex: 1 }}></div>

                            <button
                                className="btn"
                                onClick={promptClearAllConstraints}
                                style={{
                                    border: '1px solid var(--sys-color-error)', background: '#fff1f2',
                                    color: 'var(--sys-color-error)', fontSize: '0.8rem'
                                }}
                            >
                                <Trash2 size={16} />
                                Reset
                            </button>
                        </div>

                        {/* Calendar Header */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.5rem', textAlign: 'center' }}>
                            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
                                <div key={i} style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--sys-color-outline)', padding: '8px' }}>{d}</div>
                            ))}
                        </div>

                        {/* Calendar Body */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                            {blanks.map((_, i) => <div key={`blank-${i}`}></div>)}

                            {days.map(d => {
                                const c = getDayConstraints(d.num);

                                let bg = 'white';
                                let border = 'var(--sys-color-outline-variant)';
                                let color = 'var(--sys-color-on-surface)';
                                let icon = null;
                                let subLabel = null;

                                if (c) {
                                    if (c.type === 'UNAV') {
                                        border = 'var(--sys-color-error)';
                                        color = 'var(--sys-color-error)';
                                        bg = '#fef2f2';
                                        icon = <Ban size={16} />;
                                    } else {
                                        border = 'var(--sys-color-success)';
                                        color = 'var(--sys-color-success)';
                                        bg = '#f0fdf4';
                                        icon = <CheckCircle size={16} />;
                                    }

                                    if (c.slot === 'AM') { bg = `linear-gradient(to bottom, ${bg} 50%, white 50%)`; subLabel = 'AM'; }
                                    if (c.slot === 'PM') { bg = `linear-gradient(to bottom, white 50%, ${bg} 50%)`; subLabel = 'PM'; }
                                }

                                return (
                                    <div
                                        key={d.num}
                                        onClick={() => toggleDate(d.num)}
                                        style={{
                                            aspectRatio: '1',
                                            border: `1px solid ${border}`,
                                            background: bg,
                                            borderRadius: '12px',
                                            padding: '6px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            boxShadow: c ? 'var(--sys-elevation-1)' : 'none',
                                            transition: 'transform 0.1s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>{d.name}</span>
                                            {icon}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            {subLabel && <span style={{ fontSize: '0.6rem', fontWeight: '900', color: color }}>{subLabel}</span>}
                                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: color, marginLeft: 'auto' }}>{d.num}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--sys-color-outline)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <User size={48} strokeWidth={1} />
                    Seleziona un medico per iniziare
                </div>
            )}
        </div>
    );
}
