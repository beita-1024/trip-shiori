/**
 * サンプル旅程データ
 *
 * 新規アカウント作成時に自動的に追加されるサンプル旅程です。
 * タイトルは後で変更可能なように定数として定義しています。
 */
export const SAMPLE_ITINERARY_TITLE =
  'サンプル：冬の那須で動物と温泉に癒される2泊3日';

/**
 * サンプル旅程データ（那須旅行）
 *
 * 新規アカウント作成時に自動的に追加されるサンプル旅程です。
 */
export const sampleItineraryData = {
  title: 'サンプル：冬の那須で動物と温泉に癒される2泊3日',
  subtitle: 'どうぶつたちと雪景色、静かな時間を過ごす旅',
  description:
    '都会を離れ、那須の自然とあたたかな温泉、かわいい動物たちに癒される冬の小旅行。那須塩原駅前ホテルを拠点に、移動を最小限に抑えて効率的に巡る2泊3日の癒やしプラン。',
  days: [
    {
      date: '2025-12-05T00:00:00.000Z',
      events: [
        {
          time: '06:50',
          end_time: '07:07',
          title: '登戸駅 出発（小田急線・快速急行）',
          description:
            '登戸駅から小田急線快速急行で新宿へ。朝の静かな車内で、旅の始まりを感じながら出発。',
          icon: 'mdi-train',
        },
        {
          time: '07:22',
          end_time: '07:49',
          title: '新宿駅 乗り換え（埼京線・快速）',
          description:
            '埼京線快速で大宮駅へ。混雑を避けて早めに移動しつつ、軽い朝食を車内で。',
          icon: 'mdi-train',
        },
        {
          time: '08:09',
          end_time: '08:56',
          title: '大宮駅 → 那須塩原駅（東北新幹線やまびこ205号）',
          description:
            '東北新幹線で約50分。車窓から冬の関東平野を抜け、雪化粧の那須連山を眺めながら到着。',
          icon: 'mdi-train',
        },
        {
          time: '09:00',
          end_time: '09:30',
          title: '那須塩原駅 到着・荷物預け',
          description:
            'コインロッカーまたはホテルに荷物を預け、周辺を軽く散歩。空気が澄んだ高原の朝を感じる。',
          icon: 'mdi-map-marker',
        },
        {
          time: '11:30',
          end_time: '12:30',
          title: '駅周辺カフェで昼食',
          description:
            '旅の腹ごしらえに駅構内カフェで軽めのランチ。地元のパンやコーヒーを楽しむ。',
          icon: 'mdi-food',
        },
        {
          time: '13:00',
          end_time: '13:30',
          title: '那須塩原ステーションホテル チェックイン',
          description:
            '駅から徒歩3分の好立地。チェックイン後は少し休んで身支度を整える。',
          icon: 'mdi-map-marker',
        },
        {
          time: '14:00',
          end_time: '14:15',
          title: '那須塩原駅前温泉へ移動（バス）',
          description:
            '駅からすぐの源泉かけ流し温泉へ。旅の疲れを癒す時間へ向かう。',
          icon: 'mdi-bus',
        },
        {
          time: '14:15',
          end_time: '16:30',
          title: '那須塩原駅前温泉入浴',
          description:
            'ナトリウム・カルシウム塩化物泉の湯にゆったり浸かり、旅の初日をリラックスして過ごす。',
          icon: 'mdi-water',
        },
        {
          time: '17:00',
          end_time: '18:30',
          title: 'Restaurant Au revoir（レストラン オールヴォワール）で夕食',
          description:
            '那須の地元食材を使ったフレンチを堪能。人気店のため事前予約がおすすめ（0287-67-3332）。',
          icon: 'mdi-food',
        },
        {
          time: '18:45',
          end_time: '22:30',
          title: 'ホテルで休息',
          description:
            '温泉の余韻を感じながら、翌日の王国プランを確認。夜はゆっくり過ごす。',
          icon: 'mdi-map-marker',
        },
        {
          time: '23:00',
          title: '就寝',
          description: '翌朝のシャトルバスに備えて、早めに就寝。',
          icon: 'mdi-map-marker',
          end_time: '',
        },
      ],
    },
    {
      date: '2025-12-06T00:00:00.000Z',
      events: [
        {
          time: '07:00',
          end_time: '08:00',
          title: '朝食・出発準備',
          description:
            'ホテルの朝食でエネルギー補給。防寒着や荷物を確認して出発準備を整える。',
          icon: 'mdi-food',
        },
        {
          time: '08:45',
          end_time: '09:15',
          title: '那須塩原駅へ移動（徒歩）',
          description:
            '駅前のシャトル乗り場へ。9:15発の王国行きバスに合わせて到着。',
          icon: 'mdi-walk',
        },
        {
          time: '09:15',
          end_time: '10:20',
          title: '無料シャトルバス（那須塩原 → 那須どうぶつ王国）',
          description:
            '約1時間の山道ドライブ。雪の森を抜けて、動物たちの王国へ。',
          icon: 'mdi-bus',
        },
        {
          time: '10:30',
          end_time: '10:45',
          title: '那須どうぶつ王国 入場',
          description:
            'チケットを購入し、園内マップを受け取る。ショーやイベントの時刻もチェック。',
          icon: 'mdi-map-marker',
        },
        {
          time: '10:45',
          end_time: '12:00',
          title: '屋内エリアめぐり',
          description:
            'レッサーパンダやハシビロコウ、スナネコなどを観察。暖かい館内でじっくり動物観察を楽しむ。',
          icon: 'mdi-map-marker',
        },
        {
          time: '12:00',
          end_time: '13:00',
          title: '昼食（ヤマネコテラス）',
          description:
            '人気メニューは那須和牛カレーとヤマネコランチ。大きな窓から雪景色を望む癒やしの空間。',
          icon: 'mdi-food',
        },
        {
          time: '13:00',
          end_time: '14:30',
          title: 'スノーランド体験・カピバラ温泉',
          description:
            '冬限定のスノーアクティビティやカピバラの温泉入浴を鑑賞。写真撮影もおすすめ。',
          icon: 'mdi-map-marker',
        },
        {
          time: '14:30',
          end_time: '15:15',
          title: 'おみやげ・カフェ休憩',
          description:
            '王国ショップでグッズを購入し、カフェでホットドリンクを楽しむ。',
          icon: 'mdi-map-marker',
        },
        {
          time: '16:00',
          end_time: '17:00',
          title: '無料シャトルで那須塩原駅へ戻る',
          description:
            '夕方発の便で帰路へ。心地よい疲れと満足感の中、車窓の夕景を眺める。',
          icon: 'mdi-bus',
        },
        {
          time: '17:15',
          end_time: '19:00',
          title: 'あとやまで夕食',
          description:
            '那須の食材を使った家庭的な料理が評判。席数が少ないため要予約（0287-65-3814）。',
          icon: 'mdi-food',
        },
        {
          time: '19:30',
          title: 'ホテルで休息',
          description:
            '写真を整理したり、温かい飲み物を飲みながらゆったり過ごす夜。',
          icon: 'mdi-bed',
          end_time: '',
        },
      ],
    },
    {
      date: '2025-12-07T00:00:00.000Z',
      events: [
        {
          time: '08:00',
          title: 'チェックアウト・荷物預け',
          description: 'チェックアウト後、ホテルに荷物を預けて身軽に観光へ。',
          icon: 'mdi-luggage',
          end_time: '',
        },
        {
          time: '08:30',
          end_time: '09:30',
          title: '那須湯本温泉エリアへ移動（バス）',
          description: '高原を登るバスに揺られ、湯けむり立ちのぼる温泉街へ。',
          icon: 'mdi-bus',
        },
        {
          time: '09:30',
          end_time: '10:15',
          title: '殺生石 見学',
          description:
            '九尾の狐伝説が残る史跡を散策。硫黄の香りと静けさに包まれた独特の雰囲気を感じる。',
          icon: 'mdi-map-marker',
        },
        {
          time: '10:15',
          end_time: '10:45',
          title: '那須湯本温泉街 散策',
          description:
            '温泉街のスイーツ店やカフェをめぐり、チーズケーキや地元みやげを楽しむ。',
          icon: 'mdi-map-marker',
        },
        {
          time: '11:00',
          end_time: '13:30',
          title: '南ヶ丘牧場 散策・ふれあい体験',
          description:
            '馬や羊とふれあい、濃厚ソフトクリームを味わう。のどかな時間を楽しむ。',
          icon: 'mdi-paw',
        },
        {
          time: '13:30',
          end_time: '14:30',
          title: '南ヶ丘牧場 お食事処『庄屋』で昼食',
          description:
            '名物のラムジンギスカンや自家製ビーフカレーを堪能。人気店のため早めの来店を。',
          icon: 'mdi-food',
        },
        {
          time: '14:30',
          end_time: '16:00',
          title: '那須バギーパーク体験',
          description:
            'オフロードを走る迫力のバギー体験。天候により中止の可能性があるため事前確認を。',
          icon: 'mdi-map-marker',
        },
        {
          time: '16:30',
          end_time: '17:30',
          title: '那須塩原駅へ移動',
          description: 'バスで那須塩原駅へ戻り、旅の締めくくりへ。',
          icon: 'mdi-bus',
        },
        {
          time: '17:30',
          end_time: '18:30',
          title: 'かめや・手打そばで夕食',
          description:
            '地元名物"塩原そば"で旅の最後の食事。あたたかい蕎麦で体をほぐす。',
          icon: 'mdi-food',
        },
        {
          time: '19:00',
          end_time: '19:55',
          title: '那須塩原駅 発（東北新幹線 やまびこ）',
          description:
            '帰路の新幹線でゆっくり休みながら、旅の思い出を振り返る。',
          icon: 'mdi-train',
        },
        {
          time: '20:50',
          end_time: '21:06',
          title: '登戸駅 到着・解散',
          description:
            '2泊3日の那須の旅が終了。次の季節の旅を楽しみにしながら帰宅。',
          icon: 'mdi-train',
        },
      ],
    },
  ],
};
