import React, { useState, useEffect } from 'react';
import { Clock, Sun, CloudRain, CloudSun, CloudLightning, Droplets, MapPin, RefreshCw } from 'lucide-react';

interface WeatherInfo {
  temperature: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
}

export const WeatherClockWidget: React.FC = () => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Update real-time clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = days[now.getDay()];
      
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();

      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');

      setDateStr(`${dayName}, ${dd}/${mm}/${yyyy}`);
      setTimeStr(`${hh}:${min}:${ss}`);
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Weather Data from Open-Meteo
  const fetchWeather = async () => {
    try {
      setIsRefreshing(true);
      // TP. Hồ Chí Minh Lat: 10.8231, Lon: 106.6297
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=10.8231&longitude=106.6297&current=temperature_2m,precipitation,weather_code&daily=precipitation_probability_max&timezone=Asia%2FHo_Chi_Minh';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();

      const temp = data.current?.temperature_2m ?? 31;
      const precip = data.current?.precipitation ?? 0;
      const precipProb = data.daily?.precipitation_probability_max?.[0] ?? 10;
      const code = data.current?.weather_code ?? 0;

      setWeather({
        temperature: Math.round(temp),
        precipitation: precip,
        precipitationProbability: precipProb,
        weatherCode: code,
      });
    } catch (error) {
      console.warn('Weather fetch failed, using fallback metrics', error);
      // Fallback
      if (!weather) {
        setWeather({
          temperature: 31,
          precipitation: 0,
          precipitationProbability: 15,
          weatherCode: 1,
        });
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    // Refresh weather every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Weather Icon helper
  const getWeatherIcon = (code: number, precip: number) => {
    if (precip > 0 || code >= 61) return <CloudRain className="w-4 h-4 text-blue-300 animate-bounce" />;
    if (code >= 95) return <CloudLightning className="w-4 h-4 text-amber-300 animate-pulse" />;
    if (code >= 1 && code <= 3) return <CloudSun className="w-4 h-4 text-amber-200" />;
    return <Sun className="w-4 h-4 text-amber-300 animate-spin-slow" />;
  };

  return (
    <div className="hidden lg:flex items-center gap-3 bg-white/10 hover:bg-white/15 transition-all px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-md text-white text-xs select-none shadow-inner">
      {/* Date & Time Widget */}
      <div className="flex items-center gap-2 border-r border-white/20 pr-3">
        <Clock className="w-4 h-4 text-blue-200 shrink-0" />
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-[11px] text-blue-100">{dateStr}</span>
          <span className="font-black text-sm tracking-wider font-mono text-white">{timeStr}</span>
        </div>
      </div>

      {/* Weather Forecast Widget */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-red-300 shrink-0" />
          <span className="font-bold text-[11px] text-blue-100">TP.HCM</span>
        </div>

        {loading ? (
          <span className="text-[11px] text-blue-200 animate-pulse">Đang tải...</span>
        ) : weather ? (
          <div className="flex items-center gap-2.5">
            {/* Temp & Status */}
            <div className="flex items-center gap-1">
              {getWeatherIcon(weather.weatherCode, weather.precipitation)}
              <span className="font-black text-sm text-white">{weather.temperature}°C</span>
            </div>

            {/* Precipitation / Rain */}
            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md border border-white/15">
              <Droplets className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <div className="flex flex-col leading-none text-[10px]">
                <span className="font-bold text-white">{weather.precipitation} mm</span>
                <span className="text-cyan-200 text-[9px] font-medium">{weather.precipitationProbability}% mưa</span>
              </div>
            </div>

            {/* Refresh button */}
            <button
              onClick={fetchWeather}
              title="Cập nhật thời tiết"
              className="p-1 hover:bg-white/20 rounded-lg transition-transform active:scale-95"
            >
              <RefreshCw className={`w-3 h-3 text-blue-200 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-blue-200">Không có dữ liệu</span>
        )}
      </div>
    </div>
  );
};
