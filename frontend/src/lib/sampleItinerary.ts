import type { Itinerary } from "@/types";

/**
 * サンプル旅程データ（名古屋旅行）
 * 
 * チュートリアル時などに表示するサンプルデータです。
 */
export const sampleItinerary: Itinerary = {
  title: "名古屋旅行（1泊2日）",
  subtitle: "名古屋の定番スポットを巡る旅",
  description: "観光・食・散策をバランスよく組み合わせた1泊2日のモデルプラン（合計8イベント）。",
  days: [
    // Day 1
    {
      date: new Date("2024-05-01"),
      events: [
        { title: "名古屋到着・ホテルチェックイン", time: "13:00", end_time: "14:00", description: "荷物を預けて身軽に観光開始。", icon: "mdi-map-marker" },
        { title: "ひつまぶしランチ", time: "14:30", end_time: "15:30", description: "名古屋名物のひつまぶしを堪能。", icon: "mdi-food" },
        { title: "名古屋城見学", time: "16:00", end_time: "17:00", description: "天守閣や石垣を見学、写真撮影。", icon: "mdi-camera" },
        { title: "夕食（手羽先）", time: "19:00", end_time: "20:30", description: "名古屋の居酒屋で手羽先や味噌料理を楽しむ。", icon: "mdi-food" },
      ],
    },

    // Day 2
    {
      date: new Date("2024-05-02"),
      events: [
        { title: "朝食（ホテル）", time: "07:30", end_time: "08:30", description: "朝のビュッフェでエネルギーチャージ。", icon: "mdi-food" },
        { title: "熱田神宮参拝", time: "09:00", end_time: "10:00", description: "歴史ある神社で参拝と散策。", icon: "mdi-map-marker" },
        { title: "ランチ（きしめん）", time: "12:00", end_time: "13:00", description: "名古屋独特のきしめんを味わう。", icon: "mdi-food" },
        { title: "名古屋港水族館", time: "13:30", end_time: "15:30", description: "イルカショーや大水槽を見学。", icon: "mdi-camera" },
      ],
    },
  ],
};

export default sampleItinerary;

