import jsPDF from 'jspdf'

export const exportToPDF = async (state: any, creatorId: string) => {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPos = margin

  // Helper to add new page if needed
  const checkNewPage = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      doc.addPage()
      yPos = margin
    }
  }

  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Competitor Benchmarking Report', margin, yPos)
  yPos += 10

  // Date
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos)
  yPos += 8

  // Summary Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Summary', margin, yPos)
  yPos += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const summary = state.analysis_result?.summary
  if (summary) {
    doc.text(`Overall Position: ${summary.overall_position || 'N/A'}`, margin, yPos)
    yPos += 5
  }

  // Competitors Table
  checkNewPage(30)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Performance Comparison', margin, yPos)
  yPos += 7

  const competitors = state.competitors || []
  const tableData: string[][] = [
    ['Name', 'Platform', 'Followers', 'Avg Views', 'Engagement', 'Posts/Week']
  ]

  // Add creator row
  const creatorMetrics = state.creator_metrics || {}
  tableData.push([
    'You',
    state.creatorMetadata?.platformsConnected?.[0] || 'N/A',
    (creatorMetrics.followers || creatorMetrics.subscribers || 0).toLocaleString(),
    (creatorMetrics.avgViews || creatorMetrics.avg_views || 0).toLocaleString(),
    `${(creatorMetrics.engagementRate || creatorMetrics.engagement_rate || 0).toFixed(2)}%`,
    (creatorMetrics.postingFrequency || creatorMetrics.posting_frequency || 0).toFixed(1)
  ])

  // Add competitor rows
  competitors.forEach((c: any) => {
    tableData.push([
      c.name || 'Unknown',
      c.platform === 'facebook' ? 'Facebook' : 'YouTube',
      (c.follower_count || 0).toLocaleString(),
      (c.metrics?.avg_views || 0).toLocaleString(),
      `${(c.metrics?.engagement_rate || 0).toFixed(2)}%`,
      (c.metrics?.posting_frequency || 0).toFixed(1)
    ])
  })

  // Simple table rendering
  doc.setFontSize(8)
  const cellHeight = 6
  const colWidths = [40, 25, 25, 25, 25, 25]
  let xPos = margin

  tableData.forEach((row, rowIdx) => {
    checkNewPage(cellHeight)
    xPos = margin
    row.forEach((cell, colIdx) => {
      doc.setFont('helvetica', rowIdx === 0 ? 'bold' : 'normal')
      doc.text(cell.substring(0, 20), xPos, yPos)
      xPos += colWidths[colIdx]
    })
    yPos += cellHeight
  })

  yPos += 5

  // Recommendations
  checkNewPage(30)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Top Recommendations', margin, yPos)
  yPos += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const recommendations = state.analysis_result?.recommendations || []
  recommendations.slice(0, 5).forEach((rec: any, idx: number) => {
    checkNewPage(10)
    doc.text(`${idx + 1}. ${rec.action || 'N/A'}`, margin, yPos)
    yPos += 5
    if (rec.expected_impact) {
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`   ${rec.expected_impact}`, margin, yPos)
      yPos += 5
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
    }
  })

  // Strategy
  checkNewPage(30)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Optimal Strategy', margin, yPos)
  yPos += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const strategy = state.analysis_result?.optimal_strategy
  if (strategy) {
    doc.text(`Posts per week: ${strategy.posts_per_week || 'N/A'}`, margin, yPos)
    yPos += 5
    if (strategy.best_days) {
      doc.text(`Best days: ${strategy.best_days.join(', ')}`, margin, yPos)
      yPos += 5
    }
    if (strategy.best_time_window) {
      doc.text(`Best time: ${strategy.best_time_window}`, margin, yPos)
      yPos += 5
    }
  }

  // Save PDF
  doc.save(`competitor-benchmarking-${creatorId}-${Date.now()}.pdf`)
}

