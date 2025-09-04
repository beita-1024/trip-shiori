/**
 * テーマ切り替えコンポーネント
 * 
 * ライト/ダークテーマの切り替えとスキンの適用を行うコンポーネントです。
 * next-themesライブラリを使用してテーマ管理を行い、LocalStorageに設定を保存します。
 * 
 * @example
 * <ThemeToggle />
 */
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon, BriefcaseIcon, SparklesIcon } from "@heroicons/react/24/outline";

/** LocalStorageのスキンキー名 */
const SKIN_KEY = "skin";

/** 既知のスキン名の配列 */
const KNOWN_SKINS = ["business", "yumekawa"] as const;

/**
 * スキンを適用する関数
 * 
 * @param name - 適用するスキン名
 * @param persist - LocalStorageに保存するかどうか
 */
function applySkin(name: string | null, persist = true) {
  // 既知のスキンクラスをクリアしてから付与（トグル動作は呼び出し側で実装）
  document.documentElement.classList.remove(...KNOWN_SKINS);
  if (name) {
    document.documentElement.classList.add(name);
    if (persist) try { localStorage.setItem(SKIN_KEY, name); } catch (e) {}
  } else {
    if (persist) try { localStorage.removeItem(SKIN_KEY); } catch (e) {}
  }
}

/**
 * テーマ切り替えコンポーネント
 * 
 * ライト/ダークテーマの切り替えとスキンの適用を行うコンポーネントです。
 * 
 * @returns テーマ切り替えコンポーネント
 * @example
 * <ThemeToggle />
 */
export default function ThemeToggle(): React.JSX.Element {
  const { theme, setTheme, systemTheme } = useTheme();
  const current = theme === "system" ? systemTheme : theme;
  const [skin, setSkinState] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // マウント時に保存済みスキンを復元（SSR 配慮）
    try {
      const s = localStorage.getItem(SKIN_KEY);
      if (s) {
        applySkin(s, false); // persist=false: 既に localStorage にあるので再保存不要
        setSkinState(s);
      }
    } catch (e) {
      // ignore
    }
    // mark mounted to avoid hydration mismatches
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 同じスキンを押したら解除するトグル機能
   * 
   * @param name - トグルするスキン名
   */
  function toggleSkin(name: string) {
    if (skin === name) {
      applySkin(null); // 既に同じなら解除
      setSkinState(null);
    } else {
      applySkin(name); // 上書き
      setSkinState(name);
    }
  }

  /**
   * ライト/ダークに切り替える際にスキンを自動クリア（true）／保持（false）を選べる
   * 
   * @param t - 設定するテーマ
   * @param clearSkin - スキンをクリアするかどうか
   */
  function setThemeAndClearSkin(t: "light" | "dark" | "system", clearSkin = true) {
    setTheme(t);
    if (clearSkin) {
      applySkin(null);
      setSkinState(null);
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <button
        aria-label="Light"
        onClick={() => setThemeAndClearSkin("light", true)} // light にする時にスキンを消す
        className={`px-2 py-1 rounded border ${mounted && current === "light" ? "ring-1" : ""}`}
      >
        <SunIcon className="h-5 w-5 text-body" aria-hidden />
      </button>

      <button
        aria-label="Dark"
        onClick={() => setThemeAndClearSkin("dark", true)} // dark にする時にスキンを消す
        className={`px-2 py-1 rounded border ${mounted && current === "dark" ? "ring-1" : ""}`}
      >
        <MoonIcon className="h-5 w-5 text-body" aria-hidden />
      </button>

      {/* <button
        aria-label="Business skin"
        onClick={() => toggleSkin("business")}
        className={`px-2 py-1 rounded border ${skin === "business" ? "ring-1" : ""}`}
      >
        <BriefcaseIcon className="h-5 w-5 text-body" aria-hidden />
      </button>

      <button
        aria-label="Yumekawa skin"
        onClick={() => toggleSkin("yumekawa")}
        className={`px-2 py-1 rounded border ${skin === "yumekawa" ? "ring-1" : ""}`}
      >
        <SparklesIcon className="h-5 w-5 text-body" aria-hidden />
      </button> */}
    </div>
  );
}
