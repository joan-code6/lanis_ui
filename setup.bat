@echo off
echo Installing dependencies for Schulportal Hessen UI...
echo.

echo Installing Node.js dependencies...
npm install

echo.
echo Setting up environment...
if not exist .env (
    copy .env.example .env
    echo Created .env file from template
)

echo.
echo Setup complete! You can now run:
echo   npm run dev    - Start development server
echo   npm run build  - Build for production
echo.
echo Don't forget to:
echo 1. Update .env with your API URL if different from localhost:8000
echo 2. Make sure your backend API is running
echo.
pause