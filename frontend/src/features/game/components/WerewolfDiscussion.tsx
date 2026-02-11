import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timer } from './Timer';
import { ReturnToLobbyButton } from './ReturnToLobbyButton';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';

const museumBg = '/img/gallery_room.png';
const museumFrameStyle: React.CSSProperties = {
  border: '6px solid transparent',
  borderImage:
    'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)',
};

interface WerewolfDiscussionProps {
  onSendChat: (message: string) => void;
  onGuessPrompt?: (guess: string) => void;
  onEndDiscussion?: () => void;
}

export function WerewolfDiscussion({ onSendChat, onGuessPrompt, onEndDiscussion }: WerewolfDiscussionProps) {
  const { allDrawings, chatMessages, currentRound, totalRounds, isWerewolf, promptInfo, promptChoices, myGuess, setMyGuess } =
    useWerewolfStore();
  const { room, playerId } = useRoomStore();
  const [inputText, setInputText] = useState('');
  const [showGuessModal, setShowGuessModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const isHost = room?.hostId === playerId;

  // 自動スクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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

  const handleGuess = useCallback((guess: string) => {
    setMyGuess(guess);
    onGuessPrompt?.(guess);
    setShowGuessModal(false);
  }, [onGuessPrompt, setMyGuess]);

  return (
    <div
      className="min-h-screen relative overflow-auto flex flex-col"
      style={{
        backgroundImage: `url(${museumBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-black/25 z-[1]" aria-hidden />
      <ReturnToLobbyButton />
      {/* ヘッダー */}
      <div className="relative z-10 bg-gradient-to-r from-stone-800/95 to-stone-900/95 p-4 text-amber-100 border-b-2 border-stone-600 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold font-serif" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}>
              🗣️ 議論タイム
            </div>
            <div className="text-sm opacity-90 font-serif">
              ラウンド {currentRound}/{totalRounds}
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

      <div className="relative z-10 flex flex-1 overflow-hidden flex-col lg:flex-row gap-3 p-3 md:p-4">
        {/* 絵の一覧 */}
        <div className="lg:w-1/2 overflow-hidden rounded-lg bg-white/10 backdrop-blur-md p-1" style={museumFrameStyle}>
          <div className="h-full overflow-y-auto rounded bg-stone-900/60 p-3 md:p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-serif font-bold text-amber-100" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}>
                🖼️ みんなの絵
              </div>
              <div className="text-xs text-amber-200/80 font-serif">
                {promptInfo?.category ? `【${promptInfo.category}】` : ''}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
            {room?.players.map((player) => {
              const entries = allDrawings.get(player.id) ?? [];
              const latestDrawing = entries.find((e) => e.round === currentRound);

              return (
                <motion.div
                  key={player.id}
                  whileHover={{ scale: 1.02 }}
                  className="rounded-lg bg-stone-800/70 p-2 shadow border border-stone-600/60"
                >
                  <div className="mb-1 flex items-center gap-1 text-sm">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="font-medium text-amber-100 font-serif">{player.name}</span>
                    {player.id === playerId && (
                      <span className="text-xs text-amber-200/70 font-serif">(自分)</span>
                    )}
                  </div>
                  {latestDrawing ? (
                    <img
                      src={latestDrawing.imageData}
                      alt={`${player.name}の絵`}
                      className="w-full rounded bg-white"
                    />
                  ) : (
                    <div className="aspect-square rounded bg-stone-700/60 flex items-center justify-center text-amber-200/60 text-sm font-serif">
                      描画なし
                    </div>
                  )}
                </motion.div>
              );
            })}
            </div>
          </div>
        </div>

        {/* チャット */}
        <div className="lg:w-1/2 overflow-hidden rounded-lg bg-white/10 backdrop-blur-md p-1" style={museumFrameStyle}>
          <div className="flex h-full flex-col rounded bg-stone-900/60">
          {/* メッセージ一覧 */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
            {chatMessages.length === 0 && (
              <div className="text-center text-amber-200/70 mt-8 font-serif">チャットを開始しましょう</div>
            )}
            {chatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.playerId === playerId ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex ${msg.playerId === playerId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-2 shadow border ${
                    msg.playerId === playerId
                      ? 'bg-amber-700/90 text-amber-50 border-amber-600/60'
                      : 'bg-stone-800/70 text-amber-100 border-stone-600/60'
                  }`}
                >
                  {msg.playerId !== playerId && (
                    <div className="flex items-center gap-1 text-xs opacity-80 mb-1 font-serif">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: msg.playerColor }}
                      />
                      <span>{msg.playerName}</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* インポスター用お題推測ボタン */}
          {isWerewolf && promptInfo?.isHidden && promptChoices.length > 0 && (
            <div className="border-t border-stone-600 p-2">
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
            </div>
          )}

          {/* 入力欄 */}
          <div className="border-t border-stone-600 p-3 md:p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={200}
                placeholder="メッセージを入力..."
                className="flex-1 rounded-lg border-2 border-stone-600 bg-stone-700/50 px-4 py-2 text-sm text-amber-100 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-2 text-sm font-bold text-amber-100 shadow-md transition hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 border-2 border-amber-600/40"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
              >
                送信
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>

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
