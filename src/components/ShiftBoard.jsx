import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Download, RefreshCw, FilePlus, Edit, Plus, X, Check, Copy } from 'lucide-react';
import { validateShift } from '../utils/validator';
import { KNOWN_PEOPLE } from '../utils/constants';
import { exportShiftsToWord } from '../utils/exportUtils';

const getColWidths = (isNewGuardSystem) => {
    const widths = [
        50, 50, // Data, Giorno (0, 1)
        200, 200, // Ambulatorio (2, 3)
        80, 80, 80, 80, // Reparto, Bald, DH, Cons (4, 5, 6, 7)
        200, 200, // Sala Op (8, 9)
        80, 80, 80, // Sala DS, Nora, SM (10, 11, 12)
        200, // PS (13)
        200, // CONT+REP PS or GUARDIA (14)
    ];
    if (isNewGuardSystem) {
        widths.push(200); // GUARDIA NOTTE (15)
    }
    widths.push(80); // 2 Rep (15 or 16)
    widths.push(180); // Ferie (16 or 17)
    widths.push(150); // Fuori Turno (17 or 18)
    return widths;
};

export default function ShiftBoard({ data, onReset, onShiftsChange, constraints, month, year }) {
    const shifts = data.shifts;
    const isNewGuardSystem = year >= 2027;
    const [colWidths, setColWidths] = useState(() => getColWidths(isNewGuardSystem));
    const [editingCell, setEditingCell] = useState(null); // includes { position: {top,left...} }
    const [newItemText, setNewItemText] = useState('');
    const [showDuplicates, setShowDuplicates] = useState(false);

    useEffect(() => {
        setColWidths(getColWidths(isNewGuardSystem));
    }, [isNewGuardSystem]);

    const headerGroups = useMemo(() => {
        const groups = [
            { label: 'DATA', colSpan: 2, indices: [0, 1] },
            { label: 'AMBULATORIO', colSpan: 2, subHeaders: ['08 - 14', '14 - 19'], indices: [2, 3] },
            { label: 'REPARTO', colSpan: 1, subHeaders: ['08 - 14'], indices: [4] },
            { label: 'BALD', colSpan: 1, subHeaders: ['08 - 14'], indices: [5] },
            { label: 'DH', colSpan: 1, subHeaders: ['08 - 14'], indices: [6] },
            { label: 'CONS', colSpan: 1, subHeaders: ['08 - 14'], indices: [7] },
            { label: 'SALA OPERATORIA', colSpan: 2, subHeaders: ['08 - 14', '14-19'], indices: [8, 9] },
            { label: 'SALA DS', colSpan: 1, subHeaders: ['08 - 14'], indices: [10] },
            { label: 'NORA', colSpan: 1, subHeaders: ['08 - 14'], indices: [11] },
            { label: 'S.M.', colSpan: 1, subHeaders: ['08 - 14'], indices: [12] },
            { label: 'PS', colSpan: 1, subHeaders: ['08 - 14'], indices: [13] },
            isNewGuardSystem 
                ? { label: 'GUARDIA', colSpan: 1, subHeaders: ['08 - 20'], indices: [14] }
                : { label: 'CONT+REP PS', colSpan: 1, subHeaders: ['14 - 08'], indices: [14] }
        ];
        if (isNewGuardSystem) {
            groups.push({ label: 'GUARDIA NOTTE', colSpan: 1, subHeaders: ['20 - 08'], indices: [15] });
        }
        
        const offset = isNewGuardSystem ? 1 : 0;
        groups.push({ label: '2° REP', colSpan: 1, subHeaders: [''], indices: [15 + offset] });
        groups.push({ label: "FERIE E ALTRE ATTIVITA'", colSpan: 1, subHeaders: [''], indices: [16 + offset] });
        groups.push({ label: "FUORI TURNO", colSpan: 1, subHeaders: [''], indices: [17 + offset] });
        return groups;
    }, [isNewGuardSystem]);

    // Resizing State
    const resizingRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!resizingRef.current) return;
            const { index, startX, startWidth } = resizingRef.current;
            const diff = e.clientX - startX;
            const newWidth = Math.max(40, startWidth + diff);
            setColWidths(prev => {
                const next = [...prev];
                next[index] = newWidth;
                return next;
            });
        };
        const handleMouseUp = () => {
            resizingRef.current = null;
            document.body.style.cursor = 'default';
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const startResize = (index, e) => {
        e.preventDefault(); e.stopPropagation();
        resizingRef.current = { index, startX: e.clientX, startWidth: colWidths[index] };
        document.body.style.cursor = 'col-resize';
    };

    const shiftsByDay = useMemo(() => {
        const map = {};
        shifts.forEach(s => {
            if (!map[s.day]) map[s.day] = {};
            const typeIndex = s.rawColumnIndex;
            if (!map[s.day][typeIndex]) map[s.day][typeIndex] = [];
            map[s.day][typeIndex].push(s);
        });
        return map;
    }, [shifts]);

    const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
    const daysToRender = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

    // --- Drag/Drop ---
    const handleDragStart = (e, token, tokenIdx, sourceDay, sourceColIndex, sourceShiftId) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ token, tokenIdx, sourceDay, sourceColIndex, sourceShiftId }));
        e.stopPropagation();
    };
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    
    const handleDropOnCell = (e, targetDay, targetColIndex) => {
        e.preventDefault(); e.stopPropagation();
        const dataStr = e.dataTransfer.getData('text/plain');
        if (!dataStr) return;
        const { token, sourceDay, sourceColIndex, sourceShiftId } = JSON.parse(dataStr);
        if (sourceDay === targetDay && sourceColIndex === targetColIndex) return;

        const sourceShift = shifts.find(s => s.id === sourceShiftId);
        const newSourceContent = sourceShift.content.split(/\s+/).filter(t => t !== token).join(' ').trim();
        const newShift = {
            id: `${targetDay}-${targetColIndex}-${Math.random().toString(36).substr(2, 9)}`,
            day: targetDay.toString(),
            type: 'MOVED',
            label: 'Moved',
            content: token,
            rawColumnIndex: targetColIndex
        };
        let newAllShifts = shifts.filter(s => s.id !== sourceShiftId);
        if (newSourceContent) newAllShifts.push({ ...sourceShift, content: newSourceContent });
        newAllShifts.push(newShift);
        if (onShiftsChange) onShiftsChange(newAllShifts);
    };

    const handleDropOnToken = (e, targetDay, targetColIndex, targetTokenIdx, targetShiftId) => {
        e.preventDefault(); e.stopPropagation();
        const dataStr = e.dataTransfer.getData('text/plain');
        if (!dataStr) return;
        const { tokenIdx: sourceIdx, sourceDay, sourceColIndex, sourceShiftId } = JSON.parse(dataStr);
        
        // REORDER within same cell and same shift
        if (sourceDay === targetDay && sourceColIndex === targetColIndex && sourceShiftId === targetShiftId) {
            if (sourceIdx === targetTokenIdx) return;
            
            const targetShift = shifts.find(s => s.id === targetShiftId);
            const tokens = targetShift.content.split(/\s+/).filter(Boolean);
            
            // Remove from old pos and insert at new pos
            const [removed] = tokens.splice(sourceIdx, 1);
            tokens.splice(targetTokenIdx, 0, removed);
            
            const newAllShifts = shifts.map(s => s.id === targetShiftId ? { ...s, content: tokens.join(' ') } : s);
            if (onShiftsChange) onShiftsChange(newAllShifts);
            return;
        }

        // Drop on a token in a different cell behaves like dropping on the cell itself
        handleDropOnCell(e, targetDay, targetColIndex);
    };

    // --- Editing / Context Menu ---
    const handleCellClick = (e, day, colIndex, currentShifts) => {
        e.stopPropagation();
        const allContent = currentShifts.map(s => s.content).join(' ');
        const tokens = allContent.split(/\s+/).filter(t => t.length > 0);

        // Calculate Position
        const x = e.clientX;
        const y = e.clientY;
        const isNearBottom = y > window.innerHeight * 0.6;
        const isNearRight = x > window.innerWidth * 0.7;

        setEditingCell({
            day,
            colIndex,
            currentTokens: tokens,
            rawShifts: currentShifts,
            position: {
                top: isNearBottom ? 'auto' : y,
                bottom: isNearBottom ? (window.innerHeight - y) : 'auto',
                left: isNearRight ? 'auto' : x,
                right: isNearRight ? (window.innerWidth - x) : 'auto'
            }
        });
        setNewItemText('');
    };

    const handleAddText = () => {
        if (!newItemText.trim()) return;
        setEditingCell(prev => ({ ...prev, currentTokens: [...prev.currentTokens, newItemText.trim().toUpperCase()] }));
        setNewItemText('');
    };

    const saveSelection = (selectedPeople) => {
        if (!editingCell) return;
        const { day, colIndex } = editingCell;
        const remaining = shifts.filter(s => !(s.day == day && s.rawColumnIndex == colIndex));
        const newShifts = selectedPeople.map(p => ({
            id: `${day}-${colIndex}-${Math.random().toString(36).substr(2, 9)}`,
            day: day.toString(),
            type: 'MANUAL_SEL',
            label: 'Manual Selection',
            content: p,
            rawColumnIndex: colIndex
        }));
        if (onShiftsChange) onShiftsChange([...remaining, ...newShifts]);
        setEditingCell(null);
    };

    const getNormalizedDayName = (day, shiftsByDayMap) => {
        const raw = shiftsByDayMap[day]?.[1]?.[0]?.content?.trim().toUpperCase() || '';
        if (raw.startsWith('L')) return 'L';
        if (raw.startsWith('MA')) return 'MA';
        if (raw.startsWith('ME')) return 'ME';
        if (raw.startsWith('G')) return 'G';
        if (raw.startsWith('V')) return 'V';
        if (raw.startsWith('S') && !raw.startsWith('SA')) return 'S';
        if (raw.startsWith('SA')) return 'S';
        if (raw.startsWith('D')) return 'D';
        return raw;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.5rem' }}>
                <h2 style={{ color: 'var(--sys-color-on-surface)', margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Turni Mensili
                </h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                        <input
                            type="checkbox"
                            checked={showDuplicates}
                            onChange={(e) => setShowDuplicates(e.target.checked)}
                            style={{
                                appearance: 'none',
                                width: '1rem',
                                height: '1rem',
                                border: '2px solid var(--sys-color-outline)',
                                borderRadius: '4px',
                                display: 'grid',
                                placeContent: 'center',
                                color: 'white'
                            }}
                            className={showDuplicates ? 'checked-box' : ''}
                        />
                        <span style={{ color: showDuplicates ? 'var(--sys-color-primary)' : 'inherit' }}>Evidenzia Duplicati</span>
                        {/* Inline style hack for custom checkbox appearance */}
                        <style>{`
                            input[type="checkbox"]:checked {
                                background-color: var(--sys-color-primary);
                                border-color: var(--sys-color-primary) !important;
                            }
                        `}</style>
                    </label>

                    <button className="btn btn-primary" onClick={() => exportShiftsToWord(shiftsByDay, daysToRender, isNewGuardSystem)}>
                        <Download size={16} />
                        Esporta Turni
                    </button>

                    <button className="btn btn-tonal-surface" onClick={onReset} style={{ color: 'var(--sys-color-error)', borderColor: 'var(--sys-color-error)' }}>
                        <RefreshCw size={16} />
                        Nuovo File
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--sys-color-outline-variant)', borderRadius: 'var(--sys-shape-corner-medium)' }}>
                <table style={{ minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.8125rem', tableLayout: 'fixed' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                        {/* Group Header */}
                        <tr style={{ background: 'var(--sys-color-surface)' }}>
                            {headerGroups.map((group, i) => (
                                <th key={i} colSpan={group.colSpan} style={{
                                    padding: '8px',
                                    borderBottom: '1px solid var(--sys-color-outline)',
                                    borderRight: '1px solid var(--sys-color-outline-variant)',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    fontSize: '0.75rem',
                                    color: 'var(--sys-color-on-surface)',
                                    background: 'var(--sys-color-background)'
                                }}>
                                    {group.label}
                                </th>
                            ))}
                        </tr>
                        {/* Column Header */}
                        <tr style={{ background: 'var(--sys-color-surface)' }}>
                            {[
                                { w: colWidths[0], idx: 0 }, { w: colWidths[1], idx: 1 },
                                ...headerGroups.slice(1).flatMap(group => group.subHeaders.map((sub, i) => ({ w: colWidths[group.indices[i]], idx: group.indices[i], label: sub })))
                            ].map((col, i) => (
                                <th key={i} style={{
                                    width: col.w,
                                    borderBottom: '2px solid var(--sys-color-outline)',
                                    borderRight: '1px solid var(--sys-color-outline-variant)',
                                    padding: '4px',
                                    background: '#ffffff',
                                    position: 'relative'
                                }}>
                                    {col.label || ''}
                                    <div
                                        onMouseDown={(e) => startResize(col.idx, e)}
                                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', cursor: 'col-resize', zIndex: 10, background: 'transparent' }}
                                        className="resizer-handle"
                                    ></div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {daysToRender.map((day, rowIdx) => {
                            const dayName = getNormalizedDayName(day, shiftsByDay);
                            const dayNameRaw = shiftsByDay[day]?.[1]?.[0]?.content || '';
                            const isWeekend = ['S', 'D', 'SA', 'DO', 'SAB', 'DOM'].some(x => dayName.startsWith(x));
                            const rowBg = isWeekend ? '#f0f2f5' : 'white';

                            // Check duplicates
                            const rowTokens = [];
                            const maxCol = isNewGuardSystem ? 17 : 16;
                            for (let c = 2; c <= maxCol; c++) {
                                const cellShifts = shiftsByDay[day]?.[c] || [];
                                cellShifts.forEach(s => s.content.split(/\s+/).filter(Boolean).forEach(t => rowTokens.push(t)));
                            }
                            const rowCounts = {};
                            rowTokens.forEach(t => rowCounts[t] = (rowCounts[t] || 0) + 1);

                            // Missing in outside duties
                            const missingPeople = KNOWN_PEOPLE.filter(p => !rowTokens.includes(p));

                            return (
                                <tr key={day} style={{ background: rowBg }}>
                                    <td style={{ borderBottom: '1px solid var(--sys-color-outline-variant)', borderRight: '1px solid var(--sys-color-outline-variant)', fontWeight: 'bold', background: 'var(--sys-color-background)', textAlign: 'center', padding: '4px' }}>{day}</td>
                                    <td style={{ borderBottom: '1px solid var(--sys-color-outline-variant)', borderRight: '1px solid var(--sys-color-outline-variant)', fontWeight: 'bold', background: 'var(--sys-color-background)', textAlign: 'center', padding: '4px' }}>{dayNameRaw}</td>

                                    {Array.from({ length: isNewGuardSystem ? 16 : 15 }).map((_, i) => {
                                        const colIndex = i + 2;
                                        const cellShifts = shiftsByDay[day]?.[colIndex] || [];
                                        const width = colWidths[colIndex];

                                        const checkType = (idx) => {
                                            const types = {
                                                2: 'AMBULATORIO_08-14', 3: 'AMBULATORIO_14-19',
                                                4: 'REPARTO_08-14', 5: 'BALD_08-14',
                                                6: 'DH_08-14', 7: 'CONS_08-14',
                                                8: 'SALA_OP_08-14', 9: 'SALA_OP_14-19',
                                                10: 'SALA_DS_08-14', 11: 'NORA_08-14',
                                                12: 'SM_08-14', 13: 'PS_08-14'
                                            };
                                            if (isNewGuardSystem) {
                                                types[14] = 'GUARDIA_08-20';
                                                types[15] = 'GUARDIA_NOTTE_20-08';
                                                types[16] = 'REP_2';
                                                types[17] = 'FERIE';
                                            } else {
                                                types[14] = 'PS_CONT_14-20';
                                                types[15] = 'REP_2';
                                                types[16] = 'FERIE';
                                            }
                                            return types[idx] || 'GENERIC';
                                        };

                                        return (
                                            <td key={colIndex} onClick={(e) => handleCellClick(e, day, colIndex, cellShifts)}
                                                style={{
                                                    borderBottom: '1px solid var(--sys-color-outline-variant)',
                                                    borderRight: '1px solid var(--sys-color-outline-variant)',
                                                    verticalAlign: 'top',
                                                    padding: '2px',
                                                    cursor: 'pointer',
                                                    width: width,
                                                    background: 'transparent'
                                                }}
                                                onDragOver={handleDragOver} onDrop={(e) => handleDropOnCell(e, day, colIndex)}
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '2px' }}>
                                                    {cellShifts.map((shift, shiftIdx) => (
                                                        <div key={shift.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2px', borderBottom: shiftIdx < cellShifts.length - 1 ? '1px dotted #ccc' : 'none' }}>
                                                            {shift.content.split(/\s+/).filter(Boolean).map((token, tIdx) => {
                                                                const hasDuplicate = rowCounts[token] > 1;
                                                                const isDuplicateHighlight = showDuplicates && hasDuplicate;
                                                                const validation = validateShift(token, day, dayName, checkType(colIndex), constraints, shiftsByDay, year, month);

                                                                let bg = 'var(--sys-color-primary-container)';
                                                                let color = 'var(--sys-color-on-primary-container)';
                                                                let border = 'none';

                                                                if (validation.status === 'ERROR') {
                                                                    bg = 'var(--sys-color-orange)';
                                                                    color = 'white';
                                                                } else if (isDuplicateHighlight) {
                                                                    bg = 'var(--sys-color-warning)';
                                                                    color = '#000';
                                                                } else if (validation.status === 'PREFERENCE') {
                                                                    bg = 'var(--sys-color-success)';
                                                                    color = 'white';
                                                                }

                                                                // Build a detailed tooltip explanation
                                                                const tooltipParts = [];
                                                                if (hasDuplicate) {
                                                                    tooltipParts.push(`⚠️ Doppione: ${token} è assegnato a più turni in questa data`);
                                                                }
                                                                if (validation.message) {
                                                                    tooltipParts.push(validation.message);
                                                                }
                                                                const tooltipText = tooltipParts.length > 0 
                                                                    ? tooltipParts.join('\n') 
                                                                    : 'Trascina per spostare o riordinare';

                                                                return (
                                                                    <span key={tIdx} draggable 
                                                                        onDragStart={(e) => handleDragStart(e, token, tIdx, day, colIndex, shift.id)}
                                                                        onDragOver={handleDragOver}
                                                                        onDrop={(e) => handleDropOnToken(e, day, colIndex, tIdx, shift.id)}
                                                                        title={tooltipText}
                                                                        style={{
                                                                            background: bg, color: color, border: border,
                                                                            padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600,
                                                                            cursor: 'grab', borderRadius: '4px',
                                                                            display: 'inline-block'
                                                                        }}>
                                                                        {token}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        );
                                    })}

                                    {/* Off Duty (Col 17 or 18) */}
                                    <td style={{ borderBottom: '1px solid var(--sys-color-outline-variant)', borderRight: '1px solid var(--sys-color-outline-variant)', padding: '2px', verticalAlign: 'middle', background: '#fff0f2', width: colWidths[isNewGuardSystem ? 18 : 17] }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', justifyContent: 'center' }}>
                                            {missingPeople.map(p => (
                                                <span key={p} style={{ fontSize: '10px', background: 'white', border: '1px solid #ffccd5', padding: '1px 3px', borderRadius: '2px', color: '#be123c' }}>{p}</span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Context Menu Popover */}
            {editingCell && (
                <>
                    <div
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998, cursor: 'default' }}
                        onClick={() => setEditingCell(null)}
                    />
                    <div className="card" style={{
                        position: 'fixed',
                        top: editingCell.position?.top,
                        left: editingCell.position?.left,
                        bottom: editingCell.position?.bottom,
                        right: editingCell.position?.right,
                        zIndex: 9999,
                        padding: '1rem',
                        boxShadow: 'var(--sys-elevation-2)',
                        width: '320px',
                        maxHeight: '400px',
                        display: 'flex',
                        flexDirection: 'column'
                    }} onClick={e => e.stopPropagation()}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--sys-color-outline-variant)', paddingBottom: '0.5rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--sys-color-on-surface)' }}>Modifica {editingCell.dayName}</h4>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-ghost" onClick={() => setEditingCell(null)} style={{ padding: '4px', height: 'auto' }}>
                                    <X size={16} />
                                </button>
                                <button className="btn btn-primary" onClick={() => saveSelection(editingCell.currentTokens)} style={{ padding: '4px 12px', fontSize: '0.75rem', height: '28px' }}>
                                    Salva
                                </button>
                            </div>
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '1rem' }}>
                                {KNOWN_PEOPLE.map(p => {
                                    const isSelected = editingCell.currentTokens.includes(p);
                                    return (
                                        <button key={p} onClick={() => {
                                            const sel = isSelected ? editingCell.currentTokens.filter(x => x !== p) : [...editingCell.currentTokens, p];
                                            setEditingCell({ ...editingCell, currentTokens: sel });
                                        }} style={{
                                            background: isSelected ? 'var(--sys-color-primary)' : 'var(--sys-color-surface)',
                                            color: isSelected ? 'var(--sys-color-on-primary)' : 'var(--sys-color-on-surface)',
                                            border: `1px solid ${isSelected ? 'transparent' : 'var(--sys-color-outline-variant)'}`,
                                            borderRadius: '6px',
                                            padding: '6px 0',
                                            fontSize: '0.75rem',
                                            fontWeight: isSelected ? 'bold' : '500',
                                            cursor: 'pointer',
                                            transition: 'all 0.1s'
                                        }}>{p}</button>
                                    );
                                })}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <input
                                    className="input-base"
                                    value={newItemText}
                                    onChange={e => setNewItemText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddText()}
                                    placeholder="Altro..."
                                    autoFocus
                                    style={{ flex: 1, fontSize: '0.875rem' }}
                                />
                                <button className="btn btn-secondary" onClick={handleAddText} style={{ padding: '0 12px' }}>
                                    <Plus size={16} />
                                </button>
                            </div>

                            <div style={{ background: 'var(--sys-color-background)', padding: '0.5rem', borderRadius: 'var(--sys-shape-corner-medium)', minHeight: '2rem', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {editingCell.currentTokens.length === 0 && <span style={{ color: 'var(--sys-color-outline)', fontSize: '0.75rem', fontStyle: 'italic', width: '100%', textAlign: 'center' }}>Nessuna selezione</span>}
                                {editingCell.currentTokens.map((t, idx) => (
                                    <span key={idx} style={{ background: 'white', border: '1px solid var(--sys-color-outline-variant)', borderRadius: '100px', padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                        {t}
                                        <button onClick={() => setEditingCell(prev => ({ ...prev, currentTokens: prev.currentTokens.filter((_, i) => i !== idx) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--sys-color-outline)' }}>
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
