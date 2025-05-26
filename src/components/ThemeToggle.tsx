import { Moon, Sun } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
    >
      {theme === "light" ? (
        <>
          <Moon className="w-4 h-4" />
          <span>Dark</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4" />
          <span>Light</span>
        </>
      )}
    </button>
  )
}
