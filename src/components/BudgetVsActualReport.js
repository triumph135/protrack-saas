// BudgetVsActualReport.js - Add this as a new component
import React, { useState, useEffect } from 'react';
import { Download, Filter, Calendar, BarChart3, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const BudgetVsActualReport = ({ 
  activeProject, 
  costData, 
  budgetData, 
  calculateTotals, 
  hasPermission, 
  tenantDbService,
  loading 
}) => {
  const [reportType, setReportType] = useState('overall'); // 'overall' or 'category'
  const [selectedCategory, setSelectedCategory] = useState('material');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [reportData, setReportData] = useState(null);

  // Get available categories based on permissions
  const availableCategories = [
    'material', 'labor', 'equipment', 'subcontractor', 
    'others', 'capLeases', 'consumable'
  ].filter(category => hasPermission(category, 'read'));

  useEffect(() => {
    if (activeProject) {
      generateReportData();
    }
  }, [activeProject, reportType, selectedCategory, dateRange, costData, budgetData]);

  const generateReportData = () => {
    if (!activeProject) return;

    const totals = calculateTotals();
    
    if (reportType === 'overall') {
      // Overall project report
      const categoryData = availableCategories.map(category => {
        const actual = filterCostsByDate(costData[category] || [], dateRange);
        const actualTotal = calculateCategoryTotal(actual, category);
        const budgetKey = category === 'others' ? 'others_budget' : 
                         category === 'capLeases' ? 'cap_leases_budget' :
                         `${category}_budget`;
        const budget = budgetData[budgetKey] || 0;
        const variance = budget - actualTotal;
        const percentUsed = budget > 0 ? (actualTotal / budget) * 100 : 0;

        return {
          category,
          budget,
          actual: actualTotal,
          variance,
          percentUsed,
          status: variance < 0 ? 'over' : variance === 0 ? 'ontrack' : 'under'
        };
      });

      const totalBudget = categoryData.reduce((sum, item) => sum + item.budget, 0);
      const totalActual = categoryData.reduce((sum, item) => sum + item.actual, 0);
      const totalVariance = totalBudget - totalActual;

      setReportData({
        type: 'overall',
        project: activeProject,
        period: formatDateRange(dateRange),
        summary: {
          totalBudget,
          totalActual,
          totalVariance,
          percentUsed: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0
        },
        categories: categoryData
      });
    } else {
      // Category-specific report
      const categoryActuals = filterCostsByDate(costData[selectedCategory] || [], dateRange);
      const actualTotal = calculateCategoryTotal(categoryActuals, selectedCategory);
      const budgetKey = selectedCategory === 'others' ? 'others_budget' : 
                       selectedCategory === 'capLeases' ? 'cap_leases_budget' :
                       `${selectedCategory}_budget`;
      const budget = budgetData[budgetKey] || 0;
      const variance = budget - actualTotal;

      setReportData({
        type: 'category',
        project: activeProject,
        category: selectedCategory,
        period: formatDateRange(dateRange),
        budget,
        actual: actualTotal,
        variance,
        percentUsed: budget > 0 ? (actualTotal / budget) * 100 : 0,
        details: categoryActuals
      });
    }
  };

  const filterCostsByDate = (costs, dateRange) => {
    if (!dateRange.startDate && !dateRange.endDate) return costs;
    
    return costs.filter(cost => {
      const costDate = new Date(cost.date);
      const start = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const end = dateRange.endDate ? new Date(dateRange.endDate) : null;
      
      if (start && costDate < start) return false;
      if (end && costDate > end) return false;
      return true;
    });
  };

  const calculateCategoryTotal = (costs, category) => {
    return costs.reduce((sum, item) => {
      if (category === 'labor') {
        const stCost = (item.stHours || 0) * (item.stRate || 0);
        const otCost = (item.otHours || 0) * (item.otRate || 0);
        const dtCost = (item.dtHours || 0) * (item.dtRate || 0);
        const perDiem = item.perDiem || 0;
        return sum + stCost + otCost + dtCost + perDiem;
      } else {
        return sum + (item.cost || 0);
      }
    }, 0);
  };

  const formatDateRange = (range) => {
    if (!range.startDate && !range.endDate) return 'All Time';
    if (range.startDate && range.endDate) return `${range.startDate} to ${range.endDate}`;
    if (range.startDate) return `From ${range.startDate}`;
    if (range.endDate) return `Until ${range.endDate}`;
    return 'All Time';
  };

  const exportReportToPDF = () => {
    if (!reportData) return;

    let reportContent = `BUDGET VS ACTUAL REPORT\n${'='.repeat(50)}\n\n`;
    reportContent += `Project: ${reportData.project.jobNumber} - ${reportData.project.jobName}\n`;
    reportContent += `Customer: ${reportData.project.customer}\n`;
    reportContent += `Period: ${reportData.period}\n`;
    reportContent += `Report Generated: ${new Date().toLocaleDateString()}\n\n`;

    if (reportData.type === 'overall') {
      reportContent += `PROJECT SUMMARY:\n${'-'.repeat(20)}\n`;
      reportContent += `Total Budget: $${reportData.summary.totalBudget.toLocaleString()}\n`;
      reportContent += `Total Actual: $${reportData.summary.totalActual.toLocaleString()}\n`;
      reportContent += `Total Variance: ${reportData.summary.totalVariance < 0 ? '-' : ''}$${Math.abs(reportData.summary.totalVariance).toLocaleString()}\n`;
      reportContent += `Budget Used: ${reportData.summary.percentUsed.toFixed(1)}%\n\n`;

      reportContent += `CATEGORY BREAKDOWN:\n${'-'.repeat(20)}\n`;
      reportData.categories.forEach(cat => {
        reportContent += `${cat.category.toUpperCase()}:\n`;
        reportContent += `  Budget: $${cat.budget.toLocaleString()}\n`;
        reportContent += `  Actual: $${cat.actual.toLocaleString()}\n`;
        reportContent += `  Variance: ${cat.variance < 0 ? '-' : ''}$${Math.abs(cat.variance).toLocaleString()}\n`;
        reportContent += `  Status: ${cat.status.toUpperCase()}\n\n`;
      });
    } else {
      reportContent += `${reportData.category.toUpperCase()} DETAILED REPORT:\n${'-'.repeat(30)}\n`;
      reportContent += `Budget: $${reportData.budget.toLocaleString()}\n`;
      reportContent += `Actual: $${reportData.actual.toLocaleString()}\n`;
      reportContent += `Variance: ${reportData.variance < 0 ? '-' : ''}$${Math.abs(reportData.variance).toLocaleString()}\n`;
      reportContent += `Budget Used: ${reportData.percentUsed.toFixed(1)}%\n\n`;
    }

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BudgetVsActual_${reportData.project.jobNumber}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportReportToExcel = () => {
    if (!reportData) return;

    let csvContent = `Budget vs Actual Report\n`;
    csvContent += `Project,${reportData.project.jobNumber} - ${reportData.project.jobName}\n`;
    csvContent += `Customer,${reportData.project.customer}\n`;
    csvContent += `Period,${reportData.period}\n`;
    csvContent += `Report Date,${new Date().toLocaleDateString()}\n\n`;

    if (reportData.type === 'overall') {
      csvContent += `Summary\n`;
      csvContent += `Metric,Amount\n`;
      csvContent += `Total Budget,${reportData.summary.totalBudget}\n`;
      csvContent += `Total Actual,${reportData.summary.totalActual}\n`;
      csvContent += `Total Variance,${reportData.summary.totalVariance}\n`;
      csvContent += `Percent Used,${reportData.summary.percentUsed.toFixed(1)}%\n\n`;

      csvContent += `Category Breakdown\n`;
      csvContent += `Category,Budget,Actual,Variance,Percent Used,Status\n`;
      reportData.categories.forEach(cat => {
        csvContent += `${cat.category},${cat.budget},${cat.actual},${cat.variance},${cat.percentUsed.toFixed(1)}%,${cat.status}\n`;
      });
    } else {
      csvContent += `Category,Budget,Actual,Variance,Percent Used\n`;
      csvContent += `${reportData.category},${reportData.budget},${reportData.actual},${reportData.variance},${reportData.percentUsed.toFixed(1)}%\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BudgetVsActual_${reportData.project.jobNumber}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'over': return <TrendingDown className="w-5 h-5 text-red-500" />;
      case 'under': return <TrendingUp className="w-5 h-5 text-green-500" />;
      default: return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'over': return 'bg-red-50 text-red-800 border-red-200';
      case 'under': return 'bg-green-50 text-green-800 border-green-200';
      default: return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    }
  };

  if (!activeProject) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <p className="text-gray-600">Please select a project to view budget vs actual report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Budget vs Actual Report</h2>
        <div className="flex gap-2">
          <button
            onClick={exportReportToPDF}
            disabled={!reportData || loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={exportReportToExcel}
            disabled={!reportData || loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Report Controls */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="overall">Overall Project</option>
              <option value="category">By Category</option>
            </select>
          </div>

          {/* Category Selection (only for category report) */}
          {reportType === 'category' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableCategories.map(category => (
                  <option key={category} value={category}>
                    {category.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Report Content */}
      {reportData && (
        <div className="space-y-6">
          {/* Project Info */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Project Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-blue-600 text-lg font-bold">{reportData.project.jobNumber}</div>
                <div className="text-gray-600 text-sm">Job Number</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-green-600 text-lg font-bold">{reportData.project.jobName}</div>
                <div className="text-gray-600 text-sm">Project Name</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-purple-600 text-lg font-bold">{reportData.project.customer}</div>
                <div className="text-gray-600 text-sm">Customer</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-orange-600 text-lg font-bold">{reportData.period}</div>
                <div className="text-gray-600 text-sm">Report Period</div>
              </div>
            </div>
          </div>

          {/* Overall Summary (for overall reports) */}
          {reportData.type === 'overall' && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Project Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-blue-600 text-xl font-bold">${reportData.summary.totalBudget.toLocaleString()}</div>
                  <div className="text-gray-600 text-sm">Total Budget</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-gray-900 text-xl font-bold">${reportData.summary.totalActual.toLocaleString()}</div>
                  <div className="text-gray-600 text-sm">Total Actual</div>
                </div>
                <div className={`p-4 rounded-lg ${
                  reportData.summary.totalVariance < 0 ? 'bg-red-50' : 'bg-green-50'
                }`}>
                  <div className={`text-xl font-bold ${
                    reportData.summary.totalVariance < 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {reportData.summary.totalVariance < 0 ? '-' : ''}${Math.abs(reportData.summary.totalVariance).toLocaleString()}
                  </div>
                  <div className="text-gray-600 text-sm">Variance</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-purple-600 text-xl font-bold">{reportData.summary.percentUsed.toFixed(1)}%</div>
                  <div className="text-gray-600 text-sm">Budget Used</div>
                </div>
              </div>
            </div>
          )}

          {/* Category Details */}
          {reportData.type === 'overall' ? (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Category</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Budget</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actual</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Variance</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">% Used</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.categories.map((category) => (
                      <tr key={category.category} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 capitalize">
                          {category.category.replace(/([A-Z])/g, ' $1').trim()}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-600">
                          ${category.budget.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                          ${category.actual.toLocaleString()}
                        </td>
                        <td className={`py-3 px-4 text-right text-sm font-medium ${
                          category.variance < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {category.variance < 0 ? '-' : ''}${Math.abs(category.variance).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-sm">
                          <span className={`font-medium ${
                            category.percentUsed > 100 ? 'text-red-600' : 
                            category.percentUsed > 80 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {category.percentUsed.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center">
                            {getStatusIcon(category.status)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4 capitalize">
                {reportData.category.replace(/([A-Z])/g, ' $1').trim()} Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-blue-600 text-xl font-bold">${reportData.budget.toLocaleString()}</div>
                  <div className="text-gray-600 text-sm">Budget</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-gray-900 text-xl font-bold">${reportData.actual.toLocaleString()}</div>
                  <div className="text-gray-600 text-sm">Actual</div>
                </div>
                <div className={`p-4 rounded-lg ${
                  reportData.variance < 0 ? 'bg-red-50' : 'bg-green-50'
                }`}>
                  <div className={`text-xl font-bold ${
                    reportData.variance < 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {reportData.variance < 0 ? '-' : ''}${Math.abs(reportData.variance).toLocaleString()}
                  </div>
                  <div className="text-gray-600 text-sm">Variance</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-purple-600 text-xl font-bold">{reportData.percentUsed.toFixed(1)}%</div>
                  <div className="text-gray-600 text-sm">Budget Used</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Budget Progress</span>
                  <span className={`text-sm font-medium ${
                    reportData.percentUsed > 100 ? 'text-red-600' : 
                    reportData.percentUsed > 80 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    ${reportData.actual.toLocaleString()} / ${reportData.budget.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all duration-300 ${
                      reportData.percentUsed > 100 ? 'bg-red-500' : 
                      reportData.percentUsed > 80 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(reportData.percentUsed, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BudgetVsActualReport;