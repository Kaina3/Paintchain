import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer } from './Timer';
import { ReturnToLobbyButton } from './ReturnToLobbyButton';
import { WerewolfGallery } from './WerewolfGallery';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useGameStore } from '../store/gameStore';
import type { WerewolfChatMessage } from '@/shared/types';

const museumBg = '/img/gallery_room.png';
const museumFrameStyle: React.CSSProperties = {
  border: '6px solid transparent',
  borderImage:
    'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)',
};

/* ── 弾幕アイテム ── */
function DanmakuItem({ msg, lane }: { msg: WerewolfChatMessage; lane: number }) {
  return (
    <div
      className="danmaku-item absolute whitespace-nowrap font-bold"
      style={{
        top: `${lane * 44 + 60}px`,
        color: msg.playerColor || '#FFFFFF',
        fontSize: '1.15rem',
        WebkitTextStroke: '1.5px white',
        paintOrder: 'stroke fill',
        textShadow: '0 0 4px white, 0 0 4px white, 0 0 8px rgba(255,255,255,0.5)',
      }}
    >
      {msg.playerName}: {msg.text}
    </div>
  );
}

/* ── 弾幕オーバーレイ ── */
function ChatDanmaku({ messages }: { messages: WerewolfChatMessage[] }) {
  const [activeItems, setActiveItems] = useState<{ msg: WerewolfChatMessage; lane: number; key: string }[]>([]);
  const lanes = useRef<number[]>(new Array(6).fill(0));
  const processedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (processedIds.current.has(latest.id)) return;
    processedIds.current.add(latest.id);

    const now = Date.now();
    let minLane = 0;
    let minTime = lanes.current[0];
    for (let i = 1; i < lanes.current.length; i++) {
      if (lanes.current[i] < minTime) {
        minTime = lanes.current[i];
        minLane = i;
      }
    }
    lanes.current[minLane] = now;

    setActiveItems((prev) => [...prev, { msg: latest, lane: minLane, key: latest.id }]);

    const timer = setTimeout(() => {
      setActiveItems((prev) => prev.filter((i) => i.key !== latest.id));
    }, 10000);
    return () => clearTimeout(timer);
  }, [messages]);

  return (
    <div className="danmaku-container pointer-events-none absolute inset-0 overflow-hidden z-20">
      {activeItems.map(({ msg, lane, key }) => (
        <DanmakuItem key={key} msg={msg} lane={lane} />
      ))}
    </div>
  );
}

interface WerewolfRevealDiscussionProps {
  onAdvanceReveal: () => void;
  onSendChat: (message: string) => void;
  onGuessPrompt?: (guess: string) => void;
  onEndDiscussion?: () => void;
}

