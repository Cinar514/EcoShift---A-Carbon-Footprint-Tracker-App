// Export and Reporting functionality

class ExportManager {
    constructor() {
        this.currentData = null;
        this.init();
    }

    init() {
        // Set default date range (last 30 days)
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        document.getElementById('export-start-date').value = thirtyDaysAgo.toISOString().split('T')[0];
        document.getElementById('export-end-date').value = today.toISOString().split('T')[0];

        // Load initial data
        this.loadData();
    }

    async loadData() {
        const startDate = document.getElementById('export-start-date').value;
        const endDate = document.getElementById('export-end-date').value;
        
        try {
            const response = await fetch(`/api/dashboard?startDate=${startDate}&endDate=${endDate}`);
            this.currentData = await response.json();
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load data. Please try again.');
        }
    }

    async exportCSV() {
        await this.loadData();
        
        if (!this.currentData) {
            alert('No data available for export');
            return;
        }

        // Get detailed logs for all users
        const logsResponse = await fetch('/api/users');
        const users = await logsResponse.json();
        
        let csvContent = 'Date,User,Habit,Category,Quantity,Unit,CO2_Saved,Notes\n';
        
        for (const user of users) {
            const userLogsResponse = await fetch(`/api/users/${user.id}/logs?startDate=${document.getElementById('export-start-date').value}&endDate=${document.getElementById('export-end-date').value}`);
            const logs = await userLogsResponse.json();
            
            logs.forEach(log => {
                csvContent += `"${log.date}","${user.name}","${log.habit_name}","${log.category}","${log.quantity}","${log.unit}","${log.co2_saved}","${log.notes || ''}"\n`;
            });
        }

        this.downloadFile(csvContent, 'co2-challenge-data.csv', 'text/csv');
        this.showSuccess('CSV file downloaded successfully!');
    }

    async generateSummaryReport() {
        await this.loadData();
        
        if (!this.currentData) {
            alert('No data available for report generation');
            return;
        }

        const report = this.createSummaryReport();
        this.displayReport(report);
        this.showSuccess('Summary report generated!');
    }

    createSummaryReport() {
        const data = this.currentData;
        const startDate = document.getElementById('export-start-date').value;
        const endDate = document.getElementById('export-end-date').value;
        
        const report = {
            title: 'CO₂ Footprint Reduction Challenge - Summary Report',
            period: `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`,
            executiveSummary: {
                totalCO2Saved: data.total_co2_saved.toFixed(2),
                totalParticipants: data.total_users,
                totalActions: data.total_actions,
                averagePerPerson: data.total_users > 0 ? (data.total_co2_saved / data.total_users).toFixed(2) : '0'
            },
            topPerformers: data.user_stats.slice(0, 5),
            categoryBreakdown: this.groupByCategory(data.habit_stats),
            recommendations: this.generateRecommendations(data)
        };

        return report;
    }

    groupByCategory(habitStats) {
        const categories = {};
        habitStats.forEach(stat => {
            if (!categories[stat.category]) {
                categories[stat.category] = {
                    totalCO2: 0,
                    totalActions: 0,
                    habits: []
                };
            }
            categories[stat.category].totalCO2 += stat.total_co2_saved;
            categories[stat.category].totalActions += stat.total_actions;
            categories[stat.category].habits.push(stat);
        });
        return categories;
    }

    generateRecommendations(data) {
        const recommendations = [];
        
        if (data.total_users < 10) {
            recommendations.push('Consider expanding participation to increase collective impact');
        }
        
        if (data.total_actions / data.total_users < 5) {
            recommendations.push('Encourage more frequent logging to improve data quality');
        }
        
        const topCategory = Object.entries(this.groupByCategory(data.habit_stats))
            .sort((a, b) => b[1].totalCO2 - a[1].totalCO2)[0];
        
        if (topCategory) {
            recommendations.push(`Focus on ${topCategory[0]} habits as they show the highest impact`);
        }
        
        recommendations.push('Continue the program to build long-term sustainable habits');
        
        return recommendations;
    }

