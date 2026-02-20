#!/bin/bash

# Identity Circuit Factory Frontend Setup Script

echo "🔬 Identity Circuit Factory Frontend Setup"
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18+."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not available. Please install npm."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo ""
    echo "🔧 Creating environment configuration..."
cat > .env.local << EOF
# Identity Circuit Factory Frontend Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_API_HOST=http://localhost:8000
EOF
    echo "✅ Created .env.local with default settings"
else
    echo "✅ Environment configuration already exists"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Make sure the backend API is running on http://localhost:8000"
echo "2. Run the development server:"
echo "   npm run dev"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "Available commands:"
echo "  npm run dev     - Start development server"
echo "  npm run build   - Build for production"
echo "  npm run start   - Start production server"
echo "  npm run lint    - Lint code"
echo ""
echo "Happy coding! 🚀" 
