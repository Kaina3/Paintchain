import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useRoomStore } from '@/features/room/store/roomStore';
import type { Player } from '@/shared/types';

const museumFrameStyle: React.CSSProperties = {
  border: '6px solid transparent',
  borderImage:
    'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)',
};

interface GalleryItem {
  player: Player;
  imageData: string | null;
}

interface WerewolfGalleryProps {
  /** ギャラリーに表示する絵のリスト */
  revealedItems: GalleryItem[];
  /** 現在大きく表示する絵（発表中 or クリック選択中） */
  featuredPlayerId: string | null;
  /** ギャラリーの絵をクリックしたとき */
  onSelectPlayer?: (playerId: string) => void;
  /** 発表モード: featuredはサムネに表示しない */
  revealMode?: boolean;
  /** サムネに表示するアイテム（revealMode時、発表済みのみ） */
  thumbnailItems?: GalleryItem[];
  /** 投票モード: 投票ボタン表示 */
  voteMode?: boolean;
  /** 投票の選択先 */
  selectedVoteId?: string | null;
  /** 投票確定先 */
  confirmedVoteId?: string | null;
  /** 投票ボタンクリック */
  onVoteSelect?: (playerId: string) => void;
}

export function WerewolfGallery({
  revealedItems,
  featuredPlayerId,
  onSelectPlayer,
  revealMode = false,
  thumbnailItems,
  voteMode = false,
  selectedVoteId,
  confirmedVoteId,
  onVoteSelect,
}: WerewolfGalleryProps) {
  const { playerId } = useRoomStore();

  const featuredItem = featuredPlayerId
    ? revealedItems.find((item) => item.player.id === featuredPlayerId)
    : null;

  // サムネ行に表示するアイテム
  const thumbs = revealMode
    ? (thumbnailItems ?? [])
    : revealedItems;

  return (
    <LayoutGroup>
      <div className="w-full flex flex-col items-center">
        {/* === 大きい表示エリア（壁の中央） === */}
        <div className="flex justify-center mb-6 min-h-[220px] sm:min-h-[300px] items-center">
          {revealMode ? (
            /* 発表モード: layoutId でサムネイルへスムーズに移動 */
            featuredItem && featuredItem.imageData ? (
              <div className="text-center">
                {/* 名前ラベル（layoutId の外 → 位置遷移に巻き込まれない） */}
                <motion.div
                  key={`name-${featuredItem.player.id}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="mb-3 flex items-center justify-center gap-2"
                >
                  <div
                    className="h-5 w-5 rounded-full shadow-lg border border-white/30"
                    style={{ backgroundColor: featuredItem.player.color }}
                  />
                  <span
                    className="text-2xl sm:text-3xl font-bold text-amber-100 font-serif"
                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
                  >
                    {featuredItem.player.name}
                  </span>
                </motion.div>
                {/* 画像フレーム: layoutId でサムネイルへ移動するアニメーション */}
                <motion.div
                  layoutId={`card-${featuredItem.player.id}`}
                  transition={{ type: 'spring', stiffness: 150, damping: 22, mass: 0.8 }}
                  className="inline-block rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl overflow-hidden"
                  style={museumFrameStyle}
                >
                  <div className="rounded bg-white/95 p-2 sm:p-3">
                    <img
                      src={featuredItem.imageData}
                      alt={`${featuredItem.player.name}の絵`}
                      className="max-h-[200px] sm:max-h-[260px] rounded-lg"
                    />
                  </div>
                </motion.div>
              </div>
            ) : null
          ) : (
            /* 議論/投票モード: 従来の AnimatePresence */
            <AnimatePresence mode="wait">
              {featuredItem && featuredItem.imageData ? (
                <motion.div
                  key={`featured-${featuredItem.player.id}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85, y: 30 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  className="text-center"
                >
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-3 flex items-center justify-center gap-2"
                  >
                    <div
                      className="h-5 w-5 rounded-full shadow-lg border border-white/30"
                      style={{ backgroundColor: featuredItem.player.color }}
                    />
                    <span
                      className="text-2xl sm:text-3xl font-bold text-amber-100 font-serif"
                      style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
                    >
                      {featuredItem.player.name}
                    </span>
                  </motion.div>
                  <div
                    className="inline-block rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl"
                    style={museumFrameStyle}
                  >
                    <div className="rounded bg-white/95 p-2 sm:p-3">
                      <img
                        src={featuredItem.imageData}
                        alt={`${featuredItem.player.name}の絵`}
                        className="max-h-[200px] sm:max-h-[260px] rounded-lg"
                      />
                    </div>
                  </div>
                </motion.div>
              ) : featuredItem && !featuredItem.imageData ? (
                <motion.div
                  key="no-drawing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center"
                >
                  <div className="rounded-lg bg-stone-900/60 p-8 text-amber-200/70 border border-stone-600/60 font-serif">
                    絵がありません
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  className="flex items-center justify-center"
                >
                  <div className="text-amber-200/40 font-serif text-lg">
                    絵をクリックして拡大
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* === サムネイル行（下部） === */}
        {/* revealMode: 常にコンテナを描画し overflow なしで layoutId アニメを許可 */}
        {revealMode ? (
          <div className="w-full pb-2" style={{ overflow: 'visible' }}>
            <div className="flex gap-3 justify-center flex-wrap px-2 min-h-[28px]">
              {thumbs.map((item) => {
                const isMe = item.player.id === playerId;
                return (
                  <div
                    key={item.player.id}
                    className="flex flex-col items-center flex-shrink-0"
                    style={{ width: '100px' }}
                  >
                    {/* サムネ画像: 同じ layoutId で上から降りてくる */}
                    <motion.div
                      layoutId={`card-${item.player.id}`}
                      transition={{ type: 'spring', stiffness: 150, damping: 22, mass: 0.8 }}
                      className="w-full rounded-lg overflow-hidden border-2 border-stone-600/60"
                      style={{ background: 'rgba(0,0,0,0.3)' }}
                    >
                      {item.imageData ? (
                        <img
                          src={item.imageData}
                          alt={`${item.player.name}の絵`}
                          className="w-full aspect-square object-cover bg-white rounded"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-stone-700/60 flex items-center justify-center text-amber-200/50 text-xs font-serif rounded">
                          なし
                        </div>
                      )}
                    </motion.div>
                    {/* プレイヤー名: 画像着地後にフェードイン */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.25 }}
                      className="mt-1 flex items-center gap-1 justify-center w-full"
                    >
                      <div
                        className="h-3 w-3 rounded-full flex-shrink-0 border border-white/20"
                        style={{ backgroundColor: item.player.color }}
                      />
                      <span className="text-xs text-amber-100 font-serif truncate">
                        {item.player.name}
                        {isMe && <span className="text-amber-200/60 ml-0.5">(自分)</span>}
                      </span>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : thumbs.length > 0 ? (
          <div className="w-full overflow-x-auto pb-2">
            <div className="flex gap-3 justify-center flex-wrap px-2">
              <AnimatePresence>
                {thumbs.map((item) => {
                  const isFeatured = item.player.id === featuredPlayerId;
                  const isMe = item.player.id === playerId;
                  const isVoteSelected = selectedVoteId === item.player.id;
                  const isVoteConfirmed = confirmedVoteId === item.player.id;

                  return (
                    <motion.div
                      key={item.player.id}
                      layout
                      initial={{ opacity: 0, scale: 0.5, y: -60 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 250, damping: 22 }}
                      className="flex flex-col items-center flex-shrink-0"
                      style={{ width: voteMode ? '120px' : '100px' }}
                    >
                      {/* サムネイル */}
                      <button
                        onClick={() => {
                          if (voteMode && onVoteSelect && !isMe && !confirmedVoteId) {
                            onVoteSelect(item.player.id);
                          }
                          onSelectPlayer?.(item.player.id);
                        }}
                        className={`relative w-full rounded-lg transition-all overflow-hidden border-2 ${
                          isFeatured
                            ? 'border-amber-400 shadow-lg shadow-amber-400/30 scale-105'
                            : isVoteConfirmed
                            ? 'border-red-500 shadow-lg shadow-red-500/30'
                            : isVoteSelected
                            ? 'border-indigo-400 shadow-lg shadow-indigo-400/30'
                            : 'border-stone-600/60 hover:border-amber-300/60'
                        }`}
                        style={!isFeatured ? { background: 'rgba(0,0,0,0.3)' } : undefined}
                      >
                        {item.imageData ? (
                          <img
                            src={item.imageData}
                            alt={`${item.player.name}の絵`}
                            className="w-full aspect-square object-cover bg-white rounded"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-stone-700/60 flex items-center justify-center text-amber-200/50 text-xs font-serif rounded">
                            なし
                          </div>
                        )}
                        {/* 投票済みバッジ */}
                        {isVoteConfirmed && (
                          <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center rounded">
                            <span className="text-2xl">🗳️</span>
                          </div>
                        )}
                      </button>

                      {/* プレイヤー名 */}
                      <div className="mt-1 flex items-center gap-1 justify-center w-full">
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0 border border-white/20"
                          style={{ backgroundColor: item.player.color }}
                        />
                        <span className="text-xs text-amber-100 font-serif truncate">
                          {item.player.name}
                          {isMe && <span className="text-amber-200/60 ml-0.5">(自分)</span>}
                        </span>
                      </div>

                      {/* 投票ボタン */}
                      {voteMode && !isMe && (
                        <button
                          onClick={() => {
                            if (!confirmedVoteId) {
                              onVoteSelect?.(item.player.id);
                              onSelectPlayer?.(item.player.id);
                            }
                          }}
                          disabled={!!confirmedVoteId}
                          className={`mt-1 w-full text-xs py-1.5 rounded-md font-bold transition-all ${
                            isVoteConfirmed
                              ? 'bg-red-600 text-white cursor-default'
                              : isVoteSelected
                              ? 'bg-indigo-500 text-white hover:bg-indigo-600 animate-pulse'
                              : 'bg-stone-700/80 text-amber-200/80 hover:bg-stone-600 border border-stone-500/60'
                          }`}
                        >
                          {isVoteConfirmed ? '✓ 投票済' : isVoteSelected ? '選択中' : '投票'}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ) : null}
      </div>
    </LayoutGroup>
  );
}
