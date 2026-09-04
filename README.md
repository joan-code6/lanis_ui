# Lanis WEB UI

## Configuration

Edit [`config.json`](config.json) before starting the UI:

```json
{
  "host": "0.0.0.0",
  "port": 3000,
  "apiUrl": "http://localhost:8000"
}
```

`host` and `port` configure the Vite development and preview servers. `apiUrl`
sets the default LANIS API address used by the browser. No environment variables
are required for these settings.
