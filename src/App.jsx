import React, { useState } from 'react';
import { Calendar, Settings, BarChart3, Upload, X, Download, Archive, Sparkles } from 'lucide-react';
import Layout from './components/Layout';
import FileUpload from './components/FileUpload';
import ShiftBoard from './components/ShiftBoard';
import ConstraintsPanel from './components/ConstraintsPanel';
import StatsTable from './components/StatsTable';
import HistoryPanel from './components/HistoryPanel';
import ExportPanel from './components/ExportPanel';
import VacationPanel from './components/VacationPanel';
import AutoPlannerPanel from './components/AutoPlannerPanel';
import { parseShiftFile } from './utils/parser';
import { KNOWN_PEOPLE } from './utils/constants';
import { regenerateDayNames } from './utils/calendar';

function AppContent({ initialData, onReset }) {
  const [shifts, setShifts] = useState(initialData.shifts);
  const [constraints, setConstraints] = useState(initialData.constraints || {});
  const [vacationData, setVacationData] = useState(initialData.vacationData || { requests: [], baseRequired: 5, exceptions: [] });
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'constraints', 'stats', 'vacations', 'autoplanner'

  const [month, setMonth] = useState(() => {
    if (initialData.month) return parseInt(initialData.month);
    const currentDate = new Date();
    let defaultMonth = currentDate.getMonth() + 2; 
    if (defaultMonth > 12) defaultMonth = 1;
    return defaultMonth;
  });

  const [year, setYear] = useState(() => {
    if (initialData.year) return parseInt(initialData.year);
    const currentDate = new Date();
    let defaultMonth = currentDate.getMonth() + 2; 
    let defaultYear = currentDate.getFullYear();
    if (defaultMonth > 12) defaultYear += 1;
    return defaultYear;
  });

  React.useEffect(() => {
    const hasDayNames = shifts.some(s => s.type === 'DAY_NAME');
    if (!hasDayNames && shifts.length === 0) {
      setShifts(regenerateDayNames(year, month, []));
    }
  }, []);

  // Extract unique days for constraints panel
  const uniqueDays = React.useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const list = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dayName = dateObj.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase().replace('.', '');
      list.push({ num: d, name: dayName });
    }
    return list;
  }, [year, month]);

  const handleConstraintsUpdate = (person, newConstraints) => {
    setConstraints(prev => ({
      ...prev,
      [person]: newConstraints
    }));
  };

  const downloadSession = () => {
    const sessionData = {
      shifts,
      people: initialData.people,
      constraints,
      vacationData,
      month,
      year,
      timestamp: new Date().toISOString(),
      type: 'SHIFTMAKER_SESSION'
    };

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shiftmaker-session-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <h1 style={{ fontSize: '1.25rem', color: 'var(--sys-color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            ShiftMaker
          </h1>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select 
              value={month} 
              onChange={e => {
                const newMonth = parseInt(e.target.value);
                setMonth(newMonth);
                setShifts(prev => regenerateDayNames(year, newMonth, prev));
              }}
              className="input-base"
              style={{ padding: '4px 8px', fontSize: '0.9rem', width: 'auto', background: 'white' }}
            >
              {['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <input 
              type="number" 
              value={year} 
              onChange={e => {
                const newYear = parseInt(e.target.value);
                setYear(newYear);
                setShifts(prev => regenerateDayNames(newYear, month, prev));
              }}
              className="input-base"
              style={{ padding: '4px 8px', fontSize: '0.9rem', width: '80px', background: 'white' }}
            />
          </div>

          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              <Calendar size={18} />
              Calendario
            </button>
            <button
              className={`nav-tab ${activeTab === 'autoplanner' ? 'active' : ''}`}
              onClick={() => setActiveTab('autoplanner')}
            >
              <Sparkles size={18} />
              Auto-Planner
            </button>
            <button
              className={`nav-tab ${activeTab === 'constraints' ? 'active' : ''}`}
              onClick={() => setActiveTab('constraints')}
            >
              <Settings size={18} />
              Vincoli
            </button>
            <button
              className={`nav-tab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <BarChart3 size={18} />
              Statistiche
            </button>
            <button
              className={`nav-tab ${activeTab === 'historical' ? 'active' : ''}`}
              onClick={() => setActiveTab('historical')}
            >
              <Archive size={18} />
              Storico
            </button>
            <button
              className={`nav-tab ${activeTab === 'vacations' ? 'active' : ''}`}
              onClick={() => setActiveTab('vacations')}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>🌴</span>
              Ferie Estive
            </button>
            <button
              className={`nav-tab ${activeTab === 'export' ? 'active' : ''}`}
              onClick={() => setActiveTab('export')}
            >
              <Download size={18} />
              Esporta
            </button>
          </nav>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={downloadSession}>
            <Download size={18} />
            Salva Sessione
          </button>
          <button className="btn btn-danger" onClick={onReset}>
            <X size={18} />
            Chiudi File
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {activeTab === 'calendar' && (
          <div className="card" style={{ padding: '0.5rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <ShiftBoard
              data={{ ...initialData, shifts }}
              onReset={onReset}
              onShiftsChange={setShifts}
              constraints={constraints}
              month={month}
              year={year}
            />
          </div>
        )}

        {activeTab === 'autoplanner' && (
          <div className="card">
            <AutoPlannerPanel
              people={initialData.people}
              shifts={shifts}
              constraints={constraints}
              vacationData={vacationData}
              month={month}
              year={year}
              onSaveGenerated={(newShifts) => {
                setShifts(newShifts);
                setActiveTab('calendar');
              }}
            />
          </div>
        )}

        {activeTab === 'constraints' && (
          <div className="card">
            <ConstraintsPanel
              people={initialData.people}
              constraints={constraints}
              onUpdate={handleConstraintsUpdate}
              days={uniqueDays}
            />
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="card">
            <StatsTable shifts={shifts} year={year} month={month} />
          </div>
        )}

        {activeTab === 'historical' && (
          <div className="card">
            <HistoryPanel />
          </div>
        )}

        {activeTab === 'export' && (
          <div className="card">
            <ExportPanel shifts={shifts} people={initialData.people} />
          </div>
        )}

        {activeTab === 'vacations' && (
          <div className="card" style={{ padding: 0 }}>
            <VacationPanel 
              people={initialData.people} 
              vacationData={vacationData} 
              onUpdateVacationData={setVacationData} 
            />
          </div>
        )}
      </main>
    </div>
  );
}

function extractMonthYearFromFilename(filename) {
  const months = [
    "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"
  ];
  const name = filename.toLowerCase();
  let foundMonth = null;
  let foundYear = null;
  
  months.forEach((m, idx) => {
    if (name.includes(m)) {
      foundMonth = idx + 1;
    }
  });
  
  const yearMatch = name.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    foundYear = parseInt(yearMatch[1]);
  }
  
  return { month: foundMonth, year: foundYear };
}

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileProcess = async (file) => {
    setLoading(true);
    try {
      if (file.name.endsWith('.json') || file.type === 'application/json') {
        const text = await file.text();
        const json = JSON.parse(text);
        if (json.type === 'SHIFTMAKER_SESSION' || Array.isArray(json.shifts)) {
          // Ensure people array exists for older JSON formats
          if (!json.people) {
            const peopleSet = new Set();
            if (Array.isArray(json.shifts)) {
              json.shifts.forEach(s => {
                if (s.type !== 'DAY_NAME' && s.content) {
                  const tokens = s.content.split(/\s+/);
                  tokens.forEach(t => {
                    const clean = t.replace(/[()]/g, '');
                    if (clean.length >= 2 && clean === clean.toUpperCase()) {
                      peopleSet.add(clean);
                    }
                  });
                }
              });
            }
            json.people = Array.from(peopleSet).sort();
          }
          setData(json);
        } else {
          alert("File sessione non valido o formato non supportato.");
        }
        setLoading(false);
        return;
      }

      const guessed = extractMonthYearFromFilename(file.name);
      const parsedData = await parseShiftFile(file);
      if (guessed.month) parsedData.month = guessed.month;
      if (guessed.year) parsedData.year = guessed.year;
      setData(parsedData);
    } catch (error) {
      console.error(error);
      alert(`Errore lettura file [${file.name}]: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Replaced Layout with direct implementation since we handle layout internally now 
    // but preserving the outer shell logic if Layout handled something else.
    // Looking at file list, Layout.jsx exists, let's just bypass it or assume it's simple wrapper.
    // Given the redesign, I'll control the shell here directly for consistency.

    <div style={{ minHeight: '100vh', backgroundColor: 'var(--sys-color-background)' }}>
      {!data ? (
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '4rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', color: 'var(--sys-color-primary)', marginBottom: '0.5rem' }}>ShiftMaker</h1>
            <p style={{ color: 'var(--sys-color-outline)' }}>Gestione turni semplice e moderna</p>
          </div>
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>⌛</div>
              <p>Elaborazione file in corso...</p>
            </div>
          ) : (
            <div className="card">
              <FileUpload onFileProcess={handleFileProcess} />
              <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--sys-color-outline-variant)', paddingTop: '1.5rem' }}>
                <p style={{ color: 'var(--sys-color-outline)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    Vuoi pianificare solo le ferie o inserire i turni manualmente?
                </p>
                <button 
                    className="btn" 
                    style={{ border: '1px solid var(--sys-color-outline)', background: 'transparent', margin: '0 auto' }}
                    onClick={() => setData({
                        shifts: [],
                        people: KNOWN_PEOPLE,
                        constraints: {},
                        vacationData: { requests: [], baseRequired: 5, exceptions: [] },
                        type: 'SHIFTMAKER_SESSION'
                    })}
                >
                    Inizia con una sessione vuota
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <AppContent initialData={data} onReset={() => setData(null)} />
      )}
    </div>
  );
}

export default App;