export function WerewolfRevealDiscussion({
  onAdvanceReveal,
  onSendChat,
  onGuessPrompt,
  onEndDiscussion,
}: WerewolfRevealDiscussionProps) {
  const { allDrawings, chatMessages, currentRound, totalRounds, revealIndex, isWerewolf, promptInfo, promptChoices, myGuess, setMyGuess } =
    useWerewolfStore();
  const { room, playerId } = useRoomStore();
  const { phase } = useGameStore();

  const isRevealPhase = phase === 'werewolf_reveal';
  const isDiscussionPhase = phase === 'werewolf_discussion';

  const [showDrawing, setShowDrawing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showGuessModal, setShowGuessModal] = useState(false);
  const [featuredPlayerId, setFeaturedPlayerId] = useState<string | null>(null);

  const players = room?.players ?? [];
  const isHost = room?.hostId === playerId;
  const isLastPlayer = revealIndex >= players.length - 1;

  // 発表フェーズ: revealIndex が変わったら名前演出
  useEffect(() => {
    if (!isRevealPhase) return;
    setShowDrawing(false);
    const timer = setTimeout(() => setShowDrawing(true), 400);
    return () => clearTimeout(timer);
  }, [revealIndex, isRevealPhase]);

  // 議論フェーズに切り替わったら最初のプレイヤーをfeaturedに
  useEffect(() => {
    if (isDiscussionPhase && players.length > 0) {
      setFeaturedPlayerId(players[0].id);
    }
  }, [isDiscussionPhase, players]);

  // 発表フェーズ: 発表中 + 発表済みアイテム
  const revealAllItems = useMemo(() => {
    if (!isRevealPhase) return [];
    return players.slice(0, revealIndex + 1).map((player) => {
      const entries = allDrawings.get(player.id) ?? [];
      const entry = entries.find((e) => e.round === currentRound);
      return { player, imageData: entry?.imageData ?? null };
    });
  }, [isRevealPhase, players, revealIndex, allDrawings, currentRound]);

  const revealThumbnailItems = useMemo(() => {
    if (!isRevealPhase) return [];
    return players.slice(0, revealIndex).map((player) => {
      const entries = allDrawings.get(player.id) ?? [];
      const entry = entries.find((e) => e.round === currentRound);
      return { player, imageData: entry?.imageData ?? null };
    });
  }, [isRevealPhase, players, revealIndex, allDrawings, currentRound]);

  // 議論フェーズ: 全プレイヤー
  const discussionItems = useMemo(() => {
    if (!isDiscussionPhase) return [];
    return players.map((player) => {
      const entries = allDrawings.get(player.id) ?? [];
      const entry = entries.find((e) => e.round === currentRound);
      return { player, imageData: entry?.imageData ?? null };
    });
  }, [isDiscussionPhase, players, allDrawings, currentRound]);

  const currentRevealPlayer = isRevealPhase ? players[revealIndex] : null;

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    onSendChat(inputText.trim());
    setInputText('');
  }, [inputText, onSendChat]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleGuess = useCallback(
    (guess: string) => {
      setMyGuess(guess);
      onGuessPrompt?.(guess);
      setShowGuessModal(false);
    },
    [onGuessPrompt, setMyGuess]
  );

  // ギャラリーに渡すprops
  const galleryItems = isRevealPhase ? revealAllItems : discussionItems;
  const galleryFeatured = isRevealPhase
    ? showDrawing
      ? (currentRevealPlayer?.id ?? null)
      : null
    : featuredPlayerId;

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{
        backgroundImage: `url(${museumBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/20 z-[1]" aria-hidden />
      <ReturnToLobbyButton />

      {/* 弾幕（議論中のみ） */}
      {isDiscussionPhase && <ChatDanmaku messages={chatMessages} />}

      {/* ── ヘッダー（フェーズに応じて変化） ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isRevealPhase ? 'reveal-header' : 'discussion-header'}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="relative z-30"
        >
          {isRevealPhase ? (
            /* 発表フェーズ: シンプルなラウンド表示 */
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div
                className="text-sm text-amber-200/70 font-serif"
                style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.6)' }}
              >
                🎨 発表タイム — R{currentRound} ({revealIndex + 1}/{players.length})
              </div>
            </div>
          ) : (
            /* 議論フェーズ: ヘッダーバー */
            <div className="bg-gradient-to-r from-stone-800/95 to-stone-900/95 p-3 sm:p-4 text-amber-100 border-b-2 border-stone-600 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div
                    className="text-lg font-bold font-serif"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}
                  >
                    🗣️ 議論タイム
                  </div>
                  <div className="text-sm opacity-90 font-serif">
                    ラウンド {currentRound}/{totalRounds}
                    {promptInfo?.category ? ` — 【${promptInfo.category}】` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isHost && onEndDiscussion && (
                    <button
                      onClick={() => {
                        if (window.confirm('議論を終了して次のフェーズに進みますか？')) {
                          onEndDiscussion();
                        }
                      }}
                      className="rounded-lg bg-stone-700/60 hover:bg-stone-600/70 px-4 py-2 text-sm font-medium transition-colors border border-stone-500 text-amber-100 backdrop-blur-sm"
                      style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                    >
                      議論終了 ▶
                    </button>
                  )}
                  <Timer />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── メインエリア: ギャラリー（常時マウント） ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-4 pb-4">
        <WerewolfGallery
          revealedItems={galleryItems}
          featuredPlayerId={galleryFeatured}
          onSelectPlayer={isDiscussionPhase ? setFeaturedPlayerId : undefined}
          revealMode={isRevealPhase}
          thumbnailItems={isRevealPhase ? revealThumbnailItems : undefined}
        />

        {/* 発表フェーズ: 名前お披露目オーバーレイ */}
        {isRevealPhase && (
          <AnimatePresence>
            {!showDrawing && (
              <motion.div
                key={`name-${revealIndex}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
              >
                <div className="text-center">
                  <div className="text-5xl mb-4 animate-bounce">🎭</div>
                  <div
                    className="text-3xl font-bold text-amber-100 font-serif"
                    style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.6)' }}
                  >
                    {currentRevealPlayer?.name ?? ''}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* 発表フェーズ: ホスト用「次へ」ボタン */}
        {isRevealPhase && isHost && showDrawing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <button
              onClick={onAdvanceReveal}
              className="px-10 py-3 rounded-xl text-lg font-bold text-white shadow-xl transition-all active:scale-95
                bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700
                border border-indigo-400/30"
            >
              {isLastPlayer ? '議論へ進む →' : `次の人へ → (${revealIndex + 2}/${players.length})`}
            </button>
          </motion.div>
        )}

        {/* 発表フェーズ: ゲスト用メッセージ */}
        {isRevealPhase && !isHost && showDrawing && (
          <div className="mt-6 text-amber-200/40 text-sm font-serif">
            ホストが次の発表へ進めます...
          </div>
        )}
      </div>

      {/* ── 下部: 弾幕入力（議論フェーズで出現） ── */}
      <AnimatePresence>
        {isDiscussionPhase && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative z-30 p-3 sm:p-4 space-y-2"
          >
            {/* インポスター用お題推測ボタン */}
            {isWerewolf && promptInfo?.isHidden && promptChoices.length > 0 && (
              <button
                onClick={() => setShowGuessModal(true)}
                className={`w-full rounded-lg py-2 text-sm font-medium border transition-colors ${
                  myGuess
                    ? 'bg-emerald-800/80 text-amber-100 border-emerald-600/50'
                    : 'bg-red-900/80 text-amber-100 hover:bg-red-800/80 border-red-700/60'
                }`}
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
              >
                {myGuess ? `推測済み: ${myGuess}` : '🎯 お題を推測する'}
              </button>
            )}

            {/* 弾幕入力欄 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={50}
                placeholder="テキストを送信..."
                className="flex-1 rounded-lg border-2 border-stone-600 bg-stone-800/70 px-4 py-2 text-sm text-amber-100 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 backdrop-blur-sm"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-2 text-sm font-bold text-amber-100 shadow-md transition hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 border-2 border-amber-600/40"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
              >
                🎤
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* お題推測モーダル */}
      {showGuessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-4 w-full max-w-md rounded-lg bg-white/15 backdrop-blur-md p-1 shadow-2xl"
            style={museumFrameStyle}
          >
            <div className="rounded bg-white/95 backdrop-blur-xl p-6">
              <h3 className="text-xl font-bold text-stone-800 mb-2 font-serif">お題を推測</h3>
              <p className="text-stone-600 mb-4 font-serif italic">村人のお題は何だと思いますか？</p>
              <div className="space-y-2">
                {promptChoices.map((choice) => (
                  <button
                    key={choice}
                    onClick={() => handleGuess(choice)}
                    className="w-full rounded-lg bg-stone-800 px-4 py-3 text-left text-amber-100 hover:bg-stone-700 transition-colors border border-stone-600"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    {choice}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowGuessModal(false)}
                className="mt-4 w-full rounded-lg bg-stone-700 py-2 text-amber-100 hover:bg-stone-600 border border-stone-500"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
              >
                キャンセル
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
