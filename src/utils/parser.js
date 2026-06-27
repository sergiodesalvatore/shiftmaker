import mammoth from 'mammoth';

/**
 * Parses a Word file and returns extracted data.
 * @param {File} file - The uploaded .docx file
 * @returns {Promise<Object>} - Parsed shifts and metadata
 */
export async function parseShiftFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const arrayBuffer = event.target.result;
                const result = await mammoth.convertToHtml({ arrayBuffer });
                const rawHtml = result.value;

                // Parse HTML to extract table data
                const parser = new DOMParser();
                const doc = parser.parseFromString(rawHtml, 'text/html');
                const table = doc.querySelector('table');

                if (!table) {
                    throw new Error("Nessuna tabella trovata nel file");
                }

                const { headers, rows } = parseTableStructure(table);
                const parsedData = processShiftData(headers, rows);

                resolve({
                    rawHtml,
                    ...parsedData
                });
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}

function parseTableStructure(table) {
    const rows = Array.from(table.querySelectorAll('tr'));

    const rawRows = rows.map(tr => {
        return Array.from(tr.querySelectorAll('td, th')).map(td => {
            // Extract text content, handling paragraphs as newlines
            return Array.from(td.querySelectorAll('p')).map(p => p.textContent.trim()).join('\n') || td.textContent.trim();
        });
    });

    return {
        headers: rawRows.slice(0, 2), // First 2 rows assumed headers
        rows: rawRows.slice(2)        // Data rows
    };
}

function processShiftData(headers, rawRows) {
    const shifts = [];
    const people = new Set();

    // Check if new system (Guardia columns exist in headers)
    let isNewSystem = false;
    if (headers && headers.length > 0) {
        headers.forEach(row => {
            row.forEach(cell => {
                if (cell && cell.toUpperCase().includes('GUARDIA')) {
                    isNewSystem = true;
                }
            });
        });
    }

    const COL_MAP = [
        { key: 'day_num', label: 'Giorno' },
        { key: 'day_name', label: 'D' },
        { key: 'amb_m', label: 'Ambulatorio Mattina', type: 'AMBULATORIO_08-14' },
        { key: 'amb_p', label: 'Ambulatorio Pom', type: 'AMBULATORIO_14-19' },
        { key: 'rep', label: 'Reparto', type: 'REPARTO_08-14' },
        { key: 'bald', label: 'Bald', type: 'BALD_08-14' },
        { key: 'dh', label: 'DH', type: 'DH_08-14' },
        { key: 'cons', label: 'Cons', type: 'CONS_08-14' },
        { key: 'sala_m', label: 'Sala Op Mattina', type: 'SALA_OP_08-14' },
        { key: 'sala_p', label: 'Sala Op Pom', type: 'SALA_OP_14-19' },
        { key: 'sala_ds', label: 'Sala DS', type: 'SALA_DS_08-14' },
        { key: 'nora', label: 'Nora', type: 'NORA_08-14' },
        { key: 'sm', label: 'SM', type: 'SM_08-14' },
        { key: 'ps', label: 'PS', type: 'PS_08-14' },
    ];

    if (isNewSystem) {
        COL_MAP.push({ key: 'guardia', label: 'Guardia', type: 'GUARDIA_08-20' });
        COL_MAP.push({ key: 'guardia_notte', label: 'Guardia Notte', type: 'GUARDIA_NOTTE_20-08' });
        COL_MAP.push({ key: 'rep_2', label: '2 Rep', type: 'REP_2' });
        COL_MAP.push({ key: 'ferie', label: 'Ferie/Altro', type: 'FERIE' });
    } else {
        COL_MAP.push({ key: 'ps_cont', label: 'PS Cont', type: 'PS_CONT_14-20' });
        COL_MAP.push({ key: 'rep_2', label: '2 Rep', type: 'REP_2' });
        COL_MAP.push({ key: 'ferie', label: 'Ferie/Altro', type: 'FERIE' });
    }

    rawRows.forEach((row, rowIndex) => {
        if (row.length < 2) return;

        const dayNum = row[0];
        if (!dayNum || isNaN(parseInt(dayNum))) return;

        const dateId = `${dayNum}-${rowIndex}`;

        row.forEach((cellContent, colIndex) => {
            // Include Col 1 (Day Name) now!
            if (colIndex === 0) return; // Skip only day num

            // Special handling for Day Name (Col 1)
            if (colIndex === 1) {
                shifts.push({
                    id: `${dateId}-dayname`,
                    day: dayNum,
                    type: 'DAY_NAME',
                    label: 'Day Name',
                    content: cellContent,
                    rawColumnIndex: colIndex
                });
                return;
            }

            // Robust Column Mapping: Merge any column >= lastIndex into the "Ferie" slot
            const lastIndex = COL_MAP.length - 1;
            let effectiveIndex = colIndex;
            if (colIndex >= lastIndex) {
                effectiveIndex = lastIndex;
            } else if (colIndex >= COL_MAP.length) {
                return;
            }

            const colDef = COL_MAP[effectiveIndex];

            // Normal Shifts
            const entries = cellContent.split(/\n/).map(s => s.trim()).filter(Boolean);

            entries.forEach(entry => {
                // Heuristic to extract people for the "people" set (just for metadata)
                const tokens = entry.split(/\s+/);
                tokens.forEach(t => {
                    const clean = t.replace(/[()]/g, '');
                    if (clean.length >= 2 && clean === clean.toUpperCase()) {
                        people.add(clean);
                    }
                });

                shifts.push({
                    id: `${dateId}-${colIndex}-${Math.random().toString(36).substr(2, 9)}`,
                    day: dayNum,
                    type: colDef.type,
                    label: colDef.label,
                    content: entry,
                    rawColumnIndex: colIndex
                });
            });
        });
    });

    return {
        headers: headers,
        shifts: shifts,
        people: Array.from(people).sort()
    };
}
