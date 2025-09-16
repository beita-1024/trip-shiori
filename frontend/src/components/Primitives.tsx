/**
 * シンプル UI プリミティブ（React + Tailwind）
 * 
 * あなたのテーマ（bg-surface / border-ui / elevation-* など）に準拠した
 * 再利用可能なUIコンポーネントライブラリです。
 * 
 * 依存: React, Tailwind（@layer utilities に bg-app 等が定義済み）
 * 
 */

import React, { forwardRef, useState } from "react";

type Classable = { className?: string };

/**
 * Card
 * - surface/border/pattern/elevation をひとまとめ
 * - elevation: 1..5（デフォルト 1）
 * - 例) <Card elevation={3} className="max-w-xl">…</Card>
 */
export const Card: React.FC<
  React.PropsWithChildren<{ elevation?: 1 | 2 | 3 | 4 | 5 } & Classable>
> = ({ children, elevation = 1, className = "" }) => {
  const elevCls = `elevation-${elevation}`;
  return (
    <div
      className={`bg-surface border border-ui rounded-lg bg-surface-pattern surface-pattern-primary ${elevCls} p-4 ${className}`}
    >
      {children}
    </div>
  );
};

/** 見出し */
export const Heading: React.FC<{ children: React.ReactNode } & Classable> = ({
  children,
  className = "",
}) => (
  <h1 className={`text-2xl font-semibold text-body mb-2 ${className}`}>
    {children}
  </h1>
);

/** 小見出し */
export const SubHeading: React.FC<
  { children: React.ReactNode } & Classable
> = ({ children, className = "" }) => (
  <h2 className={`text-lg font-medium text-body mb-1 ${className}`}>
    {children}
  </h2>
);

/**
 * FormField
 * - ラベル + コントロール（children）+ オプションの補足
 * - id を渡すと <label htmlFor> が効きます
 * - 例)
 *   <FormField label="タイトル" id="title">
 *     <Input id="title" />
 *   </FormField>
 */
export const FormField: React.FC<
  React.PropsWithChildren<{
    label: string;
    help?: string;
    id?: string;
    required?: boolean;
  } & Classable>
> = ({ label, help, id, required = false, className = "", children }) => {
  const labelEl = (
    <>
      {label}
      {required && <span aria-hidden className="text-muted"> *</span>}
    </>
  );
  return (
    <div className={`mb-4 ${className}`}>
      {id ? (
        <label htmlFor={id} className="block text-sm text-muted mb-1">
          {labelEl}
        </label>
      ) : (
        <div className="block text-sm text-muted mb-1">{labelEl}</div>
      )}
      <div>{children}</div>
      {help && <p className="mt-1 text-xs text-muted">{help}</p>}
    </div>
  );
};

/**
 * Input（テキスト）
 * - 例) <Input id="title" defaultValue="…" placeholder="…" />
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & Classable;
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...rest }, ref) => {
    return (
      <input
        ref={ref}
        {...rest}
        className={`w-full rounded-md border border-input p-3 text-body bg-input focus:outline-none focus:border-input-focus focus:ring-2 focus:ring-[var(--color-input-focus)] transition-all duration-200 ease-out placeholder:text-input-placeholder ${className}`}
      />
    );
  }
);
Input.displayName = "Input";

/**
 * Textarea
 * - 例) <Textarea id="overview" rows={4} placeholder="…" />
 */
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  Classable;
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", rows = 4, ...rest }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        {...rest}
        className={`w-full rounded-md border border-input p-3 text-body bg-input resize-vertical focus:outline-none focus:border-input-focus focus:ring-2 focus:ring-[var(--color-input-focus)] transition-all duration-200 ease-out placeholder:text-input-placeholder ${className}`}
      />
    );
  }
);
Textarea.displayName = "Textarea";

/**
 * Button
 * - kind: "primary" | "ghost" | "destructive"
 * - elevation: 1 | 2（デフォルト: primary=2, ghost=1, destructive=1）
 * - 例) <Button kind="ghost" type="button">キャンセル</Button>
 */
export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    kind?: "primary" | "ghost" | "destructive";
    elevation?: 0 | 1 | 2;
  }
