import { useState, type FormEvent } from 'react'
import './App.css'

type Weather = {
    place: string
    current: {
        time: string
        temperature_2m: number
        apparent_temperature: number
        relative_humidity_2m: number
        wind_speed_10m: number
        weather_code: number
        is_day: number
    }
    hourly: {
        time: string[]
        temperature_2m: number[]
        weather_code: number[]
        is_day: number[]
    }
}

const getWeather = async (city: string): Promise<Weather> => {
    const geocoding_result = await (
        await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
        )
    ).json()

    const place = geocoding_result.results?.[0]
    if (!place) throw new Error(`Couldn't find a city called "${city}"`)

    const { latitude, longitude, name, country } = place

    const weather_result = await (
        await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day&hourly=temperature_2m,weather_code,is_day&timezone=auto&forecast_days=2`
        )
    ).json()

    return { place: [name, country].filter(Boolean).join(', '), ...weather_result }
}

// Turns a WMO weather code into a label, an emoji and a background theme
const describe = (code: number, isDay: boolean) => {
    if (code === 0)
        return { label: 'Clear sky', icon: isDay ? '☀️' : '🌙', theme: isDay ? 'clear' : 'night' }
    if (code <= 2)
        return {
            label: code === 1 ? 'Mainly clear' : 'Partly cloudy',
            icon: isDay ? '🌤️' : '☁️',
            theme: isDay ? 'clear' : 'night'
        }
    if (code === 3) return { label: 'Overcast', icon: '☁️', theme: isDay ? 'cloudy' : 'night' }
    if (code <= 48) return { label: 'Fog', icon: '🌫️', theme: 'cloudy' }
    if (code <= 57) return { label: 'Drizzle', icon: '🌦️', theme: 'rain' }
    if (code <= 67) return { label: 'Rain', icon: '🌧️', theme: 'rain' }
    if (code <= 77) return { label: 'Snow', icon: '❄️', theme: 'snow' }
    if (code <= 82) return { label: 'Rain showers', icon: '🌦️', theme: 'rain' }
    if (code <= 86) return { label: 'Snow showers', icon: '🌨️', theme: 'snow' }
    return { label: 'Thunderstorm', icon: '⛈️', theme: 'storm' }
}

const formatHour = (time: string) => new Date(time).toLocaleTimeString([], { hour: 'numeric' })

function App() {
    const [city, setCity] = useState('')
    const [weather, setWeather] = useState<Weather>()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string>()

    const search = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!city.trim()) return

        setLoading(true)
        setError(undefined)
        try {
            setWeather(await getWeather(city.trim()))
        } catch (err) {
            setWeather(undefined)
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const now = weather && describe(weather.current.weather_code, weather.current.is_day === 1)

    // The next 24 hours, starting from the current hour
    const start = weather
        ? weather.hourly.time.findIndex(t => t.slice(0, 13) === weather.current.time.slice(0, 13))
        : 0
    const hours = weather
        ? weather.hourly.time.slice(start, start + 24).map((time, i) => ({
              time,
              temperature: weather.hourly.temperature_2m[start + i],
              icon: describe(
                  weather.hourly.weather_code[start + i],
                  weather.hourly.is_day[start + i] === 1
              ).icon
          }))
        : []

    return (
        <main className={`app theme-${now?.theme ?? 'default'}`}>
            <div className='card'>
                <h1 className='title'>TAV Weather app</h1>

                <form className='search' onSubmit={search}>
                    <input
                        aria-label='City'
                        placeholder='Search for a city…'
                        value={city}
                        onChange={e => setCity(e.target.value)}
                    />
                    <button disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
                </form>

                {error && <p className='error'>{error}</p>}

                {weather && now ? (
                    <div className='weather' key={weather.place}>
                        <section className='current'>
                            <h2 className='place'>{weather.place}</h2>
                            <p className='condition'>{now.label}</p>
                            <div className='temp-row'>
                                <span className='icon'>{now.icon}</span>
                                <span className='temp'>
                                    {Math.round(weather.current.temperature_2m)}°
                                </span>
                            </div>
                        </section>

                        <ul className='stats'>
                            <li>
                                <span className='stat-label'>Feels like</span>
                                <span className='stat-value'>
                                    {Math.round(weather.current.apparent_temperature)}°
                                </span>
                            </li>
                            <li>
                                <span className='stat-label'>Wind</span>
                                <span className='stat-value'>
                                    {Math.round(weather.current.wind_speed_10m)} km/h
                                </span>
                            </li>
                            <li>
                                <span className='stat-label'>Humidity</span>
                                <span className='stat-value'>
                                    {weather.current.relative_humidity_2m}%
                                </span>
                            </li>
                        </ul>

                        <h3 className='section-title'>Next 24 hours</h3>
                        <ul className='hourly'>
                            {hours.map((hour, i) => (
                                <li key={hour.time} className={i === 0 ? 'now' : undefined}>
                                    <span className='hour-time'>
                                        {i === 0 ? 'Now' : formatHour(hour.time)}
                                    </span>
                                    <span className='hour-icon'>{hour.icon}</span>
                                    <span className='hour-temp'>
                                        {Math.round(hour.temperature)}°
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    !error && (
                        <p className='hint'>
                            Enter a city to see the current weather and the next 24 hours.
                        </p>
                    )
                )}
            </div>
        </main>
    )
}

export default App
