/**
 * テスト用サンプル旅程データ
 */
import { Itinerary } from '../types/itineraryTypes';

/**
 * テスト用のサンプル旅程データ
 */
export const sampleItinerary: Itinerary = {
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
      ],
    },
  ],
};
