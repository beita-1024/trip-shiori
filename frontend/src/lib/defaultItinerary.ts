import type { Itinerary } from "@/types";

export const defaultItinerary: Itinerary = {
  title: "名古屋旅行（3泊4日）",
  subtitle: "名古屋の定番とディープスポットを巡る旅",
  description: "観光・食・散策・撮影をバランスよく組み合わせた3泊4日のモデルプラン（合計50イベント）。",
  days: [
    // Day 1
    {
      date: new Date("2024-05-01"),
      events: [
        { title: "出発（自宅→名古屋）", time: "09:00", end_time: "11:00", description: "車で移動して名古屋へ向かいます。途中休憩あり。", icon: "mdi-car" },
        { title: "移動（新幹線）", time: "11:15", end_time: "12:45", description: "のんびり車窓を楽しみながら移動。", icon: "mdi-train" },
        { title: "名古屋到着・ホテルチェックイン", time: "13:00", end_time: "14:00", description: "荷物を預けて身軽に観光開始。", icon: "mdi-map-marker" },
        { title: "ひつまぶしランチ", time: "14:30", end_time: "15:30", description: "名古屋名物のひつまぶしを堪能。", icon: "mdi-food" },
        { title: "名古屋城見学", time: "16:00", end_time: "17:00", description: "天守閣や石垣を見学、写真撮影。", icon: "mdi-camera" },
        { title: "城下町散策", time: "17:15", end_time: "17:45", description: "城周辺の昔ながらの通りをぶらり散歩。", icon: "mdi-walk" },
        { title: "お土産屋さん巡り", time: "18:00", end_time: "18:45", description: "名古屋らしい小物や食品をチェック。", icon: "mdi-camera" },
        { title: "夕食（手羽先）", time: "19:00", end_time: "20:30", description: "名古屋の居酒屋で手羽先や味噌料理を楽しむ。", icon: "mdi-food" },
        { title: "夜景スポットへ", time: "20:45", end_time: "21:30", description: "市内の夜景スポットで撮影。", icon: "mdi-walk" },
        { title: "バーで一杯", time: "21:45", end_time: "22:30", description: "軽くカクテルでひと息。", icon: "mdi-food" },
        { title: "ホテルへ戻る", time: "22:45", end_time: "23:15", description: "明日の行程を軽く確認して休憩。", icon: "mdi-car" },
        { title: "就寝準備・翌日の確認", time: "23:30", end_time: "00:00", description: "荷物整理と翌日のルート確認。", icon: "mdi-map-marker" },
      ],
    },

    // Day 2
    {
      date: new Date("2024-05-02"),
      events: [
        { title: "朝食（ホテル）", time: "07:30", end_time: "08:30", description: "朝のビュッフェでエネルギーチャージ。", icon: "mdi-food" },
        { title: "熱田神宮参拝", time: "09:00", end_time: "10:00", description: "歴史ある神社で参拝と散策。", icon: "mdi-map-marker" },
        { title: "熱田周辺朝市散策", time: "10:15", end_time: "11:15", description: "地元の朝市や小店を見て回る。", icon: "mdi-walk" },
        { title: "ランチ（きしめん）", time: "12:00", end_time: "13:00", description: "名古屋独特のきしめんを味わう。", icon: "mdi-food" },
        { title: "名古屋港水族館（入館）", time: "13:30", end_time: "15:30", description: "イルカショーや大水槽を見学。", icon: "mdi-camera" },
        { title: "港エリア撮影タイム", time: "15:45", end_time: "16:30", description: "港の景色・建物を写真におさめる。", icon: "mdi-camera" },
        { title: "移動（バスで移動）", time: "16:45", end_time: "17:15", description: "次のエリアへバスで移動。", icon: "mdi-bus" },
        { title: "カフェで休憩", time: "17:30", end_time: "18:00", description: "港を眺めながらコーヒーブレイク。", icon: "mdi-food" },
        { title: "夕食（海鮮）", time: "18:30", end_time: "19:30", description: "新鮮な海鮮を楽しむ。", icon: "mdi-food" },
        { title: "ナイト撮影・散策", time: "20:00", end_time: "21:00", description: "夜のライトアップを楽しみながら撮影。", icon: "mdi-camera" },
        { title: "夜の商店街散策", time: "21:15", end_time: "21:45", description: "屋台や夜店を見て回る。", icon: "mdi-walk" },
        { title: "カフェで夜食", time: "22:00", end_time: "22:30", description: "軽い夜食と翌日の確認。", icon: "mdi-food" },
        { title: "ホテルで就寝", time: "23:00", end_time: "23:30", description: "ゆっくり休んで翌日に備える。", icon: "mdi-map-marker" },
      ],
    },

    // Day 3
    {
      date: new Date("2024-05-03"),
      events: [
        { title: "朝ラン（公園）", time: "07:00", end_time: "07:45", description: "朝の公園で軽くジョギングして目を覚ます。", icon: "mdi-bike" },
        { title: "朝食カフェ", time: "08:15", end_time: "09:00", description: "地元のカフェでゆっくり朝食。", icon: "mdi-food" },
        { title: "大須商店街散策（前半）", time: "10:00", end_time: "11:00", description: "大須の古着・アニメショップをチェック。", icon: "mdi-walk" },
        { title: "大須商店街散策（後半）", time: "11:05", end_time: "12:00", description: "カフェや神社、レトロな店を巡る。", icon: "mdi-camera" },
        { title: "ランチ（大須グルメ）", time: "12:30", end_time: "13:30", description: "名物をはしごして食べ比べ。", icon: "mdi-food" },
        { title: "ポップカルチャーショップ巡り", time: "14:00", end_time: "15:00", description: "フィギュアや同人誌などディープな店を探索。", icon: "mdi-camera" },
        { title: "伝統工芸体験（有松絞り等）", time: "15:30", end_time: "16:30", description: "染め物などのワークショップで体験。", icon: "mdi-map-marker" },
        { title: "自転車レンタルで移動", time: "16:45", end_time: "17:15", description: "レンタサイクルでちょっと足を伸ばす。", icon: "mdi-bike" },
        { title: "夕食（味噌カツ）", time: "18:30", end_time: "19:30", description: "名古屋の味噌文化を味わう一皿。", icon: "mdi-food" },
        { title: "夜のライブ/演劇観覧", time: "20:00", end_time: "21:30", description: "地元公演で夜のエンタメを楽しむ。", icon: "mdi-camera" },
        { title: "屋台で軽食", time: "21:45", end_time: "22:15", description: "屋台の味を気軽に楽しむ。", icon: "mdi-food" },
        { title: "温泉・大浴場（ホテル）", time: "22:45", end_time: "23:30", description: "旅の疲れをゆっくり癒す。", icon: "mdi-map-marker" },
        { title: "写真整理と翌日準備", time: "23:45", end_time: "00:15", description: "その日の写真をチェックして明日の準備。", icon: "mdi-camera" },
      ],
    },

    // Day 4 (最終日)
    {
      date: new Date("2024-05-04"),
      events: [
        { title: "早朝散歩", time: "07:00", end_time: "07:30", description: "最後の街並みをゆっくり散歩して締める。", icon: "mdi-walk" },
        { title: "朝食・チェックアウト準備", time: "08:00", end_time: "09:00", description: "荷物最終確認と朝食。", icon: "mdi-food" },
        { title: "名古屋駅周辺でお土産探し", time: "09:30", end_time: "10:30", description: "駅ナカで定番土産を購入。", icon: "mdi-camera" },
        { title: "ランチ（駅弁）", time: "11:00", end_time: "12:00", description: "人気の駅弁でランチタイム。", icon: "mdi-food" },
        { title: "名古屋駅出発（新幹線）", time: "12:30", end_time: "14:00", description: "帰路につきます。", icon: "mdi-train" },
        { title: "移動（自宅へ）", time: "14:30", end_time: "15:30", description: "到着後は荷物を整理して休憩。", icon: "mdi-car" },
        { title: "旅の振り返り（カフェ）", time: "15:45", end_time: "16:15", description: "ハイライトを話しながら一息。", icon: "mdi-food" },
        { title: "写真アルバム作成（簡易）", time: "16:30", end_time: "17:15", description: "ベストショットを選んでアルバムにまとめる。", icon: "mdi-camera" },
        { title: "荷物整理・洗濯準備", time: "17:30", end_time: "18:00", description: "旅道具を片付けて日常へ戻る準備。", icon: "mdi-map-marker" },
        { title: "到着・解散", time: "18:30", end_time: "19:00", description: "無事到着、解散して帰宅。", icon: "mdi-map-marker" },
        { title: "夕食（自宅で）", time: "19:30", end_time: "20:30", description: "軽い帰宅ディナーで締め。", icon: "mdi-food" },
        { title: "旅のまとめメモ作成", time: "21:00", end_time: "21:30", description: "次回に活かすための感想・メモを残す。", icon: "mdi-map-marker" },
      ],
    },
  ],
};

export default defaultItinerary;