    displayReport(report) {
        const previewContent = document.getElementById('preview-content');
        
        previewContent.innerHTML = `
            <div class="report-header text-center mb-4">
                <h2>${report.title}</h2>
                <h4 class="text-muted">${report.period}</h4>
                <hr>
            </div>
            
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="card bg-success text-white text-center">
                        <div class="card-body">
                            <h3>${report.executiveSummary.totalCO2Saved} kg</h3>
                            <p class="mb-0">Total CO₂ Saved</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-info text-white text-center">
                        <div class="card-body">
                            <h3>${report.executiveSummary.totalParticipants}</h3>
                            <p class="mb-0">Participants</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-warning text-white text-center">
                        <div class="card-body">
                            <h3>${report.executiveSummary.totalActions}</h3>
                            <p class="mb-0">Total Actions</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-primary text-white text-center">
                        <div class="card-body">
                            <h3>${report.executiveSummary.averagePerPerson} kg</h3>
                            <p class="mb-0">Avg per Person</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <h5><i class="fas fa-trophy me-2"></i>Top Performers</h5>
                    <div class="list-group">
                        ${report.topPerformers.map((user, index) => `
                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>#${index + 1} ${user.name}</strong>
                                    <br><small class="text-muted">${user.total_actions} actions</small>
                                </div>
                                <span class="badge bg-success">${(user.total_co2_saved || 0).toFixed(1)} kg</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="col-md-6">
                    <h5><i class="fas fa-chart-pie me-2"></i>Impact by Category</h5>
                    <div class="list-group">
                        ${Object.entries(report.categoryBreakdown).map(([category, data]) => `
                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>${category}</strong>
                                    <br><small class="text-muted">${data.totalActions} actions</small>
                                </div>
                                <span class="badge bg-info">${data.totalCO2.toFixed(1)} kg</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="mt-4">
                <h5><i class="fas fa-lightbulb me-2"></i>Recommendations</h5>
                <ul class="list-group">
                    ${report.recommendations.map(rec => `
                        <li class="list-group-item">
                            <i class="fas fa-arrow-right me-2 text-success"></i>${rec}
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="mt-4 p-3 bg-light rounded">
                <h6><i class="fas fa-info-circle me-2"></i>About This Report</h6>
                <p class="mb-0 small">
                    This report is generated automatically from the CO₂ Footprint Challenge data. 
                    CO₂ savings are calculated using scientifically-backed emission factors. 
                    For questions about the data or methodology, please contact the program administrator.
                </p>
            </div>
        `;
        
        document.getElementById('report-preview').style.display = 'block';
    }

    async exportIndividualReports() {
        await this.loadData();
        
        if (!this.currentData) {
            alert('No data available for export');
            return;
        }

        const users = this.currentData.user_stats;
        let csvContent = 'User,Total_CO2_Saved,Total_Actions,Average_CO2_per_Action,Participation_Rate\n';
        
        users.forEach(user => {
            const avgCO2 = user.total_actions > 0 ? (user.total_co2_saved / user.total_actions).toFixed(2) : '0';
            const participationRate = this.calculateParticipationRate(user);
            csvContent += `"${user.name}","${user.total_co2_saved || 0}","${user.total_actions}","${avgCO2}","${participationRate}"\n`;
        });

        this.downloadFile(csvContent, 'individual-reports.csv', 'text/csv');
        this.showSuccess('Individual reports exported successfully!');
    }

    calculateParticipationRate(user) {
        // Simple calculation - in a real app, you'd calculate based on expected vs actual logging
        const daysInPeriod = this.getDaysBetweenDates(
            document.getElementById('export-start-date').value,
            document.getElementById('export-end-date').value
        );
        const expectedActions = daysInPeriod * 3; // Assuming 3 actions per day
        return expectedActions > 0 ? ((user.total_actions / expectedActions) * 100).toFixed(1) + '%' : '0%';
    }

    getDaysBetweenDates(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    async preparePresentationData() {
        await this.loadData();
        
        if (!this.currentData) {
            alert('No data available for presentation');
            return;
        }

        const presentationData = {
            title: 'CO₂ Footprint Reduction Challenge Results',
            keyMetrics: {
                totalCO2: this.currentData.total_co2_saved.toFixed(1),
                participants: this.currentData.total_users,
                actions: this.currentData.total_actions,
                avgPerPerson: this.currentData.total_users > 0 ? (this.currentData.total_co2_saved / this.currentData.total_users).toFixed(1) : '0'
            },
            topPerformers: this.currentData.user_stats.slice(0, 3),
            categoryImpact: this.groupByCategory(this.currentData.habit_stats),
            insights: this.generateInsights(this.currentData)
        };

        // Create presentation-ready content
        const presentationContent = this.createPresentationContent(presentationData);
        this.displayReport(presentationContent);
        this.showSuccess('Presentation data prepared!');
    }

    generateInsights(data) {
        const insights = [];
        
        if (data.total_co2_saved > 100) {
            insights.push(`Collective impact of ${data.total_co2_saved.toFixed(1)} kg CO₂ saved demonstrates significant environmental benefit`);
        }
        
        if (data.total_users > 20) {
            insights.push(`High participation rate (${data.total_users} participants) shows strong engagement`);
        }
        
        const avgActions = data.total_users > 0 ? (data.total_actions / data.total_users).toFixed(1) : '0';
        insights.push(`Average of ${avgActions} sustainable actions per participant`);
        
        return insights;
    }

    createPresentationContent(data) {
        return {
            title: data.title,
            period: `${this.formatDate(document.getElementById('export-start-date').value)} to ${this.formatDate(document.getElementById('export-end-date').value)}`,
            executiveSummary: {
                totalCO2Saved: data.keyMetrics.totalCO2,
                totalParticipants: data.keyMetrics.participants,
                totalActions: data.keyMetrics.actions,
                averagePerPerson: data.keyMetrics.avgPerPerson
            },
            topPerformers: data.topPerformers,
            categoryBreakdown: data.categoryImpact,
            recommendations: data.insights
        };
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    downloadReport() {
        const reportContent = document.getElementById('preview-content').innerHTML;
        const fullHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>CO₂ Challenge Report</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
                <style>
                    @media print {
                        .no-print { display: none !important; }
                        body { font-size: 12px; }
                        .card { border: 1px solid #ddd; }
                    }
                </style>
            </head>
            <body>
                <div class="container mt-4">
                    ${reportContent}
                </div>
            </body>
            </html>
        `;
        
        this.downloadFile(fullHTML, 'co2-challenge-report.html', 'text/html');
    }

    printReport() {
        const reportContent = document.getElementById('preview-content').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>CO₂ Challenge Report</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
                <style>
                    @media print {
                        body { font-size: 12px; }
                        .card { border: 1px solid #ddd; }
                    }
                </style>
            </head>
            <body>
                <div class="container mt-4">
                    ${reportContent}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    showSuccess(message) {
        // Simple success notification
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '9999';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }
}

// Initialize export manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.exportManager = new ExportManager();
});

// Global functions for HTML onclick handlers
function exportCSV() {
    window.exportManager.exportCSV();
}

function generateSummaryReport() {
    window.exportManager.generateSummaryReport();
}

function exportIndividualReports() {
    window.exportManager.exportIndividualReports();
}

function preparePresentationData() {
    window.exportManager.preparePresentationData();
}

function downloadReport() {
    window.exportManager.downloadReport();
}

function printReport() {
    window.exportManager.printReport();
}
