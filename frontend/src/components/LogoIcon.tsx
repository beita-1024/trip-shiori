import Image from "next/image";

/**
 * 旅のしおりアプリのロゴアイコン
 * 
 * 旅行としおりをイメージしたSVGアイコンコンポーネントです。
 * 外部SVGファイルを参照し、サイズや色をカスタマイズできます。
 * 
 * @param props.size - アイコンのサイズ（デフォルト: 32）
 * @param props.className - 追加のCSSクラス
 * @returns ロゴアイコンのSVG要素
 * 
 * @example
 * <LogoIcon size={40} className="text-blue-500" />
 */
interface LogoIconProps {
  size?: number;
  className?: string;
}

export function LogoIcon({ size = 32, className = "" }: LogoIconProps) {
  return (
    <div 
      className={className}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo-icon.svg"
        alt="AI旅のしおりロゴ"
        width={size}
        height={size}
        className="w-full h-full"
        priority
      />
    </div>
  );
}