> = ({ kind = "primary", elevation, children, className = "", disabled, ...rest }) => {
  const base =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition duration-150 ease-in-out active:scale-95";
  
  // elevationのデフォルト値を設定
  const defaultElevation = elevation ?? (kind === "primary" ? 2 : 1);
  const elevationCls = `elevation-${defaultElevation}`;
  
  const kinds: Record<string, string> = {
    primary:
      "bg-button-primary text-button-primary hover:bg-button-primary focus:ring-2 focus:ring-[var(--color-accent)] active:scale-95",
    ghost:
      "bg-button-ghost border border-button-ghost text-button-ghost hover:bg-button-ghost focus:ring-2 focus:ring-[var(--color-accent)] active:scale-95",
    destructive: "bg-button-destructive text-button-destructive hover:bg-button-destructive focus:ring-2 focus:ring-red-500 active:scale-95",
  };
  const disabledCls = disabled ? "opacity-50 cursor-not-allowed" : "";
  return (
    <button
      {...rest}
      disabled={disabled}
      className={`${base} ${kinds[kind]} ${elevationCls} ${disabledCls} ${className}`}
    >
      {children}
    </button>
  );
};

/**
 * ActionIconButton
 * - 丸型のアイコンボタン。ツールチップは data-tip または title を使用
 * - kind: "primary" | "ghost" | "destructive"（デフォルト: "ghost"）
 * - elevation: 0 | 1 | 2（デフォルト: 1）
 * - 例) <ActionIconButton icon="mdi-undo" dataTip="Undo" onClick={() => {}} />
 */
export const ActionIconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: string; // mdi-*
    dataTip?: string;
    kind?: "primary" | "ghost" | "destructive";
    elevation?: 0 | 1 | 2;
  }
> = ({ icon, dataTip, kind = "ghost", elevation = 1, className = "", title, disabled, ...rest }) => {
  const tip = dataTip || title;
  const elevationCls = `elevation-${elevation}`;
  
  const base = "inline-flex items-center justify-center rounded-full w-10 h-10 text-sm font-medium transition-all duration-200 ease-out";
  const kinds: Record<string, string> = {
    primary: "bg-button-primary text-button-primary hover:bg-button-primary focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 active:scale-95",
    ghost: "bg-button-ghost border border-button-ghost text-button-ghost hover:bg-button-ghost focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 active:scale-95",
    destructive: "bg-button-destructive text-button-destructive hover:bg-button-destructive focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:scale-95",
  };
  const disabledCls = disabled ? "opacity-50 cursor-not-allowed hover:scale-100" : "";
  
  return (
    <button
      {...rest}
      disabled={disabled}
      className={`${base} ${kinds[kind]} ${elevationCls} ${disabledCls} ${className}`}
      title={tip}
      data-tip={tip}
      aria-label={tip}
      type={rest.type ?? "button"}
    >
      <i className={`mdi ${icon} text-lg`} aria-hidden />
    </button>
  );
};

/**
 * Spinner
 * - ローディングインジケータ
 * - size: "sm" | "md" | "lg"（デフォルト: md）
 * - 例) <Spinner size="sm" className="mr-2" />
 */
export const Spinner: React.FC<{
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}> = ({ size = "md", className = "", label = "読み込み中" }) => {
  const sizeCls =
    size === "sm" ? "ui-spinner--sm" : size === "lg" ? "ui-spinner--lg" : "ui-spinner--md";
  return <span className={`ui-spinner ${sizeCls} ${className}`} role="status" aria-label={label} />;
};

/**
 * SimpleForm
 * - フォームの最小ラッパ。デフォルトで submit を prevent し onSubmit を呼ぶ
 * - 例)
 *   <SimpleForm onSubmit={() => doSave()}>
 *     …fields…
 *     <Button type="submit">保存</Button>
 *   </SimpleForm>
 */
export const SimpleForm: React.FC<
  React.PropsWithChildren<{ onSubmit?: () => void } & Classable>
> = ({ children, onSubmit, className = "" }) => {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className={`space-y-4 ${className}`}
    >
      {children}
    </form>
  );
};

