import { useState } from 'react'

const getWeather = async (city: string) => {
    const geocoding_result = await (
        await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`
        )
    ).json()

    const { latitude, longitude } = geocoding_result.results?.[0]

    const weather_result = await (
        await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`
        )
    ).json()

    return weather_result
}

function App() {
    const [city, setCity] = useState<string>()
    const [weather, setWeather] = useState()
    return (
        <>
            <input onChange={e => setCity(e.target.value)} />
            <button
                onClick={async () => {
                    setWeather(await getWeather(city))
                }}
            >
                Search
            </button>
            <pre>{JSON.stringify(weather, null, 2)}</pre>
        </>
    )
}

export default App
