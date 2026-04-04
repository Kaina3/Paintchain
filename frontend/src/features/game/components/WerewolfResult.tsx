import { motion } from 'framer-motion';
import { useWerewolfStore } from '../store/werewolfStore';
import { ReturnToLobbyButton } from './ReturnToLobbyButton';

const museumBg = '/img/gallery_room.png';
const museumFrameStyle: React.CSSProperties = {
  border: '6px solid transparent',
  borderImage:
    'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)',
};

export function WerewolfResult() {
  const { result } = useWerewolfStore();

  if (!result) {
    return (
      <div
        className="min-h-screen relative overflow-auto flex items-center justify-center p-4"
        style={{
          backgroundImage: `url(${museumBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-black/30 z-[1]" aria-hidden />
        <div className="relative z-10 text-center">
          <div
            className="text-2xl animate-pulse text-amber-100 font-serif mb-4"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
          >
            ⏳ 結果を生成中...
          </div>
          <div className="text-sm text-amber-200/70 font-serif">
            (投票結果を集計しています)
          </div>
        </div>
      </div>
    );
  }

  const werewolfPlayers = result.players.filter((p) => result.werewolves.includes(p.id));
  const villagerWin = result.caught;

  return (
    <div
      className="min-h-screen relative overflow-y-auto p-4"
      style={{
        backgroundImage: `url(${museumBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-black/25 z-[1]" aria-hidden />
      {/* タイトル */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mb-8 text-center pt-4"
      >
        <div
          className="text-5xl font-bold mb-2 text-amber-100 font-serif"
          style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.6)' }}
        >
          {villagerWin ? '🎉 村人の勝利！' : '🐺 人狼の勝利！'}
        </div>
        {result.wolfGuessedPrompt && (
          <div className="text-lg text-amber-200 font-serif" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            ✨ 人狼がお題を当てました！ボーナス獲得！
          </div>
        )}
      </motion.div>

      {/* 人狼は誰だったか */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 mb-8 max-w-2xl mx-auto rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl"
        style={museumFrameStyle}
      >
        <div className="rounded bg-white/95 backdrop-blur-xl p-6 text-center">
          <div className="mb-4 text-lg text-stone-600 font-serif">人狼は...</div>
          <div className="flex justify-center gap-6">
            {werewolfPlayers.map((player) => (
              <div key={player.id} className="text-center">
                <div
                  className="mx-auto mb-2 h-16 w-16 rounded-full shadow-lg"
                  style={{ backgroundColor: player.color }}
                />
                <div className="text-xl font-bold text-stone-900 font-serif">{player.name}</div>
                <div className="text-red-700">🐺</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* お題の違い */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="relative z-10 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto"
      >
        <div className="rounded-lg bg-white/10 backdrop-blur-md p-1" style={museumFrameStyle}>
          <div className="rounded bg-white/95 p-4 text-center">
            <div className="mb-2 text-sm text-stone-600 font-serif">村人のお題</div>
            <div className="text-2xl font-bold text-stone-900 font-serif">{result.villagerPrompt}</div>
          </div>
        </div>
        <div className="rounded-lg bg-white/10 backdrop-blur-md p-1" style={museumFrameStyle}>
          <div className="rounded bg-white/95 p-4 text-center">
            <div className="mb-2 text-sm text-stone-600 font-serif">人狼のお題</div>
            <div className="text-2xl font-bold text-stone-900 font-serif">{result.werewolfPrompt ?? '（なし）'}</div>
          </div>
        </div>
      </motion.div>

      {/* 投票結果 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="relative z-10 mb-8 max-w-2xl mx-auto"
      >
        <h3
          className="mb-4 text-lg font-bold text-center text-amber-100 font-serif"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}
        >
          📊 投票結果
        </h3>
        <div className="space-y-2">
          {result.voteResults.map(({ playerId, voteCount }) => {
            const player = result.players.find((p) => p.id === playerId);
            const isWerewolf = result.werewolves.includes(playerId);
            const maxVotes = Math.max(...result.voteResults.map((v) => v.voteCount));
            const isTopVoted = voteCount === maxVotes;

            return (
              <div
                key={playerId}
                className={`flex items-center justify-between rounded-lg p-3 border backdrop-blur-sm ${
                  isWerewolf ? 'bg-red-900/25 border-red-700/60' : 'bg-stone-900/40 border-stone-600/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-5 w-5 rounded-full"
                    style={{ backgroundColor: player?.color }}
                  />
                  <span className="font-medium text-amber-100 font-serif">{player?.name}</span>
                  {isWerewolf && <span className="text-red-300">🐺</span>}
                  {isTopVoted && <span className="text-amber-200">👈</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-stone-700/60 rounded-full w-24 overflow-hidden">
                    <div
                      className={`h-full ${isWerewolf ? 'bg-red-500' : 'bg-sky-500'}`}
                      style={{
                        width: `${maxVotes > 0 ? (voteCount / maxVotes) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="font-bold w-12 text-right text-amber-100 font-serif">{voteCount} 票</div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* スコアボード */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="relative z-10 mb-8 max-w-2xl mx-auto"
      >
        <h3
          className="mb-4 text-lg font-bold text-center text-amber-100 font-serif"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}
        >
          🏆 スコア
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {result.players
            .sort((a, b) => (result.scores[b.id] ?? 0) - (result.scores[a.id] ?? 0))
            .map((player, index) => {
              const isWerewolf = result.werewolves.includes(player.id);
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 + index * 0.1 }}
                  className={`rounded-lg p-3 text-center border backdrop-blur-sm ${
                    index === 0
                      ? 'bg-amber-900/25 ring-2 ring-amber-400 border-amber-500/40'
                      : 'bg-stone-900/40 border-stone-600/60'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="text-sm font-medium text-amber-100 font-serif">{player.name}</span>
                    {isWerewolf && <span className="text-xs text-red-300">🐺</span>}
                  </div>
                  <div className="text-3xl font-bold text-amber-100 font-serif">{result.scores[player.id] ?? 0}</div>
                  {index === 0 && <div className="text-xs text-amber-200 font-serif">1位</div>}
                </motion.div>
              );
            })}
        </div>
      </motion.div>

      {/* 絵のギャラリー */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="relative z-10 mb-8 max-w-4xl mx-auto"
      >
        <h3
          className="mb-4 text-lg font-bold text-center text-amber-100 font-serif"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}
        >
          🎨 みんなの絵
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {result.drawings.map(({ playerId, entries }) => {
            const player = result.players.find((p) => p.id === playerId);
            const isWerewolf = result.werewolves.includes(playerId);
            return (
              <div key={playerId} className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: player?.color }}
                  />
                  <span className="text-sm text-amber-100 font-serif">{player?.name}</span>
                  {isWerewolf && <span className="text-xs text-red-300">🐺</span>}
                </div>
                <div className="space-y-2">
                  {entries.map((entry, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={entry.imageData}
                        alt={`${player?.name} R${entry.round}`}
                        className="w-full rounded-lg bg-white shadow"
                      />
                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                        R{entry.round}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ロビーに戻るボタン */}
      <div className="relative z-10 text-center pb-8">
        <ReturnToLobbyButton />
      </div>
    </div>
  );
}
