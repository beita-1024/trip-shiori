/**
 * テーマ切り替えコンポーネント
 * 
 * ライト/ダークテーマの切り替えを行うコンポーネントです。
 * next-themesライブラリを使用してテーマ管理を行います。
 * 
 * @example
 * <ThemeToggle />
 */
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";


/**
 * テーマ切り替えコンポーネント
 * 
 * ライト/ダークテーマの切り替えを行うコンポーネントです。
 * 
 * @returns テーマ切り替えコンポーネント
 * @example
 * <ThemeToggle />
 */
export default function ThemeToggle(): React.JSX.Element {
  const { theme, setTheme, systemTheme } = useTheme();
  const current = theme === "system" ? systemTheme : theme;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // mark mounted to avoid hydration mismatches
    setMounted(true);
  }, []);

  return (
    <div className="flex gap-2 items-center">
      <button
        aria-label="Light"
        onClick={() => setTheme("light")}
        className={`px-2 py-1 rounded border ${mounted && current === "light" ? "ring-1" : ""}`}
      >
        <SunIcon className="h-5 w-5 text-body" aria-hidden />
      </button>

      <button
        aria-label="Dark"
        onClick={() => setTheme("dark")}
        className={`px-2 py-1 rounded border ${mounted && current === "dark" ? "ring-1" : ""}`}
      >
        <MoonIcon className="h-5 w-5 text-body" aria-hidden />
      </button>
    </div>
  );
}
