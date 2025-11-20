import { Activity, AlertCircle, Building, Bus, Car, CheckCircle, Download, GraduationCap, Info, TrendingUp, Utensils, Wind, X, Zap } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const ReportPreview = ({ report, onClose, onDownload }) => {
  if (!report) return null;

  const {
    parcelInfo,
    pricing,
    zoningDetails,
    amenities,
    buildability,
    scenarios,
    mlConfidence,
    recommendations,
    aqiForecast,
    lightningRisk,
    traffic
  } = report;

  // Format AQI data for chart
  const aqiData = aqiForecast ? aqiForecast.map((val, idx) => ({
    day: `Day ${idx + 1}`,
    aqi: val
  })) : [];

  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Development Feasibility Report</h2>
            <p className="text-sm text-slate-500 mt-1">Generated on {new Date().toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Executive Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-sm text-emerald-600 font-medium">Buildability Score</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold text-emerald-700">{buildability.score}</span>
                <span className="text-sm text-emerald-600 mb-1">/ 100</span>
              </div>
              <div className="mt-2 text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full inline-block">
                Grade {buildability.grade}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-600 font-medium">Estimated Value</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">₹{(pricing.estimatedValue.average / 10000000).toFixed(2)} Cr</p>
              <p className="text-xs text-blue-600 mt-1">₹{pricing.pricePerSqft.average.toLocaleString()}/sqft</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <p className="text-sm text-purple-600 font-medium">Zoning Type</p>
              <p className="text-2xl font-bold text-purple-700 mt-1 capitalize">{zoningDetails.zoneType}</p>
              <p className="text-xs text-purple-600 mt-1">FAR: {zoningDetails.far}</p>
            </div>
          </div>

          {/* Parcel Details */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-emerald-600" />
              Parcel Information
            </h3>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">Total Area</p>
                <p className="font-semibold text-slate-800">{parcelInfo.area.toLocaleString()} sqft</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Perimeter</p>
                <p className="font-semibold text-slate-800">{parcelInfo.perimeter.toLocaleString()} ft</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Max Height</p>
                <p className="font-semibold text-slate-800">{zoningDetails.maxHeight}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Ground Coverage</p>
                <p className="font-semibold text-slate-800">{zoningDetails.groundCoverage}</p>
              </div>
            </div>
          </section>

          {/* Development Scenarios */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-600" />
              Development Scenarios
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {scenarios.map((scenario, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-4 hover:border-emerald-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800">{scenario.name}</h4>
                    <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium">
                      ROI: {scenario.roi}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">{scenario.description}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Built-up Area</span>
                      <span className="font-medium">{scenario.builtArea.toLocaleString()} sqft</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Floors</span>
                      <span className="font-medium">{scenario.floors}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* AI Recommendations */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              AI Recommendations
            </h3>
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div key={idx} className={`p-4 rounded-xl border flex items-start gap-3 ${
                  rec.type === 'positive' ? 'bg-emerald-50 border-emerald-100' : 
                  rec.type === 'warning' ? 'bg-amber-50 border-amber-100' : 
                  'bg-slate-50 border-slate-100'
                }`}>
                  {rec.type === 'positive' ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> :
                   rec.type === 'warning' ? <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" /> :
                   <Info className="w-5 h-5 text-slate-600 shrink-0" />}
                  <div>
                    <h4 className={`font-semibold ${
                      rec.type === 'positive' ? 'text-emerald-800' : 
                      rec.type === 'warning' ? 'text-amber-800' : 
                      'text-slate-800'
                    }`}>{rec.title}</h4>
                    <p className={`text-sm mt-1 ${
                      rec.type === 'positive' ? 'text-emerald-700' : 
                      rec.type === 'warning' ? 'text-amber-700' : 
                      'text-slate-600'
                    }`}>{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          {/* Traffic Impact */}
          {traffic && (
            <section>
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-600" />
                Traffic Impact Analysis
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Est. Daily Trips</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{traffic.dailyTrips.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">Based on {traffic.unitCount} {traffic.unitType}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Peak Hour Trips</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{traffic.peakHourTrips.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">AM/PM Peak</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center">
                  <p className="text-xs text-slate-500 mb-1">Congestion Impact</p>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: traffic.congestion.color }}
                    />
                    <span className="font-bold text-slate-800">{traffic.congestion.level}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{traffic.congestion.description}</p>
                </div>
              </div>
            </section>
          )}

          {/* Amenities */}
          <section>
             <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-emerald-600" />
              Nearby Amenities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {amenities.schools && amenities.schools.length > 0 && (
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-2 text-slate-700 font-medium">
                       <GraduationCap className="w-4 h-4" /> Schools
                    </div>
                    <ul className="text-sm space-y-1">
                       {amenities.schools.map((s, i) => (
                         <li key={i} className="flex justify-between text-slate-600">
                           <span>{s.name}</span>
                           <div className="flex gap-2">
                             <span className="text-xs bg-slate-200 px-1 rounded">{s.distance}km</span>
                             {s.time && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">{s.time}</span>}
                           </div>
                         </li>
                       ))}
                    </ul>
                 </div>
               )}
               {amenities.hospitals && amenities.hospitals.length > 0 && (
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-2 text-slate-700 font-medium">
                       <Activity className="w-4 h-4" /> Hospitals
                    </div>
                    <ul className="text-sm space-y-1">
                       {amenities.hospitals.map((s, i) => (
                         <li key={i} className="flex justify-between text-slate-600">
                           <span>{s.name}</span>
                           <div className="flex gap-2">
                             <span className="text-xs bg-slate-200 px-1 rounded">{s.distance}km</span>
                             {s.time && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">{s.time}</span>}
                           </div>
                         </li>
                       ))}
                    </ul>
                 </div>
               )}
               {amenities.metro && amenities.metro.length > 0 && (
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-2 text-slate-700 font-medium">
                       <Bus className="w-4 h-4" /> Metro
                    </div>
                    <ul className="text-sm space-y-1">
                       {amenities.metro.map((s, i) => (
                         <li key={i} className="flex justify-between text-slate-600">
                           <span>{s.name}</span>
                           <div className="flex gap-2">
                             <span className="text-xs bg-slate-200 px-1 rounded">{s.distance}km</span>
                             {s.time && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">{s.time}</span>}
                           </div>
                         </li>
                       ))}
                    </ul>
                 </div>
               )}
            </div>
          </section>

          {/* Environmental Factors (AQI & Lightning) - Moved to Bottom */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* AQI Forecast */}
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Wind className="w-5 h-5 text-emerald-600" />
                AQI Forecast (30 Days)
              </h3>
              <div style={{ width: '100%', height: '250px' }}>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={aqiData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" hide />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="aqi" 
                      stroke="#059669" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">Predicted Air Quality Index trend for the next 30 days</p>
            </section>

            {/* Lightning Risk */}
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Lightning Strike Risk
              </h3>
              
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${
                  lightningRisk?.riskLevel === 'High' ? 'bg-red-100 text-red-600' :
                  lightningRisk?.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-600' :
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  <Zap className="w-12 h-12" />
                </div>
                <h4 className="text-2xl font-bold text-slate-800 mb-2">
                  {lightningRisk?.riskLevel || 'Low'} Risk
                </h4>
                <p className="text-slate-600 max-w-xs">
                  {lightningRisk?.warning || 'Standard lightning protection measures are recommended for this area.'}
                </p>
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ReportPreview;
