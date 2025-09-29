export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
      <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/20">
        <h1 className="text-4xl font-bold text-white mb-4">Tailwind CSS Test</h1>
        <div className="space-y-4">
          <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            Test Button
          </button>
          <div className="bg-white/50 p-4 rounded-lg">
            <p className="text-gray-800">If you can see this styled content, Tailwind CSS is working!</p>
          </div>
        </div>
      </div>
    </div>
  );
}


