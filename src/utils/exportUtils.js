import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, BorderStyle, ShadingType } from "docx";
import { saveAs } from "file-saver";

export const exportShiftsToWord = (shiftsByDay, daysToRender, isNewGuardSystem = false) => {
    try {
        const headerGroups = [
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
        ];

        if (isNewGuardSystem) {
            headerGroups.push({ label: 'GUARDIA', colSpan: 1, subHeaders: ['08 - 20'], indices: [14] });
            headerGroups.push({ label: 'GUARDIA NOTTE', colSpan: 1, subHeaders: ['20 - 08'], indices: [15] });
            headerGroups.push({ label: '2° REP', colSpan: 1, subHeaders: [''], indices: [16] });
            headerGroups.push({ label: "FERIE E ALTRE ATTIVITA'", colSpan: 1, subHeaders: [''], indices: [17] });
        } else {
            headerGroups.push({ label: 'CONT+REP PS', colSpan: 1, subHeaders: ['14 - 08'], indices: [14] });
            headerGroups.push({ label: '2° REP', colSpan: 1, subHeaders: [''], indices: [15] });
            headerGroups.push({ label: "FERIE E ALTRE ATTIVITA'", colSpan: 1, subHeaders: [''], indices: [16] });
        }

        // 1. Create Header Rows
        const headerRow1Cells = [];
        const headerRow2Cells = [];

        headerGroups.forEach(group => {
            // Row 1 Cell
            headerRow1Cells.push(new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: group.label, bold: true, size: 13, font: "Times New Roman" })], // 13 half-points = 6.5pt
                    alignment: "center"
                })],
                columnSpan: group.colSpan,
                shading: { fill: "F0F0F0", type: ShadingType.CLEAR, color: "auto" },
            }));

            // Row 2 Cells (Subheaders) or Empty if merged conceptually
            if (group.indices) {
                group.indices.forEach((colIdx, i) => {
                    let subText = (group.subHeaders && group.subHeaders[i]) || "";

                    headerRow2Cells.push(new TableCell({
                        children: [new Paragraph({
                            children: [new TextRun({ text: subText, size: 13, font: "Times New Roman" })], // 13 half-points = 6.5pt
                            alignment: "center"
                        })],
                        shading: { fill: "F8F8F8", type: ShadingType.CLEAR, color: "auto" },
                        width: { size: 100, type: WidthType.AUTO }
                    }));
                });
            }
        });

        // 2. Create Data Rows
        const maxCol = isNewGuardSystem ? 17 : 16;
        const dataRows = daysToRender.map(day => {
            const isWeekend = isWeekendDay(day, shiftsByDay);
            const rowColor = isWeekend ? "D1D5DB" : "FFFFFF"; // Gray or White

            const cells = [];

            // Day Number (Col 0)
            cells.push(createDataCell(day.toString(), true, "E5E7EB"));

            // Day Name (Col 1)
            const dayNameRaw = shiftsByDay[day]?.[1]?.[0]?.content || '';
            cells.push(createDataCell(dayNameRaw, true, "E5E7EB"));

            // Data Cols (2 to maxCol)
            for (let col = 2; col <= maxCol; col++) {
                const cellShifts = shiftsByDay[day]?.[col] || [];
                const content = cellShifts.map(s => s.content.trim()).join(" ");
                cells.push(createDataCell(content, false, rowColor));
            }

            return new TableRow({
                children: cells
            });
        });

        const table = new Table({
            rows: [
                new TableRow({ children: headerRow1Cells }),
                new TableRow({ children: headerRow2Cells }),
                ...dataRows
            ],
            width: {
                size: 100,
                type: WidthType.PERCENTAGE,
            },
        });

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        size: {
                            orientation: "landscape", // Set Horizontal
                        },
                        margin: {
                            top: 500, // Twips
                            right: 500,
                            bottom: 500,
                            left: 500
                        }
                    }
                },
                children: [table],
            }],
        });

        Packer.toBlob(doc).then((blob) => {
            saveAs(blob, "Turni_Export.docx");
        }).catch(err => {
            console.error("Error generating blob:", err);
            alert("Errore durante la generazione del file Word: " + err.message);
        });
    } catch (error) {
        console.error("Critical error in exportShiftsToWord:", error);
        alert("Errore critico export: " + error.message);
    }
};

function createDataCell(text, bold, fillColor) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text: text || "", bold: bold, size: 13, font: "Times New Roman" })], // 13 half-points = 6.5pt
            alignment: "center"
        })],
        shading: { fill: fillColor, type: ShadingType.CLEAR, color: "auto" },
    });
}

function isWeekendDay(day, shiftsByDay) {
    const dayNameRaw = shiftsByDay[day]?.[1]?.[0]?.content?.trim().toUpperCase() || '';
    return ['S', 'D', 'SA', 'DO', 'SAB', 'DOM'].some(x => dayNameRaw.startsWith(x));
}
