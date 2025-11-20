import jsPDF from 'jspdf';
import 'jspdf-autotable';

class PDFService {
  generateReport(report) {
    const doc = new jsPDF();
    const { 
      parcelInfo, 
      pricing, 
      zoningDetails, 
      amenities, 
      buildability, 
      scenarios, 
      recommendations,
      traffic,
      aqiForecast,
      lightningRisk,
      mlConfidence
    } = report;

    const primaryColor = [16, 185, 129]; // Emerald
    const secondaryColor = [71, 85, 105]; // Slate
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    let yPos = 0;

    // ==================== PAGE 1: COVER PAGE ====================
    this.addCoverPage(doc, pageWidth, pageHeight, primaryColor);

    // ==================== PAGE 2: PARCEL & PRICING ====================
    doc.addPage();
    yPos = margin;

    // Parcel Information
    yPos = this.addSectionTitle(doc, 'Parcel Information', yPos, primaryColor);
    
    const parcelData = [
      ['Total Area', `${parcelInfo.area.toLocaleString()} m²`],
      ['Perimeter', `${parcelInfo.perimeter.toLocaleString()} m`],
      ['Coordinates', `${parcelInfo.centroid[1].toFixed(6)}°N, ${parcelInfo.centroid[0].toFixed(6)}°E`],
      ['Analysis Date', new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })]
    ];

    doc.autoTable({
      startY: yPos,
      head: [['Property', 'Details']],
      body: parcelData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontSize: 11, fontStyle: 'bold' },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: margin, right: margin }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Pricing Analysis
    yPos = this.addSectionTitle(doc, 'Pricing Analysis', yPos, primaryColor);

    const pricingData = [
      ['Average Price/Sqft', `₹${pricing.pricePerSqft.average.toLocaleString()}`],
      ['Price Range', `₹${pricing.pricePerSqft.min.toLocaleString()} - ₹${pricing.pricePerSqft.max.toLocaleString()}`],
      ['Estimated Property Value', `₹${(pricing.estimatedValue.average / 10000000).toFixed(2)} Crores`],
      ['Market Trend', `${pricing.marketTrend.trend} (${pricing.marketTrend.growthRate})`]
    ];

    doc.autoTable({
      startY: yPos,
      head: [['Metric', 'Value']],
      body: pricingData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontSize: 11, fontStyle: 'bold' },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: margin, right: margin }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // ML Confidence Score
    if (mlConfidence) {
      yPos = this.addInfoBox(doc, 'ML Analysis Confidence', 
        `${mlConfidence.score}% - ${mlConfidence.level}`, 
        yPos, primaryColor);
      yPos += 10;
    }

    // ==================== PAGE 3: ZONING & BUILDABILITY ====================
    doc.addPage();
    yPos = margin;

    // Zoning Details
    yPos = this.addSectionTitle(doc, 'Zoning Regulations', yPos, primaryColor);

    const zoningData = [
      ['Zone Type', zoningDetails.zoneType || 'N/A'],
      ['FAR (Floor Area Ratio)', zoningDetails.far || 'N/A'],
      ['Maximum Height', zoningDetails.maxHeight || 'N/A'],
      ['Ground Coverage', zoningDetails.groundCoverage || 'N/A'],
      ['Setback Requirements', zoningDetails.setback || 'N/A'],
      ['Parking Requirement', zoningDetails.parking || 'N/A']
    ];

    doc.autoTable({
      startY: yPos,
      head: [['Regulation', 'Value']],
      body: zoningData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontSize: 11, fontStyle: 'bold' },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: margin, right: margin }
    });

    yPos = doc.lastAutoTable.finalY + 12;

    // Permitted Land Uses
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Permitted Land Uses:', margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    (zoningDetails.landUse || []).forEach((use) => {
      doc.text(`• ${use}`, margin + 5, yPos);
      yPos += 6;
    });

    yPos += 10;

    // Buildability Score
    yPos = this.addSectionTitle(doc, 'Buildability Assessment', yPos, primaryColor);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Overall Score: ${buildability.score}/100 - Grade ${buildability.grade}`, margin, yPos);
    yPos += 10;

    const buildabilityData = (buildability.factors || []).map(f => [
      f.name, 
      `${f.score}/25`, 
      f.status
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Factor', 'Score', 'Status']],
      body: buildabilityData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontSize: 11, fontStyle: 'bold' },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: margin, right: margin }
    });

    // ==================== PAGE 4: AMENITIES ====================
    doc.addPage();
    yPos = margin;

    yPos = this.addSectionTitle(doc, 'Nearby Amenities', yPos, primaryColor);

    // Schools
    if (amenities.schools && amenities.schools.length > 0) {
      yPos = this.addSubsectionTitle(doc, '🎓 Schools', yPos);
      
      const schoolData = amenities.schools.map(s => [
        s.name || 'N/A',
        `${s.distance || 0} km`,
        `🚶 ${s.walking_time || 0} min`,
        `🚗 ${s.driving_time || 0} min`
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['Name', 'Distance', 'Walking', 'Driving']],
        body: schoolData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], fontSize: 10, fontStyle: 'bold' }, // Blue
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [239, 246, 255] },
        margin: { left: margin, right: margin }
      });

      yPos = doc.lastAutoTable.finalY + 12;
    }

    // Hospitals
    if (amenities.hospitals && amenities.hospitals.length > 0) {
      yPos = this.addSubsectionTitle(doc, '🏥 Hospitals', yPos);
      
      const hospitalData = amenities.hospitals.map(h => [
        h.name || 'N/A',
        `${h.distance || 0} km`,
        `🚶 ${h.walking_time || 0} min`,
        `🚗 ${h.driving_time || 0} min`
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['Name', 'Distance', 'Walking', 'Driving']],
        body: hospitalData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], fontSize: 10, fontStyle: 'bold' }, // Red
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [254, 242, 242] },
        margin: { left: margin, right: margin }
      });

      yPos = doc.lastAutoTable.finalY + 12;
    }

    // Transport
    if (amenities.transport && amenities.transport.length > 0) {
      yPos = this.addSubsectionTitle(doc, '🚇 Transport', yPos);
      
      const transportData = amenities.transport.map(t => [
        t.name || 'N/A',
        `${t.distance || 0} km`,
        `🚶 ${t.walking_time || 0} min`,
        `🚗 ${t.driving_time || 0} min`
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['Name', 'Distance', 'Walking', 'Driving']],
        body: transportData,
        theme: 'striped',
        headStyles: { fillColor: [147, 51, 234], fontSize: 10, fontStyle: 'bold' }, // Purple
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [250, 245, 255] },
        margin: { left: margin, right: margin }
      });

      yPos = doc.lastAutoTable.finalY + 12;
    }

    // Parks
    if (amenities.parks && amenities.parks.length > 0) {
      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }

      yPos = this.addSubsectionTitle(doc, '🌳 Parks', yPos);
      
      const parkData = amenities.parks.map(p => [
        p.name || 'N/A',
        `${p.distance || 0} km`,
        `🚶 ${p.walking_time || 0} min`,
        `🚗 ${p.driving_time || 0} min`
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['Name', 'Distance', 'Walking', 'Driving']],
        body: parkData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94], fontSize: 10, fontStyle: 'bold' }, // Green
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        margin: { left: margin, right: margin }
      });

      yPos = doc.lastAutoTable.finalY + 12;
    }

    // ==================== PAGE 5: TRAFFIC & ENVIRONMENT ====================
    doc.addPage();
    yPos = margin;

    // Traffic Impact
    if (traffic) {
      yPos = this.addSectionTitle(doc, 'Traffic Impact Analysis', yPos, primaryColor);

      const trafficData = [
        ['Estimated Daily Trips', `${traffic.dailyTrips.toLocaleString()} trips/day`],
        ['Peak Hour Trips', `${traffic.peakHourTrips.toLocaleString()} trips/hour`],
        ['Based On', `${traffic.unitCount} ${traffic.unitType}`],
        ['Congestion Level', `${traffic.congestion.level} - ${traffic.congestion.description}`]
      ];

      doc.autoTable({
        startY: yPos,
        head: [['Metric', 'Value']],
        body: trafficData,
        theme: 'grid',
        headStyles: { fillColor: [251, 146, 60], fontSize: 11, fontStyle: 'bold' }, // Orange
        bodyStyles: { fontSize: 10 },
        alternateRowStyles: { fillColor: [255, 251, 235] },
        margin: { left: margin, right: margin }
      });

      yPos = doc.lastAutoTable.finalY + 10;

      // Traffic Note
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'italic');
      const noteText = 'Note: Traffic estimates based on ITE Trip Generation rates. Actual traffic may vary.';
      doc.text(noteText, margin, yPos, { maxWidth: contentWidth });
      yPos += 15;
    }

    // AQI Forecast
    if (aqiForecast && aqiForecast.length > 0) {
      yPos = this.addSectionTitle(doc, 'Air Quality Index (AQI) Forecast', yPos, primaryColor);

      const avgAQI = (aqiForecast.reduce((a, b) => a + b, 0) / aqiForecast.length).toFixed(1);
      const maxAQI = Math.max(...aqiForecast);
      const minAQI = Math.min(...aqiForecast);

      const aqiData = [
        ['Average AQI (30 days)', avgAQI],
        ['Maximum AQI', maxAQI.toString()],
        ['Minimum AQI', minAQI.toString()],
        ['Air Quality', this.getAQILevel(avgAQI)]
      ];

      doc.autoTable({
        startY: yPos,
        head: [['Metric', 'Value']],
        body: aqiData,
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233], fontSize: 11, fontStyle: 'bold' }, // Sky blue
        bodyStyles: { fontSize: 10 },
        alternateRowStyles: { fillColor: [240, 249, 255] },
        margin: { left: margin, right: margin }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Lightning Risk
    if (lightningRisk) {
      yPos = this.addSubsectionTitle(doc, '⚡ Lightning Risk Assessment', yPos);

      const lightningData = [
        ['Risk Level', lightningRisk.level],
        ['Probability', `${lightningRisk.probability}%`],
        ['Recommendation', lightningRisk.recommendation]
      ];

      doc.autoTable({
        startY: yPos,
        head: [['Aspect', 'Details']],
        body: lightningData,
        theme: 'grid',
        headStyles: { fillColor: [234, 179, 8], fontSize: 10, fontStyle: 'bold' }, // Yellow
        bodyStyles: { fontSize: 9 },
        margin: { left: margin, right: margin }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    }

    // ==================== PAGE 6: DEVELOPMENT SCENARIOS ====================
    doc.addPage();
    yPos = margin;

    yPos = this.addSectionTitle(doc, 'Development Scenarios', yPos, primaryColor);

    scenarios.forEach((scenario, idx) => {
      // Check if we need a new page
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${idx + 1}. ${scenario.name}`, margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(scenario.description, margin, yPos, { maxWidth: contentWidth });
      yPos += 10;

      const scenarioData = [
        ['FAR', scenario.far ? scenario.far.toFixed(1) : 'N/A'],
        ['Number of Floors', scenario.floors ? scenario.floors.toString() : 'N/A'],
        ['Built-up Area', scenario.builtArea ? `${scenario.builtArea.toLocaleString()} m²` : 'N/A'],
        ['Open Space', scenario.openSpace ? `${scenario.openSpace.toLocaleString()} m²` : 'N/A'],
        ['Estimated Cost', scenario.estimatedCost ? `₹${(scenario.estimatedCost / 10000000).toFixed(2)} Crores` : 'N/A'],
        ['Expected ROI', scenario.roi || 'N/A']
      ];

      doc.autoTable({
        startY: yPos,
        head: [['Parameter', 'Value']],
        body: scenarioData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], fontSize: 10, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: margin, right: margin },
        columnStyles: { 0: { cellWidth: 70 } }
      });

      yPos = doc.lastAutoTable.finalY + 12;
    });

    // ==================== LAST PAGE: RECOMMENDATIONS ====================
    doc.addPage();
    yPos = margin;

    yPos = this.addSectionTitle(doc, 'Recommendations', yPos, primaryColor);

    if (recommendations && recommendations.length > 0) {
      recommendations.forEach((rec, idx) => {
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text(`${idx + 1}. ${rec.title || rec}`, margin, yPos);
        yPos += 6;

        if (rec.description) {
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(rec.description, margin + 5, yPos, { maxWidth: contentWidth - 5 });
          yPos += 8;
        }
      });
    }

    yPos += 10;

    // Footer with disclaimer
    this.addFooter(doc, pageHeight, margin);

    // Add page numbers to all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    // Save the PDF
    doc.save(`Property_Analysis_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  // Helper Methods
  addCoverPage(doc, pageWidth, pageHeight, primaryColor) {
    // Background gradient effect
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, pageHeight / 2, 'F');
    
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pageHeight / 2, pageWidth, pageHeight / 2, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.setFont(undefined, 'bold');
    doc.text('Property Development', pageWidth / 2, 60, { align: 'center' });
    doc.text('Feasibility Report', pageWidth / 2, 75, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    doc.text('ML-Powered Comprehensive Analysis', pageWidth / 2, 90, { align: 'center' });

    // Date and info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Report Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('This report contains detailed analysis of the property including', pageWidth / 2, pageHeight / 2 + 45, { align: 'center' });
    doc.text('zoning regulations, pricing, amenities, and development scenarios', pageWidth / 2, pageHeight / 2 + 52, { align: 'center' });

    // Footer logo or text
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Urban Development Analyzer', pageWidth / 2, pageHeight - 30, { align: 'center' });
  }

  addSectionTitle(doc, title, yPos, color) {
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(title, 20, yPos);
    
    // Underline
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 2, 190, yPos + 2);
    
    return yPos + 10;
  }

  addSubsectionTitle(doc, title, yPos) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(title, 20, yPos);
    return yPos + 7;
  }

  addInfoBox(doc, label, value, yPos, color) {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(20, yPos, 170, 15, 3, 3, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(label, 25, yPos + 6);
    
    doc.setFontSize(12);
    doc.text(value, 25, yPos + 11);
    
    return yPos + 18;
  }

  getAQILevel(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Satisfactory';
    if (aqi <= 200) return 'Moderate';
    if (aqi <= 300) return 'Poor';
    if (aqi <= 400) return 'Very Poor';
    return 'Severe';
  }

  addFooter(doc, pageHeight, margin) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont(undefined, 'italic');
    const disclaimer = 'Disclaimer: This report is generated based on available data and ML predictions. ' +
                      'Please verify all information with local authorities before making development decisions.';
    doc.text(disclaimer, margin, pageHeight - 20, { maxWidth: 170, align: 'left' });
  }
}

export default new PDFService();
