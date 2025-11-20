import jsPDF from 'jspdf';
import 'jspdf-autotable';

class PDFService {
  generateReport(report) {
    const doc = new jsPDF();
    const { parcelInfo, pricing, zoningDetails, amenities, buildability, scenarios, recommendations } = report;

    let yPos = 20;

    // Header
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('Property Analysis Report', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('ML-Powered Comprehensive Analysis', 105, 30, { align: 'center' });

    yPos = 50;
    doc.setTextColor(0, 0, 0);

    // Parcel Information
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Parcel Information', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    const parcelData = [
      ['Total Area', `${parcelInfo.area.toLocaleString()} sq meters`],
      ['Perimeter', `${parcelInfo.perimeter.toLocaleString()} meters`],
      ['Centroid', `${parcelInfo.centroid[1].toFixed(4)}°N, ${parcelInfo.centroid[0].toFixed(4)}°E`]
    ];

    doc.autoTable({
      startY: yPos,
      head: [['Property', 'Value']],
      body: parcelData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 14, right: 14 }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Pricing Analysis
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Pricing Analysis', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    const pricingData = [
      ['Price per Sqft (Average)', `₹${pricing.pricePerSqft.average.toLocaleString()}`],
      ['Price Range', `₹${pricing.pricePerSqft.min.toLocaleString()} - ₹${pricing.pricePerSqft.max.toLocaleString()}`],
      ['Estimated Value', `₹${(pricing.estimatedValue.average / 10000000).toFixed(2)} Crores`],
      ['Market Trend', `${pricing.marketTrend.trend} (${pricing.marketTrend.growthRate})`]
    ];

    doc.autoTable({
      startY: yPos,
      head: [['Metric', 'Value']],
      body: pricingData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 14, right: 14 }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Buildability Score
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Buildability Score', 14, yPos);
    yPos += 8;

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Overall Score: ${buildability.score}/100 (Grade ${buildability.grade})`, 14, yPos);
    yPos += 10;

    const buildabilityData = (buildability.factors || []).map(f => [f.name, `${f.score}/25`, f.status]);

    doc.autoTable({
      startY: yPos,
      head: [['Factor', 'Score', 'Status']],
      body: buildabilityData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 14, right: 14 }
    });

    // New Page for Zoning Details
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Zoning Regulations', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    const zoningData = [
      ['Zone Type', zoningDetails.zoneType],
      ['FAR (Floor Area Ratio)', zoningDetails.far],
      ['Max Height', zoningDetails.maxHeight],
      ['Ground Coverage', zoningDetails.groundCoverage],
      ['Setback Requirements', zoningDetails.setback],
      ['Parking Requirement', zoningDetails.parking]
    ];

    doc.autoTable({
      startY: yPos,
      head: [['Regulation', 'Value']],
      body: zoningData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 14, right: 14 }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Permitted Land Uses:', 14, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    zoningDetails.landUse.forEach((use, idx) => {
      doc.text(`• ${use}`, 20, yPos);
      yPos += 5;
    });

    yPos += 10;

    // Nearby Amenities
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Nearby Amenities', 14, yPos);
    yPos += 8;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Schools:', 14, yPos);
    yPos += 6;

    const schoolData = (amenities.schools || []).map(s => [s.name, `${s.distance}km`, `★ ${s.rating || 'N/A'}`]);
    doc.autoTable({
      startY: yPos,
      head: [['Name', 'Distance', 'Rating']],
      body: schoolData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 14, right: 14 }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Metro Stations:', 14, yPos);
    yPos += 6;

    const metroData = (amenities.metro || []).map(m => [m.name, `${m.distance}km`, m.line || 'Metro']);
    doc.autoTable({
      startY: yPos,
      head: [['Station', 'Distance', 'Line']],
      body: metroData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 14, right: 14 }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Hospitals:', 14, yPos);
    yPos += 6;

    const hospitalData = (amenities.hospitals || []).map(h => [h.name, `${h.distance}km`, `★ ${h.rating || 'N/A'}`]);
    doc.autoTable({
      startY: yPos,
      head: [['Name', 'Distance', 'Rating']],
      body: hospitalData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 14, right: 14 }
    });

    // New Page for Development Scenarios
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Development Scenarios', 14, yPos);
    yPos += 8;

    scenarios.forEach((scenario, idx) => {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${idx + 1}. ${scenario.name}`, 14, yPos);
      yPos += 6;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(scenario.description, 14, yPos);
      yPos += 8;

      const scenarioData = [
        ['FAR', scenario.far ? scenario.far.toFixed(1) : 'N/A'],
        ['Floors', scenario.floors ? scenario.floors.toString() : 'N/A'],
        ['Built Area', scenario.builtArea ? `${scenario.builtArea.toLocaleString()} m²` : 'N/A'],
        ['Open Space', scenario.openSpace ? `${scenario.openSpace.toLocaleString()} m²` : 'N/A'],
        ['Estimated Cost', scenario.estimatedCost ? `₹${(scenario.estimatedCost / 10000000).toFixed(2)} Cr` : 'N/A'],
        ['Expected ROI', scenario.roi || 'N/A']
      ];

      doc.autoTable({
        startY: yPos,
        head: [['Parameter', 'Value']],
        body: scenarioData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        margin: { left: 20, right: 14 }
      });

      yPos = doc.lastAutoTable.finalY + 12;
    });

    // Recommendations
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('AI Recommendations', 14, yPos);
    yPos += 8;

    recommendations.forEach((rec, idx) => {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${idx + 1}. ${rec.title}`, 14, yPos);
      yPos += 6;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(rec.description, 170);
      doc.text(lines, 20, yPos);
      yPos += lines.length * 5 + 6;

      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    });

    // Footer on last page
    const pageCount = doc.internal.getNumberOfPages();
    doc.setPage(pageCount);
    
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on ${new Date().toLocaleString()} | ML-Powered Analysis | UrbanForm Pro`,
      105,
      285,
      { align: 'center' }
    );

    // Save PDF
    doc.save(`property-analysis-report-${Date.now()}.pdf`);
  }
}

export default new PDFService();
