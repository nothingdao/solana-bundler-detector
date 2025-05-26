import { Info, Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderButtonsProps {
  apiKey: string;
  onSettingsOpen: () => void;
}

export default function HeaderButtons({
  apiKey,
  onSettingsOpen
}: HeaderButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      {/* README Button */}
      <button
        onClick={() => window.open('https://github.com/nothingdao/solana-bundler-detector/blob/main/README.md', '_blank')}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
      >
        <Info className="w-4 h-4" />
        <span>README</span>
      </button>

      {/* Theme Toggle Button */}
      <ThemeToggle />
      {/* Settings Button */}
      <button
        onClick={onSettingsOpen}
        className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg relative"
      >
        <Settings className="w-4 h-4" />
        <span>Settings</span>
        {!apiKey && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />}
      </button>
    </div>
  );
}
