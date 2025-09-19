"use client";

import React from "react";
import EditFeature from "../EditFeature";
import { parseWithUids, serializeWithUids } from "@/components/uiUid";
import { buildApiUrl } from "@/lib/api";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditByIdPage({ params }: Props) {
  const { id } = React.use(params);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(buildApiUrl(`/api/itineraries/${id}`), {
          method: "GET",
          headers: { 
            "Content-Type": "application/json",
          },
          credentials: 'include',
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || `HTTP ${resp.status}`);
        }
        let data: unknown = await resp.json();
        if (typeof data === "string") {
          try { data = JSON.parse(data); } catch {}
        }
        if (!cancelled) {
          // Hook が読み込む LocalStorage に事前保存しておく
          // NOTE: APIレスポンスのunknown型を
          // parseWithUidsが期待する型に変換（実行時エラーはparseWithUids内でハンドリング）
          const next = parseWithUids(data as { [key: string]: unknown });
          try {
            const serialized = JSON.stringify(serializeWithUids(next));
            localStorage.setItem("itinerary", serialized);
          } catch {}
          setReady(true);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <main className="min-h-screen bg-app text-body p-6">
      <div className="max-w-3xl mx-auto">
        {loading && (
          <div className="p-4 bg-surface-pattern surface-pattern-subtle rounded">読み込み中…（ID: <span className="font-mono">{id}</span>）</div>
        )}
        {!loading && error && (
          <div className="p-4 bg-surface-pattern surface-pattern-subtle rounded">共有IDのドキュメントが見つかりませんでした（ID: <span className="font-mono">{id}</span>）。</div>
        )}
      </div>

      {!loading && !error && ready && (
        <EditFeature itineraryId={id} />
      )}
    </main>
  );
}
