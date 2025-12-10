
import React, { useState } from 'react';
import { db } from '../services/db';
import { generateReport } from '../services/geminiService';
import { jsPDF } from 'jspdf';
import { FileText, Download, Loader2 } from 'lucide-react';

const Reports: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('Monthly');
  const [tone, setTone] = useState('Manager-ready');
  const [reportContent, setReportContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!startDate || !endDate) return;
    setIsGenerating(true);
    
    // DB Getters now strictly return only current user data
    const goals = db.getGoals(); 
    const achievements = db.getAchievements().filter(a => 
      a.date >= startDate && a.date <= endDate
    );
    const tasks = db.getTasks();

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
    
    // Simple text wrapping logic for PDF
    const splitText = doc.splitTextToSize(reportContent.replace(/#/g, ''), 170);
    doc.text(splitText, 20, 45);

    doc.save(`${reportType}_Report_${endDate}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-800">Performance Reports</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-primary" /> Report Settings
            </h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full border rounded-md p-2 bg-gray-50">
                        <option>Weekly</option>
                        <option>Monthly</option>
                        <option>Quarterly</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                    <select value={tone} onChange={e => setTone(e.target.value)} className="w-full border rounded-md p-2 bg-gray-50">
                        <option>Manager-ready</option>
                        <option>Casual</option>
                        <option>Concise</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded-md p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border rounded-md p-2" />
                </div>
                <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !startDate || !endDate}
                    className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {isGenerating ? <Loader2 className="animate-spin" size={18} /> : 'Generate Report'}
                </button>
            </div>
        </div>

        {/* Report Preview */}
        <div className="md:col-span-2 bg-white p-8 rounded-xl shadow-sm border border-gray-200 min-h-[500px] relative">
            {reportContent ? (
                <>
                    <div className="absolute top-4 right-4">
                        <button onClick={handleExportPDF} className="flex items-center gap-2 text-sm text-primary hover:bg-blue-50 px-3 py-1.5 rounded transition-colors">
                            <Download size={16} /> PDF
                        </button>
                    </div>
                    <div className="prose prose-sm max-w-none prose-blue">
                        <h2 className="text-xl font-bold text-gray-900 mb-2 border-b pb-2">{reportType} Report</h2>
                        <p className="text-xs text-gray-500 mb-6">Period: {startDate} - {endDate}</p>
                        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed font-sans">
                            {reportContent}
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <FileText size={48} className="mb-4 text-gray-200" />
                    <p>Select settings and click generate to see your report.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
