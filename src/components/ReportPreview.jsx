import { Activity, AlertCircle, Building, Bus, Car, CheckCircle, Download, GraduationCap, Info, TrendingUp, Utensils, Wind, X, Zap, MapPin, Ruler, Home, DollarSign, FileText, Award } from 'lucide-react';
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
    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 z-50 flex items-center justify-center p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
        {/* Professional Header with Branding */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 p-8 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
          
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Development Feasibility Report</h1>
                  <p className="text-emerald-50 text-sm mt-1">Comprehensive Analysis & Recommendations</p>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-4 text-sm text-emerald-50">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Parcel ID: {parcelInfo.area.toString().slice(-6)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Generated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                  <Award className="w-4 h-4" />
                  <span className="font-semibold">Confidence: {(mlConfidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all shadow-lg font-semibold"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto">
          <div className="p-8 space-y-8">
            {/* Executive Summary - Enhanced */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                <h2 className="text-2xl font-bold text-slate-800">Executive Summary</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="group relative bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 transition-all shadow-sm hover:shadow-md">
                  <div className="absolute top-4 right-4 text-emerald-200 group-hover:text-emerald-300 transition-colors">
                    <Award className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-2">Buildability Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-emerald-600">{buildability.score}</span>
                    <span className="text-lg text-emerald-500 font-medium">/ 100</span>
                  </div>
                  <div className="mt-3">
                    <span className="inline-block text-sm font-bold text-emerald-700 bg-emerald-200 px-3 py-1.5 rounded-lg">
                      Grade {buildability.grade}
                    </span>
                  </div>
                </div>

                <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 hover:border-blue-400 transition-all shadow-sm hover:shadow-md">
                  <div className="absolute top-4 right-4 text-blue-200 group-hover:text-blue-300 transition-colors">
                    <DollarSign className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2">Estimated Value</p>
                  <div className="text-4xl font-bold text-blue-600 mb-1">
                    ₹{(pricing.estimatedValue.average / 10000000).toFixed(2)} Cr
                  </div>
                  <p className="text-sm text-blue-600 font-medium">₹{pricing.pricePerSqft.average.toLocaleString()}/sqft</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-medium">{pricing.marketTrend?.trend || 'Rising'} Market</span>
                  </div>
                </div>

                <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-200 hover:border-purple-400 transition-all shadow-sm hover:shadow-md">
                  <div className="absolute top-4 right-4 text-purple-200 group-hover:text-purple-300 transition-colors">
                    <Home className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide mb-2">Zoning Type</p>
                  <div className="text-4xl font-bold text-purple-600 capitalize mb-1">
                    {zoningDetails.zoneType}
                  </div>
                  <p className="text-sm text-purple-600 font-medium">FAR: {zoningDetails.far}</p>
                  <div className="mt-3 text-xs text-purple-600 font-medium">
                    Max Height: {zoningDetails.maxHeight}
                  </div>
                </div>
              </div>
            </section>

          {/* Parcel Details */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-slate-800">Parcel Information</h2>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider">
                    <Ruler className="w-4 h-4" />
                    Total Area
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{Math.round(parcelInfo.area * 10.764).toLocaleString()}</p>
                  <p className="text-sm text-slate-600">sqft</p>
                  <p className="text-xs text-slate-400">{parcelInfo.area.toLocaleString()} m²</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider">
                    <Ruler className="w-4 h-4" />
                    Perimeter
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{Math.round(parcelInfo.perimeter * 3.281).toLocaleString()}</p>
                  <p className="text-sm text-slate-600">ft</p>
                  <p className="text-xs text-slate-400">{parcelInfo.perimeter.toLocaleString()} m</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider">
                    <Building className="w-4 h-4" />
                    Max Height
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{zoningDetails.maxHeight}</p>
                  <p className="text-sm text-slate-600">Permitted</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider">
                    <Home className="w-4 h-4" />
                    Ground Coverage
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{zoningDetails.groundCoverage}</p>
                  <p className="text-sm text-slate-600">Maximum</p>
                </div>
              </div>
            </div>
          </section>

          {/* Development Scenarios */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-slate-800">Development Scenarios</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {scenarios.map((scenario, idx) => (
                <div key={idx} className="group relative bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-emerald-400 hover:shadow-lg transition-all">
                  <div className="absolute top-6 right-6">
                    <span className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md">
                      <TrendingUp className="w-3 h-3" />
                      ROI: {scenario.roi}
                    </span>
                  </div>
                  <div className="mb-4">
                    <h4 className="text-xl font-bold text-slate-800 mb-2">{scenario.name}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{scenario.description}</p>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500 font-medium">Built-up Area</span>
                      <span className="text-lg font-bold text-slate-800">{scenario.builtArea.toLocaleString()} <span className="text-sm font-normal text-slate-500">sqft</span></span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500 font-medium">Number of Floors</span>
                      <span className="text-lg font-bold text-slate-800">{scenario.floors} <span className="text-sm font-normal text-slate-500">floors</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* AI Recommendations */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-slate-800">AI-Powered Recommendations</h2>
            </div>
            <div className="space-y-4">
              {recommendations.map((rec, idx) => (
                <div key={idx} className={`group relative p-6 rounded-2xl border-2 transition-all ${
                  rec.type === 'positive' ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 hover:border-emerald-400 hover:shadow-lg' : 
                  rec.type === 'warning' ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 hover:border-amber-400 hover:shadow-lg' : 
                  'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300 hover:border-slate-400 hover:shadow-lg'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`shrink-0 p-3 rounded-xl ${
                      rec.type === 'positive' ? 'bg-emerald-100' : 
                      rec.type === 'warning' ? 'bg-amber-100' : 
                      'bg-slate-200'
                    }`}>
                      {rec.type === 'positive' ? <CheckCircle className="w-6 h-6 text-emerald-600" /> :
                       rec.type === 'warning' ? <AlertCircle className="w-6 h-6 text-amber-600" /> :
                       <Info className="w-6 h-6 text-slate-600" />}
                    </div>
                  <div className="flex-1">
                    <h4 className={`text-lg font-bold mb-1 ${
                      rec.type === 'positive' ? 'text-emerald-800' : 
                      rec.type === 'warning' ? 'text-amber-800' : 
                      'text-slate-800'
                    }`}>{rec.title}</h4>
                    <p className={`text-sm leading-relaxed ${
                      rec.type === 'positive' ? 'text-emerald-700' : 
                      rec.type === 'warning' ? 'text-amber-700' : 
                      'text-slate-600'
                    }`}>{rec.description}</p>
                  </div>
                </div>
              </div>
              ))}
            </div>
          </section>
          
          {/* Traffic Impact */}
          {traffic && (
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                <h2 className="text-2xl font-bold text-slate-800">Traffic Impact Analysis</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 shadow-sm">
                  <div className="flex items-center gap-2 text-blue-600 text-xs font-medium uppercase tracking-wider mb-3">
                    <Car className="w-4 h-4" />
                    Daily Trips
                  </div>
                  <p className="text-3xl font-bold text-blue-700">{traffic.dailyTrips.toLocaleString()}</p>
                  <p className="text-sm text-blue-600 mt-2">Based on {traffic.unitCount} {traffic.unitType}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-200 shadow-sm">
                  <div className="flex items-center gap-2 text-purple-600 text-xs font-medium uppercase tracking-wider mb-3">
                    <TrendingUp className="w-4 h-4" />
                    Peak Hour
                  </div>
                  <p className="text-3xl font-bold text-purple-700">{traffic.peakHourTrips.toLocaleString()}</p>
                  <p className="text-sm text-purple-600 mt-2">AM/PM Peak Trips</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border-2 border-amber-200 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-600 text-xs font-medium uppercase tracking-wider mb-3">
                    <AlertCircle className="w-4 h-4" />
                    Impact Level
                  </div>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full shadow-md" 
                      style={{ backgroundColor: traffic.congestion.color }}
                    />
                    <span className="text-2xl font-bold text-amber-800">{traffic.congestion.level}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{traffic.congestion.description}</p>
                </div>
              </div>
            </section>
          )}

          {/* Amenities */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-slate-800">Nearby Amenities</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {amenities.schools && amenities.schools.length > 0 && (
                 <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                       <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-2.5 rounded-xl">
                         <GraduationCap className="w-5 h-5 text-emerald-600" />
                       </div>
                       <h3 className="text-lg font-bold text-slate-800">Schools</h3>
                    </div>
                    <ul className="space-y-4">
                       {amenities.schools.map((s, i) => (
                         <li key={i} className="group">
                           <div className="flex justify-between items-start mb-2">
                             <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-600 transition-colors">{s.name}</span>
                             <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg">{s.distance} km</span>
                           </div>
                           <div className="flex gap-3 text-xs">
                             <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                               <Car className="w-3.5 h-3.5" /> <span className="font-medium">{s.drivingTime || 0} min</span>
                             </span>
                             <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                               🚶 <span className="font-medium">{s.walkingTime || 0} min</span>
                             </span>
                           </div>
                         </li>
                       ))}
                    </ul>
                 </div>
               )}
               {amenities.hospitals && amenities.hospitals.length > 0 && (
                 <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 hover:border-red-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                       <div className="bg-gradient-to-br from-red-100 to-pink-100 p-2.5 rounded-xl">
                         <Activity className="w-5 h-5 text-red-600" />
                       </div>
                       <h3 className="text-lg font-bold text-slate-800">Hospitals</h3>
                    </div>
                    <ul className="space-y-4">
                       {amenities.hospitals.map((s, i) => (
                         <li key={i} className="group">
                           <div className="flex justify-between items-start mb-2">
                             <span className="text-sm font-semibold text-slate-700 group-hover:text-red-600 transition-colors">{s.name}</span>
                             <span className="text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-lg">{s.distance} km</span>
                           </div>
                           <div className="flex gap-3 text-xs">
                             <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                               <Car className="w-3.5 h-3.5" /> <span className="font-medium">{s.drivingTime || 0} min</span>
                             </span>
                             <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                               🚶 <span className="font-medium">{s.walkingTime || 0} min</span>
                             </span>
                           </div>
                         </li>
                       ))}
                    </ul>
                 </div>
               )}
               {((amenities.metro && amenities.metro.length > 0) || (amenities.transport && amenities.transport.length > 0)) && (
                 <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                       <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-2.5 rounded-xl">
                         <Bus className="w-5 h-5 text-blue-600" />
                       </div>
                       <h3 className="text-lg font-bold text-slate-800">Transport</h3>
                    </div>
                    <ul className="space-y-4">
                       {(amenities.metro || amenities.transport || []).map((s, i) => (
                         <li key={i} className="group">
                           <div className="flex justify-between items-start mb-2">
                             <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{s.name}</span>
                             <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg">{s.distance} km</span>
                           </div>
                           <div className="flex gap-3 text-xs">
                             <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                               <Car className="w-3.5 h-3.5" /> <span className="font-medium">{s.drivingTime || 0} min</span>
                             </span>
                             <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                               🚶 <span className="font-medium">{s.walkingTime || 0} min</span>
                             </span>
                           </div>
                         </li>
                       ))}
                    </ul>
                 </div>
               )}
               {amenities.parks && amenities.parks.length > 0 && (
                 <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 hover:border-green-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                       <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-2.5 rounded-xl">
                         <Activity className="w-5 h-5 text-green-600" />
                       </div>
                       <h3 className="text-lg font-bold text-slate-800">Parks</h3>
                    </div>
                    <ul className="space-y-4">
                       {amenities.parks.map((s, i) => (
                         <li key={i} className="group">
                           <div className="flex justify-between items-start mb-2">
                             <span className="text-sm font-semibold text-slate-700 group-hover:text-green-600 transition-colors">{s.name}</span>
                             <span className="text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-lg">{s.distance} km</span>
                           </div>
                           <div className="flex gap-3 text-xs">
                             <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                               <Car className="w-3.5 h-3.5" /> <span className="font-medium">{s.drivingTime || 0} min</span>
                             </span>
                             <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                               🚶 <span className="font-medium">{s.walkingTime || 0} min</span>
                             </span>
                           </div>
                         </li>
                       ))}
                    </ul>
                 </div>
               )}
            </div>
          </section>

          {/* Environmental Factors */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-slate-800">Environmental Factors</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* AQI Forecast */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-cyan-100 to-blue-100 p-2.5 rounded-xl">
                    <Wind className="w-5 h-5 text-cyan-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">AQI Forecast (30 Days)</h3>
                </div>
                <div style={{ width: '100%', height: '200px' }} className="mt-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={aqiData}>
                      <defs>
                        <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" hide />
                      <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '12px', 
                          border: '2px solid #10b981',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="aqi" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', r: 4 }}
                        fill="url(#aqiGradient)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-500 mt-4 text-center leading-relaxed">Predicted Air Quality Index trend based on historical data and seasonal patterns</p>
              </div>

              {/* Lightning Risk */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-2.5 rounded-xl">
                    <Zap className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Lightning Strike Risk</h3>
                </div>
                
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className={`w-28 h-28 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${
                    lightningRisk?.riskLevel === 'High' ? 'bg-gradient-to-br from-red-100 to-red-200 text-red-600' :
                    lightningRisk?.riskLevel === 'Medium' ? 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600' :
                    'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-600'
                  }`}>
                    <Zap className="w-14 h-14" />
                  </div>
                  <h4 className="text-3xl font-bold text-slate-800 mb-3">
                    {lightningRisk?.riskLevel || 'Low'} Risk
                  </h4>
                  <p className="text-sm text-slate-600 max-w-xs leading-relaxed">
                    {lightningRisk?.warning || 'Standard lightning protection measures are recommended for this area.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Professional Footer */}
          <div className="mt-12 pt-8 border-t-2 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">AI Confidence Level:</span> {(mlConfidence * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  This report is generated using machine learning algorithms and real-time data analysis
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Report ID: {parcelInfo.area.toString().slice(-6)}</p>
                <p className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>

        </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPreview;
