
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { generateReport } from '../services/geminiService';
import { jsPDF } from 'jspdf';
import { FileText, Download, Loader2, Calendar, ListChecks } from 'lucide-react';

const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('Monthly');
  const [tone, setTone] = useState('Manager-ready');
  const [selectedDateForWeek, setSelectedDateForWeek] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingList, setIsExportingList] = useState(false);

  useEffect(() => {
    const today = new Date();
    setSelectedDateForWeek(today.toISOString().split('T')[0]);
    setSelectedMonth(today.toISOString().slice(0, 7));
    setSelectedQuarter(Math.floor((today.getMonth() + 3) / 3).toString());
  }, []);

  useEffect(() => {
    if (reportType === 'Weekly' && selectedDateForWeek) {
        const d = new Date(selectedDateForWeek);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
        const monday = new Date(d.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        setStartDate(monday.toISOString().split('T')[0]);
        setEndDate(sunday.toISOString().split('T')[0]);
    } else if (reportType === 'Monthly' && selectedMonth) {
        const [y, m] = selectedMonth.split('-');
        const year = parseInt(y);
        const month = parseInt(m);
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        
        const fmt = (d: Date) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };
        setStartDate(fmt(firstDay));
        setEndDate(fmt(lastDay));
    } else if (reportType === 'Quarterly') {
        const y = selectedYear;
        const q = parseInt(selectedQuarter);
        const startMonth = (q - 1) * 3;
        const endMonth = startMonth + 2;
        const firstDay = new Date(y, startMonth, 1);
        const lastDay = new Date(y, endMonth + 1, 0);
        const fmt = (d: Date) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };
        setStartDate(fmt(firstDay));
        setEndDate(fmt(lastDay));
    }
  }, [reportType, selectedDateForWeek, selectedMonth, selectedYear, selectedQuarter]);

  const handleGenerate = async () => {
    if (!startDate || !endDate) return;
    setIsGenerating(true);
    
    // Async DB fetch
    const [goals, allAchievements, tasks] = await Promise.all([
        db.getGoals(),
        db.getAchievements(),
        db.getTasks()
    ]);
    
    const achievements = allAchievements.filter(a => 
      a.date >= startDate && a.date <= endDate
    );

    const result = await generateReport(startDate, endDate, goals, achievements, tasks, tone, reportType);
    setReportContent(result);
    setIsGenerating(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica");
    doc.setFontSize(18);
    doc.text(`${reportType} Report`, 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 26);
    doc.text(`Period: ${startDate} to ${endDate}`, 20, 32);
    doc.setFontSize(12);
    doc.setTextColor(0);
    const splitText = doc.splitTextToSize(reportContent.replace(/#/g, ''), 170);
    doc.text(splitText, 20, 45);
    doc.save(`${reportType}_Report_${endDate}.pdf`);
  };

  const handleExportSimplePDF = async () => {
    if (!startDate || !endDate) return;
    setIsExportingList(true);

    try {
      const [goals, achievements] = await Promise.all([
          db.getGoals(),
          db.getAchievements()
      ]);

      // Filter Data
      const finishedGoals = goals.filter(g => 
          g.isCompleted && 
          g.completedAt && 
          g.completedAt >= startDate && 
          g.completedAt <= endDate
      );

      const finishedAchievements = achievements.filter(a => 
          a.date >= startDate && 
          a.date <= endDate
      );

      // Generate PDF
      const doc = new jsPDF();
      let y = 20;
      const margin = 20;
      const contentWidth = 170;
      const pageHeight = doc.internal.pageSize.height;

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Completed Items List", margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Period: ${startDate} to ${endDate}`, margin, y);
      y += 15;
      doc.setTextColor(0);

      // Goals Section
      if (finishedGoals.length > 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Finished Goals", margin, y);
        y += 8;

        finishedGoals.forEach(g => {
            if (y > pageHeight - 20) { doc.addPage(); y = 20; }
            
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(`• ${g.title}`, margin, y);
            y += 5;
            
            if (g.description) {
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                const descLines = doc.splitTextToSize(g.description, contentWidth - 5);
                doc.text(descLines, margin + 5, y);
                y += (descLines.length * 4) + 4;
            } else {
                y += 4;
            }
        });
        y += 10;
      }

      // Achievements Section
      if (finishedAchievements.length > 0) {
        if (y > pageHeight - 30) { doc.addPage(); y = 20; }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Achievements Logged", margin, y);
        y += 8;

        finishedAchievements.forEach(a => {
            if (y > pageHeight - 20) { doc.addPage(); y = 20; }
            
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(`• ${a.title}`, margin, y);
            y += 5;
            
            if (a.description) {
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                const descLines = doc.splitTextToSize(a.description, contentWidth - 5);
                doc.text(descLines, margin + 5, y);
                y += (descLines.length * 4) + 4;
            } else {
                y += 4;
            }
        });
      }

      if (finishedGoals.length === 0 && finishedAchievements.length === 0) {
          doc.setFont("helvetica", "italic");
          doc.text("No completed items found for this period.", margin, y);
      }

      doc.save(`Completed_Items_${endDate}.pdf`);

    } catch (error) {
        console.error(error);
        alert("Failed to export list.");
    } finally {
        setIsExportingList(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-800">Performance Reports</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-primary" /> AI Report Settings
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full border rounded-md p-2 bg-gray-50 focus:ring-primary focus:border-primary">
                            <option>Weekly</option>
                            <option>Monthly</option>
                            <option>Quarterly</option>
                        </select>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Calendar size={12} /> Period Selection</label>
                        {reportType === 'Weekly' && (
                            <div><input type="date" value={selectedDateForWeek} onChange={e => setSelectedDateForWeek(e.target.value)} className="w-full border rounded-md p-2 bg-white text-sm" /></div>
                        )}
                        {reportType === 'Monthly' && (
                            <div><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full border rounded-md p-2 bg-white text-sm" /></div>
                        )}
                        {reportType === 'Quarterly' && (
                            <div className="flex gap-2">
                                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="w-full border rounded-md p-2 bg-white text-sm">{[0, 1, 2, -1, -2].map(o => <option key={o} value={new Date().getFullYear() - o}>{new Date().getFullYear() - o}</option>)}</select>
                                <select value={selectedQuarter} onChange={e => setSelectedQuarter(e.target.value)} className="w-full border rounded-md p-2 bg-white text-sm"><option value="1">Q1</option><option value="2">Q2</option><option value="3">Q3</option><option value="4">Q4</option></select>
                            </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-gray-200"><p className="text-xs text-gray-400">Range:</p><p className="text-xs font-semibold text-primary">{startDate} to {endDate}</p></div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                        <select value={tone} onChange={e => setTone(e.target.value)} className="w-full border rounded-md p-2 bg-gray-50">
                            <option>Manager-ready</option>
                            <option>Casual</option>
                            <option>Concise</option>
                        </select>
                    </div>

                    <button onClick={handleGenerate} disabled={isGenerating || !startDate || !endDate} className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 flex justify-center items-center gap-2 shadow-sm">
                        {isGenerating ? <Loader2 className="animate-spin" size={18} /> : 'Generate AI Report'}
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <ListChecks size={20} className="text-green-600" /> Quick Exports
                </h2>
                <p className="text-xs text-gray-500 mb-4">Download a simple list of items finished during the selected period.</p>
                <button 
                    onClick={handleExportSimplePDF} 
                    disabled={isExportingList || !startDate || !endDate} 
                    className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {isExportingList ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} 
                    Export Completed List (PDF)
                </button>
            </div>
        </div>

        <div className="md:col-span-2 bg-white p-8 rounded-xl shadow-sm border border-gray-200 min-h-[500px] relative">
            {reportContent ? (
                <>
                    <div className="absolute top-4 right-4"><button onClick={handleExportPDF} className="flex items-center gap-2 text-sm text-primary hover:bg-blue-50 px-3 py-1.5 rounded transition-colors"><Download size={16} /> PDF</button></div>
                    <div className="prose prose-sm max-w-none prose-blue"><h2 className="text-xl font-bold text-gray-900 mb-2 border-b pb-2">{reportType} Report</h2><p className="text-xs text-gray-500 mb-6">Period: {startDate} - {endDate}</p><div className="whitespace-pre-wrap text-gray-700 leading-relaxed font-sans">{reportContent}</div></div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400"><FileText size={48} className="mb-4 text-gray-200" /><p>Select settings and click generate.</p></div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
