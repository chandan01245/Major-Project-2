import { Activity, AlertCircle, Building, Bus, Car, CheckCircle, Download, GraduationCap, Info, TrendingUp, Wind, X, Zap, MapPin, Ruler, Home, DollarSign, FileText, Award } from 'lucide-react';
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
    traffic,
    cityInfo
  } = report;

  // Get currency symbol, fallback to ₹ if not available
  const currencySymbol = pricing?.currencySymbol || cityInfo?.currencySymbol || '₹';
  const cityName = cityInfo?.name || 'Bangalore';

  const aqiData = aqiForecast ? aqiForecast.map((val, idx) => ({
    day: `Day ${idx + 1}`,
    aqi: val
  })) : [];

  return (
    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header matching sidebar style */}
        <div className="p-6 border-b border-emerald-200 bg-gradient-to-r from-emerald-500 to-green-500 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Development Report</h1>
                <p className="text-xs text-emerald-100">{cityName} • ML-Powered Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-emerald-100">
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              <span>ID: {parcelInfo.area.toString().slice(-6)}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-2 py-1 rounded">
              <Award className="w-3 h-3" />
              <span className="font-semibold">Confidence: {(mlConfidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Executive Summary */}
            <section>
              <h3 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                <div className="w-1 h-4 bg-emerald-500 rounded"></div>
                Executive Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border-2 border-emerald-200 hover:border-emerald-400 transition-all shadow-sm hover:shadow-md group">
                  <div className="absolute top-2 right-2 opacity-20 group-hover:opacity-30 transition-opacity">
                    <Award className="w-12 h-12 text-emerald-500" />
                  </div>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Buildability Score</p>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-bold text-emerald-600">{buildability.score}</span>
                    <span className="text-lg text-emerald-500 font-medium">/ 100</span>
                  </div>
                  <span className="inline-block text-xs font-bold text-emerald-700 bg-emerald-200 px-3 py-1.5 rounded-full">
                    Grade {buildability.grade}
                  </span>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200 hover:border-blue-400 transition-all shadow-sm hover:shadow-md group">
                  <div className="absolute top-2 right-2 opacity-20 group-hover:opacity-30 transition-opacity">
                    <DollarSign className="w-12 h-12 text-blue-500" />
                  </div>
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Estimated Value</p>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {currencySymbol}{(pricing.estimatedValue.average / 10000000).toFixed(2)} {currencySymbol === '₹' ? 'Cr' : 'M'}
                  </div>
                  <p className="text-xs text-blue-600 font-medium mb-2">{currencySymbol}{pricing.pricePerSqft.average.toLocaleString()}/sqft</p>
                  <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full w-fit">
                    <TrendingUp className="w-3 h-3" />
                    <span className="font-semibold">{pricing.marketTrend?.trend || 'Rising'} Market</span>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200 hover:border-purple-400 transition-all shadow-sm hover:shadow-md group">
                  <div className="absolute top-2 right-2 opacity-20 group-hover:opacity-30 transition-opacity">
                    <Home className="w-12 h-12 text-purple-500" />
                  </div>
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Zoning Type</p>
                  <div className="text-3xl font-bold text-purple-600 capitalize mb-1">
                    {zoningDetails.zoneType}
                  </div>
                  <p className="text-xs text-purple-600 font-medium">FAR: {zoningDetails.far}</p>
                  <p className="text-xs text-purple-600 font-medium mt-1">Max Height: {zoningDetails.maxHeight}</p>
                </div>
              </div>
            </section>

            {/* Parcel Details */}
            <section>
              <h3 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                <div className="w-1 h-4 bg-emerald-500 rounded"></div>
                Parcel Information
              </h3>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 border border-slate-200 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <Ruler className="w-4 h-4 text-emerald-600" />
                      <p className="text-xs font-semibold text-slate-600 uppercase">Total Area</p>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{Math.round(parcelInfo.area * 10.764).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">sqft</p>
                    <p className="text-xs text-slate-400 mt-1">{parcelInfo.area.toLocaleString()} m²</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-semibold text-slate-600 uppercase">Perimeter</p>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{Math.round(parcelInfo.perimeter * 3.281).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">ft</p>
                    <p className="text-xs text-slate-400 mt-1">{parcelInfo.perimeter.toLocaleString()} m</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
                    <p className="text-xs text-emerald-700">Max Height</p>
                    <p className="font-bold text-sm text-slate-800">{zoningDetails.maxHeight}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
                    <p className="text-xs text-emerald-700">Ground Coverage</p>
                    <p className="font-bold text-sm text-slate-800">{zoningDetails.groundCoverage}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Development Scenarios */}
            <section>
              <h3 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                <div className="w-1 h-4 bg-emerald-500 rounded"></div>
                Development Scenarios
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scenarios.map((scenario, idx) => (
                  <div key={idx} className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 hover:border-emerald-300 rounded-xl p-5 shadow-sm hover:shadow-lg transition-all group">
                    <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Building className="w-16 h-16 text-emerald-500" />
                    </div>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-base font-bold text-slate-800">{scenario.name}</h4>
                      <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                        {scenario.roi}
                      </span>
                    </div>
                    {scenario.description && (
                      <p className="text-xs text-slate-600 mb-4 leading-relaxed">{scenario.description}</p>
                    )}
                    <div className="space-y-2">
                      {scenario.builtArea && (
                        <div className="flex justify-between items-center p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                          <span className="text-xs text-emerald-700 font-medium">Built-up Area</span>
                          <span className="text-sm font-bold text-slate-800">{scenario.builtArea.toLocaleString()} <span className="text-xs font-normal text-slate-500">sqft</span></span>
                        </div>
                      )}
                      {scenario.floors && (
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                          <span className="text-xs text-blue-700 font-medium">Floors</span>
                          <span className="text-sm font-bold text-slate-800">{scenario.floors}</span>
                        </div>
                      )}
                      {scenario.far && (
                        <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg border border-purple-100">
                          <span className="text-xs text-purple-700 font-medium">FAR</span>
                          <span className="text-sm font-bold text-slate-800">{scenario.far}</span>
                        </div>
                      )}
                      {scenario.estimatedCost && (
                        <div className="flex justify-between items-center p-2 bg-amber-50 rounded-lg border border-amber-100">
                          <span className="text-xs text-amber-700 font-medium">Est. Cost</span>
                          <span className="text-sm font-bold text-slate-800">{currencySymbol}{(scenario.estimatedCost / 10000000).toFixed(2)} {currencySymbol === '₹' ? 'Cr' : 'M'}</span>
                        </div>
                      )}
                      {scenario.openSpace && (
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg border border-green-100">
                          <span className="text-xs text-green-700 font-medium">Open Space</span>
                          <span className="text-sm font-bold text-slate-800">{scenario.openSpace.toLocaleString()} <span className="text-xs font-normal text-slate-500">sqft</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* AI Recommendations */}
            <section>
              <h3 className="text-sm font-semibold text-emerald-900 mb-3">AI Recommendations</h3>
              <div className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border ${
                    rec.type === 'positive' ? 'bg-emerald-50 border-emerald-300' : 
                    rec.type === 'warning' ? 'bg-amber-50 border-amber-300' : 
                    'bg-slate-50 border-slate-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 p-2 rounded-lg ${
                        rec.type === 'positive' ? 'bg-emerald-100' : 
                        rec.type === 'warning' ? 'bg-amber-100' : 
                        'bg-slate-200'
                      }`}>
                        {rec.type === 'positive' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> :
                         rec.type === 'warning' ? <AlertCircle className="w-4 h-4 text-amber-600" /> :
                         <Info className="w-4 h-4 text-slate-600" />}
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-sm font-bold mb-1 ${
                          rec.type === 'positive' ? 'text-emerald-800' : 
                          rec.type === 'warning' ? 'text-amber-800' : 
                          'text-slate-800'
                        }`}>{rec.title}</h4>
                        <p className={`text-xs ${
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
                <h3 className="text-sm font-semibold text-emerald-900 mb-3">Traffic Impact</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <p className="text-xs text-emerald-700 mb-1">Daily Trips</p>
                    <p className="text-xl font-bold text-slate-800">{traffic.dailyTrips.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">{traffic.unitCount} {traffic.unitType}</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <p className="text-xs text-emerald-700 mb-1">Peak Hour</p>
                    <p className="text-xl font-bold text-slate-800">{traffic.peakHourTrips.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">AM/PM Peak</p>
                  </div>
                  <div className="col-span-2 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <p className="text-xs text-emerald-700 mb-2">Impact Level</p>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: traffic.congestion.color }} />
                      <span className="text-lg font-bold text-slate-800">{traffic.congestion.level}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{traffic.congestion.description}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Amenities */}
            <section>
              <h3 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                <div className="w-1 h-4 bg-emerald-500 rounded"></div>
                Nearby Amenities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {amenities.schools && amenities.schools.length > 0 && (
                  <div className="bg-white border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-emerald-100 p-2 rounded-lg">
                        <GraduationCap className="w-4 h-4 text-emerald-600" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Schools</h4>
                    </div>
                    <ul className="space-y-2">
                      {amenities.schools.map((s, i) => (
                        <li key={i} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-semibold text-slate-700">{s.name}</span>
                            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">{typeof s.distance === 'number' ? s.distance.toFixed(2) : s.distance} km</span>
                          </div>
                          <div className="flex gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {s.drivingTime || 0} min</span>
                            <span>🚶 {s.walkingTime || 0} min</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {amenities.hospitals && amenities.hospitals.length > 0 && (
                  <div className="bg-white border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-red-100 p-2 rounded-lg">
                        <Activity className="w-4 h-4 text-red-600" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Hospitals</h4>
                    </div>
                    <ul className="space-y-2">
                      {amenities.hospitals.map((s, i) => (
                        <li key={i} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-semibold text-slate-700">{s.name}</span>
                            <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">{typeof s.distance === 'number' ? s.distance.toFixed(2) : s.distance} km</span>
                          </div>
                          <div className="flex gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {s.drivingTime || 0} min</span>
                            <span>🚶 {s.walkingTime || 0} min</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {((amenities.metro && amenities.metro.length > 0) || (amenities.transport && amenities.transport.length > 0)) && (
                  <div className="bg-white border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Bus className="w-4 h-4 text-blue-600" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Transport</h4>
                    </div>
                    <ul className="space-y-2">
                      {(amenities.metro || amenities.transport || []).map((s, i) => (
                        <li key={i} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-semibold text-slate-700">{s.name}</span>
                            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{typeof s.distance === 'number' ? s.distance.toFixed(2) : s.distance} km</span>
                          </div>
                          <div className="flex gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {s.drivingTime || 0} min</span>
                            <span>🚶 {s.walkingTime || 0} min</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {amenities.parks && amenities.parks.length > 0 && (
                  <div className="bg-white border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <Activity className="w-4 h-4 text-green-600" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Parks</h4>
                    </div>
                    <ul className="space-y-2">
                      {amenities.parks.map((s, i) => (
                        <li key={i} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-semibold text-slate-700">{s.name}</span>
                            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">{typeof s.distance === 'number' ? s.distance.toFixed(2) : s.distance} km</span>
                          </div>
                          <div className="flex gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {s.drivingTime || 0} min</span>
                            <span>🚶 {s.walkingTime || 0} min</span>
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
              <h3 className="text-sm font-semibold text-emerald-900 mb-3">Environmental Factors</h3>
              <div className="space-y-3">
                <div className="bg-white border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-cyan-100 p-2 rounded-lg">
                      <Wind className="w-4 h-4 text-cyan-600" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">AQI Forecast (30 Days)</h4>
                  </div>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={aqiData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" hide />
                      <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '8px', 
                          border: '1px solid #10b981',
                          fontSize: '12px'
                        }}
                      />
                      <Line type="monotone" dataKey="aqi" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-slate-500 mt-2 text-center">Predicted AQI trend</p>
                </div>

                <div className="bg-white border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <Zap className="w-4 h-4 text-amber-600" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Lightning Strike Risk</h4>
                  </div>
                  <div className="text-center py-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3 ${
                      lightningRisk?.riskLevel === 'High' ? 'bg-red-100 text-red-600' :
                      lightningRisk?.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-600' :
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      <Zap className="w-8 h-8" />
                    </div>
                    <h5 className="text-xl font-bold text-slate-800 mb-2">{lightningRisk?.riskLevel || 'Low'} Risk</h5>
                    <p className="text-xs text-slate-600">{lightningRisk?.warning || 'Standard lightning protection recommended.'}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="pt-4 border-t border-emerald-200">
              <p className="text-xs text-slate-500 text-center">
                Report ID: {parcelInfo.area.toString().slice(-6)} • Generated: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPreview;