// プレースホルダー付きのInput
export const InputWithPlaceholder: React.FC<InputProps> = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", placeholder = "", ...rest }, ref) => {
    return (
      <input
        ref={ref}
        placeholder={placeholder}
        {...rest}
        className={`w-full rounded-md border border-input p-3 text-body bg-input focus:outline-none focus:border-input-focus focus:ring-2 focus:ring-[var(--color-input-focus)] transition-all duration-200 ease-out placeholder:text-input-placeholder ${className}`}
      />
    );
  }
);
InputWithPlaceholder.displayName = "InputWithPlaceholder";

// プレースホルダー付きのTextarea
export const TextareaWithPlaceholder: React.FC<TextareaProps> = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", rows = 4, placeholder = "", ...rest }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        placeholder={placeholder}
        {...rest}
        className={`w-full rounded-md border border-input p-3 text-body bg-input resize-vertical focus:outline-none focus:border-input-focus focus:ring-2 focus:ring-[var(--color-input-focus)] transition-all duration-200 ease-out placeholder:text-input-placeholder ${className}`}
      />
    );
  }
);
TextareaWithPlaceholder.displayName = "TextareaWithPlaceholder";

// 日付入力 + 曜日表示
type DateInputWithWeekdayProps = Omit<InputProps, "type" | "value" | "onChange"> & {
  id?: string;
  // 推奨: Date を直接受け取る
  valueDate?: Date;
  onChangeDate?: (next?: Date) => void;
  // 後方互換: 文字列 (YYYY-MM-DD)
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

export const DateInputWithWeekday: React.FC<DateInputWithWeekdayProps> = ({
  id,
  valueDate,
  onChangeDate,
  value,
  onChange,
  className = "",
  ...rest
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const formatYYYYMMDD = (d?: Date) => {
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const parseYYYYMMDD = (s?: string) => {
    if (!s) return undefined;
    const [y, m, d] = s.split("-").map((v) => parseInt(v, 10));
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
  };

  const valueString = valueDate ? formatYYYYMMDD(valueDate) : value ?? "";

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (onChangeDate) {
      const next = parseYYYYMMDD(e.target.value || undefined);
      onChangeDate(next);
    }
    onChange?.(e);
  };

  const formatDisplayFromString = (input?: string) => {
    if (!input) return "";
    const date = parseYYYYMMDD(input);
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const wk = new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date);
    return `${y}/${m}/${d} (${wk})`;
  };

  return (
    <div className={`${className}`}>
      <input
        id={id}
        type={isEditing ? "date" : "text"}
        value={isEditing ? valueString : formatDisplayFromString(valueString)}
        onChange={handleChange}
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        readOnly={!isEditing}
        inputMode={isEditing ? "numeric" : undefined}
        {...rest}
        className="w-full rounded-md border border-input p-3 text-body bg-input focus:outline-none focus:border-input-focus focus:ring-2 focus:ring-[var(--color-input-focus)] transition-all duration-200 ease-out"
      />
    </div>
  );
};

/**
 * IconRadioGroup
 * - mdiのクラス（例: "mdi-map-marker"）を使ってアイコンを並べるラジオ
 * - items: { value: string; label?: string }[]
 * - value: 現在値（例: "mdi-map-marker"）
 * - onChange: (next: string) => void
 */
export const IconRadioGroup: React.FC<{
  name?: string;
  value?: string;
  items: readonly { value: string; label?: string }[];
  onChange?: (next: string) => void;
  className?: string;
}> = ({ name = "icon", value, items, onChange, className = "" }) => {
  return (
    <div className={`flex flex-wrap gap-2 mb-2 ${className}`} role="radiogroup" aria-label="アイコン選択">
      {items.map((it) => {
        const checked = value === it.value;
        return (
          <label key={it.value} className={`icon-radio inline-flex items-center justify-center px-2 py-1 cursor-pointer ${checked ? "icon-radio--checked" : ""}`}>
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={checked}
              onChange={() => onChange?.(it.value)}
            />
            <i className={`mdi ${it.value} text-body`} aria-hidden />
            {/* {it.label && <span className="ml-1 text-sm text-body">{it.label}</span>} */}
          </label>
        );
      })}
    </div>
  );
};

const Primitives = {
  Card,
  Heading,
  SubHeading,
  FormField,
  Input,
  Textarea,
  Button,
  SimpleForm,
  Spinner,
  IconRadioGroup,
};

export default Primitives;
