import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timer } from './Timer';
import { ReturnToLobbyButton } from './ReturnToLobbyButton';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';

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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-900 to-gray-800">
      <ReturnToLobbyButton />
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">🗣️ 議論タイム</div>
            <div className="text-sm opacity-80">
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
                className="rounded-lg bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-medium transition-colors"
              >
                議論終了 ▶
              </button>
            )}
            <Timer />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 絵の一覧（左側） */}
        <div className="w-1/2 overflow-y-auto border-r border-gray-700 p-4">
          <div className="grid grid-cols-2 gap-3">
            {room?.players.map((player) => {
              const entries = allDrawings.get(player.id) ?? [];
              const latestDrawing = entries.find((e) => e.round === currentRound);

              return (
                <motion.div
                  key={player.id}
                  whileHover={{ scale: 1.02 }}
                  className="rounded-lg bg-gray-800 p-2 shadow"
                >
                  <div className="mb-1 flex items-center gap-1 text-sm">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="font-medium text-white">{player.name}</span>
                    {player.id === playerId && (
                      <span className="text-xs text-gray-400">(自分)</span>
                    )}
                  </div>
                  {latestDrawing ? (
                    <img
                      src={latestDrawing.imageData}
                      alt={`${player.name}の絵`}
                      className="w-full rounded bg-white"
                    />
                  ) : (
                    <div className="aspect-square rounded bg-gray-700 flex items-center justify-center text-gray-500 text-sm">
                      描画なし
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* チャット（右側） */}
        <div className="flex w-1/2 flex-col">
          {/* メッセージ一覧 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                チャットを開始しましょう
              </div>
            )}
            {chatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.playerId === playerId ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex ${msg.playerId === playerId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-2 shadow ${
                    msg.playerId === playerId
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {msg.playerId !== playerId && (
                    <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: msg.playerColor }}
                      />
                      <span>{msg.playerName}</span>
                    </div>
                  )}
                  <div>{msg.text}</div>
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* インポスター用お題推測ボタン */}
          {isWerewolf && promptInfo?.isHidden && promptChoices.length > 0 && (
            <div className="border-t border-gray-700 p-2">
              <button
                onClick={() => setShowGuessModal(true)}
                className={`w-full rounded-lg py-2 text-sm font-medium ${
                  myGuess
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {myGuess ? `推測済み: ${myGuess}` : '🎯 お題を推測する'}
              </button>
            </div>
          )}

          {/* 入力欄 */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={200}
                placeholder="メッセージを入力..."
                className="flex-1 rounded-full bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="rounded-full bg-amber-500 px-6 py-2 text-white hover:bg-amber-600 disabled:opacity-50"
              >
                送信
              </button>
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
            className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-xl font-bold text-white mb-4">お題を推測</h3>
            <p className="text-gray-400 mb-4">
              村人のお題は何だと思いますか？
            </p>
            <div className="space-y-2">
              {promptChoices.map((choice) => (
                <button
                  key={choice}
                  onClick={() => handleGuess(choice)}
                  className="w-full rounded-lg bg-gray-700 px-4 py-3 text-left text-white hover:bg-gray-600 transition-colors"
                >
                  {choice}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowGuessModal(false)}
              className="mt-4 w-full rounded-lg bg-gray-600 py-2 text-gray-300 hover:bg-gray-500"
            >
              キャンセル
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
